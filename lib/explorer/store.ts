import type { ScanResult, ScannedNode, ScannedEdge } from "../scanner/types";
import type {
  StaticTrace,
  NamedFlow,
  NamedFlowStep,
  FlowHandlerType,
  TraceRecord,
  RepoRecord,
} from "./types";

// ── In-memory store (survives HMR in dev) ───────────────────────────

const globalForStore = globalThis as unknown as {
  __explorerRepos?: Map<string, RepoRecord>;
  __explorerTraces?: Map<string, TraceRecord>;
};

const repos = (globalForStore.__explorerRepos ??= new Map<string, RepoRecord>());
const traces = (globalForStore.__explorerTraces ??= new Map<string, TraceRecord>());

export function getRepo(id: string): RepoRecord | undefined {
  return repos.get(id);
}

export function getRepoByFullName(fullName: string): RepoRecord | undefined {
  for (const r of repos.values()) {
    if (r.fullName === fullName) return r;
  }
  return undefined;
}

export function getAllRepos(): RepoRecord[] {
  return Array.from(repos.values());
}

export function upsertRepo(fullName: string): RepoRecord {
  const existing = getRepoByFullName(fullName);
  if (existing) return existing;
  const repo: RepoRecord = { id: generateId(), fullName, latestTraceId: null };
  repos.set(repo.id, repo);
  return repo;
}

export function getTrace(id: string): TraceRecord | undefined {
  return traces.get(id);
}

export function createTrace(repositoryId: string, staticTrace: StaticTrace): TraceRecord {
  const trace: TraceRecord = { id: generateId(), repositoryId, staticTrace };
  traces.set(trace.id, trace);
  const repo = repos.get(repositoryId);
  if (repo) repo.latestTraceId = trace.id;
  return trace;
}

function generateId(): string {
  // Simple UUID-like ID without external dep
  return (
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36)
  );
}

// ── Convert ScanResult → StaticTrace ────────────────────────────────

function nodeTypeToHandler(node: ScannedNode): FlowHandlerType {
  switch (node.type) {
    case "PAGE":
      return "page";
    case "LAYOUT":
      return "layout";
    case "API":
      return "api";
    case "HOOK":
    case "CONTEXT":
      return "export";
    default:
      return "export";
  }
}

function isEntryPoint(node: ScannedNode): boolean {
  return (
    node.type === "PAGE" ||
    node.type === "LAYOUT" ||
    node.type === "API" ||
    (node.isExported === true && node.type === "FUNCTION") ||
    (node.isExported === true && node.type === "COMPONENT")
  );
}

function buildStepsFromNode(
  rootNode: ScannedNode,
  allNodes: Map<string, ScannedNode>,
  edgesBySource: Map<string, ScannedEdge[]>,
  visited: Set<string>,
  depth: number
): NamedFlowStep[] {
  if (visited.has(rootNode.id) || depth > 8) return [];
  visited.add(rootNode.id);

  const outEdges = edgesBySource.get(rootNode.id) ?? [];
  const children: NamedFlowStep[] = [];

  for (const edge of outEdges) {
    const target = allNodes.get(edge.target);
    if (!target || visited.has(target.id)) continue;

    const childSteps = buildStepsFromNode(
      target,
      allNodes,
      edgesBySource,
      visited,
      depth + 1
    );

    children.push({
      id: target.id,
      label: target.label,
      filePath: target.filePath,
      startLine: target.line ?? 0,
      endLine: target.line ? target.line + 10 : 0,
      pureCode: "",
      callDepth: depth + 1,
      treeDepth: depth + 1,
      nodeType: target.type === "COMPONENT" ? "section" : "function",
      children: childSteps,
    });
  }

  return children;
}

export function scanResultToStaticTrace(scan: ScanResult): StaticTrace {
  const nodeMap = new Map<string, ScannedNode>();
  for (const n of scan.nodes) nodeMap.set(n.id, n);

  const edgesBySource = new Map<string, ScannedEdge[]>();
  for (const e of scan.edges) {
    if (!edgesBySource.has(e.source)) edgesBySource.set(e.source, []);
    edgesBySource.get(e.source)!.push(e);
  }

  const entryNodes = scan.nodes.filter(isEntryPoint);
  const namedFlows: NamedFlow[] = [];

  for (const entry of entryNodes) {
    const visited = new Set<string>();
    const steps = buildStepsFromNode(entry, nodeMap, edgesBySource, visited, 0);

    const rootStep: NamedFlowStep = {
      id: entry.id,
      label: entry.label,
      filePath: entry.filePath,
      startLine: entry.line ?? 0,
      endLine: entry.line ? entry.line + 10 : 0,
      pureCode: "",
      callDepth: 0,
      treeDepth: 0,
      nodeType: "function",
      children: steps,
    };

    let flowLabel = entry.label;
    if (entry.type === "API") {
      flowLabel = `${entry.label} ${entry.filePath}`;
    } else if (entry.type === "PAGE") {
      flowLabel = entry.label;
    }

    namedFlows.push({
      flowId: generateId(),
      entryPointId: entry.id,
      label: flowLabel,
      handlerType: nodeTypeToHandler(entry),
      steps: [rootStep],
    });
  }

  return { namedFlows };
}
