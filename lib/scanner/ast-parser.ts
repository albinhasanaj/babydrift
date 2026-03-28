import * as ts from "typescript";
import * as path from "path";
import { FileClassification, NodeType, ParsedFile, ScannedNode } from "./types";

function getRelativePath(filePath: string, repoRoot: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

function makeNodeId(relativePath: string, name: string): string {
  return `${relativePath}::${name}`;
}

function returnsJsx(node: ts.Node): boolean {
  let found = false;
  function walk(n: ts.Node) {
    if (found) return;
    if (
      ts.isJsxElement(n) ||
      ts.isJsxSelfClosingElement(n) ||
      ts.isJsxFragment(n)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(n, walk);
  }
  walk(node);
  return found;
}

function getEnclosingFunctionName(node: ts.Node): string | undefined {
  let current = node.parent;
  while (current) {
    if (ts.isFunctionDeclaration(current) && current.name) {
      return current.name.text;
    }
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
      const init = current.initializer;
      if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
        return current.name.text;
      }
    }
    current = current.parent;
  }
  return undefined;
}

function isNodeExported(node: ts.Node): boolean {
  if (ts.canHaveModifiers(node)) {
    const modifiers = ts.getModifiers(node);
    if (modifiers) {
      return modifiers.some(
        (m) =>
          m.kind === ts.SyntaxKind.ExportKeyword ||
          m.kind === ts.SyntaxKind.DefaultKeyword
      );
    }
  }
  // Check if the parent is an export declaration
  if (node.parent && ts.isVariableStatement(node.parent)) {
    return isNodeExported(node.parent);
  }
  return false;
}

function isVariableStatementExported(stmt: ts.VariableStatement): boolean {
  if (ts.canHaveModifiers(stmt)) {
    const modifiers = ts.getModifiers(stmt);
    if (modifiers) {
      return modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    }
  }
  return false;
}

function classifyFunction(
  name: string,
  hasJsx: boolean,
  fileType: NodeType
): NodeType {
  if (/^use[A-Z]/.test(name)) return "HOOK";
  if (
    fileType === "API" &&
    ["GET", "POST", "PUT", "DELETE", "PATCH"].includes(name)
  )
    return "API";
  if (hasJsx && /^[A-Z]/.test(name)) return "COMPONENT";
  return "FUNCTION";
}

function isAsyncFunction(node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression): boolean {
  if (ts.canHaveModifiers(node)) {
    const modifiers = ts.getModifiers(node);
    if (modifiers) {
      return modifiers.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
    }
  }
  return false;
}

function bindParents(node: ts.Node) {
  ts.forEachChild(node, (child) => {
    (child as any).parent = node;
    bindParents(child);
  });
}

export function parseFile(
  filePath: string,
  classification: FileClassification,
  repoRoot: string,
  program: ts.Program
): ParsedFile {
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) {
    return {
      filePath: classification.filePath,
      nodes: [],
      imports: [],
      exports: [],
      calls: [],
      jsxComponents: [],
    };
  }

  // Bind to local const for closure narrowing
  const sf = sourceFile;

  // Ensure parent pointers are set (TS 6 compatibility)
  bindParents(sf);

  const relativePath = getRelativePath(filePath, repoRoot);
  const nodes: ScannedNode[] = [];
  const imports: Array<{ from: string; names: string[] }> = [];
  const exports: string[] = [];
  const calls: Array<{ caller: string; callee: string }> = [];
  const jsxComponents: string[] = [];

  // First pass: collect all call expression names
  const allCalledNames = new Set<string>();
  function collectCalls(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (ts.isIdentifier(expr)) {
        allCalledNames.add(expr.text);
      } else if (ts.isPropertyAccessExpression(expr)) {
        allCalledNames.add(expr.name.text);
      }
    }
    ts.forEachChild(node, collectCalls);
  }
  collectCalls(sf);

  // Second pass: extract all info
  function visit(node: ts.Node) {
    // IMPORTS
    if (ts.isImportDeclaration(node)) {
      const moduleSpec = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpec)) {
        const from = moduleSpec.text;
        const names: string[] = [];
        const clause = node.importClause;
        if (clause) {
          if (clause.name) {
            names.push(clause.name.text);
          }
          if (clause.namedBindings) {
            if (ts.isNamedImports(clause.namedBindings)) {
              for (const el of clause.namedBindings.elements) {
                names.push(el.name.text);
              }
            } else if (ts.isNamespaceImport(clause.namedBindings)) {
              names.push(clause.namedBindings.name.text);
            }
          }
        }
        imports.push({ from, names });
      }
    }

    // FUNCTION DECLARATIONS
    if (ts.isFunctionDeclaration(node) && node.name) {
      const name = node.name.text;
      const exported = isNodeExported(node);
      const asyncFn = isAsyncFunction(node);
      const hasJsx = returnsJsx(node);
      let type = classifyFunction(name, hasJsx, classification.primaryType);

      const isDrift =
        exported &&
        !allCalledNames.has(name) &&
        type !== "HOOK" &&
        type !== "API" &&
        type !== "PAGE" &&
        type !== "LAYOUT" &&
        type !== "COMPONENT";

      if (isDrift) {
        type = "DRIFT";
      }

      if (exported) exports.push(name);

      nodes.push({
        id: makeNodeId(relativePath, name),
        label: name,
        type,
        filePath: relativePath,
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        isClientComponent: classification.isClientComponent,
        isAsync: asyncFn,
        isExported: exported,
        isDrift,
        driftReason: isDrift ? "Exported but never called" : undefined,
        position: { x: 0, y: 0 },
      });
    }

    // VARIABLE STATEMENTS with arrow/function expression
    if (ts.isVariableStatement(node)) {
      const stmtExported = isVariableStatementExported(node);
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer) {
          if (
            ts.isArrowFunction(decl.initializer) ||
            ts.isFunctionExpression(decl.initializer)
          ) {
            const name = decl.name.text;
            const asyncFn = isAsyncFunction(decl.initializer);
            const hasJsx = returnsJsx(decl.initializer);
            let type = classifyFunction(
              name,
              hasJsx,
              classification.primaryType
            );

            const isDrift =
              stmtExported &&
              !allCalledNames.has(name) &&
              type !== "HOOK" &&
              type !== "API" &&
              type !== "PAGE" &&
              type !== "LAYOUT" &&
              type !== "COMPONENT";

            if (isDrift) {
              type = "DRIFT";
            }

            if (stmtExported) exports.push(name);

            nodes.push({
              id: makeNodeId(relativePath, name),
              label: name,
              type,
              filePath: relativePath,
              line:
                sf.getLineAndCharacterOfPosition(decl.getStart(sf)).line +
                1,
              isClientComponent: classification.isClientComponent,
              isAsync: asyncFn,
              isExported: stmtExported,
              isDrift,
              driftReason: isDrift ? "Exported but never called" : undefined,
              position: { x: 0, y: 0 },
            });
          }
        }
      }
    }

    // JSX usage
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName;
      if (ts.isIdentifier(tagName)) {
        const name = tagName.text;
        if (/^[A-Z]/.test(name) && !jsxComponents.includes(name)) {
          jsxComponents.push(name);
        }
      }
    }

    // CALL EXPRESSIONS
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      let calleeName: string | undefined;
      if (ts.isIdentifier(expr)) {
        calleeName = expr.text;
      } else if (ts.isPropertyAccessExpression(expr)) {
        calleeName = expr.name.text;
      }
      if (calleeName) {
        const caller = getEnclosingFunctionName(node);
        if (caller) {
          calls.push({ caller, callee: calleeName });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);

  return {
    filePath: relativePath,
    nodes,
    imports,
    exports,
    calls,
    jsxComponents,
  };
}
