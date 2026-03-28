import * as fs from "fs";
import * as path from "path";
import { FileClassification, NodeType } from "./types";

const SKIP_DIRS = ["node_modules", ".next", "dist", ".git"];
const SKIP_EXTENSIONS = [".d.ts"];
const SKIP_PATTERNS = [".test.", ".spec."];
const CONFIG_NAMES = [
  "next.config",
  "postcss.config",
  "tailwind.config",
  "eslint.config",
  "jest.config",
  "tsconfig",
  "components.json",
];

function shouldSkip(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");

  for (const dir of SKIP_DIRS) {
    if (normalized.includes(`/${dir}/`) || normalized.startsWith(`${dir}/`)) {
      return true;
    }
  }

  for (const ext of SKIP_EXTENSIONS) {
    if (normalized.endsWith(ext)) {
      return true;
    }
  }

  for (const pat of SKIP_PATTERNS) {
    if (normalized.includes(pat)) {
      return true;
    }
  }

  const baseName = path.basename(normalized);
  for (const cfg of CONFIG_NAMES) {
    if (baseName.startsWith(cfg)) {
      return true;
    }
  }

  return false;
}

function detectClientDirective(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const firstLines = content.slice(0, 200);
    return /^['"]use client['"];?/m.test(firstLines);
  } catch {
    return false;
  }
}

function classifyByPath(relativePath: string, fileName: string): NodeType {
  const normalized = relativePath.replace(/\\/g, "/");

  // App Router patterns
  if (/^app\/.*\/page\.[tj]sx?$/.test(normalized) || /^app\/page\.[tj]sx?$/.test(normalized)) {
    return "PAGE";
  }
  if (/^app\/.*\/layout\.[tj]sx?$/.test(normalized) || /^app\/layout\.[tj]sx?$/.test(normalized)) {
    return "LAYOUT";
  }
  if (/^app\/api\/.*\/route\.[tj]s$/.test(normalized) || /^app\/api\/route\.[tj]s$/.test(normalized)) {
    return "API";
  }

  // Hooks
  if (/^hooks\/use[A-Z]/.test(normalized) || /use[A-Z][a-zA-Z]*\.[tj]sx?$/.test(fileName)) {
    return "HOOK";
  }

  // Context
  if (normalized.startsWith("context/") || /Context\.[tj]sx?$/.test(fileName)) {
    return "CONTEXT";
  }

  // Components
  if (normalized.startsWith("components/") || /^[A-Z][a-zA-Z]*\.[tj]sx$/.test(fileName)) {
    return "COMPONENT";
  }

  // Utilities
  if (
    normalized.startsWith("lib/") ||
    normalized.startsWith("utils/") ||
    normalized.startsWith("helpers/")
  ) {
    return "UTILITY";
  }

  return "UTILITY";
}

export function classifyFile(filePath: string, repoRoot: string): FileClassification {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath);
  const relativePath = path.relative(repoRoot, absolutePath).replace(/\\/g, "/");
  const fileName = path.basename(relativePath);

  if (shouldSkip(relativePath)) {
    return {
      filePath: relativePath,
      primaryType: "UTILITY",
      isClientComponent: false,
      isServerComponent: false,
      shouldAnalyze: false,
    };
  }

  const isClient = detectClientDirective(absolutePath);
  const primaryType = classifyByPath(relativePath, fileName);

  return {
    filePath: relativePath,
    primaryType,
    isClientComponent: isClient,
    isServerComponent: !isClient,
    shouldAnalyze: true,
  };
}
