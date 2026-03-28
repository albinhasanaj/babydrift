import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { fetchUserRepos, fetchGitHubUser } from "@/lib/github";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accessToken = (session as any).accessToken as string;
  if (!accessToken) {
    return NextResponse.json(
      { error: "No access token" },
      { status: 401 }
    );
  }

  try {
    // Get or create user
    const ghUser = await fetchGitHubUser(accessToken);
    db.upsertUser({ ...ghUser, accessToken });
    const user = db.getUserByGithubId(ghUser.githubId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 500 });
    }
    const userId = user.id as number;

    // Fetch repos from GitHub and sync to SQLite
    const ghRepos = await fetchUserRepos(accessToken);
    for (const repo of ghRepos) {
      db.upsertRepo({ ...repo, userId });
    }

    // Return from DB
    const repos = db.getReposByUserId(userId);

    return NextResponse.json({
      repos: repos.map((r) => ({
        id: r.id,
        githubId: r.github_id,
        name: r.name,
        owner: r.owner,
        fullName: r.full_name,
        description: r.description,
        language: r.language,
        stars: r.stars,
        defaultBranch: r.default_branch,
        updatedAt: r.updated_at,
        clonedAt: r.cloned_at,
        clonePath: r.clone_path,
      })),
    });
  } catch (err) {
    console.error("Failed to fetch repos:", err);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}
