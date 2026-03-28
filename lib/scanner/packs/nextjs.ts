import * as fs from "fs";
import * as path from "path";
import type { FrameworkPack } from "../framework-pack";
import type { ScannedNode, ScannedEdge, NodeType } from "../types";

// ── Next.js App Router conventions ──────────────────────────────────
// layout.tsx wraps all pages/layouts in the same directory and child dirs.
// loading.tsx, error.tsx, not-found.tsx, template.tsx are implicit siblings.
// Middleware applies to all routes below it.

const NEXTJS_SPECIAL_FILES: Record<string, NodeType> = {
  "page":     "PAGE",
  "layout":   "LAYOUT",
  "route":    "API",
  "loading":  "COMPONENT",
  "error":    "COMPONENT",
  "not-found":"COMPONENT",
  "template": "LAYOUT",
  "default":  "PAGE",
};

export const nextjsPack: FrameworkPack = {
  name: "nextjs",

  detect(repoRoot: string): boolean {
    const candidates = [
      "next.config.js",
      "next.config.mjs",
      "next.config.ts",
    ];
    return candidates.some((f) => fs.existsSync(path.join(repoRoot, f)));
  },

  classifyFile(relativePath: string, fileName: string): NodeType | null {
    const normalized = relativePath.replace(/\\/g, "/");
    const baseName = path.basename(fileName, path.extname(fileName));

    // Only apply to files inside app/ directory
    if (!normalized.startsWith("app/") && !normalized.includes("/app/")) {
      return null;
    }

    return NEXTJS_SPECIAL_FILES[baseName] ?? null;
  },

  skipDirs(): string[] {
    return [".next"];
  },

  extraEdges(
    nodes: ScannedNode[],
    edges: ScannedEdge[],
    repoRoot: string
  ): ScannedEdge[] {
    const newEdges: ScannedEdge[] = [];
    let edgeCounter = 0;

    // Build lookup: directory → nodes in that directory
    const dirNodes = new Map<string, ScannedNode[]>();
    for (const node of nodes) {
      const dir = path.dirname(node.filePath).replace(/\\/g, "/");
      if (!dirNodes.has(dir)) dirNodes.set(dir, []);
      dirNodes.get(dir)!.push(node);
    }

    // Find all layout nodes
    const layoutNodes = nodes.filter((n) => n.type === "LAYOUT");

    for (const layout of layoutNodes) {
      const layoutDir = path.dirname(layout.filePath).replace(/\\/g, "/");

      // Find all pages, child layouts, and special files that this layout wraps.
      // A layout wraps anything at the same level + all nested subdirectories
      // (until another layout takes over).
      const wrappedNodes = findWrappedNodes(layout, layoutDir, nodes, dirNodes);

      for (const child of wrappedNodes) {
        if (child.id === layout.id) continue;

        // Avoid duplicating edges that already exist
        const exists = edges.some(
          (e) => e.source === layout.id && e.target === child.id
        ) || newEdges.some(
          (e) => e.source === layout.id && e.target === child.id
        );

        if (!exists) {
          newEdges.push({
            id: `fw-edge-${edgeCounter++}`,
            source: layout.id,
            target: child.id,
            type: "RENDERS",
          });
        }
      }
    }

    return newEdges;
  },
};

/**
 * Find all nodes that a layout implicitly wraps via Next.js conventions.
 * A layout wraps:
 *  - page.tsx, loading.tsx, error.tsx, template.tsx in the SAME directory
 *  - page.tsx, loading.tsx, etc. in child directories (recursively)
 *  - BUT stops descending into a child directory subtree once another layout is found there
 */
function findWrappedNodes(
  layout: ScannedNode,
  layoutDir: string,
  allNodes: ScannedNode[],
  dirNodes: Map<string, ScannedNode[]>
): ScannedNode[] {
  const result: ScannedNode[] = [];

  // Collect all unique directories
  const allDirs = new Set(dirNodes.keys());

  // Directories that have their own layout (excluding the current one)
  const dirsWithOwnLayout = new Set<string>();
  for (const node of allNodes) {
    if (
      node.type === "LAYOUT" &&
      node.id !== layout.id
    ) {
      const dir = path.dirname(node.filePath).replace(/\\/g, "/");
      dirsWithOwnLayout.add(dir);
    }
  }

  // BFS through child directories
  const queue: string[] = [layoutDir];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentDir = queue.shift()!;
    if (visited.has(currentDir)) continue;
    visited.add(currentDir);

    // Add wrappable nodes from this directory
    const nodesHere = dirNodes.get(currentDir) ?? [];
    for (const node of nodesHere) {
      if (node.id === layout.id) continue;
      // Layout wraps pages, components (loading/error), and child layouts
      if (isWrappableByLayout(node)) {
        result.push(node);
      }
    }

    // Descend into child directories, but stop if a child dir has its own layout
    for (const dir of allDirs) {
      if (dir === currentDir) continue;
      if (!dir.startsWith(currentDir + "/")) continue;

      // Check if this is a DIRECT child (no intermediate dirs we haven't queued)
      const relative = dir.slice(currentDir.length + 1);
      const depth = relative.split("/").length;
      if (depth !== 1) continue;

      // If child dir has its own layout, still add that layout as a wrapped node
      // (parent layout renders child layout), but don't recurse further
      if (dirsWithOwnLayout.has(dir)) {
        const childLayouts = (dirNodes.get(dir) ?? []).filter(
          (n) => n.type === "LAYOUT"
        );
        for (const cl of childLayouts) {
          result.push(cl);
        }
        // Don't recurse into this subtree — child layout takes over
      } else {
        queue.push(dir);
      }
    }
  }

  return result;
}

function isWrappableByLayout(node: ScannedNode): boolean {
  return (
    node.type === "PAGE" ||
    node.type === "LAYOUT" ||
    node.type === "COMPONENT"
  );
}
