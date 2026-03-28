"use client";

import { useState } from "react";
import type { FileTreeNode } from "@/lib/explorer/types";
import {
  ChevronRight,
  FileCode,
  Zap,
  BookOpen,
  LayoutTemplate,
  Globe,
  Component,
  Layers,
  Wrench,
  Settings2,
  Tag,
  Paintbrush,
  Package,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface FileTreeSidebarProps {
  tree: FileTreeNode | null;
  selectedFile: string | null;
  onSelectFile: (filePath: string, flowIds: string[]) => void;
}

function flattenEntryFiles(node: FileTreeNode, out: FileTreeNode[] = []): FileTreeNode[] {
  if (!node.isDir && node.flowIds.length > 0) out.push(node);
  for (const child of node.children) flattenEntryFiles(child, out);
  return out;
}

interface FileCategory {
  key: string;
  label: string;
  Icon: LucideIcon;
  match: (path: string, name: string) => boolean;
}

const FILE_CATEGORIES: FileCategory[] = [
  {
    key: "pages",
    label: "Pages",
    Icon: BookOpen,
    match: (_p, n) =>
      n === "page.tsx" || n === "page.ts" || n === "page.jsx" || n === "page.js",
  },
  {
    key: "layouts",
    label: "Layouts",
    Icon: LayoutTemplate,
    match: (_p, n) =>
      n === "layout.tsx" || n === "layout.ts" || n === "layout.jsx",
  },
  {
    key: "routes",
    label: "API Routes",
    Icon: Globe,
    match: (p, n) =>
      n === "route.ts" || n === "route.tsx" || p.includes("/api/") || p.includes("\\api\\"),
  },
  {
    key: "components",
    label: "Components",
    Icon: Component,
    match: (p, n) => {
      const segs = p.replace(/\\/g, "/").split("/");
      const inDir = segs.some((s) =>
        ["components", "ui", "widgets", "shared", "common", "views", "screens"].includes(s),
      );
      return inDir || /^[A-Z][a-zA-Z0-9]*\.(tsx|jsx)$/.test(n);
    },
  },
  {
    key: "hooks",
    label: "Hooks",
    Icon: Layers,
    match: (p, n) =>
      n.startsWith("use") || p.replace(/\\/g, "/").split("/").includes("hooks"),
  },
  {
    key: "lib",
    label: "Lib / Utils",
    Icon: Wrench,
    match: (p) =>
      p.replace(/\\/g, "/").split("/").some((s) =>
        ["lib", "utils", "helpers", "services", "server"].includes(s),
      ),
  },
  {
    key: "constants",
    label: "Constants / Config",
    Icon: Settings2,
    match: (p, n) => {
      const segs = p.replace(/\\/g, "/").split("/");
      return (
        segs.some((s) =>
          ["constants", "config", "configs", "settings", "env"].includes(s),
        ) || /^(constants?|config|settings?|env)\.(ts|js|tsx)$/.test(n)
      );
    },
  },
  {
    key: "types",
    label: "Types",
    Icon: Tag,
    match: (_p, n) =>
      n === "types.ts" ||
      n === "types.tsx" ||
      n.endsWith(".types.ts") ||
      n.endsWith(".d.ts"),
  },
  {
    key: "styles",
    label: "Styles",
    Icon: Paintbrush,
    match: (_p, n) =>
      n.endsWith(".css") || n.endsWith(".scss") || n.endsWith(".sass"),
  },
];

function categorize(file: FileTreeNode): string {
  const path = file.path.replace(/\\/g, "/");
  const name = file.name;
  for (const cat of FILE_CATEGORIES) {
    if (cat.match(path, name)) return cat.key;
  }
  return "other";
}

function groupByCategory(files: FileTreeNode[]): { cat: FileCategory; files: FileTreeNode[] }[] {
  const map = new Map<string, FileTreeNode[]>();
  map.set("other", []);
  for (const cat of FILE_CATEGORIES) map.set(cat.key, []);
  for (const file of files) map.get(categorize(file))!.push(file);

  const result: { cat: FileCategory; files: FileTreeNode[] }[] = [];
  for (const cat of FILE_CATEGORIES) {
    const items = map.get(cat.key)!;
    if (items.length > 0) result.push({ cat, files: items });
  }
  const other = map.get("other")!;
  if (other.length > 0) {
    result.push({
      cat: { key: "other", label: "Other", Icon: Package, match: () => true },
      files: other,
    });
  }
  return result;
}

function CategoryGroup({
  cat,
  files,
  selectedFile,
  onSelectFile,
}: {
  cat: FileCategory;
  files: FileTreeNode[];
  selectedFile: string | null;
  onSelectFile: (filePath: string, flowIds: string[]) => void;
}) {
  const [open, setOpen] = useState(true);
  const { Icon } = cat;

  return (
    <div className="mb-0.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-comprendo-elevated"
      >
        <Icon className="h-4 w-4 shrink-0 text-comprendo-faint transition-colors group-hover:text-comprendo-muted" />
        <span className="flex-1 text-sm font-medium text-comprendo-muted transition-colors group-hover:text-comprendo-text">
          {cat.label}
        </span>
        <span className="mr-1 shrink-0 text-[10px] tabular-nums text-comprendo-faint">
          {files.length}
        </span>
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 text-comprendo-faint transition-transform duration-150 ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>

      {open && (
        <div className="mb-1 mt-0.5 flex flex-col gap-0.5 pl-4">
          {files.map((node) => (
            <button
              key={node.path}
              onClick={() => onSelectFile(node.path, node.flowIds)}
              title={node.path}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs transition-colors ${
                selectedFile === node.path
                  ? "bg-comprendo-accent/15 text-comprendo-accent"
                  : "text-comprendo-muted hover:bg-comprendo-elevated hover:text-comprendo-text"
              }`}
            >
              <FileCode
                className={`h-3.5 w-3.5 shrink-0 ${
                  selectedFile === node.path ? "text-comprendo-accent" : "text-comprendo-faint"
                }`}
              />
              <span className="flex-1 truncate">{node.name}</span>
              <span className="flex shrink-0 items-center gap-0.5 text-[10px] tabular-nums text-comprendo-accent">
                <Zap className="h-2.5 w-2.5" />
                {node.flowIds.length}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
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

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {tree ? (
          (() => {
            const entries = flattenEntryFiles(tree);
            if (entries.length === 0) {
              return (
                <p className="px-5 py-8 text-center text-xs text-comprendo-faint">
                  No entry points found.
                </p>
              );
            }
            return groupByCategory(entries).map(({ cat, files }) => (
              <CategoryGroup
                key={cat.key}
                cat={cat}
                files={files}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
              />
            ));
          })()
        ) : (
          <p className="px-5 py-8 text-center text-xs text-comprendo-faint">
            Loading...
          </p>
        )}
      </div>
    </aside>
  );
}
