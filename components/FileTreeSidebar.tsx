"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { FileTreeNode, RepoRecord } from "@/lib/explorer/types";
import {
  ChevronRight,
  ChevronDown,
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
  PanelLeftClose,
  PanelLeftOpen,
  GitBranch,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface FileTreeSidebarProps {
  tree: FileTreeNode | null;
  selectedFile: string | null;
  selectedCategory: string | null;
  repos: (RepoRecord & { latestTraceId: string | null })[];
  fullName: string;
  onSelectFile: (filePath: string, flowIds: string[]) => void;
  onSelectCategory: (categoryKey: string, filePaths: string[]) => void;
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
  open,
  selectedFile,
  selectedCategory,
  onSelectFile,
  onSelectCategory,
  onToggleOpen,
}: {
  cat: FileCategory;
  files: FileTreeNode[];
  open: boolean;
  selectedFile: string | null;
  selectedCategory: string | null;
  onSelectFile: (filePath: string, flowIds: string[]) => void;
  onSelectCategory: (categoryKey: string, filePaths: string[]) => void;
  onToggleOpen: (categoryKey: string) => void;
}) {
  const { Icon } = cat;
  const isCategoryActive = selectedCategory === cat.key;

  return (
    <div className="mb-0.5">
      <div
        className={`group flex w-full items-center rounded-md transition-colors ${
          isCategoryActive
            ? "bg-comprendo-primary text-white"
            : "hover:bg-comprendo-elevated"
        }`}
      >
        {/* Icon + label — selects category overview and opens it */}
        <button
          onClick={() => {
            onSelectCategory(cat.key, files.map((f) => f.path));
            onToggleOpen(cat.key);
          }}
          className="flex flex-1 items-center gap-2.5 px-3 py-2 text-left"
        >
          <Icon
            className={`h-4 w-4 shrink-0 transition-colors ${
              isCategoryActive
                ? "text-white"
                : "text-comprendo-faint group-hover:text-comprendo-muted"
            }`}
          />
          <span
            className={`flex-1 text-sm font-medium transition-colors ${
              isCategoryActive
                ? "text-white"
                : "text-comprendo-muted group-hover:text-comprendo-text"
            }`}
          >
            {cat.label}
          </span>
          <span
            className={`mr-1 shrink-0 text-[10px] tabular-nums ${
              isCategoryActive ? "text-white/70" : "text-comprendo-faint"
            }`}
          >
            {files.length}
          </span>
        </button>
        {/* Chevron — only toggles collapse */}
        <button
          onClick={() => onToggleOpen(cat.key)}
          className="flex h-full items-center px-2 py-2"
        >
          <ChevronRight
            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${
              isCategoryActive ? "text-white/70" : "text-comprendo-faint"
            } ${open ? "rotate-90" : ""}`}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="items"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="mb-1 mt-0.5 flex flex-col gap-0.5 pl-4">
              {files.map((node) => (
                <button
                  key={node.path}
                  onClick={() => { onSelectFile(node.path, node.flowIds); }}
                  title={node.path}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs transition-colors ${
                    selectedFile === node.path
                      ? "bg-comprendo-primary text-white"
                      : "text-comprendo-muted hover:bg-comprendo-elevated hover:text-comprendo-text"
                  }`}
                >
                  <FileCode
                    className={`h-3.5 w-3.5 shrink-0 ${
                      selectedFile === node.path ? "text-white" : "text-comprendo-faint"
                    }`}
                  />
                  <span className="flex-1 truncate">{node.name}</span>
                  <span className={`flex shrink-0 items-center gap-0.5 text-[10px] tabular-nums ${selectedFile === node.path ? "text-white/70" : "text-comprendo-accent"}`}>
                    <Zap className="h-2.5 w-2.5" />
                    {node.flowIds.length}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Repo dropdown ────────────────────────────────────────────────────

function RepoDropdown({
  repos,
  fullName,
}: {
  repos: (RepoRecord & { latestTraceId: string | null })[];
  fullName: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const top5 = repos.slice(0, 5);
  const [owner, repo] = fullName.split("/");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-comprendo-elevated"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-comprendo-primary text-xs font-bold text-white">
          {(owner?.[0] ?? "?").toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-comprendo-text">{repo}</p>
          <p className="truncate text-[10px] text-comprendo-faint">{owner}</p>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-comprendo-faint transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && top5.length > 0 && (
          <motion.div
            key="dropdown"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
            className="absolute left-2 right-2 top-full z-50 mt-1 rounded-md border border-comprendo-border bg-comprendo-surface shadow-lg"
          >
            {top5.map((r) => {
              const [rOwner, rRepo] = r.fullName.split("/");
              const isActive = r.fullName === fullName;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setOpen(false);
                    if (!isActive) router.push(`/explore/${r.fullName}`);
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors ${
                    isActive
                      ? "bg-comprendo-elevated text-comprendo-text"
                      : "text-comprendo-muted hover:bg-comprendo-elevated hover:text-comprendo-text"
                  }`}
                >
                  <GitBranch className="h-3.5 w-3.5 shrink-0 text-comprendo-faint" />
                  <span className="flex-1 truncate">
                    <span className="text-comprendo-faint">{rOwner}/</span>{rRepo}
                  </span>
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-comprendo-primary" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main sidebar ─────────────────────────────────────────────────────

export function FileTreeSidebar({
  tree,
  selectedFile,
  selectedCategory,
  repos,
  fullName,
  onSelectFile,
  onSelectCategory,
}: FileTreeSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const handleToggleOpen = (key: string) => {
    setOpenCategory((prev) => (prev === key ? null : key));
  };

  const [owner] = fullName.split("/");

  const collapsedCategories = tree
    ? groupByCategory(flattenEntryFiles(tree))
    : [];

  return (
    <motion.aside
      key="sidebar"
      initial={false}
      animate={{ width: collapsed ? 48 : 280 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="flex shrink-0 flex-col overflow-hidden border-r border-comprendo-border bg-comprendo-surface"
    >
      <AnimatePresence initial={false} mode="wait">
        {collapsed ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="flex flex-col items-center gap-1 py-3"
          >
            {/* Expand button */}
            <button
              onClick={() => setCollapsed(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-comprendo-faint transition-colors hover:bg-comprendo-elevated hover:text-comprendo-text"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>

            {/* Repo avatar */}
            <button
              onClick={() => setCollapsed(false)}
              title={fullName}
              className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-comprendo-primary text-xs font-bold text-white"
            >
              {(owner?.[0] ?? "?").toUpperCase()}
            </button>

            {/* Divider */}
            <div className="my-1 h-px w-6 bg-comprendo-border" />

            {/* Category icon buttons */}
            {collapsedCategories.map(({ cat }) => {
              const { Icon } = cat;
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  title={cat.label}
                  onClick={() => {
                    setCollapsed(false);
                    onSelectCategory(
                      cat.key,
                      collapsedCategories
                        .find((c) => c.cat.key === cat.key)
                        ?.files.map((f) => f.path) ?? [],
                    );
                    setOpenCategory(cat.key);
                  }}
                  className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                    isActive
                      ? "bg-comprendo-primary text-white"
                      : "text-comprendo-faint hover:bg-comprendo-elevated hover:text-comprendo-text"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="flex min-w-[280px] flex-1 flex-col overflow-hidden"
          >
            {/* Top bar: collapse toggle */}
            <div className="flex items-center justify-end border-b border-comprendo-border px-3 py-2">
              <button
                onClick={() => setCollapsed(true)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-comprendo-faint transition-colors hover:bg-comprendo-elevated hover:text-comprendo-text"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>

            {/* Repo dropdown */}
            <div className="border-b border-comprendo-border px-2 py-2">
              <RepoDropdown repos={repos} fullName={fullName} />
            </div>

            {/* Files section */}
            <div className="flex-1 overflow-y-auto px-2 py-3">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-comprendo-faint">
                Files
              </p>
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
                      open={openCategory === cat.key}
                      selectedFile={selectedFile}
                      selectedCategory={selectedCategory}
                      onSelectFile={onSelectFile}
                      onSelectCategory={onSelectCategory}
                      onToggleOpen={handleToggleOpen}
                    />
                  ));
                })()
              ) : (
                <p className="px-5 py-8 text-center text-xs text-comprendo-faint">
                  Loading...
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
