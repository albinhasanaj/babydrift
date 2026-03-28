"use client";

import type { FileTreeNode } from "@/lib/explorer/types";
import { FileCode, Zap } from "lucide-react";

interface FileTreeSidebarProps {
  tree: FileTreeNode | null;
  selectedFile: string | null;
  onSelectFile: (filePath: string, flowIds: string[]) => void;
}

function flattenEntryFiles(node: FileTreeNode, out: FileTreeNode[] = []): FileTreeNode[] {
  if (!node.isDir && node.flowIds.length > 0) {
    out.push(node);
  }
  for (const child of node.children) {
    flattenEntryFiles(child, out);
  }
  return out;
}

export function FileTreeSidebar({
  tree,
  selectedFile,
  onSelectFile,
}: FileTreeSidebarProps) {
  return (
    <aside className="flex w-[280px] shrink-0 flex-col overflow-hidden border-r border-comprendo-border bg-comprendo-surface">
      <div className="flex items-center justify-between border-b border-comprendo-border px-5 py-4">
        <h2 className="text-sm font-semibold text-comprendo-text">Files</h2>
        {selectedFile && (
          <span className="max-w-[140px] truncate text-right text-[10px] text-comprendo-faint">
            {selectedFile.split("/").pop()}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {tree ? (() => {
          const entries = flattenEntryFiles(tree);
          return entries.length > 0 ? (
            entries.map((node) => (
              <button
                key={node.path}
                onClick={() => onSelectFile(node.path, node.flowIds)}
                className={`flex w-full items-center gap-1.5 rounded px-3 py-1.5 text-left text-xs transition-colors ${
                  selectedFile === node.path
                    ? "bg-comprendo-elevated text-comprendo-accent"
                    : "text-comprendo-muted hover:bg-comprendo-elevated hover:text-comprendo-text"
                }`}
              >
                <FileCode className="h-3.5 w-3.5 shrink-0 text-comprendo-faint" />
                <span className="flex-1 truncate">{node.name}</span>
                <span className="flex items-center gap-0.5 shrink-0 text-[10px] text-comprendo-accent tabular-nums">
                  <Zap className="h-2.5 w-2.5" />
                  {node.flowIds.length}
                </span>
              </button>
            ))
          ) : (
            <p className="px-5 py-8 text-center text-xs text-comprendo-faint">
              No entry points found.
            </p>
          );
        })() : (
          <p className="px-5 py-8 text-center text-xs text-comprendo-faint">
            Loading...
          </p>
        )}
      </div>
    </aside>
  );
}
