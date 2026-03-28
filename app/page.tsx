"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Zap, GitBranch, AlertTriangle } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Analysis",
    description: "Drop any repo. Get a full architectural map in seconds.",
  },
  {
    icon: GitBranch,
    title: "Flow Visualization",
    description:
      "See every function, import, and call relationship as an interactive graph.",
  },
  {
    icon: AlertTriangle,
    title: "Drift Detection",
    description: "Understand what changed and why it matters.",
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col bg-comprendo-bg">
      <Navbar />

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        {/* Hero */}
        <div className="flex max-w-3xl flex-col items-center gap-6 text-center">
          <Badge
            variant="outline"
            className="border-comprendo-border bg-comprendo-surface text-comprendo-accent"
          >
            Code Comprehension for AI-Generated Codebases
          </Badge>

          <h1 className="text-5xl font-bold leading-tight tracking-tight text-comprendo-text sm:text-6xl">
            Understand any codebase,{" "}
            <span className="text-comprendo-primary">instantly.</span>
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-comprendo-muted">
            Comprendo maps your TypeScript codebase into an interactive flow
            graph. See how your code connects, where complexity lives, and what
            AI changed.
          </p>

          <div className="flex items-center gap-4 pt-2">
            <Button
              size="lg"
              onClick={() => router.push("/repos")}
              className="bg-comprendo-primary px-8 text-white hover:bg-comprendo-primary-hover"
            >
              Connect GitHub
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push("/repos")}
              className="border-comprendo-border bg-transparent text-comprendo-text hover:bg-comprendo-elevated"
            >
              Demo Mode
            </Button>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-24 grid w-full max-w-4xl grid-cols-1 gap-6 pb-20 sm:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-comprendo-border bg-comprendo-surface transition-colors hover:bg-comprendo-elevated"
            >
              <CardContent className="flex flex-col gap-3 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-comprendo-elevated">
                  <feature.icon className="h-5 w-5 text-comprendo-accent" />
                </div>
                <h3 className="text-lg font-semibold text-comprendo-text">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-comprendo-muted">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Background grid overlay */}
      <div className="pointer-events-none fixed inset-0 bg-grid opacity-30" />
    </div>
  );
}
