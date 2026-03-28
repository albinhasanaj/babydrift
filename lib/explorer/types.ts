// ── Flow handler types ──────────────────────────────────────────────

export type FlowHandlerType =
  | "page"
  | "layout"
  | "http"
  | "api"
  | "worker"
  | "job"
  | "event"
  | "webhook"
  | "cron"
  | "cli"
  | "export";

// ── NamedFlow / StaticTrace ─────────────────────────────────────────

export interface NamedFlowStep {
  id: string;
  label: string;
  filePath: string;
  startLine: number;
  endLine: number;
  pureCode: string;
  callDepth: number;
  treeDepth: number;
  nodeType: "function" | "branch" | "section";
  children: NamedFlowStep[];
}

export interface NamedFlow {
  flowId: string;
  entryPointId: string;
  label: string;
  handlerType: FlowHandlerType;
  steps: NamedFlowStep[];
}

export interface StaticTrace {
  namedFlows: NamedFlow[];
}

// ── Trace row (in-memory) ───────────────────────────────────────────

export interface TraceRecord {
  id: string;
  repositoryId: string;
  staticTrace: StaticTrace | null;
}

// ── Repository row (in-memory) ──────────────────────────────────────

export interface RepoRecord {
  id: string;
  fullName: string;
  latestTraceId: string | null;
}

// ── Entry points API response ───────────────────────────────────────

export interface EntryPointItem {
  flowId: string;
  entryPointId: string;
  label: string;
  handlerType: string;
  totalFunctions: number;
  totalFiles: number;
}

export interface EntryPointGroup {
  key: string;
  label: string;
  items: EntryPointItem[];
}

export interface EntryPointsResponse {
  traceId: string;
  groups: EntryPointGroup[];
  totalFlows: number;
}

// ── Flow tree API response ──────────────────────────────────────────

export interface FlowTreeNode {
  id: string;
  nodeType: "function" | "branch" | "section";
  parentRelation?: "call" | "composition" | "section";
  label: string;
  filePath: string;
  startLine: number;
  endLine: number;
  pureCode: string;
  callDepth: number;
  treeDepth: number;
  branchKind?: string;
  branchArm?: string;
  children: FlowTreeNode[];
  canExpand?: boolean;
  concurrencyGroup?: string | null;
  resolutionStrategy?: string;
  edgeConfidence?: number;
}

export interface FlowTreeResponse {
  traceId: string;
  flowId: string;
  label: string;
  handlerType: string;
  totalFunctions: number;
  totalFiles: number;
  tree: FlowTreeNode[];
}

// ── File tree ───────────────────────────────────────────────────────

export interface FileTreeNode {
  name: string;
  path: string;       // repo-relative path
  isDir: boolean;
  children: FileTreeNode[];
  flowIds: string[];  // flows whose entry lives in this file
}

// ── File canvas API response ────────────────────────────────────────

export interface FileCanvasFlow {
  flowId: string;
  label: string;
  handlerType: string;
  tree: FlowTreeNode[];
}

export interface FileCanvasResponse {
  traceId: string;
  filePath: string;
  flows: FileCanvasFlow[];
}

// ── Canvas layout ───────────────────────────────────────────────────

export interface LaidNode extends FlowTreeNode {
  x: number;
  y: number;
  w: number;
  expanded: boolean;
  parentId: string | null;
  /** Unique key for React — scoped to the flow so shared nodes don't collide */
  layoutId: string;
  /** Marks the first node of each flow group so the canvas can draw a label */
  flowGroupLabel?: string;
}
