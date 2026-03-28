import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as ts from "typescript";
import { parseFile } from "@/lib/scanner/ast-parser";
import { FileClassification } from "@/lib/scanner/types";

function createProgram(filePath: string): ts.Program {
  return ts.createProgram([filePath], {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    allowJs: true,
    strict: false,
    noEmit: true,
  });
}

function makeClassification(
  filePath: string,
  overrides: Partial<FileClassification> = {}
): FileClassification {
  return {
    filePath,
    primaryType: "UTILITY",
    isClientComponent: false,
    isServerComponent: true,
    shouldAnalyze: true,
    ...overrides,
  };
}

describe("parseFile", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ast-parser-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeAndParse(
    fileName: string,
    content: string,
    classOverrides: Partial<FileClassification> = {}
  ) {
    const filePath = path.join(tmpDir, fileName);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    const program = createProgram(filePath);
    const classification = makeClassification(fileName, classOverrides);
    return parseFile(filePath, classification, tmpDir, program);
  }

  test("detects exported function declaration → isExported: true", () => {
    const result = writeAndParse(
      "lib/utils.ts",
      `export function greet() { return "hello"; }`
    );
    expect(result.nodes.length).toBeGreaterThanOrEqual(1);
    const node = result.nodes.find((n) => n.label === "greet");
    expect(node).toBeDefined();
    expect(node!.isExported).toBe(true);
  });

  test("detects async function → isAsync: true", () => {
    const result = writeAndParse(
      "lib/fetch.ts",
      `export async function fetchData() { return await fetch("/api"); }`
    );
    const node = result.nodes.find((n) => n.label === "fetchData");
    expect(node).toBeDefined();
    expect(node!.isAsync).toBe(true);
  });

  test("detects arrow function component (returns JSX, uppercase) → COMPONENT", () => {
    const result = writeAndParse(
      "components/Card.tsx",
      `export const Card = () => { return <div>Hello</div>; };`
    );
    const node = result.nodes.find((n) => n.label === "Card");
    expect(node).toBeDefined();
    expect(node!.type).toBe("COMPONENT");
  });

  test("detects hook (name starts with use + uppercase) → HOOK", () => {
    const result = writeAndParse(
      "hooks/useAuth.ts",
      `export function useAuth() { return { user: null }; }`
    );
    const node = result.nodes.find((n) => n.label === "useAuth");
    expect(node).toBeDefined();
    expect(node!.type).toBe("HOOK");
  });

  test("detects API handler named GET in API-classified file → API", () => {
    const result = writeAndParse(
      "app/api/users/route.ts",
      `export async function GET() { return Response.json({}); }`,
      { primaryType: "API" }
    );
    const node = result.nodes.find((n) => n.label === "GET");
    expect(node).toBeDefined();
    expect(node!.type).toBe("API");
  });

  test("detects import statement → appears in imports array", () => {
    const result = writeAndParse(
      "lib/utils.ts",
      `import { useState } from "react";\nexport function foo() { useState(); }`
    );
    expect(result.imports.length).toBeGreaterThanOrEqual(1);
    const reactImport = result.imports.find((i) => i.from === "react");
    expect(reactImport).toBeDefined();
    expect(reactImport!.names).toContain("useState");
  });

  test("detects call expression → appears in calls array", () => {
    const result = writeAndParse(
      "lib/utils.ts",
      `function helper() { return 1; }\nexport function main() { helper(); }`
    );
    const call = result.calls.find(
      (c) => c.caller === "main" && c.callee === "helper"
    );
    expect(call).toBeDefined();
  });

  test("detects JSX usage of uppercase component → appears in jsxComponents", () => {
    const result = writeAndParse(
      "components/App.tsx",
      `import React from "react";\nexport function App() { return <Button />; }`
    );
    expect(result.jsxComponents).toContain("Button");
  });

  test("exported function never called elsewhere → type DRIFT", () => {
    const result = writeAndParse(
      "lib/unused.ts",
      `export function unusedFn() { return 42; }`
    );
    const node = result.nodes.find((n) => n.label === "unusedFn");
    expect(node).toBeDefined();
    expect(node!.type).toBe("DRIFT");
    expect(node!.isDrift).toBe(true);
  });

  test("function not exported → not DRIFT even if never called", () => {
    const result = writeAndParse(
      "lib/internal.ts",
      `function internalFn() { return 42; }`
    );
    const node = result.nodes.find((n) => n.label === "internalFn");
    expect(node).toBeDefined();
    expect(node!.type).not.toBe("DRIFT");
    expect(node!.isDrift).toBe(false);
  });
});
