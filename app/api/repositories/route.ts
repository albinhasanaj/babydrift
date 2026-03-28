import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { fetchUserRepos } from "@/lib/github";
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

// GET /api/repositories — list all repos (GitHub + locally connected)
export async function GET() {
  const session = await getServerSession(authOptions);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accessToken = (session as any)?.accessToken as string | undefined;

  const localRepos = getAllRepos();
  const localMap = new Map(localRepos.map((r) => [r.fullName, r]));

  if (!accessToken) {
    // Not authenticated — return only locally stored repos
    return NextResponse.json(
      localRepos.map((r) => ({
        id: r.id,
        fullName: r.fullName,
        latestTraceId: r.latestTraceId,
      }))
    );
  }

  try {
    const ghRepos = await fetchUserRepos(accessToken);

    const merged = ghRepos.map((gh) => {
      const local = localMap.get(gh.fullName);
      return {
        id: local?.id ?? null,
        fullName: gh.fullName,
        name: gh.name,
        owner: gh.owner,
        description: gh.description,
        language: gh.language,
        stars: gh.stars,
        updatedAt: gh.updatedAt,
        latestTraceId: local?.latestTraceId ?? null,
      };
    });

    return NextResponse.json(merged);
  } catch (err) {
    console.error("Failed to fetch GitHub repos:", err);
    // Fall back to local repos if GitHub API fails
    return NextResponse.json(
      localRepos.map((r) => ({
        id: r.id,
        fullName: r.fullName,
        latestTraceId: r.latestTraceId,
      }))
    );
  }
}
