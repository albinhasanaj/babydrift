import { NextRequest, NextResponse } from "next/server";
import * as path from "path";
import * as fs from "fs";
import { scanRepo } from "@/lib/scanner";
import {
  getRepo,
  createTrace,
  scanResultToStaticTrace,
} from "@/lib/explorer";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const REPOS_DIR = path.join(DATA_DIR, "repos");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const repoId: string | undefined = body.repo_id;

    if (!repoId || typeof repoId !== "string") {
      return NextResponse.json(
        { error: "repo_id is required" },
        { status: 400 }
      );
    }

    const repo = getRepo(repoId);
    if (!repo) {
      return NextResponse.json(
        { error: "Repository not found. Connect it first via POST /api/repositories." },
        { status: 404 }
      );
    }

    // Resolve clone path: data/repos/owner/name
    const [owner, name] = repo.fullName.split("/");
    if (!owner || !name) {
      return NextResponse.json(
        { error: "Invalid repository fullName" },
        { status: 400 }
      );
    }

    const cloneDir = path.join(REPOS_DIR, owner, name);

    // Security: resolved path must be inside REPOS_DIR
    const resolvedReposDir = path.resolve(REPOS_DIR);
    const resolvedClone = path.resolve(cloneDir);
    if (!resolvedClone.startsWith(resolvedReposDir + path.sep)) {
      return NextResponse.json(
        { error: "Invalid repository path" },
        { status: 403 }
      );
    }

    if (!fs.existsSync(resolvedClone)) {
      return NextResponse.json(
        { error: `Repository not cloned at ${repo.fullName}. Clone it first via POST /api/repos/clone.` },
        { status: 404 }
      );
    }

    // Run the scanner
    const scanResult = await scanRepo(resolvedClone);

    // Convert to StaticTrace and persist
    const staticTrace = scanResultToStaticTrace(scanResult);
    const trace = createTrace(repoId, staticTrace);

    return NextResponse.json({
      scanId: trace.id,
      traceId: trace.id,
      repositoryId: repoId,
      stats: scanResult.stats,
      flowCount: staticTrace.namedFlows.length,
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
