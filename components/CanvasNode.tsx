"use client";

import type { LaidNode } from "@/lib/explorer/types";

const NODE_H = 40;

interface CanvasNodeProps {
  node: LaidNode;
  selected: boolean;
  onClick: () => void;
}

const typeColors: Record<string, { bg: string; border: string; text: string }> = {
  function: { bg: "#FFF5E7", border: "#FFF5E7", text: "#242424" },
  branch:   { bg: "#FFF5E7", border: "#FFF5E7", text: "#242424" },
  section:  { bg: "#FFF5E7", border: "#FFF5E7", text: "#242424" },
};

export function CanvasNode({ node, selected, onClick }: CanvasNodeProps) {
  const colors = typeColors[node.nodeType] ?? typeColors.function;
  const hasChildren = node.children.length > 0 || node.canExpand;

  return (
    <>
      {node.flowGroupLabel && (
        <div
          style={{
            position: "absolute",
            left: node.x,
            top: node.y - 26,
            fontSize: 11,
            fontWeight: 600,
            color: "#242424",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            zIndex: 3,
          }}
        >
          {node.flowGroupLabel}
        </div>
      )}
      <div
        onClick={onClick}
        style={{
          position: "absolute",
          left: node.x,
          top: node.y,
          width: node.w,
          height: NODE_H,
          background: colors.bg,
          border: `2px solid ${selected ? "#e8420a" : colors.border}`,
          borderRadius: node.nodeType === "function" ? 9999 : 12,
          color: colors.text,
          fontSize: 13,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          cursor: hasChildren ? "pointer" : "default",
          boxShadow: selected
            ? `0 0 0 2px #e8420a, 0 4px 24px rgba(232,66,10,0.25)`
            : "0 2px 8px rgba(0,0,0,0.3)",
          transition: "box-shadow 0.15s ease, border-color 0.15s ease",
          userSelect: "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          padding: "0 16px",
          zIndex: 2,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {node.label}
        </span>
        {hasChildren && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            style={{
              flexShrink: 0,
              transform: node.expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
            }}
          >
            <path
              d="M4 2L8 6L4 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </>
  );
}
