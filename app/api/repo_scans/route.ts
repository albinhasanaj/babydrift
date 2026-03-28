import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";
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

    // Get access token for authenticated git operations
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = (session as any)?.accessToken as string | undefined;

    if (fs.existsSync(resolvedClone) && fs.existsSync(path.join(resolvedClone, ".git"))) {
      // Pull latest changes before scanning
      try {
        if (accessToken) {
          const authUrl = `https://x-access-token:${accessToken}@github.com/${owner}/${name}.git`;
          execSync(`git remote set-url origin ${authUrl}`, { cwd: resolvedClone, stdio: "pipe" });
        }
        execSync("git pull --ff-only", { cwd: resolvedClone, stdio: "pipe", timeout: 30_000 });
      } catch (pullErr) {
        console.warn("git pull failed, scanning existing clone:", pullErr);
      }
    } else if (!fs.existsSync(resolvedClone)) {
      // Clone the repo if it doesn't exist yet
      if (!accessToken) {
        return NextResponse.json(
          { error: "Not authenticated. Sign in to clone repositories." },
          { status: 401 }
        );
      }
      const authUrl = `https://x-access-token:${accessToken}@github.com/${owner}/${name}.git`;
      fs.mkdirSync(path.dirname(resolvedClone), { recursive: true });
      execSync(`git clone --depth 1 ${authUrl} ${resolvedClone}`, { stdio: "pipe", timeout: 60_000 });
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
