"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { FileTreeSidebar } from "@/components/FileTreeSidebar";
import { FlowCanvas } from "@/components/FlowCanvas";
import { DetailPanel } from "@/components/DetailPanel";
import { NodeExplainPanel } from "@/components/NodeExplainPanel";
import { useExploreData } from "@/hooks/useExploreData";
import { useExploreDerived } from "@/hooks/useExploreDerived";
import { RepoSummaryBanner } from "@/components/RepoSummaryBanner";
import type { LaidNode } from "@/lib/explorer/types";
import { Loader2, RefreshCw, Play, Square, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FileTreeNode } from "@/lib/explorer/types";

export default function ExplorePage() {
  const params = useParams();
  const owner = params.owner as string;
  const repo = params.repo as string;
  const fullName = `${owner}/${repo}`;

  const {
    currentRepoId,
    traceId,
    fileTree,
    fileCanvas,
    selectedFile,
    repos,
    loading,
    scanning,
    error,
    connectRepo,
    triggerScan,
    fetchFileTree,
    fetchFileCanvas,
    fetchMultiFileCanvas,
    fetchRepos,
  } = useExploreData();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Onboarding state
  const onboardingKey = `comprendo_onboarded_${owner}_${repo}`;
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem(onboardingKey);
  });
  const [pulseNodeIds, setPulseNodeIds] = useState<Set<string>>(new Set());

  // Tour state
  const [tourActive, setTourActive] = useState(false);
  const [tourFileIndex, setTourFileIndex] = useState(0);
  const [tourNodeIndex, setTourNodeIndex] = useState(0);
  const [tourComplete, setTourComplete] = useState(false);
  // Track how many nodes in the current file we've revealed
  const [tourRevealedNodes, setTourRevealedNodes] = useState<string[]>([]);

  const { laidNodes } = useExploreDerived(fileCanvas, expanded);

  const selectedNode: LaidNode | null =
    laidNodes.find((n) => n.id === selectedNodeId) ?? null;

  // Build ordered tour file list: Pages first, then Components, then everything else
  const tourFiles = useMemo(() => {
    if (!fileTree) return [];
    const all: FileTreeNode[] = [];
    const collect = (node: FileTreeNode) => {
      if (!node.isDir && node.flowIds.length > 0) all.push(node);
      for (const child of node.children) collect(child);
    };
    collect(fileTree);

    const isPage = (f: FileTreeNode) =>
      f.name === "page.tsx" || f.name === "page.ts" || f.name === "page.jsx";
    const isComponent = (f: FileTreeNode) => {
      const segs = f.path.replace(/\\/g, "/").split("/");
      return (
        segs.some((s) =>
          ["components", "ui", "widgets", "shared", "common"].includes(s)
        ) || /^[A-Z][a-zA-Z0-9]*\.(tsx|jsx)$/.test(f.name)
      );
    };

    const pages = all.filter(isPage);
    const components = all.filter((f) => !isPage(f) && isComponent(f));
    const rest = all.filter((f) => !isPage(f) && !isComponent(f));
    return [...pages, ...components, ...rest];
  }, [fileTree]);

  // 1. Connect repo on mount and load repos list
  useEffect(() => {
    connectRepo(fullName);
    fetchRepos();
  }, [fullName, connectRepo, fetchRepos]);

  // 2. Once we have a traceId, fetch the file tree
  useEffect(() => {
    if (traceId) {
      fetchFileTree(traceId);
    }
  }, [traceId, fetchFileTree]);

  // 3. When a file is selected, fetch canvas flows + reset state
  const handleSelectFile = useCallback(
    (filePath: string) => {
      if (!traceId) return;
      if (selectedFile === filePath) return;
      setExpanded(new Set());
      setSelectedNodeId(null);
      setSelectedCategory(null);
      fetchFileCanvas(traceId, filePath);
    },
    [traceId, selectedFile, fetchFileCanvas]
  );

  // 3b. When a category header is clicked, fetch all files in it merged
  const handleSelectCategory = useCallback(
    (categoryKey: string, filePaths: string[]) => {
      if (!traceId || filePaths.length === 0) return;
      if (selectedCategory === categoryKey) return;
      setExpanded(new Set());
      setSelectedNodeId(null);
      setSelectedCategory(categoryKey);
      fetchMultiFileCanvas(traceId, filePaths);
    },
    [traceId, selectedCategory, fetchMultiFileCanvas]
  );

  // 4. Auto-expand root nodes when canvas data arrives
  useEffect(() => {
    if (fileCanvas?.flows) {
      const rootIds = new Set(
        fileCanvas.flows.flatMap((f) => f.tree.map((n) => n.id))
      );
      setExpanded(rootIds);
    }
  }, [fileCanvas]);

  // 4b. Set up onboarding pulse for first 3 nodes
  useEffect(() => {
    if (showOnboarding && laidNodes.length > 0 && pulseNodeIds.size === 0) {
      const topThree = laidNodes.slice(0, 3).map((n) => n.id);
      setPulseNodeIds(new Set(topThree));
    }
  }, [showOnboarding, laidNodes, pulseNodeIds.size]);

  // 5. Node click — toggle expand + select
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      // Dismiss onboarding on any click
      if (showOnboarding) {
        setShowOnboarding(false);
        setPulseNodeIds(new Set());
        localStorage.setItem(onboardingKey, "true");
      }

      const node = laidNodes.find((n) => n.id === nodeId);
      if (!node) return;

      setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));

      if (node.children.length > 0 || node.canExpand) {
        setExpanded((prev) => {
          const next = new Set(prev);
          if (next.has(nodeId)) {
            next.delete(nodeId);
            const collapse = (n: LaidNode) => {
              for (const child of laidNodes.filter((c) => c.parentId === n.id)) {
                next.delete(child.id);
                collapse(child);
              }
            };
            collapse(node);
          } else {
            next.add(nodeId);
          }
          return next;
        });
      }
    },
    [laidNodes, showOnboarding, onboardingKey]
  );

  const handleScan = useCallback(async () => {
    if (!currentRepoId) return;
    const result = await triggerScan(currentRepoId);
    if (result?.traceId) {
      fetchFileTree(result.traceId);
    }
  }, [currentRepoId, triggerScan, fetchFileTree]);

  // ── Tour controls ──
  const startTour = useCallback(() => {
    if (tourFiles.length === 0 || !traceId) return;
    setTourComplete(false);
    setTourActive(true);
    setTourFileIndex(0);
    setTourNodeIndex(0);
    setTourRevealedNodes([]);
    // Load the first file
    setExpanded(new Set());
    setSelectedNodeId(null);
    setSelectedCategory(null);
    fetchFileCanvas(traceId, tourFiles[0].path);
  }, [tourFiles, traceId, fetchFileCanvas]);

  const stopTour = useCallback(() => {
    setTourActive(false);
    setTourRevealedNodes([]);
  }, []);

  // When tour file loads, seed the revealed nodes list with just the first root node
  useEffect(() => {
    if (!tourActive || laidNodes.length === 0) return;
    // Only seed on fresh file load (when tourRevealedNodes is empty)
    if (tourRevealedNodes.length > 0) return;
    const firstNode = laidNodes[0];
    if (firstNode) {
      setTourRevealedNodes([firstNode.id]);
      setTourNodeIndex(0);
      setSelectedNodeId(firstNode.id);
      // Expand the first node
      setExpanded(new Set([firstNode.id]));
    }
  }, [tourActive, laidNodes, tourRevealedNodes.length]);

  // Tour: go to next node (deeper into tree, then next sibling, then next file)
  const tourNext = useCallback(() => {
    if (!tourActive) return;

    const currentNodeId = tourRevealedNodes[tourNodeIndex];
    const currentNode = laidNodes.find((n) => n.id === currentNodeId);

    // Try to find the next node to reveal:
    // 1. First unexpanded child of current node
    // 2. Next sibling (next node at same or shallower depth)
    // 3. Next file

    // Find children of current node that aren't revealed yet
    const unrevealedChild = currentNode
      ? laidNodes.find(
          (n) => n.parentId === currentNodeId && !tourRevealedNodes.includes(n.id)
        )
      : null;

    if (unrevealedChild) {
      // Expand current node and reveal the child
      setExpanded((prev) => new Set([...prev, currentNodeId!]));
      const newRevealed = [...tourRevealedNodes, unrevealedChild.id];
      setTourRevealedNodes(newRevealed);
      setTourNodeIndex(newRevealed.length - 1);
      setSelectedNodeId(unrevealedChild.id);
      return;
    }

    // Find next sibling or ancestor's sibling
    // Walk up the tree to find the next unvisited node
    const allRootIds = laidNodes.filter((n) => !n.parentId).map((n) => n.id);
    
    // Find any node that has unrevealed children
    for (const revealedId of [...tourRevealedNodes].reverse()) {
      const node = laidNodes.find((n) => n.id === revealedId);
      if (!node) continue;
      const unrevealedKid = laidNodes.find(
        (n) => n.parentId === revealedId && !tourRevealedNodes.includes(n.id)
      );
      if (unrevealedKid) {
        setExpanded((prev) => new Set([...prev, revealedId]));
        const newRevealed = [...tourRevealedNodes, unrevealedKid.id];
        setTourRevealedNodes(newRevealed);
        setTourNodeIndex(newRevealed.length - 1);
        setSelectedNodeId(unrevealedKid.id);
        return;
      }
    }

    // Find unrevealed root nodes
    const unrevealedRoot = allRootIds.find(
      (id) => !tourRevealedNodes.includes(id)
    );
    if (unrevealedRoot) {
      const newRevealed = [...tourRevealedNodes, unrevealedRoot];
      setTourRevealedNodes(newRevealed);
      setTourNodeIndex(newRevealed.length - 1);
      setSelectedNodeId(unrevealedRoot);
      setExpanded((prev) => new Set([...prev, unrevealedRoot]));
      return;
    }

    // All nodes in this file exhausted — move to next file
    const nextFileIdx = tourFileIndex + 1;
    if (nextFileIdx >= tourFiles.length) {
      setTourActive(false);
      setTourComplete(true);
      return;
    }

    setTourFileIndex(nextFileIdx);
    setTourRevealedNodes([]);
    setTourNodeIndex(0);
    setExpanded(new Set());
    setSelectedNodeId(null);
    setSelectedCategory(null);
    if (traceId) {
      fetchFileCanvas(traceId, tourFiles[nextFileIdx].path);
    }
  }, [tourActive, tourNodeIndex, tourRevealedNodes, laidNodes, tourFileIndex, tourFiles, traceId, fetchFileCanvas]);

  // Tour: go back to previous node
  const tourBack = useCallback(() => {
    if (!tourActive || tourRevealedNodes.length <= 1) {
      // Go to previous file
      if (tourFileIndex > 0) {
        const prevIdx = tourFileIndex - 1;
        setTourFileIndex(prevIdx);
        setTourRevealedNodes([]);
        setTourNodeIndex(0);
        setExpanded(new Set());
        setSelectedNodeId(null);
        setSelectedCategory(null);
        if (traceId) {
          fetchFileCanvas(traceId, tourFiles[prevIdx].path);
        }
      }
      return;
    }

    // Go back one node within the current file
    const newRevealed = tourRevealedNodes.slice(0, -1);
    setTourRevealedNodes(newRevealed);
    setTourNodeIndex(newRevealed.length - 1);
    const prevNodeId = newRevealed[newRevealed.length - 1];
    setSelectedNodeId(prevNodeId);
  }, [tourActive, tourRevealedNodes, tourFileIndex, tourFiles, traceId, fetchFileCanvas]);

  return (
    <div className="flex h-screen flex-col bg-comprendo-bg">
      <Navbar showBack breadcrumb={fullName}>
        {traceId && !scanning && (
          <>
            {tourActive && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-comprendo-muted">
                  {tourFileIndex + 1} / {tourFiles.length} files
                </span>
                <Button
                  onClick={tourBack}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-comprendo-muted hover:text-comprendo-text"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  onClick={tourNext}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-comprendo-muted hover:text-comprendo-text"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  onClick={stopTour}
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-red-400 hover:text-red-300"
                >
                  <Square className="h-3 w-3" />
                  Stop
                </Button>
              </div>
            )}
            {!tourActive && tourFiles.length > 0 && (
              <Button
                onClick={startTour}
                variant="ghost"
                size="sm"
                className="gap-1.5 text-comprendo-muted hover:text-comprendo-text"
              >
                <Play className="h-3.5 w-3.5" />
                Walk me through this
              </Button>
            )}
            <Button
              onClick={handleScan}
              variant="ghost"
              size="sm"
              className="gap-1.5 text-comprendo-muted hover:text-comprendo-text"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </>
        )}
      </Navbar>

      <RepoSummaryBanner traceId={traceId} repoKey={fullName} />

      <div className="flex flex-1 overflow-hidden">
        <FileTreeSidebar
          tree={fileTree}
          selectedFile={selectedFile}
          selectedCategory={selectedCategory}
          repos={repos}
          fullName={fullName}
          onSelectFile={handleSelectFile}
          onSelectCategory={handleSelectCategory}
        />

        <main className="relative flex-1">
          {/* Loading overlay */}
          {(loading || scanning) && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-comprendo-bg/80">
              <Loader2 className="h-8 w-8 animate-spin text-comprendo-accent" />
              <span className="mt-3 text-sm text-comprendo-muted">
                {scanning ? "Reading your code..." : "Loading..."}
              </span>
            </div>
          )}

          {/* Error */}
          {error && !loading && !scanning && (
            <div className="absolute left-4 top-4 z-30 rounded-lg border border-comprendo-drift/30 bg-comprendo-drift/10 px-4 py-2 text-xs text-comprendo-drift">
              {error}
            </div>
          )}

          {/* No trace – prompt scan */}
          {!traceId && !loading && !scanning && currentRepoId && (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <p className="text-sm text-comprendo-muted">
                This repository hasn't been analyzed yet.
              </p>
              <Button
                onClick={handleScan}
                className="bg-comprendo-primary text-white hover:bg-comprendo-primary-hover"
              >
                Run Scan
              </Button>
            </div>
          )}

          {/* No file selected */}
          {traceId && !fileCanvas && !loading && (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <p className="text-sm text-comprendo-faint">
                Select a file from the sidebar
              </p>
              <p className="text-xs text-comprendo-faint">
                Files with a{" "}
                <span className="text-comprendo-accent">⚡</span> badge have
                important parts
              </p>
            </div>
          )}

          {/* File selected but no flows */}
          {fileCanvas && fileCanvas.flows.length === 0 && !loading && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-comprendo-faint">
                No important parts found in{" "}
                <span className="text-comprendo-muted">
                  {selectedFile?.split("/").pop()}
                </span>
              </p>
            </div>
          )}

          {/* Canvas */}
          {fileCanvas && laidNodes.length > 0 && (
            <>
              <FlowCanvas
                nodes={laidNodes}
                selectedNodeId={selectedNodeId}
                onNodeClick={handleNodeClick}
                pulseNodeIds={pulseNodeIds}
                showOnboardingTooltip={showOnboarding && pulseNodeIds.size > 0}
              />
              <DetailPanel
                node={selectedNode}
                onClose={() => setSelectedNodeId(null)}
              />
                <NodeExplainPanel
                  node={
                    selectedNode
                      ? {
                          id: selectedNode.id,
                          label: selectedNode.label,
                          type: selectedNode.nodeType,
                          filePath: selectedNode.filePath,
                          line: selectedNode.startLine,
                        }
                      : null
                  }
                  owner={owner}
                  repo={repo}
                  onClose={() => setSelectedNodeId(null)}
                />
            </>
          )}

          {/* Tour completion message */}
          {tourComplete && !tourActive && (
            <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-comprendo-border bg-comprendo-surface px-6 py-3 text-sm text-comprendo-text shadow-lg">
              Tour complete. Click any block to explore further.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

