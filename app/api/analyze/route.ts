import { NextRequest, NextResponse } from "next/server";
import * as path from "path";
import * as fs from "fs";
import { scanRepo } from "@/lib/scanner";
import { db } from "@/lib/db";

const REPOS_DIR = process.env.REPOS_DIR ?? path.join(process.cwd(), "data/repos");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, name } = body;

    if (!owner || typeof owner !== "string" || !name || typeof name !== "string") {
      return NextResponse.json(
        { error: "owner and name are required" },
        { status: 400 }
      );
    }

    const absolutePath = path.resolve(REPOS_DIR, owner, name);

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

    // Look up repo in DB
    const repo = db.getRepo(owner, name);

    // Return cached result if available
    if (repo && repo.scan_status === "done" && repo.scan_result) {
      return NextResponse.json(JSON.parse(repo.scan_result as string));
    }

    // Mark as scanning
    if (repo) {
      db.setScanStatus(repo.id as number, "scanning");
    }

    try {
      const result = await scanRepo(absolutePath);

      // Cache result
      if (repo) {
        db.setScanResult(repo.id as number, JSON.stringify(result));
      }

      return NextResponse.json(result);
    } catch (scanError) {
      // Mark as failed
      if (repo) {
        db.setScanStatus(repo.id as number, "failed");
      }
      throw scanError;
    }
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
