"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { Navbar } from "@/components/Navbar";
import { RepoCard } from "@/components/RepoCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, LogIn } from "lucide-react";

interface Repo {
  id: number;
  name: string;
  description: string;
  language: string;
  stars: number;
  updatedAt: string;
  owner: string;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  return `${weeks} weeks ago`;
}

export default function ReposPage() {
  const { data: session, status } = useSession();
  const [search, setSearch] = useState("");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/repositories");
      if (!res.ok) throw new Error("Failed to fetch repos");
      const data = await res.json();
      const mapped: Repo[] = data.map(
        (r: {
          id?: string | null;
          fullName: string;
          name?: string;
          owner?: string;
          description?: string | null;
          language?: string | null;
          stars?: number;
          updatedAt?: string;
          latestTraceId?: string | null;
        }) => {
          const [ownerPart, namePart] = r.fullName.split("/");
          return {
            id: Number(r.id) || Math.random(),
            name: r.name ?? namePart ?? r.fullName,
            owner: r.owner ?? ownerPart ?? "",
            description: r.description ?? "",
            language: r.language ?? "",
            stars: r.stars ?? 0,
            updatedAt: r.updatedAt ? timeAgo(r.updatedAt) : "",
          };
        }
      );
      setRepos(mapped);
    } catch (err) {
      console.error(err);
      setError("Failed to load repositories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchRepos();
    }
  }, [status, fetchRepos]);

  const filtered = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(search.toLowerCase()) ||
      repo.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen flex-col bg-comprendo-bg">
      <Navbar />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-comprendo-text">
            Your Repositories
          </h1>
          <p className="mt-2 text-comprendo-muted">
            {session
              ? "Select a repository to explore"
              : ""}
          </p>
          {error && (
            <p className="mt-2 text-sm text-comprendo-drift">{error}</p>
          )}
        </div>

        {!session && status !== "loading" ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-comprendo-muted text-lg">
              Sign in to see your repositories
            </p>
            <Button
              onClick={() => signIn("github", { callbackUrl: "/repos" })}
              className="bg-comprendo-primary text-white hover:bg-comprendo-primary-hover gap-2"
            >
              <LogIn className="h-4 w-4" />
              Sign in with GitHub
            </Button>
          </div>
        ) : (
          <>
            <div className="relative mb-8">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-comprendo-faint" />
              <Input
                placeholder="Search repositories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-comprendo-border bg-comprendo-surface pl-10 text-comprendo-text placeholder:text-comprendo-faint focus-visible:ring-comprendo-primary"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-comprendo-accent" />
                <span className="ml-3 text-comprendo-muted">Loading your repositories...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((repo) => (
                    <RepoCard key={repo.id} {...repo} />
                  ))}
                </div>

                {filtered.length === 0 && repos.length > 0 && (
                  <div className="py-20 text-center text-comprendo-muted">
                    No repositories match your search.
                  </div>
                )}

                {repos.length === 0 && !loading && (
                  <div className="py-20 text-center text-comprendo-muted">
                    No repositories connected yet. Explore a repo to get started.
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <div className="pointer-events-none fixed inset-0 bg-grid opacity-20" />
    </div>
  );
}
