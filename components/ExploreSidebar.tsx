"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { EntryPointGroup, EntryPointItem } from "@/lib/explorer/types";

interface ExploreSidebarProps {
  groups: EntryPointGroup[];
  totalFlows: number;
  selectedFlowId: string | null;
  onSelectFlow: (flowId: string) => void;
}

// ── Meta-category definitions ───────────────────────────────────────

interface MetaCategory {
  key: string;
  label: string;
  icon: string;
  types: string[];
}

const META_CATEGORIES: MetaCategory[] = [
  { key: "ui",         label: "Pages & Layouts", icon: "🖥️",  types: ["page", "layout"] },
  { key: "api",        label: "API & Routes",    icon: "🌐",  types: ["http", "api", "webhook"] },
  { key: "background", label: "Background",      icon: "⚙️",  types: ["worker", "job", "cron", "event"] },
  { key: "other",      label: "Other",           icon: "📦",  types: ["cli", "export"] },
];

const HANDLER_ICONS: Record<string, string> = {
  page: "📄", layout: "🔲", http: "🌐", api: "⚡",
  worker: "⚙️", job: "📋", event: "📡", webhook: "🔗",
  cron: "⏰", cli: "💻", export: "📦",
};

// ── Collapsible meta-group ──────────────────────────────────────────

function MetaGroup({
  meta,
  items,
  selectedFlowId,
  onSelectFlow,
}: {
  meta: MetaCategory;
  items: EntryPointItem[];
  selectedFlowId: string | null;
  onSelectFlow: (flowId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-comprendo-elevated"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 text-comprendo-faint transition-transform duration-150 ${open ? "rotate-90" : ""}`}
        />
        <span className="text-sm">{meta.icon}</span>
        <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-comprendo-faint">
          {meta.label}
        </span>
        <span className="text-[10px] tabular-nums text-comprendo-faint">{items.length}</span>
      </button>

      {open && (
        <div className="mt-0.5 flex flex-col gap-0.5 pl-4">
          {items.map((item) => (
            <button
              key={item.flowId}
              onClick={() => onSelectFlow(item.flowId)}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                selectedFlowId === item.flowId
                  ? "bg-comprendo-elevated text-comprendo-accent"
                  : "text-comprendo-muted hover:bg-comprendo-elevated hover:text-comprendo-text"
              }`}
            >
              <span className="shrink-0 text-[10px]">
                {HANDLER_ICONS[item.handlerType] ?? "📦"}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              <span className="shrink-0 text-[10px] tabular-nums text-comprendo-faint">
                {item.totalFunctions}fn
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────

export function ExploreSidebar({
  groups,
  totalFlows,
  selectedFlowId,
  onSelectFlow,
}: ExploreSidebarProps) {
  // Flatten all items keyed by handlerType for meta-grouping
  const byType = new Map<string, EntryPointItem[]>();
  for (const group of groups) {
    byType.set(group.key, group.items);
  }

  // Build meta-groups, only include those that have items
  const metaGroups = META_CATEGORIES.map((meta) => ({
    meta,
    items: meta.types.flatMap((t) => byType.get(t) ?? []),
  })).filter(({ items }) => items.length > 0);

  // Collect any handler types not covered by a meta-category
  const coveredTypes = new Set(META_CATEGORIES.flatMap((m) => m.types));
  const uncoveredItems = groups
    .filter((g) => !coveredTypes.has(g.key))
    .flatMap((g) => g.items);

  return (
    <aside className="flex w-[280px] shrink-0 flex-col overflow-y-auto border-r border-comprendo-border bg-comprendo-surface">
      <div className="p-5">
        <h2 className="text-lg font-semibold text-comprendo-text">
          Important Parts
        </h2>
        <p className="mt-1 text-xs text-comprendo-faint">
          {totalFlows} item{totalFlows !== 1 ? "s" : ""} found
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {metaGroups.map(({ meta, items }) => (
          <MetaGroup
            key={meta.key}
            meta={meta}
            items={items}
            selectedFlowId={selectedFlowId}
            onSelectFlow={onSelectFlow}
          />
        ))}

        {uncoveredItems.length > 0 && (
          <MetaGroup
            meta={{ key: "misc", label: "Misc", icon: "📦", types: [] }}
            items={uncoveredItems}
            selectedFlowId={selectedFlowId}
            onSelectFlow={onSelectFlow}
          />
        )}

        {groups.length === 0 && (
          <p className="px-2 py-8 text-center text-xs text-comprendo-faint">
            No important parts found yet.
          </p>
        )}
      </div>
    </aside>
  );
}
