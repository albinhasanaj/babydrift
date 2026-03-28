import type {
  NamedFlow,
  NamedFlowStep,
  EntryPointGroup,
  EntryPointItem,
  FlowTreeNode,
  FileTreeNode,
  FileCanvasFlow,
} from "./types";

// ── groupEntryPoints ────────────────────────────────────────────────

const HANDLER_LABELS: Record<string, string> = {
  page: "Pages",
  layout: "Layouts",
  http: "HTTP Routes",
  api: "API Routes",
  worker: "Workers",
  job: "Jobs",
  event: "Event Handlers",
  webhook: "Webhooks",
  cron: "Cron Jobs",
  cli: "CLI Commands",
  export: "Exports",
};

function countFunctions(steps: NamedFlowStep[]): number {
  let count = 0;
  for (const step of steps) {
    if (step.nodeType === "function") count++;
    count += countFunctions(step.children);
  }
  return count;
}

function collectFiles(steps: NamedFlowStep[]): Set<string> {
  const files = new Set<string>();
  for (const step of steps) {
    if (step.filePath) files.add(step.filePath);
    for (const f of collectFiles(step.children)) files.add(f);
  }
  return files;
}

export function groupEntryPoints(namedFlows: NamedFlow[]): EntryPointGroup[] {
  const map = new Map<string, EntryPointItem[]>();

  for (const flow of namedFlows) {
    const key = flow.handlerType;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push({
      flowId: flow.flowId,
      entryPointId: flow.entryPointId,
      label: flow.label,
      handlerType: flow.handlerType,
      totalFunctions: countFunctions(flow.steps),
      totalFiles: collectFiles(flow.steps).size,
    });
  }

  const groups: EntryPointGroup[] = [];
  for (const [key, items] of map) {
    items.sort((a, b) => a.label.localeCompare(b.label));
    groups.push({
      key,
      label: HANDLER_LABELS[key] ?? key,
      items,
    });
  }

  groups.sort((a, b) => a.label.localeCompare(b.label));
  return groups;
}

// ── flowToTree ──────────────────────────────────────────────────────

function stepToTreeNode(
  step: NamedFlowStep,
  maxDepth: number,
  currentDepth: number
): FlowTreeNode {
  const atLimit = currentDepth >= maxDepth;
  const hasChildren = step.children.length > 0;

  return {
    id: step.id,
    nodeType: step.nodeType,
    parentRelation: "call",
    label: step.label,
    filePath: step.filePath,
    startLine: step.startLine,
    endLine: step.endLine,
    pureCode: step.pureCode,
    callDepth: step.callDepth,
    treeDepth: step.treeDepth,
    children: atLimit
      ? []
      : step.children.map((c) => stepToTreeNode(c, maxDepth, currentDepth + 1)),
    canExpand: atLimit && hasChildren ? true : undefined,
  };
}

export function flowToTree(flow: NamedFlow, maxDepth: number): FlowTreeNode[] {
  return flow.steps.map((step) => stepToTreeNode(step, maxDepth, 0));
}

// ── buildFileTree ───────────────────────────────────────────────────

function collectAllPaths(steps: NamedFlowStep[], out: Set<string>) {
  for (const step of steps) {
    if (step.filePath) out.add(step.filePath);
    collectAllPaths(step.children, out);
  }
}

function insertPath(
  root: FileTreeNode,
  parts: string[],
  fullPath: string,
  flowIds: string[]
) {
  let current = root;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLast = i === parts.length - 1;
    const partPath = parts.slice(0, i + 1).join("/");
    let child = current.children.find((c) => c.name === part);
    if (!child) {
      child = {
        name: part,
        path: partPath,
        isDir: !isLast,
        children: [],
        flowIds: isLast ? flowIds : [],
      };
      current.children.push(child);
    } else if (isLast) {
      // merge flowIds if the node already existed
      for (const id of flowIds) {
        if (!child.flowIds.includes(id)) child.flowIds.push(id);
      }
    }
    current = child;
  }
}

function sortTree(node: FileTreeNode) {
  node.children.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const child of node.children) sortTree(child);
}

export function buildFileTree(namedFlows: NamedFlow[]): FileTreeNode {
  // Build filePath → flowIds map (entry point files only)
  const entryFileMap = new Map<string, string[]>();
  for (const flow of namedFlows) {
    const entryFile = flow.steps[0]?.filePath;
    if (entryFile) {
      if (!entryFileMap.has(entryFile)) entryFileMap.set(entryFile, []);
      entryFileMap.get(entryFile)!.push(flow.flowId);
    }
  }

  // Collect every file path referenced in any step
  const allPaths = new Set<string>();
  for (const flow of namedFlows) {
    collectAllPaths(flow.steps, allPaths);
  }

  const root: FileTreeNode = {
    name: "",
    path: "",
    isDir: true,
    children: [],
    flowIds: [],
  };

  for (const filePath of allPaths) {
    const parts = filePath.split("/").filter(Boolean);
    if (parts.length === 0) continue;
    const flowIds = entryFileMap.get(filePath) ?? [];
    insertPath(root, parts, filePath, flowIds);
  }

  sortTree(root);
  return root;
}

// ── getFlowsForFile ─────────────────────────────────────────────────

export function getFlowsForFile(
  namedFlows: NamedFlow[],
  filePath: string,
  maxDepth: number
): FileCanvasFlow[] {
  return namedFlows
    .filter((flow) => flow.steps[0]?.filePath === filePath)
    .map((flow) => ({
      flowId: flow.flowId,
      label: flow.label,
      handlerType: flow.handlerType,
      tree: flowToTree(flow, maxDepth),
    }));
}
