import type { ScannedNode, ScannedEdge, FileClassification, NodeType } from "./types";

// ── Framework Pack interface ────────────────────────────────────────
// Packs add framework-specific knowledge to the generic scanner engine.
// All methods are optional — implement only what the framework needs.

export interface FrameworkPack {
  /** Unique pack identifier */
  name: string;

  /** Check if this pack applies to a repo (e.g. look for next.config.*) */
  detect(repoRoot: string): boolean;

  /** Override or refine default file classification.
   *  Return null to let the default classifier handle it. */
  classifyFile?(relativePath: string, fileName: string): NodeType | null;

  /** Additional directory names to skip during scanning */
  skipDirs?(): string[];

  /** Synthesize implicit edges the AST can't detect.
   *  Called after graph-builder finishes with all nodes + existing edges.
   *  Return only the NEW edges to add. */
  extraEdges?(
    nodes: ScannedNode[],
    edges: ScannedEdge[],
    repoRoot: string
  ): ScannedEdge[];
}
