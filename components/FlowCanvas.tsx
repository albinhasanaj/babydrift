"use client";

import type { LaidNode } from "@/lib/explorer/types";
import { CanvasNode } from "./CanvasNode";
import { CanvasEdges } from "./CanvasEdges";
import { useCanvasPanZoom } from "@/hooks/useCanvasPanZoom";

interface FlowCanvasProps {
  nodes: LaidNode[];
  selectedNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
}

export function FlowCanvas({ nodes, selectedNodeId, onNodeClick }: FlowCanvasProps) {
  const { containerRef, transformRef, handlers } = useCanvasPanZoom();

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
      </div>
    </div>
  );
}
