"use client";

import type { LaidNode } from "@/lib/explorer/types";

interface DetailPanelProps {
  node: LaidNode | null;
  onClose: () => void;
}

export function DetailPanel({ node, onClose }: DetailPanelProps) {
  if (!node) return null;

  return (
    <div className="absolute bottom-4 right-4 z-20 w-[380px] rounded-xl border border-comprendo-border bg-comprendo-surface/95 p-5 shadow-2xl backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-comprendo-text">
          {node.label}
        </h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-comprendo-faint hover:bg-comprendo-elevated hover:text-comprendo-text"
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path
              d="M3 3L11 11M11 3L3 11"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded bg-comprendo-elevated px-2 py-0.5 text-[11px] font-medium text-comprendo-accent">
          {node.nodeType}
        </span>
        {node.branchKind && (
          <span className="rounded bg-comprendo-elevated px-2 py-0.5 text-[11px] font-medium text-comprendo-warm">
            {node.branchKind}
          </span>
        )}
        {node.branchArm && (
          <span className="rounded bg-comprendo-elevated px-2 py-0.5 text-[11px] font-medium text-comprendo-muted">
            {node.branchArm}
          </span>
        )}
      </div>

      {node.filePath && (
        <p className="mb-2 text-xs text-comprendo-faint">
          {node.filePath}
          {node.startLine > 0 && `:${node.startLine}`}
          {node.endLine > 0 && node.endLine !== node.startLine && `-${node.endLine}`}
        </p>
      )}

      {node.pureCode && (
        <pre className="max-h-[200px] overflow-auto rounded-lg bg-comprendo-bg p-3 text-[11px] leading-relaxed text-comprendo-muted">
          <code>{node.pureCode}</code>
        </pre>
      )}

      <div className="mt-3 flex gap-4 text-[11px] text-comprendo-faint">
        <span>depth: {node.treeDepth}</span>
        <span>children: {node.children.length}</span>
        {node.edgeConfidence != null && (
          <span>confidence: {Math.round(node.edgeConfidence * 100)}%</span>
        )}
      </div>
    </div>
  );
}
