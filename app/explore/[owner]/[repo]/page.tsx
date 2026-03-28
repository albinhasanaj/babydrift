"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { FileTreeSidebar } from "@/components/FileTreeSidebar";
import { FlowCanvas } from "@/components/FlowCanvas";
import { DetailPanel } from "@/components/DetailPanel";
import { NodeExplainPanel } from "@/components/NodeExplainPanel";
import { useExploreData } from "@/hooks/useExploreData";
import { useExploreDerived } from "@/hooks/useExploreDerived";
import type { LaidNode } from "@/lib/explorer/types";
import { Loader2, RefreshCw } from "lucide-react";
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

  // 4. Auto-expand root nodes when canvas data arrives
  useEffect(() => {
    if (fileCanvas?.flows) {
      const rootIds = new Set(
        fileCanvas.flows.flatMap((f) => f.tree.map((n) => n.id))
      );
      setExpanded(rootIds);
    }
  }, [fileCanvas]);

  // 5. Node click — toggle expand + select
  const handleNodeClick = useCallback(
    (nodeId: string) => {
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
    [laidNodes]
  );

  const handleScan = useCallback(async () => {
    if (!currentRepoId) return;
    const result = await triggerScan(currentRepoId);
    if (result?.traceId) {
      fetchFileTree(result.traceId);
    }
  }, [currentRepoId, triggerScan, fetchFileTree]);

  return (
    <div className="flex h-screen flex-col bg-comprendo-bg">
      <Navbar showBack breadcrumb={fullName}>
        {traceId && !scanning && (
          <Button
            onClick={handleScan}
            variant="ghost"
            size="sm"
            className="gap-1.5 text-comprendo-muted hover:text-comprendo-text"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Rescan
          </Button>
        )}
      </Navbar>

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
                {scanning ? "Scanning repository..." : "Loading..."}
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
                No scan found for this repository.
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
                entry points
              </p>
            </div>
          )}

          {/* File selected but no flows */}
          {fileCanvas && fileCanvas.flows.length === 0 && !loading && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-comprendo-faint">
                No entry points in{" "}
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
        </main>
      </div>
    </div>
  );
}

