"use client";

import type { LaidNode } from "@/lib/explorer/types";
import { CanvasNode } from "./CanvasNode";
import { CanvasEdges } from "./CanvasEdges";
import { useCanvasPanZoom } from "@/hooks/useCanvasPanZoom";

const NODE_H = 40;

interface FlowCanvasProps {
  nodes: LaidNode[];
  selectedNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  pulseNodeIds?: Set<string>;
  showOnboardingTooltip?: boolean;
}

export function FlowCanvas({
  nodes,
  selectedNodeId,
  onNodeClick,
  pulseNodeIds,
  showOnboardingTooltip,
}: FlowCanvasProps) {
  const { containerRef, transformRef, handlers } = useCanvasPanZoom();

  // Find the first pulsing node for tooltip placement
  const firstPulseNode =
    showOnboardingTooltip && pulseNodeIds
      ? nodes.find((n) => pulseNodeIds.has(n.id))
      : null;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ cursor: "grab", background: "#242424" }}
      onMouseDown={handlers.onMouseDown}
      onMouseMove={handlers.onMouseMove}
      onMouseUp={handlers.onMouseUp}
      onMouseLeave={handlers.onMouseUp}
    >
      <div ref={transformRef} style={{ transformOrigin: "0 0" }}>
        <CanvasEdges nodes={nodes} />
        {nodes.map((node) => (
          <CanvasNode
            key={node.layoutId}
            node={node}
            selected={node.id === selectedNodeId}
            onClick={() => onNodeClick(node.id)}
          />
        ))}

        {/* Onboarding pulse rings */}
        {pulseNodeIds &&
          pulseNodeIds.size > 0 &&
          nodes
            .filter((n) => pulseNodeIds.has(n.id))
            .map((node) => (
              <div
                key={`pulse-${node.layoutId}`}
                style={{
                  position: "absolute",
                  left: node.x - 6,
                  top: node.y - 6,
                  width: node.w + 12,
                  height: NODE_H + 12,
                  borderRadius: node.nodeType === "function" ? 9999 : 16,
                  border: "2px solid #f97316",
                  animation: "onboarding-pulse 2s ease-in-out infinite",
                  pointerEvents: "none",
                  zIndex: 10,
                }}
              />
            ))}

        {/* Onboarding tooltip */}
        {firstPulseNode && (
          <div
            style={{
              position: "absolute",
              left: firstPulseNode.x,
              top: firstPulseNode.y - 44,
              background: "#1a1008",
              border: "1px solid #f97316",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 500,
              color: "#faf5f0",
              whiteSpace: "nowrap",
              zIndex: 20,
              pointerEvents: "none",
            }}
          >
            Click any block to understand what it does →
          </div>
        )}
      </div>

      <style>{`
        @keyframes onboarding-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(249,115,22,0.4); }
          50% { opacity: 0.7; box-shadow: 0 0 0 8px rgba(249,115,22,0); }
        }
      `}</style>
    </div>
  );
}
