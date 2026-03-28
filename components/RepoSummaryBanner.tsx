"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface RepoSummaryBannerProps {
  traceId: string | null;
  filePath: string | null;
}

export function RepoSummaryBanner({ traceId, filePath }: RepoSummaryBannerProps) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [generatedFor, setGeneratedFor] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset when file changes
  useEffect(() => {
    if (filePath !== generatedFor) {
      setSummary("");
      setLoading(false);
      setCollapsed(false);
      setGeneratedFor(null);
    }
  }, [filePath, generatedFor]);

  const generate = () => {
    if (!traceId || !filePath || loading) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setSummary("");
    setGeneratedFor(filePath);
    setCollapsed(false);

    (async () => {
      try {
        const response = await fetch("/api/explain/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ traceId, filePath }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          setLoading(false);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          setSummary((prev) => prev + text);
        }

        setLoading(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  };

  if (!traceId || !filePath) return null;

  // Friendly display name for the file
  const displayName = (() => {
    const parts = filePath.replace(/\\/g, "/").split("/");
    const name = parts[parts.length - 1];
    const ambiguous = /^(page|layout|route)\.[tj]sx?$/.test(name);
    if (ambiguous && parts.length >= 2) return parts[parts.length - 2] + "/" + name;
    return name;
  })();

  // Before generation: show trigger
  if (generatedFor !== filePath && !loading) {
    return (
      <div className="w-full border-b border-comprendo-border bg-comprendo-surface/80">
        <button
          onClick={generate}
          className="flex w-full items-center gap-3 px-6 py-2.5 text-left transition-colors hover:bg-comprendo-elevated/50"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-comprendo-accent" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-comprendo-faint">
            What does {displayName} do?
          </span>
          <span className="ml-auto text-[11px] text-comprendo-accent">
            Click to find out
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full border-b border-comprendo-border bg-comprendo-surface/80">
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="flex w-full items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-comprendo-elevated/50"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-comprendo-accent" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-comprendo-faint">
          What {displayName} does
        </span>
        <span className="ml-auto shrink-0 text-comprendo-faint">
          {collapsed ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" />
          )}
        </span>
      </button>

      {!collapsed && (
        <div className="px-6 pb-4 pl-[52px]">
          {loading && !summary && (
            <div className="flex flex-col gap-2">
              {[85, 60].map((w, i) => (
                <div
                  key={i}
                  style={{
                    height: 12,
                    width: `${w}%`,
                    borderRadius: 4,
                    background:
                      "linear-gradient(90deg, #2a1a0a 25%, #3d2010 50%, #2a1a0a 75%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.5s infinite",
                  }}
                />
              ))}
              <style>{`
                @keyframes shimmer {
                  0% { background-position: 200% 0; }
                  100% { background-position: -200% 0; }
                }
              `}</style>
            </div>
          )}
          {summary && (
            <p className="text-sm leading-relaxed text-comprendo-text">
              {summary}
              {loading && (
                <span
                  style={{
                    display: "inline-block",
                    width: 2,
                    height: 14,
                    background: "#f97316",
                    marginLeft: 2,
                    verticalAlign: "text-bottom",
                    animation: "blink 1s step-end infinite",
                  }}
                />
              )}
            </p>
          )}
          <style>{`
            @keyframes blink {
              50% { opacity: 0; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
