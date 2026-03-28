// ── Node & Edge type unions ──────────────────────────────────────────

export type NodeType =
  | "PAGE"
  | "LAYOUT"
  | "COMPONENT"
  | "FUNCTION"
  | "API"
  | "UTILITY"
  | "HOOK"
  | "CONTEXT"
  | "DRIFT";

export type EdgeType = "IMPORTS" | "CALLS" | "RENDERS" | "DATA_FLOW";

// ── Scanned graph primitives ────────────────────────────────────────

export interface ScannedNode {
  id: string;
  label: string;
  type: NodeType;
  filePath: string;
  line?: number;
  isClientComponent?: boolean;
  isAsync?: boolean;
  isExported?: boolean;
  isDrift?: boolean;
  driftReason?: string;
  group?: string;
  position: { x: number; y: number };
}

export interface ScannedEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
}

// ── Scan result ─────────────────────────────────────────────────────

export interface ScanResult {
  nodes: ScannedNode[];
  edges: ScannedEdge[];
  stats: {
    filesAnalyzed: number;
    functionsFound: number;
    componentsFound: number;
    connectionsFound: number;
    driftIssues: number;
  };
}

// ── File classification ─────────────────────────────────────────────

export interface FileClassification {
  filePath: string;
  primaryType: NodeType;
  isClientComponent: boolean;
  isServerComponent: boolean;
  shouldAnalyze: boolean;
}

// ── Parsed file ─────────────────────────────────────────────────────

export interface ParsedFile {
  filePath: string;
  nodes: ScannedNode[];
  imports: Array<{ from: string; names: string[] }>;
  exports: string[];
  calls: Array<{ caller: string; callee: string }>;
  jsxComponents: string[];
}
