import { NextRequest, NextResponse } from "next/server";
import { getTrace, buildFileTree } from "@/lib/explorer";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ traceId: string }> }
) {
  const { traceId } = await params;

  const trace = getTrace(traceId);
  if (!trace || !trace.staticTrace) {
    return NextResponse.json({ error: "Trace not found" }, { status: 404 });
  }

  const tree = buildFileTree(trace.staticTrace.namedFlows);

  return NextResponse.json({ traceId, tree });
}
