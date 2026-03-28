"use client";

import type { EntryPointGroup } from "@/lib/explorer/types";

interface ExploreSidebarProps {
  groups: EntryPointGroup[];
  totalFlows: number;
  selectedFlowId: string | null;
  onSelectFlow: (flowId: string) => void;
}

const handlerIcons: Record<string, string> = {
  page: "📄",
  layout: "🔲",
  http: "🌐",
  api: "⚡",
  worker: "⚙️",
  job: "📋",
  event: "📡",
  webhook: "🔗",
  cron: "⏰",
  cli: "💻",
  export: "📦",
};

export function ExploreSidebar({
  groups,
  totalFlows,
  selectedFlowId,
  onSelectFlow,
}: ExploreSidebarProps) {
  return (
    <aside className="flex w-[280px] shrink-0 flex-col overflow-y-auto border-r border-comprendo-border bg-comprendo-surface">
      <div className="p-5">
        <h2 className="text-lg font-semibold text-comprendo-text">
          Entry Points
        </h2>
        <p className="mt-1 text-xs text-comprendo-faint">
          {totalFlows} flow{totalFlows !== 1 ? "s" : ""} found
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.key} className="mb-4">
            <p className="mb-2 flex items-center gap-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-comprendo-faint">
              <span>{handlerIcons[group.key] ?? "📦"}</span>
              {group.label}
              <span className="ml-auto text-[10px] tabular-nums text-comprendo-faint">
                {group.items.length}
              </span>
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <button
                  key={item.flowId}
                  onClick={() => onSelectFlow(item.flowId)}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                    selectedFlowId === item.flowId
                      ? "bg-comprendo-elevated text-comprendo-accent"
                      : "text-comprendo-muted hover:bg-comprendo-elevated hover:text-comprendo-text"
                  }`}
                >
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="shrink-0 text-[10px] tabular-nums text-comprendo-faint">
                    {item.totalFunctions}fn
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <p className="px-2 py-8 text-center text-xs text-comprendo-faint">
            No entry points. Run a scan first.
          </p>
        )}
      </div>
    </aside>
  );
}
