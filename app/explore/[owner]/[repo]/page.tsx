"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { FileTreeSidebar } from "@/components/FileTreeSidebar";
import { FlowCanvas } from "@/components/FlowCanvas";
import { DetailPanel } from "@/components/DetailPanel";
import { NodeExplainPanel } from "@/components/NodeExplainPanel";
import { useExploreData } from "@/hooks/useExploreData";
import { useExploreDerived } from "@/hooks/useExploreDerived";
import { RepoSummaryBanner } from "@/components/RepoSummaryBanner";
import type { LaidNode, FlowTreeNode } from "@/lib/explorer/types";
import { Loader2, RefreshCw, Play, Square, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  // Pending node to highlight after a file load triggered by the chat
  const pendingHighlightRef = useRef<string | null>(null);

  // Onboarding state
  const onboardingKey = `comprendo_onboarded_${owner}_${repo}`;
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem(onboardingKey);
  });
  const [pulseNodeIds, setPulseNodeIds] = useState<Set<string>>(new Set());

  // Tour state (scoped to current file only)
  const [tourActive, setTourActive] = useState(false);
  const [tourNodeIndex, setTourNodeIndex] = useState(0);
  const [tourComplete, setTourComplete] = useState(false);

  // Flatten the raw tree (depth-first) so the tour has a stable ordered list
  // of ALL nodes, not just the currently expanded/visible ones.
  const allTreeNodes = useMemo(() => {
    if (!fileCanvas?.flows) return [];
    const result: { id: string; parentIds: string[] }[] = [];
    const walk = (node: FlowTreeNode, ancestors: string[]) => {
      result.push({ id: node.id, parentIds: ancestors });
      for (const child of node.children) {
        walk(child, [...ancestors, node.id]);
      }
    };
    for (const flow of fileCanvas.flows) {
      for (const root of flow.tree) {
        walk(root, []);
      }
    }
    return result;
  }, [fileCanvas]);

  const { laidNodes } = useExploreDerived(fileCanvas, expanded);

  const selectedNode: LaidNode | null =
    laidNodes.find((n) => n.id === selectedNodeId) ?? null;

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

  // 4. Auto-expand root nodes; if a chat highlight is pending, expand all and select it
  useEffect(() => {
    if (!fileCanvas?.flows) return;

    if (pendingHighlightRef.current) {
      const pending = pendingHighlightRef.current;
      pendingHighlightRef.current = null;
      // Expand every node in the newly loaded file so the target is visible
      const allIds = new Set<string>();
      const collectAll = (node: FlowTreeNode) => {
        allIds.add(node.id);
        node.children.forEach(collectAll);
      };
      fileCanvas.flows.forEach((f) => f.tree.forEach(collectAll));
      setExpanded(allIds);
      setSelectedNodeId(pending);
    } else {
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

  // 5. Handler for Navbar chat: navigate to the node's file and highlight it
  const handleHighlightNode = useCallback(
    (nodeId: string, filePath: string) => {
      if (!traceId) return;
      pendingHighlightRef.current = nodeId;
      setExpanded(new Set());
      setSelectedNodeId(null);
      setSelectedCategory(null);
      fetchFileCanvas(traceId, filePath);
    },
    [traceId, fetchFileCanvas]
  );

  // 6. Node click — toggle expand + select
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

  // ── Tour controls (scoped to current file) ──
  const startTour = useCallback(() => {
    if (allTreeNodes.length === 0) return;
    setTourComplete(false);
    setTourActive(true);
    setTourNodeIndex(0);
    // Expand all ancestors of the first node + the node itself
    const first = allTreeNodes[0];
    setExpanded(new Set([...first.parentIds, first.id]));
    setSelectedNodeId(first.id);
  }, [allTreeNodes]);

  const stopTour = useCallback(() => {
    setTourActive(false);
  }, []);

  // Navigate to a specific tour index, expanding all ancestors so it's visible
  const goToTourIndex = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= allTreeNodes.length) return;
      const entry = allTreeNodes[idx];
      setTourNodeIndex(idx);
      setExpanded((prev) => {
        const next = new Set(prev);
        for (const pid of entry.parentIds) next.add(pid);
        next.add(entry.id);
        return next;
      });
      setSelectedNodeId(entry.id);
    },
    [allTreeNodes]
  );

  const tourNext = useCallback(() => {
    if (!tourActive) return;
    const nextIdx = tourNodeIndex + 1;
    if (nextIdx >= allTreeNodes.length) {
      setTourActive(false);
      setTourComplete(true);
      return;
    }
    goToTourIndex(nextIdx);
  }, [tourActive, tourNodeIndex, allTreeNodes, goToTourIndex]);

  const tourBack = useCallback(() => {
    if (!tourActive || tourNodeIndex <= 0) return;
    goToTourIndex(tourNodeIndex - 1);
  }, [tourActive, tourNodeIndex, goToTourIndex]);

  return (
    <div className="flex h-screen flex-col bg-comprendo-bg">
      <Navbar showBack breadcrumb={fullName} traceId={traceId ?? undefined} onHighlightNode={handleHighlightNode}>
        {traceId && !scanning && (
          <>
            {tourActive && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-comprendo-muted">
                  {tourNodeIndex + 1} / {allTreeNodes.length} blocks
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
            {!tourActive && fileCanvas && allTreeNodes.length > 0 && (
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

      <RepoSummaryBanner traceId={traceId} filePath={selectedFile} />

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

