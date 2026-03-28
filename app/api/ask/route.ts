import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getTrace } from "@/lib/explorer/store";
import type { NamedFlowStep } from "@/lib/explorer/types";

interface FlatNode {
  id: string;
  label: string;
  nodeType: string;
  filePath: string;
  startLine: number;
}

function flattenSteps(steps: NamedFlowStep[], out: FlatNode[] = []): FlatNode[] {
  for (const step of steps) {
    out.push({
      id: step.id,
      label: step.label,
      nodeType: step.nodeType,
      filePath: step.filePath,
      startLine: step.startLine,
    });
    flattenSteps(step.children, out);
  }
  return out;
}

const SYSTEM_PROMPT = `You are a codebase assistant for Comprendo.
You will be given a list of code nodes (functions, components, API routes, etc.) from a scanned repository.
Answer the developer's question concisely based on the node information provided.
Be specific — reference actual function/component names from the list when relevant.
Keep answers under 5 sentences. Plain text only — no markdown, no bullet points, no headers.

If your answer is primarily about ONE specific node, append this exact JSON marker at the very end of your response on a new line:
__COMPRENDO_NODE__{"id":"<nodeId>","label":"<nodeLabel>","filePath":"<filePath>"}

Only include this marker when the answer clearly maps to a single node. Omit it for general questions.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { question: string; traceId: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { question, traceId } = body;

  if (!question?.trim() || !traceId) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: question and traceId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const trace = getTrace(traceId);
  if (!trace || !trace.staticTrace) {
    return new Response(
      JSON.stringify({ error: "Trace not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Flatten all nodes from the trace (deduplicated by id)
  const nodeMap = new Map<string, FlatNode>();
  for (const flow of trace.staticTrace.namedFlows) {
    for (const node of flattenSteps(flow.steps)) {
      nodeMap.set(node.id, node);
    }
  }
  const uniqueNodes = Array.from(nodeMap.values()).slice(0, 300);

  const nodeList = uniqueNodes
    .map((n) => `[${n.id}] ${n.label} (${n.nodeType}) @ ${n.filePath}:${n.startLine}`)
    .join("\n");

  const userPrompt = `Codebase nodes:\n${nodeList}\n\nQuestion: ${question}`;

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
    console.error("Gemini ask error:", err);

    const status =
      err instanceof Error &&
      "status" in err &&
      (err as { status: number }).status === 429
        ? 429
        : 500;

    const message =
      status === 429
        ? "Gemini API rate limit exceeded. Please wait a moment."
        : "Failed to generate answer";

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
}
