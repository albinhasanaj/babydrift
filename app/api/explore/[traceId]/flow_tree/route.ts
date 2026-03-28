import { NextRequest, NextResponse } from "next/server";
import { getTrace, flowToTree } from "@/lib/explorer";
import type { NamedFlowStep } from "@/lib/explorer/types";

function countFunctions(steps: NamedFlowStep[]): number {
  let count = 0;
  for (const s of steps) {
    if (s.nodeType === "function") count++;
    count += countFunctions(s.children);
  }
  return count;
}

function collectFiles(steps: NamedFlowStep[]): Set<string> {
  const files = new Set<string>();
  for (const s of steps) {
    if (s.filePath) files.add(s.filePath);
    for (const f of collectFiles(s.children)) files.add(f);
  }
  return files;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ traceId: string }> }
) {
  const { traceId } = await params;
  const flowId = req.nextUrl.searchParams.get("flow_id");
  const depthStr = req.nextUrl.searchParams.get("depth");
  const maxDepth = depthStr ? parseInt(depthStr, 10) : 10;

  if (!flowId) {
    return NextResponse.json(
      { error: "flow_id query param is required" },
      { status: 400 }
    );
  }

  const trace = getTrace(traceId);
  if (!trace || !trace.staticTrace) {
    return NextResponse.json({ error: "Trace not found" }, { status: 404 });
  }

  const flow = trace.staticTrace.namedFlows.find((f) => f.flowId === flowId);
  if (!flow) {
    return NextResponse.json({ error: "Flow not found" }, { status: 404 });
  }

  const tree = flowToTree(flow, maxDepth);

  return NextResponse.json({
    traceId,
    flowId: flow.flowId,
    label: flow.label,
    handlerType: flow.handlerType,
    totalFunctions: countFunctions(flow.steps),
    totalFiles: collectFiles(flow.steps).size,
    tree,
  });
}
