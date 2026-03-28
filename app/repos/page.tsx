"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { RepoCard } from "@/components/RepoCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const mockRepos = [
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

export default function ReposPage() {
  const [search, setSearch] = useState("");

  const filtered = mockRepos.filter(
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
            Select a repository to analyze
          </p>
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
      </main>

      <div className="pointer-events-none fixed inset-0 bg-grid opacity-20" />
    </div>
  );
}
