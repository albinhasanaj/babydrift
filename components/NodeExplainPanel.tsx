"use client";

import { useEffect, useRef, useState } from "react";

interface ExplainNodeData {
  id: string;
  label: string;
  type: string;
  filePath: string;
  line?: number;
  isDrift?: boolean;
  driftReason?: string;
  isClientComponent?: boolean;
  isAsync?: boolean;
}

interface NodeExplainPanelProps {
  node: ExplainNodeData | null;
  owner: string;
  repo: string;
  onClose: () => void;
}

const typeBadgeStyles: Record<string, string> = {
  PAGE: "background-color: #7c3aed",
  LAYOUT: "background-color: #6d28d9",
  COMPONENT: "background-color: #c2410c",
  FUNCTION: "background-color: #1e293b; border: 1px solid #f97316",
  API: "background-color: #059669",
  HOOK: "background-color: #0369a1",
  CONTEXT: "background-color: #0369a1",
  UTILITY: "background-color: #3d2010",
  DRIFT: "background-color: #450a0a; border: 1px solid #ef4444",
};

export function NodeExplainPanel({
  node,
  owner,
  repo,
  onClose,
}: NodeExplainPanelProps) {
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!node) {
      setExplanation("");
      setLoading(false);
      setError(false);
      return;
    }

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setExplanation("");
    setError(false);
    setLoading(true);

    (async () => {
      try {
        const response = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: node.label,
            type: node.type,
            filePath: node.filePath,
            line: node.line ?? 1,
            owner,
            repo,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          setError(true);
          setLoading(false);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          setExplanation((prev) => prev + text);
        }

        setLoading(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [node, owner, repo]);

  const isVisible = node !== null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transform: isVisible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        maxHeight: "40vh",
        background: "#1a1008",
        borderTop: "1px solid #3d2010",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 24,
        overflow: "auto",
      }}
    >
      {/* Drag handle */}
      <div
        style={{
          width: 32,
          height: 4,
          borderRadius: 2,
          background: "#3d2010",
          margin: "0 auto 16px",
        }}
      />

      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 18,
            color: "#faf5f0",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {node?.label}
        </span>

        {node?.type && (
          <span
            style={{
              display: "inline-block",
              padding: "2px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              color: "#faf5f0",
              flexShrink: 0,
              ...(parseStyleString(typeBadgeStyles[node.type] ?? "")),
            }}
          >
            {node.type}
          </span>
        )}

        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#8a7560",
            padding: 4,
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Drift warning */}
      {node?.isDrift && node.driftReason && (
        <div
          style={{
            background: "#450a0a",
            color: "#ef4444",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          ⚠ Drift detected — {node.driftReason}
        </div>
      )}

      {/* File path + line */}
      {node?.filePath && (
        <div
          style={{
            fontSize: 12,
            color: "#8a7560",
            marginBottom: 12,
          }}
        >
          {node.filePath}
          {node.line ? `:${node.line}` : ""}
        </div>
      )}

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: "#3d2010",
          marginBottom: 14,
        }}
      />

      {/* Explanation area */}
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: "#faf5f0",
          minHeight: 48,
        }}
      >
        {loading && !explanation && <ShimmerLines />}
        {explanation && <span>{explanation}</span>}
        {!loading && explanation && (
          <span
            style={{
              display: "inline-block",
              width: 2,
              height: 14,
              marginLeft: 2,
              verticalAlign: "text-bottom",
            }}
          />
        )}
        {loading && explanation && (
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
        {error && (
          <span style={{ color: "#8a7560" }}>
            Could not load explanation
          </span>
        )}
      </div>

      <style>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function ShimmerLines() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[85, 70, 55].map((w, i) => (
        <div
          key={i}
          style={{
            height: 14,
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
  );
}

function parseStyleString(s: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of s.split(";")) {
    const [key, value] = part.split(":").map((x) => x.trim());
    if (key && value) {
      const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      result[camelKey] = value;
    }
  }
  return result;
}
