import { NextRequest, NextResponse } from "next/server";
import { getTrace, getFlowsForFile } from "@/lib/explorer";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ traceId: string }> }
) {
  const { traceId } = await params;
  const filePath = req.nextUrl.searchParams.get("file_path");
  const depthStr = req.nextUrl.searchParams.get("depth");
  const maxDepth = depthStr ? parseInt(depthStr, 10) : 10;

  if (!filePath) {
    return NextResponse.json(
      { error: "file_path query param is required" },
      { status: 400 }
    );
  }

  const trace = getTrace(traceId);
  if (!trace || !trace.staticTrace) {
    return NextResponse.json({ error: "Trace not found" }, { status: 404 });
  }

  const flows = getFlowsForFile(trace.staticTrace.namedFlows, filePath, maxDepth);

  return NextResponse.json({ traceId, filePath, flows });
}
