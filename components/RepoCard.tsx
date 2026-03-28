"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Clock, Loader2 } from "lucide-react";

interface RepoCardProps {
  id: number;
  name: string;
  description: string;
  language: string;
  stars: number;
  updatedAt: string;
  owner: string;
}

export function RepoCard({
  name,
  description,
  language,
  stars,
  updatedAt,
  owner,
}: RepoCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [cloning, setCloning] = useState(false);

  async function handleAnalyze() {
    if (!session) {
      // Demo mode — go directly
      router.push(`/repo/${owner}/${name}`);
      return;
    }

    // Clone the repo first, then navigate
    setCloning(true);
    try {
      const res = await fetch("/api/repos/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, name }),
      });
      if (!res.ok) {
        console.error("Clone failed:", await res.text());
      }
    } catch (err) {
      console.error("Clone error:", err);
    } finally {
      setCloning(false);
    }
    router.push(`/repo/${owner}/${name}`);
  }

  return (
    <Card className="group border-comprendo-border bg-comprendo-surface transition-all hover:border-comprendo-primary/40 hover:bg-comprendo-elevated">
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold text-comprendo-text group-hover:text-comprendo-accent transition-colors">
              {name}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-comprendo-muted">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="border-comprendo-accent/30 bg-comprendo-accent/10 text-comprendo-accent"
          >
            {language}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-comprendo-faint">
            <Star className="h-3.5 w-3.5" />
            <span>{stars}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-comprendo-faint">
            <Clock className="h-3.5 w-3.5" />
            <span>{updatedAt}</span>
          </div>
        </div>

        <Button
          onClick={handleAnalyze}
          disabled={cloning}
          className="mt-auto w-full bg-comprendo-primary text-white hover:bg-comprendo-primary-hover disabled:opacity-60"
        >
          {cloning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cloning...
            </>
          ) : (
            "Analyze"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
