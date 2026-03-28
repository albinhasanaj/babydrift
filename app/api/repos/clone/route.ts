import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const REPOS_DIR = process.env.REPOS_DIR ?? path.join(process.cwd(), "data/repos");

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accessToken = (session as any).accessToken as string;
  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  const { owner, name } = await req.json();
  if (!owner || !name) {
    return NextResponse.json(
      { error: "owner and name are required" },
      { status: 400 }
    );
  }

  const repo = db.getRepo(owner, name);
  if (!repo) {
    return NextResponse.json({ error: "Repo not found in DB" }, { status: 404 });
  }

  const cloneDir = path.join(REPOS_DIR, owner, name);

  try {
    if (fs.existsSync(cloneDir)) {
      // Pull latest instead of re-cloning
      execSync("git pull --ff-only", {
        cwd: cloneDir,
        timeout: 60_000,
        stdio: "pipe",
      });
    } else {
      fs.mkdirSync(path.dirname(cloneDir), { recursive: true });

      // Clone with token for private repos, shallow for speed
      const cloneUrl = (repo.clone_url as string).replace(
        "https://",
        `https://x-access-token:${accessToken}@`
      );

      execSync(
        `git clone --depth 1 ${cloneUrl} ${cloneDir}`,
        { timeout: 120_000, stdio: "pipe" }
      );
    }

    db.setRepoCloned(repo.id as number, cloneDir);

    return NextResponse.json({
      success: true,
      clonePath: cloneDir,
    });
  } catch (err) {
    console.error("Clone failed:", err);
    return NextResponse.json(
      { error: "Failed to clone repository" },
      { status: 500 }
    );
  }
}
