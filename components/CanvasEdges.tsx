"use client";

import type { LaidNode } from "@/lib/explorer/types";

const NODE_H = 40;

interface CanvasEdgesProps {
  nodes: LaidNode[];
}

function getEdgeColor(node: LaidNode): { stroke: string; dashArray?: string } {
  switch (node.branchArm) {
    case "then":
      return { stroke: "rgba(52,211,153,0.45)" };
    case "else":
      return { stroke: "rgba(251,113,133,0.45)" };
    case "body":
      return { stroke: "rgba(52,211,153,0.45)", dashArray: "6 4" };
    default:
      return { stroke: "rgba(168,120,96,0.4)" };
  }
}

export function CanvasEdges({ nodes }: CanvasEdgesProps) {
  const nodeMap = new Map<string, LaidNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const edges: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    stroke: string;
    dashArray?: string;
  }[] = [];

  for (const node of nodes) {
    if (!node.parentId) continue;
    const parent = nodeMap.get(node.parentId);
    if (!parent) continue;

    const { stroke, dashArray } = getEdgeColor(node);

    edges.push({
      x1: parent.x + parent.w,
      y1: parent.y + NODE_H / 2,
      x2: node.x,
      y2: node.y + NODE_H / 2,
      stroke,
      dashArray,
    });
  }

  if (edges.length === 0) return null;

  // Compute SVG bounds
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w);
    maxY = Math.max(maxY, n.y + NODE_H);
  }

  const pad = 20;

  return (
    <svg
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: maxX + pad,
        height: maxY + pad,
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      {edges.map((e, i) => {
        const cx = (e.x1 + e.x2) / 2;
        return (
          <path
            key={i}
            d={`M ${e.x1} ${e.y1} C ${cx} ${e.y1}, ${cx} ${e.y2}, ${e.x2} ${e.y2}`}
            fill="none"
            stroke={e.stroke}
            strokeWidth={2}
            strokeDasharray={e.dashArray}
          />
        );
      })}
    </svg>
  );
}
