import * as ts from "typescript";
import * as path from "path";
import { glob } from "glob";
import { classifyFile } from "./file-classifier";
import { parseFile } from "./ast-parser";
import { buildGraph } from "./graph-builder";
import { ScanResult } from "./types";

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

  // 3. Classify each file
  const classifications = files.map((f) => ({
    absolutePath: f,
    classification: classifyFile(f, absoluteRoot),
  }));

  // 4. Filter to analyzable files
  const analyzable = classifications.filter((c) => c.classification.shouldAnalyze);

  // 5. Parse each file
  const parsedFiles = analyzable.map((c) =>
    parseFile(c.absolutePath, c.classification, absoluteRoot, program)
  );

  // 6. Build graph
  const result = buildGraph(parsedFiles, absoluteRoot);

  return result;
}

export { classifyFile } from "./file-classifier";
export { parseFile } from "./ast-parser";
export { buildGraph } from "./graph-builder";
export type { ScanResult, ScannedNode, ScannedEdge, ParsedFile, FileClassification, NodeType, EdgeType } from "./types";
