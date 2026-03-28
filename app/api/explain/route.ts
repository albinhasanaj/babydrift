import { NextRequest } from "next/server";
import * as path from "path";
import * as fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";

const REPOS_DIR =
  process.env.REPOS_DIR ?? path.join(process.cwd(), "data/repos");

const SYSTEM_PROMPT = `You explain code to people who don't know how to code.
You will be given a piece of code. Explain what it does in simple everyday language.
Imagine you're explaining to a friend who has never programmed.
Use analogies and real-world comparisons when helpful.
Never use words like: function, component, render, props, state, API, endpoint, hook, callback, parameter, argument, variable, object, array, module, import, export, async, promise, type, interface.
Instead say things like: "this part", "this piece", "this block", "this section".
Keep it to 2-3 short sentences max.
Plain text only — no markdown, no bullet points, no headers.`;

function extractCodeBlock(
  fileContent: string,
  startLine: number
): string {
  const lines = fileContent.split("\n");
  const startIdx = Math.max(0, startLine - 1);
  let depth = 0;
  let started = false;
  let endIdx = startIdx;

  for (let i = startIdx; i < lines.length; i++) {
    for (const char of lines[i]) {
      if (char === "{") {
        depth++;
        started = true;
      }
      if (char === "}") depth--;
    }
    endIdx = i;
    if (started && depth === 0) break;
    if (i - startIdx > 100) break;
  }

  return lines.slice(startIdx, endIdx + 1).join("\n");
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: {
    label: string;
    type: string;
    filePath: string;
    line: number;
    owner: string;
    repo: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { label, type, filePath, line, owner, repo } = body;

  if (!label || !type || !filePath || !owner || !repo) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Security: prevent path traversal
  const safePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, "");
  const fullPath = path.join(REPOS_DIR, owner, repo, safePath);
  const resolvedReposDir = path.resolve(REPOS_DIR);
  const resolvedFullPath = path.resolve(fullPath);

  if (!resolvedFullPath.startsWith(resolvedReposDir + path.sep)) {
    return new Response(
      JSON.stringify({ error: "Invalid file path" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!fs.existsSync(resolvedFullPath)) {
    return new Response(
      JSON.stringify({ error: "File not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const fileContent = fs.readFileSync(resolvedFullPath, "utf-8");
  const codeSnippet = extractCodeBlock(fileContent, line ?? 1);

  const userPrompt = `Here is a piece of code called "${label}":

\`\`\`
${codeSnippet}
\`\`\`

Explain what this does like you're talking to someone who has never coded.
What does it actually do? What would a user see or experience because of it?
Use simple everyday words. No technical jargon at all.
Keep it to 2-3 short sentences.`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const stream = await model.generateContentStream(userPrompt);

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(new TextEncoder().encode(text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: unknown) {
    console.error("Gemini error:", err);

    const status =
      err instanceof Error && "status" in err && (err as { status: number }).status === 429
        ? 429
        : 500;

    const message =
      status === 429
        ? "Gemini API rate limit exceeded. Please wait a minute or check your plan at https://ai.google.dev."
        : "Failed to generate explanation";

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
}
