import { Octokit } from "@octokit/rest";

export function createOctokit(accessToken: string) {
  return new Octokit({ auth: accessToken });
}

export async function fetchUserRepos(accessToken: string) {
  const octokit = createOctokit(accessToken);

  const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
    sort: "updated",
    per_page: 100,
    type: "owner",
  });

  return repos.map((repo) => ({
    githubId: repo.id,
    owner: repo.owner?.login ?? "",
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description ?? null,
    language: repo.language ?? null,
    stars: repo.stargazers_count ?? 0,
    defaultBranch: repo.default_branch ?? "main",
    cloneUrl: repo.clone_url ?? "",
    updatedAt: repo.updated_at ?? new Date().toISOString(),
  }));
}

export async function fetchGitHubUser(accessToken: string) {
  const octokit = createOctokit(accessToken);
  const { data } = await octokit.users.getAuthenticated();
  return {
    githubId: data.id,
    login: data.login,
    name: data.name ?? data.login,
    avatarUrl: data.avatar_url,
  };
}
