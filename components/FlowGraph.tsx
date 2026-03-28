"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AlertTriangle, ChevronRight } from "lucide-react";

// --- Node style config ---
const nodeStyles: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  PAGE: { bg: "#FD2E00", border: "#FD2E00", text: "#FFF6E9" },
  COMPONENT: { bg: "#CC2500", border: "#CC2500", text: "#FFF6E9" },
  FUNCTION: { bg: "#424242", border: "#FF9300", text: "#FFF6E9" },
  API: { bg: "#B36800", border: "#B36800", text: "#FFF6E9" },
  UTILITY: { bg: "#555555", border: "#555555", text: "#FFF0D5" },
  DRIFT: { bg: "#4a0d00", border: "#FD2E00", text: "#FD2E00" },
};

// --- Tree data structure ---
interface TreeNode {
  id: string;
  label: string;
  type: string;
  drift?: boolean;
  children?: TreeNode[];
}

const flowTrees: TreeNode[] = [
  {
    id: "page-home",
    label: "HomePage",
    type: "PAGE",
    children: [
      { id: "comp-navbar-1", label: "NavBar", type: "COMPONENT" },
    ],
  },
  {
    id: "page-dashboard",
    label: "DashboardPage",
    type: "PAGE",
    children: [
      { id: "comp-navbar-2", label: "NavBar", type: "COMPONENT" },
      {
        id: "comp-usertable",
        label: "UserTable",
        type: "COMPONENT",
        children: [
          {
            id: "fn-fetchuser",
            label: "fetchUserData",
            type: "FUNCTION",
            children: [
              {
                id: "api-users",
                label: "/api/users",
                type: "API",
                children: [
                  { id: "util-supabase-1", label: "supabaseClient", type: "UTILITY" },
                ],
              },
              { id: "util-logger", label: "logger", type: "UTILITY" },
            ],
          },
        ],
      },
      { id: "comp-chart", label: "RevenueChart", type: "COMPONENT" },
    ],
  },
  {
    id: "page-settings",
    label: "SettingsPage",
    type: "PAGE",
    children: [
      {
        id: "comp-authform",
        label: "AuthForm",
        type: "COMPONENT",
        children: [
          {
            id: "fn-auth",
            label: "authenticateUser",
            type: "FUNCTION",
            children: [
              {
                id: "api-auth",
                label: "/api/auth",
                type: "API",
                children: [
                  { id: "util-supabase-2", label: "supabaseClient", type: "UTILITY" },
                ],
              },
            ],
          },
          { id: "fn-validate", label: "validateInput", type: "FUNCTION" },
        ],
      },
    ],
  },
  {
    id: "fn-payment",
    label: "handlePayment",
    type: "DRIFT",
    drift: true,
    children: [
      { id: "api-payments", label: "/api/payments", type: "API" },
      { id: "fn-format", label: "formatLegacyDate", type: "DRIFT", drift: true },
    ],
  },
];

// --- Helpers to collect descendant IDs ---
function getAllDescendantIds(trees: TreeNode[], id: string): string[] {
  for (const tree of trees) {
    if (tree.id === id) {
      const ids: string[] = [];
      const collect = (n: TreeNode) => {
        if (n.children) for (const c of n.children) { ids.push(c.id); collect(c); }
      };
      collect(tree);
      return ids;
    }
    if (tree.children) {
      const found = getAllDescendantIds(tree.children, id);
      if (found.length) return found;
    }
  }
  return [];
}

// --- Custom node component ---
function ComprendoNode({ data, selected }: NodeProps) {
  const nodeData = data as {
    label: string;
    type: string;
    drift?: boolean;
    expandable?: boolean;
    expanded?: boolean;
  };
  const style = nodeStyles[nodeData.type] || nodeStyles.UTILITY;
  const isDrift = nodeData.type === "DRIFT";
  const isFunction = nodeData.type === "FUNCTION";

  return (
    <div
      className={`relative ${isDrift ? "drift-pulse" : ""}`}
      style={{
        background: style.bg,
        border: `2px solid ${style.border}`,
        borderRadius: isFunction ? "9999px" : "12px",
        padding: isFunction ? "8px 20px" : "10px 18px",
        color: style.text,
        fontSize: "13px",
        fontWeight: 600,
        fontFamily: "var(--font-geist-sans), Inter, sans-serif",
        minWidth: "120px",
        textAlign: "center",
        boxShadow: selected
          ? `0 0 0 2px ${style.border}, 0 4px 24px ${style.border}40`
          : `0 2px 8px rgba(0,0,0,0.3)`,
        transition: "box-shadow 0.2s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        cursor: nodeData.expandable ? "pointer" : "default",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: style.border, border: "none", width: 6, height: 6 }}
      />
      {isDrift && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
      <span>{nodeData.label}</span>
      {nodeData.expandable && (
        <ChevronRight
          className="h-3.5 w-3.5 shrink-0 transition-transform"
          style={{
            transform: nodeData.expanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        />
      )}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: style.border, border: "none", width: 6, height: 6 }}
      />
    </div>
  );
}

const nodeTypes = { comprendo: ComprendoNode };

// --- Legend ---
function Legend() {
  const items = [
    { label: "Page", color: "#FD2E00" },
    { label: "Component", color: "#CC2500" },
    { label: "Function", color: "#FF9300", outline: true },
    { label: "API", color: "#B36800" },
    { label: "Utility", color: "#555555" },
    { label: "Drift ⚠", color: "#FD2E00", outline: true },
  ];

  const edgeItems = [
    { label: "Calls", color: "#FF9300", dashed: false },
    { label: "Imports", color: "#FFF0D5", dashed: true },
    { label: "Data Flow", color: "#FFF0D5", dashed: false },
  ];

  return (
    <div className="absolute right-4 top-4 z-10 rounded-xl border border-comprendo-border bg-comprendo-bg/90 p-4 backdrop-blur-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-comprendo-faint">
        Nodes
      </p>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-sm"
              style={{
                background: item.outline ? "transparent" : item.color,
                border: item.outline ? `2px solid ${item.color}` : "none",
              }}
            />
            <span className="text-xs text-comprendo-muted">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="my-2 h-px bg-comprendo-border" />
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-comprendo-faint">
        Edges
      </p>
      <div className="flex flex-col gap-1.5">
        {edgeItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="flex h-3 w-5 items-center">
              <div
                className="h-0.5 w-full"
                style={{
                  background: item.color,
                  ...(item.dashed
                    ? {
                        backgroundImage: `repeating-linear-gradient(90deg, ${item.color} 0px, ${item.color} 4px, transparent 4px, transparent 8px)`,
                        background: "transparent",
                        borderTop: `2px dashed ${item.color}`,
                      }
                    : {}),
                }}
              />
            </div>
            <span className="text-xs text-comprendo-muted">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Layout algorithm ---
const H_GAP = 250;
const V_GAP = 70;
const ROOT_GAP = 20;

function getEdgeStyle(parentType: string, childType: string): Partial<Edge> {
  if (parentType === "PAGE" && childType === "COMPONENT") {
    return { style: { stroke: "#FFF0D5", strokeDasharray: "5,5" }, animated: false };
  }
  if (
    (parentType === "COMPONENT" || parentType === "FUNCTION") &&
    childType === "FUNCTION"
  ) {
    return { style: { stroke: "#FF9300" }, animated: true };
  }
  if (
    (parentType === "FUNCTION" || parentType === "DRIFT") &&
    childType === "API"
  ) {
    return { style: { stroke: "#FFF0D5" }, animated: true };
  }
  if (parentType === "DRIFT" || childType === "DRIFT") {
    return { style: { stroke: "#FD2E00", strokeDasharray: "5,5" } };
  }
  if (childType === "UTILITY") {
    return { style: { stroke: "#FFF0D5", strokeDasharray: "5,5" } };
  }
  return { style: { stroke: "#FF9300" } };
}

function getSubtreeHeight(node: TreeNode, expanded: Set<string>): number {
  if (!expanded.has(node.id) || !node.children?.length) return V_GAP;
  let total = 0;
  for (const child of node.children) {
    total += getSubtreeHeight(child, expanded);
  }
  return Math.max(V_GAP, total);
}

function computeLayout(
  trees: TreeNode[],
  expanded: Set<string>
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let currentY = 0;

  function layoutNode(node: TreeNode, x: number, y: number) {
    const isExp = expanded.has(node.id);
    const hasChildren = !!node.children?.length;
    const subtreeH = getSubtreeHeight(node, expanded);
    const nodeY = y + subtreeH / 2 - V_GAP / 2;

    nodes.push({
      id: node.id,
      type: "comprendo",
      position: { x, y: nodeY },
      data: {
        label: node.label,
        type: node.type,
        drift: node.drift,
        expandable: hasChildren,
        expanded: isExp,
      },
    });

    if (isExp && hasChildren) {
      let childY = y;
      for (const child of node.children!) {
        const edgeStyle = getEdgeStyle(node.type, child.type);
        edges.push({
          id: `e-${node.id}-${child.id}`,
          source: node.id,
          target: child.id,
          type: "smoothstep",
          ...edgeStyle,
        });
        layoutNode(child, x + H_GAP, childY);
        childY += getSubtreeHeight(child, expanded);
      }
    }
  }

  for (const tree of trees) {
    layoutNode(tree, 0, currentY);
    currentY += getSubtreeHeight(tree, expanded) + ROOT_GAP;
  }

  return { nodes, edges };
}

// --- Main component ---
interface FlowGraphProps {
  onNodeSelect?: (nodeId: string | null) => void;
}

export function FlowGraph({ onNodeSelect }: FlowGraphProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const toggleExpand = useCallback((nodeId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
        for (const desc of getAllDescendantIds(flowTrees, nodeId)) {
          next.delete(desc);
        }
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const { nodes, edges } = useMemo(
    () => computeLayout(flowTrees, expanded),
    [expanded]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const data = node.data as { expandable?: boolean };
      if (data.expandable) {
        toggleExpand(node.id);
      }
      setSelectedNode((prev) => (prev === node.id ? null : node.id));
      onNodeSelect?.(node.id);
    },
    [onNodeSelect, toggleExpand]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  // Highlight / dim based on selection
  const connectedNodeIds = selectedNode
    ? new Set(
        edges
          .filter((e) => e.source === selectedNode || e.target === selectedNode)
          .flatMap((e) => [e.source, e.target])
      )
    : null;

  const styledNodes = nodes.map((node) => {
    if (!connectedNodeIds || connectedNodeIds.has(node.id) || node.id === selectedNode) {
      return { ...node, style: { ...node.style, opacity: 1 } };
    }
    return { ...node, style: { ...node.style, opacity: 0.3 } };
  });

  const styledEdges = edges.map((edge) => {
    if (!connectedNodeIds) {
      return { ...edge, style: { ...edge.style, opacity: 1 } };
    }
    if (edge.source === selectedNode || edge.target === selectedNode) {
      return { ...edge, style: { ...edge.style, opacity: 1 } };
    }
    return { ...edge, style: { ...edge.style, opacity: 0.15 } };
  });

  return (
    <div className="relative h-full w-full">
      <Legend />
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#555555"
        />
        <Controls position="bottom-left" />
        <MiniMap
          nodeColor={(node) => {
            const type = (node.data as { type?: string })?.type || "UTILITY";
            return nodeStyles[type]?.bg || "#555555";
          }}
          maskColor="rgba(55, 55, 55, 0.8)"
          position="bottom-right"
        />
      </ReactFlow>
    </div>
  );
}
