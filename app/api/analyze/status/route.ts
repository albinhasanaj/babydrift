import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "owner and repo query params are required" },
      { status: 400 }
    );
  }

  const result = db.getScanStatus(owner, repo);

  if (!result) {
    return NextResponse.json(
      { error: "Repository not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: result.scan_status,
    scanned_at: result.scanned_at,
  });
}
