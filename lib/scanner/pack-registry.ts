import type { FrameworkPack } from "./framework-pack";
import { nextjsPack } from "./packs/nextjs";

// ── Registry of all available framework packs ───────────────────────
// Add new packs here as they are created.

const ALL_PACKS: FrameworkPack[] = [
  nextjsPack,
];

/** Auto-detect which packs apply to a given repo root. */
export function detectPacks(repoRoot: string): FrameworkPack[] {
  return ALL_PACKS.filter((pack) => pack.detect(repoRoot));
}
