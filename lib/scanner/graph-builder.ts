import * as fs from "fs";
import * as path from "path";
import { ParsedFile, ScanResult, ScannedEdge, ScannedNode, NodeType } from "./types";

const NODE_WIDTH = 200;
const LAYER_HEIGHT = 180;

function layerForType(type: NodeType): number {
  switch (type) {
    case "PAGE":
    case "LAYOUT":
      return 0;
    case "API":
      return 1;
    case "COMPONENT":
      return 2;
    case "HOOK":
    case "CONTEXT":
      return 3;
    case "FUNCTION":
    case "DRIFT":
      return 4;
    case "UTILITY":
      return 5;
    default:
      return 5;
  }
}

function resolveImportPath(
  fromFile: string,
  importSpecifier: string,
  repoRoot: string
): string | null {
  if (!importSpecifier.startsWith(".")) return null;

  const fromDir = path.dirname(path.join(repoRoot, fromFile));
  const resolved = path.resolve(fromDir, importSpecifier);
  const relative = path.relative(repoRoot, resolved).replace(/\\/g, "/");

  const extensions = [".ts", ".tsx", ".js", ".jsx"];
  const indexFiles = extensions.map((ext) => `/index${ext}`);

  // Try exact match
  for (const ext of extensions) {
    const candidate = relative + ext;
    if (fs.existsSync(path.join(repoRoot, candidate))) {
      return candidate;
    }
  }

  // Try as directory with index file
  for (const idx of indexFiles) {
    const candidate = relative + idx;
    if (fs.existsSync(path.join(repoRoot, candidate))) {
      return candidate;
    }
  }

  // Already has extension
  if (fs.existsSync(path.join(repoRoot, relative))) {
    return relative;
  }

  return null;
}

export function buildGraph(
  parsedFiles: ParsedFile[],
  repoRoot: string
): ScanResult {
  const nodeMap = new Map<string, ScannedNode>();
  const edges: ScannedEdge[] = [];
  let edgeCounter = 0;

  // 1. Build node map from all parsed files
  for (const pf of parsedFiles) {
    for (const node of pf.nodes) {
      nodeMap.set(node.id, { ...node });
    }
  }

  // 2. Add file-level fallback for files with zero nodes
  for (const pf of parsedFiles) {
    if (pf.nodes.length === 0) {
      const fileName = path.basename(pf.filePath, path.extname(pf.filePath));
      const id = `${pf.filePath}::${fileName}`;
      if (!nodeMap.has(id)) {
        nodeMap.set(id, {
          id,
          label: fileName,
          type: "UTILITY",
          filePath: pf.filePath,
          position: { x: 0, y: 0 },
        });
      }
    }
  }

  // Build lookup: filePath → nodes
  const fileNodes = new Map<string, ScannedNode[]>();
  for (const node of nodeMap.values()) {
    const existing = fileNodes.get(node.filePath) || [];
    existing.push(node);
    fileNodes.set(node.filePath, existing);
  }

  // Build label → node lookup
  const labelToNode = new Map<string, ScannedNode>();
  for (const node of nodeMap.values()) {
    // First match wins
    if (!labelToNode.has(node.label)) {
      labelToNode.set(node.label, node);
    }
  }

  // 3. Resolve import edges
  for (const pf of parsedFiles) {
    for (const imp of pf.imports) {
      if (!imp.from.startsWith(".")) continue;

      const resolvedPath = resolveImportPath(pf.filePath, imp.from, repoRoot);
      if (!resolvedPath) continue;

      const targetNodes = fileNodes.get(resolvedPath);
      if (!targetNodes || targetNodes.length === 0) continue;

      const sourceNodes = fileNodes.get(pf.filePath);
      if (!sourceNodes || sourceNodes.length === 0) continue;

      const sourceNode = sourceNodes[0];

      // Try to match imported names to target nodes
      for (const importedName of imp.names) {
        const targetNode = targetNodes.find((n) => n.label === importedName);
        if (targetNode) {
          edges.push({
            id: `edge-${edgeCounter++}`,
            source: sourceNode.id,
            target: targetNode.id,
            type: "IMPORTS",
          });
        }
      }

      // If no specific name matched, link to first target node
      if (imp.names.length === 0 || !imp.names.some((n) => targetNodes.some((tn) => tn.label === n))) {
        edges.push({
          id: `edge-${edgeCounter++}`,
          source: sourceNode.id,
          target: targetNodes[0].id,
          type: "IMPORTS",
        });
      }
    }
  }

  // 4. Resolve call edges
  for (const pf of parsedFiles) {
    for (const call of pf.calls) {
      const callerId = `${pf.filePath}::${call.caller}`;
      const calleeNode = labelToNode.get(call.callee);
      if (calleeNode && nodeMap.has(callerId)) {
        edges.push({
          id: `edge-${edgeCounter++}`,
          source: callerId,
          target: calleeNode.id,
          type: "CALLS",
        });
      }
    }
  }

  // 5. Resolve render edges
  for (const pf of parsedFiles) {
    for (const compName of pf.jsxComponents) {
      const compNode = labelToNode.get(compName);
      if (!compNode) continue;

      const sourceNodes = fileNodes.get(pf.filePath);
      if (!sourceNodes || sourceNodes.length === 0) continue;

      // Find first component/page node in source file as the renderer
      const renderer =
        sourceNodes.find(
          (n) => n.type === "COMPONENT" || n.type === "PAGE" || n.type === "LAYOUT"
        ) || sourceNodes[0];

      edges.push({
        id: `edge-${edgeCounter++}`,
        source: renderer.id,
        target: compNode.id,
        type: "RENDERS",
      });
    }
  }

  // 6. Filter edges: both source and target must exist
  const validEdges = edges.filter(
    (e) => nodeMap.has(e.source) && nodeMap.has(e.target)
  );

  // 6b. Un-drift nodes that are referenced from other files
  const referencedNodeIds = new Set<string>();
  for (const edge of validEdges) {
    if (edge.type === "CALLS" || edge.type === "IMPORTS" || edge.type === "RENDERS") {
      referencedNodeIds.add(edge.target);
    }
  }
  for (const node of nodeMap.values()) {
    if (node.type === "DRIFT" && referencedNodeIds.has(node.id)) {
      node.type = "FUNCTION";
      node.isDrift = false;
      node.driftReason = undefined;
    }
  }

  // 7. Assign positions using layered layout
  const layerCounts = new Map<number, number>();
  for (const node of nodeMap.values()) {
    const layer = layerForType(node.type);
    const count = layerCounts.get(layer) || 0;
    const xOffset = layer % 2 === 1 ? NODE_WIDTH / 4 : 0;
    node.position = {
      x: count * NODE_WIDTH + xOffset,
      y: layer * LAYER_HEIGHT,
    };
    layerCounts.set(layer, count + 1);
  }

  // 8. Compute stats
  const allNodes = Array.from(nodeMap.values());
  const stats = {
    filesAnalyzed: parsedFiles.length,
    functionsFound: allNodes.filter(
      (n) => n.type === "FUNCTION" || n.type === "DRIFT"
    ).length,
    componentsFound: allNodes.filter((n) => n.type === "COMPONENT").length,
    connectionsFound: validEdges.length,
    driftIssues: allNodes.filter((n) => n.type === "DRIFT").length,
  };

  return {
    nodes: allNodes,
    edges: validEdges,
    stats,
  };
}
