"use client";

import { useState, useCallback } from "react";
import type {
  EntryPointGroup,
  FlowTreeResponse,
  RepoRecord,
  FileTreeNode,
  FileCanvasResponse,
} from "@/lib/explorer/types";

interface ExploreData {
  repos: (RepoRecord & { latestTraceId: string | null })[];
  currentRepoId: string | null;
  traceId: string | null;
  groups: EntryPointGroup[];
  totalFlows: number;
  fileTree: FileTreeNode | null;
  fileCanvas: FileCanvasResponse | null;
  flowTree: FlowTreeResponse | null;
  selectedFlowId: string | null;
  selectedFile: string | null;
  loading: boolean;
  scanning: boolean;
  error: string | null;
}

export function useExploreData() {
  const [data, setData] = useState<ExploreData>({
    repos: [],
    currentRepoId: null,
    traceId: null,
    groups: [],
    totalFlows: 0,
    fileTree: null,
    fileCanvas: null,
    flowTree: null,
    selectedFlowId: null,
    selectedFile: null,
    loading: false,
    scanning: false,
    error: null,
  });

  const connectRepo = useCallback(async (fullName: string) => {
    setData((d) => ({ ...d, loading: true, error: null }));
    try {
      const res = await fetch("/api/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName }),
      });
      if (!res.ok) throw new Error(await res.text());
      const body = await res.json();
      setData((d) => ({
        ...d,
        currentRepoId: body.repositoryId,
        traceId: body.latestTraceId ?? null,
        loading: false,
      }));
      return body;
    } catch (err) {
      setData((d) => ({
        ...d,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to connect repo",
      }));
      return null;
    }
  }, []);

  const fetchRepos = useCallback(async () => {
    setData((d) => ({ ...d, loading: true, error: null }));
    try {
      const res = await fetch("/api/repositories");
      if (!res.ok) throw new Error("Failed to fetch repos");
      const repos = await res.json();
      setData((d) => ({ ...d, repos, loading: false }));
    } catch (err) {
      setData((d) => ({
        ...d,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch repos",
      }));
    }
  }, []);

  const triggerScan = useCallback(async (repoId: string) => {
    setData((d) => ({ ...d, scanning: true, error: null }));
    try {
      const res = await fetch("/api/repo_scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_id: repoId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const body = await res.json();
      setData((d) => ({
        ...d,
        traceId: body.traceId,
        scanning: false,
      }));
      return body;
    } catch (err) {
      setData((d) => ({
        ...d,
        scanning: false,
        error: err instanceof Error ? err.message : "Scan failed",
      }));
      return null;
    }
  }, []);

  const fetchFileTree = useCallback(async (traceId: string) => {
    setData((d) => ({ ...d, loading: true, error: null }));
    try {
      const res = await fetch(`/api/explore/${traceId}/files`);
      if (!res.ok) throw new Error("Failed to fetch file tree");
      const body = await res.json();
      setData((d) => ({ ...d, fileTree: body.tree, loading: false }));
    } catch (err) {
      setData((d) => ({
        ...d,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch file tree",
      }));
    }
  }, []);

  const fetchFileCanvas = useCallback(
    async (traceId: string, filePath: string, depth = 10) => {
      setData((d) => ({
        ...d,
        loading: true,
        error: null,
        selectedFile: filePath,
        fileCanvas: null,
      }));
      try {
        const res = await fetch(
          `/api/explore/${traceId}/file_canvas?file_path=${encodeURIComponent(filePath)}&depth=${depth}`
        );
        if (!res.ok) throw new Error("Failed to fetch file canvas");
        const body: FileCanvasResponse = await res.json();
        setData((d) => ({ ...d, fileCanvas: body, loading: false }));
      } catch (err) {
        setData((d) => ({
          ...d,
          loading: false,
          error:
            err instanceof Error ? err.message : "Failed to fetch file canvas",
        }));
      }
    },
    []
  );

  const fetchEntryPoints = useCallback(async (traceId: string) => {
    setData((d) => ({ ...d, loading: true, error: null }));
    try {
      const res = await fetch(`/api/explore/${traceId}/entry_points`);
      if (!res.ok) throw new Error("Failed to fetch entry points");
      const body = await res.json();
      setData((d) => ({
        ...d,
        traceId,
        groups: body.groups,
        totalFlows: body.totalFlows,
        loading: false,
      }));
    } catch (err) {
      setData((d) => ({
        ...d,
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch entry points",
      }));
    }
  }, []);

  const fetchFlowTree = useCallback(
    async (traceId: string, flowId: string, depth = 10) => {
      setData((d) => ({
        ...d,
        loading: true,
        error: null,
        selectedFlowId: flowId,
      }));
      try {
        const res = await fetch(
          `/api/explore/${traceId}/flow_tree?flow_id=${encodeURIComponent(flowId)}&depth=${depth}`
        );
        if (!res.ok) throw new Error("Failed to fetch flow tree");
        const body: FlowTreeResponse = await res.json();
        setData((d) => ({ ...d, flowTree: body, loading: false }));
      } catch (err) {
        setData((d) => ({
          ...d,
          loading: false,
          error:
            err instanceof Error ? err.message : "Failed to fetch flow tree",
        }));
      }
    },
    []
  );

  return {
    ...data,
    connectRepo,
    fetchRepos,
    triggerScan,
    fetchFileTree,
    fetchFileCanvas,
    fetchEntryPoints,
    fetchFlowTree,
  };
}
