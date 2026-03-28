"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AlertTriangle } from "lucide-react";

// --- Node style config ---
const nodeStyles: Record<
  string,
  { bg: string; border: string; text: string; borderStyle?: string }
> = {
  PAGE: {
    bg: "#e8420a",
    border: "#e8420a",
    text: "#ffffff",
  },
  COMPONENT: {
    bg: "#c2410c",
    border: "#c2410c",
    text: "#ffffff",
  },
  FUNCTION: {
    bg: "#1a1008",
    border: "#f97316",
    text: "#ffffff",
  },
  API: {
    bg: "#92400e",
    border: "#92400e",
    text: "#ffffff",
  },
  UTILITY: {
    bg: "#3d2010",
    border: "#3d2010",
    text: "#a87860",
  },
  DRIFT: {
    bg: "#450a0a",
    border: "#ef4444",
    text: "#ef4444",
  },
};

// --- Custom node component ---
function ComprendoNode({ data, selected }: NodeProps) {
  const nodeData = data as { label: string; type: string; drift?: boolean };
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
        minWidth: "100px",
        textAlign: "center",
        boxShadow: selected
          ? `0 0 0 2px ${style.border}, 0 4px 24px ${style.border}40`
          : `0 2px 8px rgba(0,0,0,0.3)`,
        transition: "box-shadow 0.2s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: style.border, border: "none", width: 6, height: 6 }}
      />
      {isDrift && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
      <span>{nodeData.label}</span>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: style.border, border: "none", width: 6, height: 6 }}
      />
    </div>
  );
}

const nodeTypes = {
  comprendo: ComprendoNode,
};

// --- Legend ---
function Legend() {
  const items = [
    { label: "Page", color: "#e8420a" },
    { label: "Component", color: "#c2410c" },
    { label: "Function", color: "#f97316", outline: true },
    { label: "API", color: "#92400e" },
    { label: "Utility", color: "#3d2010" },
    { label: "Drift ⚠", color: "#ef4444", outline: true },
  ];

  const edgeItems = [
    { label: "Calls", color: "#f97316", dashed: false },
    { label: "Imports", color: "#a87860", dashed: true },
    { label: "Data Flow", color: "#fbbf24", dashed: false },
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

// --- Mock data ---
const initialNodes: Node[] = [
  // Pages
  {
    id: "page-home",
    type: "comprendo",
    position: { x: 100, y: 50 },
    data: { label: "HomePage", type: "PAGE" },
  },
  {
    id: "page-dashboard",
    type: "comprendo",
    position: { x: 400, y: 50 },
    data: { label: "DashboardPage", type: "PAGE" },
  },
  {
    id: "page-settings",
    type: "comprendo",
    position: { x: 700, y: 50 },
    data: { label: "SettingsPage", type: "PAGE" },
  },

  // Components
  {
    id: "comp-navbar",
    type: "comprendo",
    position: { x: 100, y: 200 },
    data: { label: "NavBar", type: "COMPONENT" },
  },
  {
    id: "comp-authform",
    type: "comprendo",
    position: { x: 400, y: 200 },
    data: { label: "AuthForm", type: "COMPONENT" },
  },
  {
    id: "comp-usertable",
    type: "comprendo",
    position: { x: 700, y: 200 },
    data: { label: "UserTable", type: "COMPONENT" },
  },
  {
    id: "comp-chart",
    type: "comprendo",
    position: { x: 550, y: 350 },
    data: { label: "RevenueChart", type: "COMPONENT" },
  },

  // Functions
  {
    id: "fn-fetchuser",
    type: "comprendo",
    position: { x: 250, y: 380 },
    data: { label: "fetchUserData", type: "FUNCTION" },
  },
  {
    id: "fn-auth",
    type: "comprendo",
    position: { x: 400, y: 500 },
    data: { label: "authenticateUser", type: "FUNCTION" },
  },
  {
    id: "fn-payment",
    type: "comprendo",
    position: { x: 700, y: 380 },
    data: { label: "handlePayment", type: "DRIFT", drift: true },
  },
  {
    id: "fn-format",
    type: "comprendo",
    position: { x: 850, y: 500 },
    data: { label: "formatLegacyDate", type: "DRIFT", drift: true },
  },
  {
    id: "fn-validate",
    type: "comprendo",
    position: { x: 100, y: 500 },
    data: { label: "validateInput", type: "FUNCTION" },
  },

  // APIs
  {
    id: "api-users",
    type: "comprendo",
    position: { x: 250, y: 620 },
    data: { label: "/api/users", type: "API" },
  },
  {
    id: "api-auth",
    type: "comprendo",
    position: { x: 500, y: 620 },
    data: { label: "/api/auth", type: "API" },
  },
  {
    id: "api-payments",
    type: "comprendo",
    position: { x: 750, y: 620 },
    data: { label: "/api/payments", type: "API" },
  },

  // Utils
  {
    id: "util-logger",
    type: "comprendo",
    position: { x: 100, y: 750 },
    data: { label: "logger", type: "UTILITY" },
  },
  {
    id: "util-supabase",
    type: "comprendo",
    position: { x: 400, y: 750 },
    data: { label: "supabaseClient", type: "UTILITY" },
  },
];

const initialEdges: Edge[] = [
  // Pages import components (dashed warm muted)
  {
    id: "e1",
    source: "page-home",
    target: "comp-navbar",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#a87860", strokeDasharray: "5,5" },
  },
  {
    id: "e2",
    source: "page-dashboard",
    target: "comp-navbar",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#a87860", strokeDasharray: "5,5" },
  },
  {
    id: "e3",
    source: "page-dashboard",
    target: "comp-chart",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#a87860", strokeDasharray: "5,5" },
  },
  {
    id: "e4",
    source: "page-dashboard",
    target: "comp-usertable",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#a87860", strokeDasharray: "5,5" },
  },
  {
    id: "e5",
    source: "page-settings",
    target: "comp-authform",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#a87860", strokeDasharray: "5,5" },
  },

  // Components call functions (orange animated)
  {
    id: "e6",
    source: "comp-usertable",
    target: "fn-fetchuser",
    animated: true,
    style: { stroke: "#f97316" },
  },
  {
    id: "e7",
    source: "comp-authform",
    target: "fn-auth",
    animated: true,
    style: { stroke: "#f97316" },
  },
  {
    id: "e8",
    source: "comp-chart",
    target: "fn-fetchuser",
    animated: true,
    style: { stroke: "#f97316" },
  },
  {
    id: "e9",
    source: "fn-validate",
    target: "fn-auth",
    animated: true,
    style: { stroke: "#f97316" },
  },

  // Functions call APIs (golden data flow)
  {
    id: "e10",
    source: "fn-fetchuser",
    target: "api-users",
    animated: true,
    style: { stroke: "#fbbf24" },
  },
  {
    id: "e11",
    source: "fn-auth",
    target: "api-auth",
    animated: true,
    style: { stroke: "#fbbf24" },
  },
  {
    id: "e12",
    source: "fn-payment",
    target: "api-payments",
    animated: true,
    style: { stroke: "#fbbf24" },
  },

  // Utils connections (dashed)
  {
    id: "e13",
    source: "api-users",
    target: "util-supabase",
    type: "smoothstep",
    style: { stroke: "#a87860", strokeDasharray: "5,5" },
  },
  {
    id: "e14",
    source: "api-auth",
    target: "util-supabase",
    type: "smoothstep",
    style: { stroke: "#a87860", strokeDasharray: "5,5" },
  },
  {
    id: "e15",
    source: "fn-fetchuser",
    target: "util-logger",
    type: "smoothstep",
    style: { stroke: "#a87860", strokeDasharray: "5,5" },
  },

  // Drift nodes - red dashed
  {
    id: "e16",
    source: "fn-payment",
    target: "fn-format",
    style: { stroke: "#ef4444", strokeDasharray: "5,5" },
  },
];

interface FlowGraphProps {
  onNodeSelect?: (nodeId: string | null) => void;
}

export function FlowGraph({ onNodeSelect }: FlowGraphProps) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode((prev) => (prev === node.id ? null : node.id));
      onNodeSelect?.(node.id);
    },
    [onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  // Compute styles for highlight/dim
  const connectedNodeIds = selectedNode
    ? new Set(
        edges
          .filter(
            (e) => e.source === selectedNode || e.target === selectedNode
          )
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
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#3d2010"
        />
        <Controls position="bottom-left" />
        <MiniMap
          nodeColor={(node) => {
            const type = (node.data as { type?: string })?.type || "UTILITY";
            return nodeStyles[type]?.bg || "#3d2010";
          }}
          maskColor="rgba(15, 10, 8, 0.8)"
          position="bottom-right"
        />
      </ReactFlow>
    </div>
  );
}
