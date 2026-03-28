"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/Navbar";
import { RepoCard } from "@/components/RepoCard";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";

interface Repo {
  id: number;
  name: string;
  description: string;
  language: string;
  stars: number;
  updatedAt: string;
  owner: string;
}

const mockRepos: Repo[] = [
  {
    id: 1,
    name: "my-saas-app",
    description:
      "A full-stack SaaS application built with Next.js and Supabase",
    language: "TypeScript",
    stars: 12,
    updatedAt: "2 days ago",
    owner: "demo",
  },
  {
    id: 2,
    name: "ai-dashboard",
    description: "Analytics dashboard with AI-powered insights",
    language: "TypeScript",
    stars: 8,
    updatedAt: "5 days ago",
    owner: "demo",
  },
  {
    id: 3,
    name: "lovable-clone",
    description: "Vibe-coded app generated with Lovable.dev",
    language: "TypeScript",
    stars: 3,
    updatedAt: "1 week ago",
    owner: "demo",
  },
  {
    id: 4,
    name: "e-commerce-store",
    description: "Next.js e-commerce store with Stripe integration",
    language: "TypeScript",
    stars: 24,
    updatedAt: "3 days ago",
    owner: "demo",
  },
  {
    id: 5,
    name: "job-board",
    description: "Job matching platform with semantic search",
    language: "TypeScript",
    stars: 31,
    updatedAt: "yesterday",
    owner: "demo",
  },
  {
    id: 6,
    name: "realtime-chat",
    description: "WebSocket chat app with presence indicators",
    language: "TypeScript",
    stars: 7,
    updatedAt: "4 days ago",
    owner: "demo",
  },
];

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
  const [repos, setRepos] = useState<Repo[]>(mockRepos);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/repos");
      if (!res.ok) throw new Error("Failed to fetch repos");
      const data = await res.json();
      const mapped: Repo[] = data.repos.map(
        (r: {
          id: number;
          name: string;
          owner: string;
          description: string | null;
          language: string | null;
          stars: number;
          updatedAt: string;
        }) => ({
          id: r.id,
          name: r.name,
          owner: r.owner,
          description: r.description ?? "",
          language: r.language ?? "Unknown",
          stars: r.stars,
          updatedAt: timeAgo(r.updatedAt),
        })
      );
      setRepos(mapped);
    } catch (err) {
      console.error(err);
      setError("Failed to load repositories. Using demo data.");
      setRepos(mockRepos);
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
              ? "Select a repository to analyze"
              : "Demo mode — sign in with GitHub to see your real repos"}
          </p>
          {error && (
            <p className="mt-2 text-sm text-comprendo-drift">{error}</p>
          )}
        </div>

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

            {filtered.length === 0 && (
              <div className="py-20 text-center text-comprendo-muted">
                No repositories match your search.
              </div>
            )}
          </>
        )}
      </main>

      <div className="pointer-events-none fixed inset-0 bg-grid opacity-20" />
    </div>
  );
}
