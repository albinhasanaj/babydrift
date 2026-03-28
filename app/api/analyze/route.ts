import { NextRequest, NextResponse } from "next/server";
import * as path from "path";
import * as fs from "fs";
import { scanRepo } from "@/lib/scanner";

const REPOS_DIR = process.env.REPOS_DIR ?? path.join(process.cwd(), "repos");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoPath } = body;

    if (!repoPath || typeof repoPath !== "string") {
      return NextResponse.json(
        { error: "repoPath is required" },
        { status: 400 }
      );
    }

    const absolutePath = path.resolve(REPOS_DIR, repoPath);

    // Security check: resolved path must start with REPOS_DIR
    const resolvedReposDir = path.resolve(REPOS_DIR);
    if (!absolutePath.startsWith(resolvedReposDir + path.sep) && absolutePath !== resolvedReposDir) {
      return NextResponse.json(
        { error: "Invalid repository path" },
        { status: 403 }
      );
    }

    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    const result = await scanRepo(absolutePath);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
