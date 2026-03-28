import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getTrace } from "@/lib/explorer";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { traceId: string };

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { traceId } = body;
  if (!traceId) {
    return new Response(
      JSON.stringify({ error: "Missing traceId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const trace = getTrace(traceId);
  if (!trace?.staticTrace) {
    return new Response(
      JSON.stringify({ error: "Trace not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Build a summary of the project structure from the trace
  const flows = trace.staticTrace.namedFlows;
  const fileSet = new Set<string>();
  const entryLabels: string[] = [];

  for (const flow of flows) {
    entryLabels.push(`${flow.handlerType}: ${flow.label}`);
    for (const step of flow.steps) {
      if (step.filePath) fileSet.add(step.filePath);
      collectFiles(step.children, fileSet);
    }
  }

  const fileList = Array.from(fileSet).sort().join("\n  ");
  const entryList = entryLabels.slice(0, 30).join("\n  ");

  const userPrompt = `You are explaining a software project to a non-technical person.
Based on these files and their purposes:
  ${fileList}

Key parts of the app:
  ${entryList}

Write 2-3 sentences explaining what this app does, who would use it, and what problem it solves. Plain English only. No technical terms.`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction:
        "You are a friendly assistant that explains software projects in plain English to non-technical people. Never use jargon or technical terms. Be concise.",
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
    console.error("Gemini summary error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to generate summary" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

function collectFiles(
  steps: { filePath: string; children: { filePath: string; children: any[] }[] }[],
  out: Set<string>
) {
  for (const step of steps) {
    if (step.filePath) out.add(step.filePath);
    collectFiles(step.children, out);
  }
}
