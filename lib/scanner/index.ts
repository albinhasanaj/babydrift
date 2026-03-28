import * as ts from "typescript";
import * as path from "path";
import { glob } from "glob";
import { classifyFile } from "./file-classifier";
import { parseFile } from "./ast-parser";
import { buildGraph } from "./graph-builder";
import { ScanResult } from "./types";
import { detectPacks } from "./pack-registry";

export async function scanRepo(repoPath: string): Promise<ScanResult> {
  const absoluteRoot = path.resolve(repoPath);

  // 1. Glob all .ts/.tsx files
  const files = await glob("**/*.{ts,tsx}", {
    cwd: absoluteRoot,
    absolute: true,
    ignore: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/*.d.ts",
      "**/*.test.*",
      "**/*.spec.*",
    ],
  });

  // 2. Create ts.Program
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    allowJs: true,
    strict: false,
    noEmit: true,
  };

  const program = ts.createProgram(files, compilerOptions);

  // 3. Auto-detect framework packs
  const packs = detectPacks(absoluteRoot);

  // 4. Classify each file
  const classifications = files.map((f) => ({
    absolutePath: f,
    classification: classifyFile(f, absoluteRoot, packs),
  }));

  // 5. Filter to analyzable files
  const analyzable = classifications.filter((c) => c.classification.shouldAnalyze);

  // 6. Parse each file
  const parsedFiles = analyzable.map((c) =>
    parseFile(c.absolutePath, c.classification, absoluteRoot, program)
  );

  // 7. Build graph (with framework pack edges)
  const result = buildGraph(parsedFiles, absoluteRoot, packs);

  return result;
}

export { classifyFile } from "./file-classifier";
export { parseFile } from "./ast-parser";
export { buildGraph } from "./graph-builder";
export { detectPacks } from "./pack-registry";
export type { FrameworkPack } from "./framework-pack";
export type { ScanResult, ScannedNode, ScannedEdge, ParsedFile, FileClassification, NodeType, EdgeType } from "./types";
