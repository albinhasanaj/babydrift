"use client";

import { useMemo } from "react";
import type { FlowTreeNode, LaidNode, FileCanvasResponse } from "@/lib/explorer/types";

const NODE_H = 40;
const H_GAP = 56;
const V_GAP = 14;
const SPINE_W = 94;
const FLOW_GROUP_GAP = 72; // vertical gap between separate flows

function nodeWidth(label: string): number {
  return Math.max(160, label.length * 7.4 + 56);
}

function getSubtreeHeight(node: FlowTreeNode, expanded: Set<string>): number {
  if (!expanded.has(node.id) || node.children.length === 0) {
    return NODE_H;
  }
  let total = 0;
  for (const child of node.children) {
    if (total > 0) total += V_GAP;
    total += getSubtreeHeight(child, expanded);
  }
  return Math.max(NODE_H, total);
}

function layoutSubtree(
  node: FlowTreeNode,
  x: number,
  y: number,
  expanded: Set<string>,
  parentId: string | null,
  out: LaidNode[],
  flowGroupLabel?: string
): number {
  const w = nodeWidth(node.label);
  const subtreeH = getSubtreeHeight(node, expanded);
  const nodeY = y + subtreeH / 2 - NODE_H / 2;

  out.push({
    ...node,
    x,
    y: nodeY,
    w,
    expanded: expanded.has(node.id),
    parentId,
    flowGroupLabel,
  });

  if (expanded.has(node.id) && node.children.length > 0) {
    let childY = y;
    for (const child of node.children) {
      layoutSubtree(child, x + w + H_GAP, childY, expanded, node.id, out);
      childY += getSubtreeHeight(child, expanded) + V_GAP;
    }
  }

  return subtreeH;
}

export function layoutNodes(
  tree: FlowTreeNode[],
  expanded: Set<string>,
  startY = 0,
  flowGroupLabel?: string
): { nodes: LaidNode[]; totalHeight: number } {
  const out: LaidNode[] = [];
  let y = startY;
  let isFirst = true;
  for (const root of tree) {
    const h = layoutSubtree(
      root,
      SPINE_W,
      y,
      expanded,
      null,
      out,
      isFirst ? flowGroupLabel : undefined
    );
    y += h + V_GAP;
    isFirst = false;
  }
  return { nodes: out, totalHeight: y - startY };
}

export function layoutFlowGroups(
  fileCanvas: FileCanvasResponse,
  expanded: Set<string>
): LaidNode[] {
  const all: LaidNode[] = [];
  let y = 0;
  for (const flow of fileCanvas.flows) {
    const { nodes, totalHeight } = layoutNodes(
      flow.tree,
      expanded,
      y,
      flow.label
    );
    all.push(...nodes);
    y += totalHeight + FLOW_GROUP_GAP;
  }
  return all;
}

export function useExploreDerived(
  fileCanvas: FileCanvasResponse | null,
  expanded: Set<string>
) {
  const laidNodes = useMemo(() => {
    if (!fileCanvas || fileCanvas.flows.length === 0) return [];
    return layoutFlowGroups(fileCanvas, expanded);
  }, [fileCanvas, expanded]);

  return { laidNodes };
}
