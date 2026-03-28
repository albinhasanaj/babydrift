"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { FlowGraph } from "@/components/FlowGraph";
import { Separator } from "@/components/ui/separator";
import {
  FileCode2,
  GitFork,
  Waypoints,
  AlertTriangle,
  File,
} from "lucide-react";

const mockFiles = [
  "app/page.tsx",
  "app/dashboard/page.tsx",
  "app/settings/page.tsx",
  "components/NavBar.tsx",
  "components/AuthForm.tsx",
  "components/UserTable.tsx",
  "components/RevenueChart.tsx",
  "lib/fetchUserData.ts",
  "lib/authenticateUser.ts",
  "lib/handlePayment.ts",
  "lib/formatLegacyDate.ts",
  "lib/validateInput.ts",
  "app/api/users/route.ts",
  "app/api/auth/route.ts",
  "app/api/payments/route.ts",
  "lib/logger.ts",
  "lib/supabaseClient.ts",
];

const driftWarnings = [
  { icon: AlertTriangle, message: "Unwired function: handlePayment" },
  { icon: AlertTriangle, message: "Dead code: formatLegacyDate" },
  { icon: AlertTriangle, message: "Missing error handler: fetchUserData" },
];

export default function RepoFlowPage() {
  const params = useParams();
  const owner = params.owner as string;
  const repo = params.repo as string;
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  return (
    <div className="flex h-screen flex-col bg-comprendo-bg">
      <Navbar showBack breadcrumb={`${owner}/${repo}`} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-[280px] shrink-0 flex-col overflow-y-auto border-r border-comprendo-border bg-comprendo-surface">
          <div className="p-5">
            <h2 className="text-lg font-semibold text-comprendo-text">
              {repo}
            </h2>
            <p className="mt-1 text-xs text-comprendo-faint">{owner}</p>

            <div className="mt-5 grid grid-cols-1 gap-3">
              <div className="flex items-center gap-2.5">
                <FileCode2 className="h-4 w-4 text-comprendo-accent" />
                <div>
                  <span className="text-sm font-medium text-comprendo-text">
                    24
                  </span>
                  <span className="ml-1 text-xs text-comprendo-muted">
                    files analyzed
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <GitFork className="h-4 w-4 text-comprendo-accent" />
                <div>
                  <span className="text-sm font-medium text-comprendo-text">
                    87
                  </span>
                  <span className="ml-1 text-xs text-comprendo-muted">
                    functions mapped
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Waypoints className="h-4 w-4 text-comprendo-accent" />
                <div>
                  <span className="text-sm font-medium text-comprendo-text">
                    143
                  </span>
                  <span className="ml-1 text-xs text-comprendo-muted">
                    connections
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-comprendo-border" />

          {/* File list */}
          <div className="flex-1 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-comprendo-faint">
              Files
            </p>
            <div className="flex flex-col gap-0.5">
              {mockFiles.map((file) => (
                <button
                  key={file}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                    selectedNode
                      ? "text-comprendo-faint hover:text-comprendo-muted hover:bg-comprendo-elevated"
                      : "text-comprendo-muted hover:text-comprendo-text hover:bg-comprendo-elevated"
                  }`}
                >
                  <File className="h-3.5 w-3.5 shrink-0 text-comprendo-faint" />
                  <span className="truncate">{file}</span>
                </button>
              ))}
            </div>
          </div>

          <Separator className="bg-comprendo-border" />

          {/* Drift warnings */}
          <div className="p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-comprendo-drift">
              Drift Detected
            </p>
            <div className="flex flex-col gap-2">
              {driftWarnings.map((warning) => (
                <div
                  key={warning.message}
                  className="flex items-start gap-2 rounded-lg border border-comprendo-drift/20 bg-comprendo-drift/5 px-3 py-2"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-comprendo-drift" />
                  <span className="text-xs text-comprendo-drift">
                    {warning.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Graph area */}
        <main className="flex-1">
          <FlowGraph onNodeSelect={setSelectedNode} />
        </main>
      </div>
    </div>
  );
}
