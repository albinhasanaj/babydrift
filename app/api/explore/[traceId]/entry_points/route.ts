import { NextRequest, NextResponse } from "next/server";
import { getTrace, groupEntryPoints } from "@/lib/explorer";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ traceId: string }> }
) {
  const { traceId } = await params;

  const trace = getTrace(traceId);
  if (!trace) {
    return NextResponse.json({ error: "Trace not found" }, { status: 404 });
  }

  if (!trace.staticTrace) {
    return NextResponse.json(
      { error: "Trace has no static analysis data" },
      { status: 404 }
    );
  }

  const groups = groupEntryPoints(trace.staticTrace.namedFlows);

  return NextResponse.json({
    traceId,
    groups,
    totalFlows: trace.staticTrace.namedFlows.length,
  });
}
