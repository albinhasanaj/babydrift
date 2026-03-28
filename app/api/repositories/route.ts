import { NextRequest, NextResponse } from "next/server";
import {
  upsertRepo,
  getAllRepos,
} from "@/lib/explorer";

// POST /api/repositories — connect a repo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fullName: string | undefined = body.full_name;

    if (!fullName || typeof fullName !== "string" || !fullName.includes("/")) {
      return NextResponse.json(
        { error: "full_name is required (e.g. 'owner/repo')" },
        { status: 400 }
      );
    }

    const repo = upsertRepo(fullName);

    return NextResponse.json({
      repositoryId: repo.id,
      fullName: repo.fullName,
      latestTraceId: repo.latestTraceId,
      connected: true,
    });
  } catch (error) {
    console.error("Connect repo error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/repositories — list all connected repos
export async function GET() {
  const repos = getAllRepos();
  return NextResponse.json(
    repos.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      latestTraceId: r.latestTraceId,
    }))
  );
}
