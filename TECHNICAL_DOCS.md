# Comprendo — Technical Documentation

Comprehensive technical documentation of Comprendo's architecture, design decisions, internal systems, and implementation details. Written for jury evaluation and developer onboarding.

---

## Table of Contents

- [1. Product Overview](#1-product-overview)
  - [1.1 Problem Statement](#11-problem-statement)
  - [1.2 Solution](#12-solution)
  - [1.3 User Journey](#13-user-journey)
- [2. System Architecture](#2-system-architecture)
  - [2.1 High-Level Architecture](#21-high-level-architecture)
  - [2.2 Data Flow](#22-data-flow)
  - [2.3 Technology Choices & Rationale](#23-technology-choices--rationale)
- [3. Static Analysis Engine](#3-static-analysis-engine)
  - [3.1 Pipeline Overview](#31-pipeline-overview)
  - [3.2 File Discovery](#32-file-discovery)
  - [3.3 Framework Pack System](#33-framework-pack-system)
  - [3.4 File Classification](#34-file-classification)
  - [3.5 AST Parsing](#35-ast-parsing)
  - [3.6 Graph Building](#36-graph-building)
  - [3.7 Type System](#37-type-system)
- [4. Explorer Data Layer](#4-explorer-data-layer)
  - [4.1 In-Memory Store](#41-in-memory-store)
  - [4.2 Scan-to-Trace Conversion](#42-scan-to-trace-conversion)
  - [4.3 Data Transforms](#43-data-transforms)
- [5. AI Integration](#5-ai-integration)
  - [5.1 Model & SDK](#51-model--sdk)
  - [5.2 Code Explanation](#52-code-explanation)
  - [5.3 Repository & File Summaries](#53-repository--file-summaries)
  - [5.4 Codebase Q&A with Node Resolution](#54-codebase-qa-with-node-resolution)
  - [5.5 Security: Path Traversal Protection](#55-security-path-traversal-protection)
- [6. Frontend Architecture](#6-frontend-architecture)
  - [6.1 Page Structure](#61-page-structure)
  - [6.2 Canvas Rendering](#62-canvas-rendering)
  - [6.3 Layout Algorithm](#63-layout-algorithm)
  - [6.4 State Management](#64-state-management)
  - [6.5 Pan & Zoom](#65-pan--zoom)
- [7. Authentication & GitHub Integration](#7-authentication--github-integration)
  - [7.1 OAuth Flow](#71-oauth-flow)
  - [7.2 Token Management](#72-token-management)
  - [7.3 Repository Operations](#73-repository-operations)
- [8. Database](#8-database)
  - [8.1 Technology Choice](#81-technology-choice)
  - [8.2 Schema](#82-schema)
  - [8.3 Migrations](#83-migrations)
- [9. Testing](#9-testing)
  - [9.1 Strategy](#91-strategy)
  - [9.2 Test Suites](#92-test-suites)
- [10. Frameworks, Libraries & Tools](#10-frameworks-libraries--tools)
- [11. Design Decisions & Trade-offs](#11-design-decisions--trade-offs)

---

## 1. Product Overview

### 1.1 Problem Statement

Developers joining a new project — or returning to one after time away — face a steep learning curve. Understanding how pages connect to components, which hooks manage state, how API routes process data, and where utility functions fit in the architecture requires reading through dozens of files. Existing tools (IDE file trees, GitHub code browse) show files in isolation without revealing the relationships between them.

### 1.2 Solution

Comprendo solves this by **statically analyzing** a TypeScript/React codebase and rendering the complete call graph as an **interactive visual flow**. Starting from every entry point (page, API route, layout), it traces the dependency chain through components, hooks, and utilities — then displays the result on a pannable, zoomable canvas. Users can click any function node to get an **AI-generated plain-English explanation** of what that code does.

### 1.3 User Journey

```
1. Sign in with GitHub
         │
         ▼
2. See all your repositories listed
         │
         ▼
3. Connect a repository
         │
         ▼
4. Click "Scan" → repo is cloned & statically analyzed
         │
         ▼
5. Redirected to the Explorer view:
   ┌─────────────────────────────────────────────────────────┐
   │  ┌──────────┐  ┌────────────────────┐  ┌────────────┐  │
   │  │ Sidebar   │  │   Flow Canvas      │  │  Detail    │  │
   │  │           │  │                    │  │  Panel     │  │
   │  │ • Entry   │  │  ┌───┐    ┌───┐   │  │            │  │
   │  │   points  │  │  │ A │───►│ B │   │  │ • Code     │  │
   │  │ • File    │  │  └───┘    └─┬─┘   │  │ • AI       │  │
   │  │   tree    │  │            │      │  │   explain  │  │
   │  │           │  │         ┌──▼──┐   │  │ • Source    │  │
   │  │           │  │         │  C  │   │  │   link     │  │
   │  │           │  │         └─────┘   │  │            │  │
   │  └──────────┘  └────────────────────┘  └────────────┘  │
   └─────────────────────────────────────────────────────────┘
         │
         ▼
6. Click any node → see AI explanation
7. Use "Ask" to query the entire codebase in natural language
```

---

## 2. System Architecture

### 2.1 High-Level Architecture

Comprendo is a **monolithic Next.js 16 application** using the App Router. The frontend and backend live in the same codebase, deployed as a single unit.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                              │
│                                                                         │
│  React 19 + React Flow + Framer Motion + Tailwind CSS + shadcn/ui      │
│                                                                         │
│  Pages:                                                                 │
│    /           → Landing (marketing + sign-in)                          │
│    /repos      → Repository listing                                     │
│    /explore/*  → Interactive code explorer                              │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTP (fetch)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     SERVER (Next.js API Routes)                         │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │    Auth       │  │   Scanner    │  │    AI        │                  │
│  │  (NextAuth)   │  │  (TS AST)    │  │  (Gemini)    │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                  │                  │                          │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐                  │
│  │   SQLite DB   │  │  In-Memory   │  │ Gemini API   │                  │
│  │  (users,repos)│  │   Store      │  │ (streaming)  │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                           │                                             │
│                    ┌──────▼───────┐                                     │
│                    │  Filesystem   │                                     │
│                    │  (cloned      │                                     │
│                    │   repos)      │                                     │
│                    └──────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

The system follows a clear three-stage pipeline: **Scan → Store → Explore**.

**Stage 1: Scan**
```
GitHub Repo → git clone → Filesystem → glob *.ts/*.tsx → TypeScript Compiler API
→ AST parsing → File classification → Graph building → ScanResult
```

**Stage 2: Store**
```
ScanResult → scanResultToStaticTrace() → NamedFlow[] → TraceRecord → In-Memory Store
```

**Stage 3: Explore**
```
TraceRecord → transforms (groupEntryPoints, flowToTree, buildFileTree, getFlowsForFile)
→ API responses → React Flow canvas rendering
```

### 2.3 Technology Choices & Rationale

| Choice | Why |
|---|---|
| **Next.js 16 (App Router)** | Unified frontend/backend in one codebase. Server Components reduce client JS. API routes eliminate the need for a separate backend service. |
| **TypeScript Compiler API for analysis** | First-party TypeScript parser — 100% accurate AST for TS/TSX files. No third-party parser dependencies. Resolves imports using the same algorithm as `tsc`. |
| **In-memory store (not DB) for traces** | Trace data is large and frequently accessed during exploration. In-memory Maps provide O(1) lookups with zero serialization overhead. Survives Next.js HMR via `globalThis`. |
| **SQLite (better-sqlite3)** | Zero-config embedded DB. No external database server to set up. Synchronous API avoids callback complexity. WAL mode for concurrent reads. |
| **Google Gemini 2.5 Flash** | Fast inference latency for streaming UI. Generous context window handles large code blocks and full trace indexes. Free tier available for development. |
| **React Flow (@xyflow/react)** | Production-grade graph rendering with built-in pan/zoom, edge routing, and custom node support. Handles hundreds of nodes smoothly. |
| **Streaming AI responses** | Users see the explanation forming in real-time rather than waiting for a complete response. Reduces perceived latency. |

---

## 3. Static Analysis Engine

The scanner lives in `lib/scanner/` and is the core differentiator of Comprendo. It performs **static analysis only** — no code is executed, no runtime instrumentation is needed.

### 3.1 Pipeline Overview

```
scanRepo(repoPath)
    │
    ├─ 1. glob("**/*.{ts,tsx}") ──────────────────────── File Discovery
    │
    ├─ 2. detectPacks(repoRoot) ──────────────────────── Framework Detection
    │
    ├─ 3. classifyFile(filePath) for each file ────────── File Classification
    │      └─ filter to shouldAnalyze === true
    │
    ├─ 4. ts.createProgram(files) ─────────────────────── TypeScript Program
    │
    ├─ 5. parseFile(sourceFile, program) for each ─────── AST Parsing
    │      └─ returns ParsedFile { nodes, imports, calls, exports, jsxComponents }
    │
    └─ 6. buildGraph(parsedFiles, packs) ──────────────── Graph Building
           └─ returns ScanResult { nodes, edges, stats }
```

### 3.2 File Discovery

Uses `glob` to find all TypeScript source files:

**Included:** `**/*.ts`, `**/*.tsx`

**Excluded:**
- `node_modules/`
- `.next/`
- `dist/`
- `*.d.ts` (declaration files)
- `*.test.*`, `*.spec.*` (test files)

### 3.3 Framework Pack System

The pack system (`framework-pack.ts` + `pack-registry.ts`) is a plugin architecture that allows Comprendo to understand framework-specific conventions.

**Interface:**

```typescript
interface FrameworkPack {
  name: string;
  detect(repoRoot: string): boolean;           // Does this framework exist here?
  classifyFile(relativePath: string, fileName: string): NodeType | null;  // Framework-specific classification
  skipDirs(): string[];                          // Extra directories to skip
  extraEdges(nodes: ScannedNode[], edges: ScannedEdge[], repoRoot: string): ScannedEdge[];  // Synthetic edges
}
```

**Currently implemented:** Next.js App Router pack (`packs/nextjs.ts`).

**Next.js pack behavior:**

- **Detection:** Checks for `next.config.ts` / `next.config.js` / `next.config.mjs` at the repo root. Also checks one level deep for monorepo structures.
- **Classification:** Maps special Next.js filenames:
  - `page.tsx` → `PAGE`
  - `layout.tsx` → `LAYOUT`
  - `route.ts` → `API`
  - `loading.tsx`, `error.tsx`, `not-found.tsx`, `template.tsx`, `default.tsx` → `COMPONENT`
- **Skip dirs:** Adds `.next` to the exclusion list.
- **Extra edges:** Synthesizes `RENDERS` edges from layouts to the pages they wrap (following the App Router file-system nesting convention).

### 3.4 File Classification

The file classifier (`file-classifier.ts`) assigns each file a `NodeType` based on its path pattern:

| Pattern | Classification | Logic |
|---|---|---|
| `app/**/page.tsx` | `PAGE` | Next.js page component |
| `app/**/layout.tsx` | `LAYOUT` | Next.js layout wrapper |
| `app/api/**/route.ts` | `API` | Next.js API route handler |
| `hooks/use*.ts` | `HOOK` | Custom React hook |
| `context/**` | `CONTEXT` | React context provider |
| `components/**` or PascalCase `.tsx` | `COMPONENT` | React component |
| `lib/`, `utils/`, `helpers/` | `UTILITY` | Utility function |

**Client component detection:** Reads the first 200 bytes of each file to check for the `"use client"` directive.

**Output:**

```typescript
interface FileClassification {
  filePath: string;
  primaryType: NodeType;
  isClientComponent: boolean;
  isServerComponent: boolean;
  shouldAnalyze: boolean;        // false for non-TS files, declaration files, etc.
}
```

### 3.5 AST Parsing

The AST parser (`ast-parser.ts`) uses the **TypeScript Compiler API** (`ts.createProgram`, `ts.forEachChild`) to walk each file's syntax tree.

**What it extracts:**

| Extracted Data | AST Nodes Visited |
|---|---|
| **Function declarations** | `FunctionDeclaration`, `ArrowFunction`, `FunctionExpression` |
| **Class components** | `ClassDeclaration` extending `React.Component` |
| **Variable declarations** | `VariableStatement` with initializers (arrow functions, `forwardRef`, `memo`, `cva`) |
| **Imports** | `ImportDeclaration` — named, default, and namespace imports |
| **Exports** | `ExportDeclaration`, `ExportAssignment`, export modifiers on declarations |
| **Call sites** | `CallExpression` — records caller function, callee name, and line number |
| **JSX usage** | `JsxOpeningElement`, `JsxSelfClosingElement` — records which components are rendered |

**Node ID format:** `"{relativePath}::{functionName}"` — e.g., `"app/page.tsx::HomePage"`

**Special handling:**
- `forwardRef(Component)` → classified as `COMPONENT`
- `memo(Component)` → classified as `COMPONENT`
- `cva(...)` → classified as `COMPONENT` (class-variance-authority pattern)
- Functions with PascalCase names in `.tsx` files → classified as `COMPONENT`
- Functions named `use*` → classified as `HOOK`
- `async function` → `isAsync: true`
- Exported functions → `isExported: true`

**Output:**

```typescript
interface ParsedFile {
  filePath: string;
  nodes: ScannedNode[];
  imports: { source: string; specifiers: string[] }[];
  exports: string[];
  calls: { caller: string; callee: string; line: number }[];
  jsxComponents: { parent: string; component: string }[];
}
```

### 3.6 Graph Building

The graph builder (`graph-builder.ts`) takes all `ParsedFile` results and constructs a unified dependency graph.

**Edge resolution process:**

1. **Import edges (`IMPORTS`):** For each import statement, resolve the source path to an actual file in the project. Creates an edge from the importing file's main node to the imported file's main node.

2. **Call edges (`CALLS`):** For each call site, look up the callee by name across all parsed files. If found, create an edge from the caller node to the callee node.

3. **Render edges (`RENDERS`):** For each JSX component usage, look up the component by name. If found, create an edge from the parent component to the rendered component.

4. **Framework edges:** After all standard edges are built, invoke each detected framework pack's `extraEdges()` method to inject framework-specific relationships (e.g., Next.js layout → page wrapping).

**Layout positioning:**

Nodes are assigned Y-positions based on their type to create a layered graph:

| Layer | Node Types | Y Position |
|---|---|---|
| 0 | `PAGE` | Top |
| 1 | `API` | |
| 2 | `COMPONENT`, `LAYOUT` | |
| 3 | `HOOK`, `CONTEXT` | |
| 4 | `FUNCTION` | |
| 5 | `UTILITY` | Bottom |

X positions are distributed evenly within each layer.

### 3.7 Type System

```typescript
// Node types — what kind of code entity this is
type NodeType = "PAGE" | "LAYOUT" | "COMPONENT" | "FUNCTION"
              | "API" | "UTILITY" | "HOOK" | "CONTEXT" | "DRIFT";

// Edge types — what kind of relationship exists
type EdgeType = "IMPORTS" | "CALLS" | "RENDERS" | "DATA_FLOW";

interface ScannedNode {
  id: string;              // "{filePath}::{functionName}"
  label: string;           // Human-readable name
  type: NodeType;
  filePath: string;
  line?: number;
  isClientComponent?: boolean;
  isAsync?: boolean;
  isExported?: boolean;
  isDrift?: boolean;       // Architectural drift flag
  driftReason?: string;
  group?: string;
  position: { x: number; y: number };
}

interface ScannedEdge {
  id: string;              // "{source}->{target}"
  source: string;          // Source node ID
  target: string;          // Target node ID
  type: EdgeType;
}

interface ScanResult {
  nodes: ScannedNode[];
  edges: ScannedEdge[];
  stats: {
    filesAnalyzed: number;
    functionsFound: number;
    componentsFound: number;
    connectionsFound: number;
    driftIssues: number;
  };
}
```

---

## 4. Explorer Data Layer

The explorer (`lib/explorer/`) converts raw scan results into structured data that the frontend can render.

### 4.1 In-Memory Store

The store (`store.ts`) uses `globalThis`-attached Maps to persist data across Next.js hot-module reloads during development.

```typescript
// Attached to globalThis to survive HMR
const repoStore = new Map<string, RepoRecord>();    // __explorerRepos
const traceStore = new Map<string, TraceRecord>();   // __explorerTraces
```

**Exported functions:**

| Function | Description |
|---|---|
| `getRepo(id)` | Look up a repo by internal ID |
| `getRepoByFullName(fullName)` | Look up by `"owner/repo"` |
| `getAllRepos()` | Return all registered repos |
| `upsertRepo(fullName)` | Create or update a repo record |
| `getTrace(id)` | Look up a trace by ID |
| `createTrace(repositoryId, staticTrace)` | Store a new trace, update repo's `latestTraceId` |

**Data types:**

```typescript
interface RepoRecord {
  id: string;
  fullName: string;
  latestTraceId: string | null;
}

interface TraceRecord {
  id: string;
  repositoryId: string;
  staticTrace: StaticTrace | null;
}
```

### 4.2 Scan-to-Trace Conversion

`scanResultToStaticTrace(scan: ScanResult): StaticTrace` converts the flat graph into hierarchical **named flows**.

**Algorithm:**

1. **Identify entry points:** Nodes of type `PAGE`, `LAYOUT`, `API`, or any exported `FUNCTION`/`COMPONENT`.

2. **For each entry point, BFS the graph:**
   - Start at the entry point node.
   - Follow outgoing edges (calls, renders, imports) up to **depth 8**.
   - Build a `NamedFlowStep` tree preserving the call hierarchy.
   - Avoid cycles by tracking visited node IDs.

3. **Assign handler types:**

   | Node Type | Handler Type |
   |---|---|
   | `PAGE` | `page` |
   | `LAYOUT` | `layout` |
   | `API` | `http` |
   | Exported `FUNCTION` | `export` |
   | Exported `COMPONENT` | `export` |

4. **Generate IDs:** `Math.random().toString(36).slice(2) + Date.now().toString(36)`

**Output:**

```typescript
interface StaticTrace {
  namedFlows: NamedFlow[];
}

interface NamedFlow {
  flowId: string;
  entryPointId: string;
  label: string;
  handlerType: FlowHandlerType;
  steps: NamedFlowStep[];
}

interface NamedFlowStep {
  id: string;
  label: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
  pureCode: boolean;
  callDepth: number;
  treeDepth: number;
  nodeType: "function" | "branch" | "section";
  children: NamedFlowStep[];
}
```

### 4.3 Data Transforms

`transforms.ts` reshapes trace data for different UI views:

**`groupEntryPoints(namedFlows)`**

Groups flows by `handlerType` with human-readable labels:

```
page    → "Pages"
layout  → "Layouts"
http    → "API Routes"
api     → "API Routes"
export  → "Exports"
worker  → "Workers"
...
```

**`flowToTree(flow, maxDepth)`**

Converts a `NamedFlow` into a `FlowTreeNode[]` tree, respecting the `maxDepth` limit. Used by the `/flow_tree` endpoint.

**`buildFileTree(namedFlows)`**

Constructs a filesystem tree (`FileTreeNode`) from all file paths referenced in the flows. Each file node includes the `flowId` if it's an entry point. Used by the `/files` endpoint.

**`getFlowsForFile(flows, filePath, maxDepth)`**

Filters flows whose entry point matches `filePath`, then converts each to a `FileCanvasFlow`. Used by the `/file_canvas` endpoint.

---

## 5. AI Integration

### 5.1 Model & SDK

| Property | Value |
|---|---|
| **Model** | Google Gemini 2.5 Flash |
| **SDK** | `@google/generative-ai` |
| **Delivery** | Streaming (`generateContentStream`) |
| **Response format** | `text/plain` streamed via `ReadableStream` |
| **API key** | `GEMINI_API_KEY` environment variable |

All three AI features create a new `GoogleGenerativeAI` instance per request and use `generateContentStream` to stream the response directly to the HTTP response.

### 5.2 Code Explanation

**Endpoint:** `POST /api/explain`

**Process:**

1. Resolve file path: `$DATA_DIR/repos/{owner}/{repo}/{filePath}`.
2. **Path traversal protection:** Verify the resolved path starts with the repo directory.
3. Read the source file.
4. Extract the code block starting at the specified `line`:
   - Uses brace-balanced parsing to find the complete function/component body.
   - Caps at 100 lines maximum.
5. Send to Gemini with a system prompt requesting:
   - Plain English explanation, beginner-friendly, no jargon.
   - Contextual awareness of the function's role (type: page, component, hook, etc.).
6. Stream the response back.

### 5.3 Repository & File Summaries

**Endpoint:** `POST /api/explain/summary`

**Two modes:**

- **File summary:** When `filePath` is provided, generates a user-facing description of what the page/component does — what a user sees and can interact with.
- **Repo summary:** When no `filePath`, feeds the entire flow structure (all named flows and file paths) to Gemini for a high-level project summary.

### 5.4 Codebase Q&A with Node Resolution

**Endpoint:** `POST /api/ask`

**Node index construction:**

Flattens all `NamedFlowStep` nodes from the `StaticTrace` (up to 300) into a text format:

```
[n_001] HomePage (function) @ app/page.tsx:15
[n_002] Navbar (function) @ components/Navbar.tsx:8
[n_003] useSession (function) @ hooks/useSession.ts:3
...
```

This index is included in the Gemini prompt along with the user's question.

**Node resolution:** If the AI's answer points to a specific function, the response ends with:

```
__COMPRENDO_NODE__{"id":"n_001","label":"HomePage","filePath":"app/page.tsx"}
```

The frontend parses this marker and highlights/navigates to the corresponding node on the canvas — creating a seamless transition from natural language question to visual code navigation.

### 5.5 Security: Path Traversal Protection

The `/api/explain` endpoint reads source files from the filesystem. To prevent path traversal attacks (e.g., `filePath: "../../etc/passwd"`), the endpoint:

1. Constructs the full path: `path.resolve(DATA_DIR, "repos", owner, repo, filePath)`.
2. Validates that the resolved path starts with `path.resolve(DATA_DIR, "repos", owner, repo)`.
3. Rejects requests where the resolved path escapes the repo directory.

---

## 6. Frontend Architecture

### 6.1 Page Structure

| Route | Component | Type | Description |
|---|---|---|---|
| `/` | `app/page.tsx` | Client | Landing page with GitHub sign-in CTA. Redirects to `/repos` if already authenticated. |
| `/repos` | `app/repos/page.tsx` | Client | Lists all repos. Connect button registers repos. Scan button triggers analysis. |
| `/explore/[owner]/[repo]` | `app/explore/[owner]/[repo]/page.tsx` | Client | Main explorer: three-panel layout with sidebar, canvas, and detail panel. |

**Root layout** (`app/layout.tsx`):
- Fonts: `Funnel_Display` (headings) + `Roboto_Mono` (monospace/code)
- Wraps all pages in `<Providers>` (NextAuth `SessionProvider`)

### 6.2 Canvas Rendering

The flow canvas uses **@xyflow/react (React Flow)** with custom components:

| Component | Role |
|---|---|
| `FlowCanvas.tsx` | Wrapper component configuring React Flow with custom node/edge types |
| `CanvasNode.tsx` | Custom node component — renders function/component labels with type-based styling |
| `CanvasEdges.tsx` | Custom edge component — renders relationship lines between nodes |

React Flow handles:
- Built-in pan and zoom controls
- Edge routing and path calculation
- Node drag-and-drop
- Minimap and controls overlay

### 6.3 Layout Algorithm

The layout algorithm (`useExploreDerived.ts`) positions nodes for the canvas display.

**Constants:**

```typescript
const NODE_H = 40;          // Node height in pixels
const H_GAP = 56;           // Horizontal gap between sibling nodes
const V_GAP = 14;           // Vertical gap between parent and child
const SPINE_W = 94;         // Width of the connecting spine
const FLOW_GROUP_GAP = 72;  // Gap between flow groups

// Dynamic node width based on label length
function nodeWidth(label: string): number {
  return Math.max(160, label.length * 7.4 + 56);
}
```

**`layoutNodes(tree, expanded)`** — Recursively positions nodes in a tree layout. Collapsed nodes hide their children. Returns `LaidNode[]` with computed `x`, `y`, `w` positions.

**`layoutFlowGroups(flows, expanded)`** — Lays out multiple flow trees side by side with `FLOW_GROUP_GAP` spacing.

**`useExploreDerived(fileCanvas, expanded)`** — React hook that memoizes the layout computation, recalculating only when `fileCanvas` data or `expanded` node set changes.

### 6.4 State Management

State is managed via a custom hook (`useExploreData.ts`) — no external state library.

**State shape:**

```typescript
{
  repos: RepoRecord[];
  currentRepoId: string | null;
  traceId: string | null;
  groups: EntryPointGroup[];
  totalFlows: number;
  fileTree: FileTreeNode | null;
  fileCanvas: FileCanvasFlow[];
  flowTree: FlowTreeResponse | null;
  selectedFlowId: string | null;
  selectedFile: string | null;
  loading: boolean;
  scanning: boolean;
  error: string | null;
}
```

**API wrapper functions:** `connectRepo()`, `fetchRepos()`, `triggerScan()`, `fetchFileTree()`, `fetchFileCanvas()`, `fetchEntryPoints()`, `fetchMultiFileCanvas()` — all use `fetch()` against the API routes.

### 6.5 Pan & Zoom

`useCanvasPanZoom.ts` implements custom pan and zoom for canvas views that don't use React Flow directly.

- **Pan:** Mouse drag on the container background.
- **Zoom:** `Ctrl + Wheel` — range 0.1x to 3.0x.
- **Performance:** Applies `transform: translate(x, y) scale(z)` directly to the DOM element via `ref.current.style.transform` — bypasses React re-rendering for 60fps interaction.

**Returns:**

```typescript
{
  containerRef: RefObject<HTMLDivElement>;
  transformRef: RefObject<HTMLDivElement>;
  panZoom: { x: number; y: number; zoom: number };
  handlers: { onMouseDown, onMouseMove, onMouseUp, onWheel };
}
```

---

## 7. Authentication & GitHub Integration

### 7.1 OAuth Flow

```
User clicks "Sign in with GitHub"
    │
    ▼
NextAuth redirects to github.com/login/oauth/authorize
    │  scope: read:user, repo
    ▼
User authorizes → GitHub redirects to /api/auth/callback/github
    │
    ▼
NextAuth exchanges code for access_token
    │
    ▼
JWT created with { sub, name, email, accessToken }
    │
    ▼
Session cookie set → user redirected to /repos
```

### 7.2 Token Management

- GitHub `access_token` is stored in the JWT (server-side only by default).
- The `session` callback exposes `accessToken` on the session object for API routes.
- Tokens are used for: listing repos (Octokit), cloning private repos (`git clone` with token auth).

### 7.3 Repository Operations

`lib/github.ts` provides:

| Function | Description |
|---|---|
| `createOctokit(accessToken)` | Create an authenticated Octokit instance |
| `fetchUserRepos(accessToken)` | Paginate all user repos (100/page, sorted by update time) |
| `fetchGitHubUser(accessToken)` | Fetch authenticated user profile |

**Git operations** (in `/api/repo_scans`):
- **Clone:** `git clone --depth 1 https://x-access-token:{token}@github.com/{owner}/{repo}.git`
- **Update:** `git pull --ff-only` (with remote URL rewritten to include token)

---

## 8. Database

### 8.1 Technology Choice

**SQLite via better-sqlite3** — an embedded, file-based database requiring zero infrastructure. 

- Location: `$DATA_DIR/comprendo.db`
- Mode: WAL (Write-Ahead Logging) for concurrent read performance
- Foreign keys: Enabled

Configuration in `next.config.ts`:
```typescript
serverExternalPackages: ["better-sqlite3"]  // Native addon, not bundled by webpack
```

### 8.2 Schema

**`users` table:**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID |
| `github_id` | INTEGER | UNIQUE NOT NULL | GitHub user ID |
| `login` | TEXT | NOT NULL | GitHub username |
| `name` | TEXT | | Display name |
| `avatar_url` | TEXT | | Profile picture URL |
| `access_token` | TEXT | | GitHub OAuth token |
| `created_at` | TEXT | DEFAULT current timestamp | ISO timestamp |
| `updated_at` | TEXT | DEFAULT current timestamp | ISO timestamp |

**`repos` table:**

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID |
| `github_id` | INTEGER | UNIQUE NOT NULL | GitHub repo ID |
| `owner` | TEXT | NOT NULL | Repo owner |
| `name` | TEXT | NOT NULL | Repo name |
| `full_name` | TEXT | NOT NULL | `owner/name` |
| `description` | TEXT | | Repo description |
| `language` | TEXT | | Primary language |
| `stars` | INTEGER | DEFAULT 0 | Star count |
| `default_branch` | TEXT | | Default branch |
| `clone_url` | TEXT | | Git clone URL |
| `clone_path` | TEXT | | Local clone path |
| `scan_status` | TEXT | DEFAULT `'none'` | `none` / `scanning` / `done` / `error` |
| `scan_result` | TEXT | | JSON-serialized scan result |
| `scanned_at` | TEXT | | ISO timestamp |
| `user_id` | TEXT | FK → users.id | Owner user |

### 8.3 Migrations

The database module includes an automatic migration that adds `scan_status`, `scan_result`, and `scanned_at` columns to the `repos` table if they don't exist. This runs on database initialization — no migration tooling is needed.

---

## 9. Testing

### 9.1 Strategy

Testing focuses on the **scanner engine** — the most complex and correctness-critical part of the system. The scanner is a pure function pipeline (`files → AST → graph`) with no side effects, making it ideal for unit testing.

**Configuration** (`jest.config.ts`):
- Preset: `ts-jest` (TypeScript compilation)
- Environment: `node`
- Path alias: `@/` → project root
- Excluded: `data/`, `node_modules/`

### 9.2 Test Suites

| Suite | File | What It Tests |
|---|---|---|
| **AST Parser** | `__tests__/scanner/ast-parser.test.ts` | Function extraction from `FunctionDeclaration`, `ArrowFunction`, `VariableStatement`. Import tracking (named, default, namespace). Call site detection. JSX component usage. `forwardRef`/`memo` wrapper detection. Export modifier handling. |
| **File Classifier** | `__tests__/scanner/file-classifier.test.ts` | Path pattern matching: `app/**/page.tsx` → PAGE, `hooks/use*.ts` → HOOK, etc. Client component detection via `"use client"` directive. `shouldAnalyze` filtering. |
| **Graph Builder** | `__tests__/scanner/graph-builder.test.ts` | Import path resolution. IMPORTS edge creation. CALLS edge linking across files. RENDERS edge from JSX usage. Layer-based Y positioning. Framework pack `extraEdges()` integration. |
| **Integration** | `__tests__/scanner/integration.test.ts` | End-to-end `scanRepo()` on a test fixture directory. Verifies the complete pipeline: discovery → classification → parsing → graph building → ScanResult stats. |

**Run tests:**

```bash
npx jest              # Run all tests
npx jest --verbose    # With detailed output
npx jest ast-parser   # Run a specific suite
```

---

## 10. Frameworks, Libraries & Tools

### Core Framework

| Library | Version | Role |
|---|---|---|
| [Next.js](https://nextjs.org/) | 16.2.1 | Full-stack React framework. App Router with Server Components, API route handlers, dynamic routes (`[owner]/[repo]`, `[traceId]`), `next/font` for font optimization. |
| [React](https://react.dev/) | 19.2.4 | UI rendering with server and client components. |
| [TypeScript](https://www.typescriptlang.org/) | 5.9.3 | Type-safe development. Also used as a **runtime library** for AST parsing (not just a build tool). |

### Frontend

| Library | Version | Role |
|---|---|---|
| [@xyflow/react](https://reactflow.dev/) | 12.10.2 | Flow graph canvas — node/edge rendering, pan/zoom, minimap. Custom node and edge components. |
| [Framer Motion](https://www.framer.com/motion/) | 12.38.0 | Page transitions, slide-in panels, hover effects, mount/unmount animations. |
| [Tailwind CSS](https://tailwindcss.com/) | 4.x | Utility-first styling. All components styled with Tailwind classes. |
| [shadcn/ui](https://ui.shadcn.com/) | 4.1.1 | Copy-paste component library. Style: `base-nova`. Components: Button, Card, Badge, Avatar, Input, Separator. |
| [@base-ui/react](https://base-ui.com/) | 1.3.0 | Unstyled UI primitives (used by shadcn/ui). |
| [Lucide React](https://lucide.dev/) | 1.7.0 | SVG icon library — all icons in the UI. |
| [class-variance-authority](https://cva.style/) | 0.7.1 | Component variant styling (button sizes, colors). |
| [clsx](https://github.com/lukeed/clsx) | 2.1.1 | Conditional className joining. |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) | 3.5.0 | Merges Tailwind classes without duplicates. |
| [tw-animate-css](https://www.npmjs.com/package/tw-animate-css) | 1.4.0 | Tailwind animation utilities. |

### Backend & Data

| Library | Version | Role |
|---|---|---|
| [NextAuth.js](https://next-auth.js.org/) | 4.24.13 | GitHub OAuth 2.0 authentication. JWT session strategy. |
| [@octokit/rest](https://github.com/octokit/rest.js) | 22.0.1 | GitHub REST API client. Repo listing, user profile, authenticated git operations. |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | 12.8.0 | Embedded SQLite3. WAL mode. Synchronous API. Stores users and repo metadata. |
| [glob](https://github.com/isaacs/node-glob) | 13.0.6 | File pattern matching for source file discovery during scanning. |

### AI

| Library | Version | Role |
|---|---|---|
| [@google/generative-ai](https://ai.google.dev/) | 0.24.1 | Google Gemini 2.5 Flash client. Streaming responses for code explanations, summaries, and Q&A. |

### Developer Tools

| Tool | Version | Role |
|---|---|---|
| [ESLint](https://eslint.org/) | 9.x | Code linting with `eslint-config-next`. |
| [Jest](https://jestjs.io/) | 30.3.0 | Unit testing framework. |
| [ts-jest](https://kulshekhar.github.io/ts-jest/) | 29.4.6 | TypeScript support for Jest. |
| [@tailwindcss/postcss](https://tailwindcss.com/) | 4.x | PostCSS plugin for Tailwind CSS processing. |

---

## 11. Design Decisions & Trade-offs

### Why static analysis instead of runtime tracing?

Static analysis (AST parsing) works on any codebase without running it. No test coverage needed, no instrumentation, no runtime dependencies. The trade-off: dynamic behavior (conditional imports, computed property access, runtime-registered routes) is invisible to the scanner. We mitigate this with the framework pack system, which knows about framework conventions (e.g., Next.js file-based routing) that static analysis alone would miss.

### Why in-memory store instead of persisting traces to SQLite?

Traces can be large (thousands of nodes for big repos). Storing them as JSON blobs in SQLite would require serialization/deserialization on every API call. The in-memory store provides instant access. The trade-off: traces are lost on server restart — but re-scanning is fast (the cloned repo persists on disk, so it's just a `git pull` + re-analysis).

### Why streaming AI responses?

Users see explanations forming in real-time (~200ms to first token) instead of waiting 3-5 seconds for a complete response. This dramatically improves perceived performance for AI features.

### Why custom pan/zoom instead of always using React Flow?

Some views (like file-focused canvas) use a simpler layout that doesn't need React Flow's full graph engine. The custom `useCanvasPanZoom` hook provides 60fps interaction by writing directly to `style.transform` — avoiding React re-renders entirely.

### Why BFS with depth 8 for flow building?

Depth 8 captures the vast majority of practical call chains (page → component → hook → utility) while preventing runaway traversal in highly recursive or deeply nested codebases. Cycles are tracked and skipped to avoid infinite loops.

### Why SQLite instead of PostgreSQL?

Zero setup. No Docker, no database server, no connection strings beyond a file path. For a hackathon project that runs locally, an embedded database eliminates infrastructure complexity while still providing ACID compliance and SQL query capability.
