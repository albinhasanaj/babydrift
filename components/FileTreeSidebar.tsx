"use client";

import { useState } from "react";
import type { FileTreeNode } from "@/lib/explorer/types";
import { ChevronRight, Folder, FolderOpen, FileCode, Zap } from "lucide-react";

interface FileTreeSidebarProps {
  tree: FileTreeNode | null;
  selectedFile: string | null;
  onSelectFile: (filePath: string, flowIds: string[]) => void;
}

interface FileNodeProps {
  node: FileTreeNode;
  depth: number;
  selectedFile: string | null;
  onSelectFile: (filePath: string, flowIds: string[]) => void;
}

function FileNodeRow({ node, depth, selectedFile, onSelectFile }: FileNodeProps) {
  const [open, setOpen] = useState(depth === 0);

  const indent = depth * 12;
  const hasFlows = node.flowIds.length > 0;
  const isSelected = selectedFile === node.path;

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs text-comprendo-muted hover:bg-comprendo-elevated hover:text-comprendo-text transition-colors"
          style={{ paddingLeft: `${indent + 8}px` }}
        >
          <ChevronRight
            className="h-3 w-3 shrink-0 text-comprendo-faint transition-transform"
            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
          />
          {open ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-comprendo-warm" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-comprendo-warm" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {open && (
          <div>
            {node.children.map((child) => (
              <FileNodeRow
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => hasFlows && onSelectFile(node.path, node.flowIds)}
      className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs transition-colors ${
        isSelected
          ? "bg-comprendo-elevated text-comprendo-accent"
          : hasFlows
          ? "text-comprendo-muted hover:bg-comprendo-elevated hover:text-comprendo-text cursor-pointer"
          : "text-comprendo-faint cursor-default"
      }`}
      style={{ paddingLeft: `${indent + 8}px` }}
    >
      <FileCode className="h-3.5 w-3.5 shrink-0 text-comprendo-faint" />
      <span className="flex-1 truncate">{node.name}</span>
      {hasFlows && (
        <span className="flex items-center gap-0.5 shrink-0 text-[10px] text-comprendo-accent tabular-nums">
          <Zap className="h-2.5 w-2.5" />
          {node.flowIds.length}
        </span>
      )}
    </button>
  );
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
        {tree ? (
          tree.children.length > 0 ? (
            tree.children.map((child) => (
              <FileNodeRow
                key={child.path}
                node={child}
                depth={0}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
              />
            ))
          ) : (
            <p className="px-5 py-8 text-center text-xs text-comprendo-faint">
              No files found. Run a scan first.
            </p>
          )
        ) : (
          <p className="px-5 py-8 text-center text-xs text-comprendo-faint">
            Loading file tree...
          </p>
        )}
      </div>
    </aside>
  );
}
