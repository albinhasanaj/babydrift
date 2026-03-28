# Comprendo — API Reference

Complete documentation of every HTTP endpoint exposed by the Comprendo backend. All routes are implemented as Next.js App Router API route handlers under `app/api/`.

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Repositories](#repositories)
  - [GET /api/repositories](#get-apirepositories)
  - [POST /api/repositories](#post-apirepositories)
- [Scanning](#scanning)
  - [POST /api/repo\_scans](#post-apirepo_scans)
- [Exploration](#exploration)
  - [GET /api/explore/\[traceId\]/entry\_points](#get-apiexploretraceidentry_points)
  - [GET /api/explore/\[traceId\]/flow\_tree](#get-apiexploretraceidflow_tree)
  - [GET /api/explore/\[traceId\]/files](#get-apiexploretraceidfiles)
  - [GET /api/explore/\[traceId\]/file\_canvas](#get-apiexploretraceidfile_canvas)
- [AI Endpoints](#ai-endpoints)
  - [POST /api/explain](#post-apiexplain)
  - [POST /api/explain/summary](#post-apiexplainsummary)
  - [POST /api/ask](#post-apiask)
- [Error Handling](#error-handling)

---

## Overview

| Base URL | `http://localhost:3000` (development) |
|---|---|
| **Content-Type** | `application/json` (requests and most responses) |
| **Auth mechanism** | NextAuth.js JWT session cookie (auto-set after GitHub OAuth) |
| **Streaming endpoints** | `/api/explain`, `/api/explain/summary`, `/api/ask` return `text/plain` streams |

All endpoints return JSON unless noted otherwise. Error responses follow the format:

```json
{ "error": "Human-readable error message" }
```

---

## Authentication

### `GET|POST /api/auth/[...nextauth]`

NextAuth.js catch-all route that handles the full GitHub OAuth 2.0 flow (sign-in, callback, session, sign-out, CSRF).

| Detail | Value |
|---|---|
| **Provider** | GitHub |
| **Scopes** | `read:user`, `repo` |
| **Session strategy** | JWT |
| **Callback URL** | `{NEXTAUTH_URL}/api/auth/callback/github` |
| **Sign-in page** | `/` (landing page) |

**JWT callback behavior:**
- Stores the GitHub `access_token` on the JWT token object at sign-in.

**Session callback behavior:**
- Exposes `accessToken` on the session object so API routes and server components can use it.

**Usage from client code:**

```ts
import { signIn, signOut, useSession } from "next-auth/react";

// Sign in
signIn("github");

// Access session
const { data: session } = useSession();
console.log(session?.accessToken);  // GitHub token
```

---

## Repositories

### `GET /api/repositories`

List all repositories available to the user.

**Authentication:** Optional. If authenticated, fetches the user's GitHub repos via Octokit and merges with locally connected repos. If unauthenticated, returns only in-memory repos.

**Request:** No body or parameters.

**Response `200`:**

```json
{
  "repositories": [
    {
      "id": "abc123",
      "fullName": "albinhasanaj/babydrift",
      "name": "babydrift",
      "owner": "albinhasanaj",
      "description": "AI-powered codebase visualization",
      "language": "TypeScript",
      "stars": 12,
      "updatedAt": "2025-03-28T10:00:00Z",
      "latestTraceId": "tr_xyz789"
    }
  ]
}
```

**Response fields:**

| Field | Type | Description |
|---|---|---|
| `id` | string | Internal repository ID |
| `fullName` | string | `owner/name` format |
| `name` | string | Repository name |
| `owner` | string | Repository owner (GitHub username or org) |
| `description` | string \| null | GitHub repo description |
| `language` | string \| null | Primary programming language |
| `stars` | number | GitHub star count |
| `updatedAt` | string | ISO 8601 timestamp of last update |
| `latestTraceId` | string \| null | Most recent scan trace ID (null if never scanned) |

---

### `POST /api/repositories`

Connect a repository for scanning. Registers the repo in the in-memory store.

**Authentication:** Required (needs GitHub access token for clone operations).

**Request body:**

```json
{
  "full_name": "owner/repo"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `full_name` | string | Yes | Repository in `owner/name` format |

**Response `200`:**

```json
{
  "repositoryId": "abc123",
  "fullName": "albinhasanaj/babydrift",
  "latestTraceId": null,
  "connected": true
}
```

**Error `400`:**

```json
{ "error": "full_name is required" }
```

---

## Scanning

### `POST /api/repo_scans`

Clone (or update) a repository and run the full static analysis scanner.

**Authentication:** Required.

**Request body:**

```json
{
  "repo_id": "abc123"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `repo_id` | string | Yes | Internal repository ID (from `GET /api/repositories`) |

**Process:**

1. Looks up the repository by ID from the in-memory store.
2. Resolves the clone path: `$DATA_DIR/repos/{owner}/{name}`.
3. If clone exists: runs `git pull --ff-only` with token authentication.
4. If not: runs `git clone --depth 1` with token authentication.
5. Executes `scanRepo(clonePath)` — the full static analysis pipeline.
6. Converts the `ScanResult` into a `StaticTrace` and persists it.
7. Updates the repo record with the new `latestTraceId`.

**Response `200`:**

```json
{
  "scanId": "sc_abc",
  "traceId": "tr_xyz789",
  "repositoryId": "abc123",
  "stats": {
    "filesAnalyzed": 25,
    "functionsFound": 120,
    "componentsFound": 18,
    "connectionsFound": 85,
    "driftIssues": 0
  },
  "flowCount": 15
}
```

**Response fields:**

| Field | Type | Description |
|---|---|---|
| `scanId` | string | Unique scan identifier |
| `traceId` | string | Trace ID — use this for all `/api/explore/*` endpoints |
| `repositoryId` | string | The scanned repository ID |
| `stats.filesAnalyzed` | number | Number of TypeScript/TSX files processed |
| `stats.functionsFound` | number | Total functions and components extracted |
| `stats.componentsFound` | number | React components detected |
| `stats.connectionsFound` | number | Edges (imports, calls, renders) resolved |
| `stats.driftIssues` | number | Architectural drift issues detected |
| `flowCount` | number | Number of named flows (entry points) generated |

**Error `404`:**

```json
{ "error": "Repository not found" }
```

---

## Exploration

All exploration endpoints require a `traceId` path parameter corresponding to a completed scan. The `traceId` is returned from `POST /api/repo_scans`.

### `GET /api/explore/[traceId]/entry_points`

List all entry points in the scanned codebase, grouped by handler type.

**Path parameters:**

| Param | Type | Description |
|---|---|---|
| `traceId` | string | Trace ID from a completed scan |

**Response `200`:**

```json
{
  "traceId": "tr_xyz789",
  "groups": [
    {
      "label": "Pages",
      "handlerType": "page",
      "items": [
        {
          "flowId": "fl_001",
          "label": "HomePage",
          "filePath": "app/page.tsx"
        },
        {
          "flowId": "fl_002",
          "label": "ReposPage",
          "filePath": "app/repos/page.tsx"
        }
      ]
    },
    {
      "label": "API Routes",
      "handlerType": "api",
      "items": [
        {
          "flowId": "fl_010",
          "label": "POST",
          "filePath": "app/api/repo_scans/route.ts"
        }
      ]
    },
    {
      "label": "Layouts",
      "handlerType": "layout",
      "items": [
        {
          "flowId": "fl_020",
          "label": "RootLayout",
          "filePath": "app/layout.tsx"
        }
      ]
    }
  ],
  "totalFlows": 15
}
```

**Handler types:**

| Type | Description |
|---|---|
| `page` | Next.js page components (`page.tsx`) |
| `layout` | Next.js layout components (`layout.tsx`) |
| `http` | HTTP route handlers (`route.ts`) |
| `api` | Generic API endpoints |
| `export` | Exported functions/components not classified as pages or APIs |
| `worker` | Background workers |
| `job` | Scheduled jobs |
| `event` | Event handlers |
| `webhook` | Webhook handlers |
| `cron` | Cron jobs |
| `cli` | CLI entry points |

---

### `GET /api/explore/[traceId]/flow_tree`

Get the full call tree for a specific flow, starting from its entry point.

**Path parameters:**

| Param | Type | Description |
|---|---|---|
| `traceId` | string | Trace ID from a completed scan |

**Query parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `flow_id` | string | Yes | Flow ID (from `entry_points` response) |
| `depth` | number | No | Maximum tree depth (default: unlimited) |

**Response `200`:**

```json
{
  "traceId": "tr_xyz789",
  "flowId": "fl_001",
  "label": "HomePage",
  "handlerType": "page",
  "totalFunctions": 12,
  "totalFiles": 5,
  "tree": [
    {
      "id": "n_001",
      "label": "HomePage",
      "filePath": "app/page.tsx",
      "startLine": 15,
      "endLine": 89,
      "nodeType": "function",
      "children": [
        {
          "id": "n_002",
          "label": "Navbar",
          "filePath": "components/Navbar.tsx",
          "startLine": 8,
          "endLine": 45,
          "nodeType": "function",
          "children": []
        },
        {
          "id": "n_003",
          "label": "useSession",
          "filePath": "node_modules/next-auth/react/index.js",
          "startLine": null,
          "endLine": null,
          "nodeType": "function",
          "children": []
        }
      ]
    }
  ]
}
```

**Tree node fields:**

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique node identifier |
| `label` | string | Function or component name |
| `filePath` | string | Relative file path |
| `startLine` | number \| null | Start line in source file |
| `endLine` | number \| null | End line in source file |
| `nodeType` | string | `"function"`, `"branch"`, or `"section"` |
| `children` | FlowTreeNode[] | Nested call tree |

---

### `GET /api/explore/[traceId]/files`

Get the complete file tree structure derived from the static trace.

**Path parameters:**

| Param | Type | Description |
|---|---|---|
| `traceId` | string | Trace ID from a completed scan |

**Response `200`:**

```json
{
  "traceId": "tr_xyz789",
  "tree": {
    "name": "root",
    "type": "directory",
    "children": [
      {
        "name": "app",
        "type": "directory",
        "children": [
          {
            "name": "page.tsx",
            "type": "file",
            "flowId": "fl_001"
          },
          {
            "name": "layout.tsx",
            "type": "file",
            "flowId": "fl_020"
          },
          {
            "name": "api",
            "type": "directory",
            "children": [
              {
                "name": "repo_scans",
                "type": "directory",
                "children": [
                  {
                    "name": "route.ts",
                    "type": "file",
                    "flowId": "fl_010"
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "name": "components",
        "type": "directory",
        "children": [
          {
            "name": "Navbar.tsx",
            "type": "file",
            "flowId": null
          }
        ]
      }
    ]
  }
}
```

**File tree node fields:**

| Field | Type | Description |
|---|---|---|
| `name` | string | File or directory name |
| `type` | string | `"file"` or `"directory"` |
| `flowId` | string \| null | Associated flow ID (files only, null for non-entry files) |
| `children` | FileTreeNode[] | Child nodes (directories only) |

---

### `GET /api/explore/[traceId]/file_canvas`

Get all flows whose entry point lives in a specific file, formatted for canvas rendering.

**Path parameters:**

| Param | Type | Description |
|---|---|---|
| `traceId` | string | Trace ID from a completed scan |

**Query parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `file_path` | string | Yes | Relative file path within the repo |
| `depth` | number | No | Maximum tree depth (default: unlimited) |

**Response `200`:**

```json
{
  "traceId": "tr_xyz789",
  "filePath": "app/page.tsx",
  "flows": [
    {
      "flowId": "fl_001",
      "label": "HomePage",
      "handlerType": "page",
      "tree": [
        {
          "id": "n_001",
          "label": "HomePage",
          "filePath": "app/page.tsx",
          "startLine": 15,
          "nodeType": "function",
          "children": []
        }
      ]
    }
  ]
}
```

---

## AI Endpoints

All AI endpoints use **Google Gemini 2.5 Flash** and return **streaming `text/plain` responses**. The response is streamed chunk-by-chunk as the model generates it.

### `POST /api/explain`

Get a beginner-friendly AI explanation of a specific code block.

**Request body:**

```json
{
  "label": "handleSubmit",
  "type": "FUNCTION",
  "filePath": "app/repos/page.tsx",
  "line": 42,
  "owner": "albinhasanaj",
  "repo": "babydrift"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `label` | string | Yes | Name of the function or component |
| `type` | string | Yes | Node type (`FUNCTION`, `COMPONENT`, `PAGE`, `API`, etc.) |
| `filePath` | string | Yes | Relative file path within the repo |
| `line` | number | Yes | Starting line number of the code block |
| `owner` | string | Yes | GitHub repo owner |
| `repo` | string | Yes | GitHub repo name |

**Process:**

1. Resolves the source file at `$DATA_DIR/repos/{owner}/{repo}/{filePath}`.
2. Path-traversal protection: validates the resolved path is within the repo directory.
3. Extracts the code block starting at `line` using brace-balanced parsing (max 100 lines).
4. Sends the code block to Gemini with a prompt requesting a plain-English, beginner-friendly explanation.
5. Streams the response back to the client.

**Response:** `Content-Type: text/plain` — streamed chunks of the explanation.

**Error `400`:**

```json
{ "error": "Missing required fields" }
```

**Error `404`:**

```json
{ "error": "Source file not found" }
```

---

### `POST /api/explain/summary`

Generate an AI summary of an entire repository or a specific file/page.

**Request body:**

```json
{
  "traceId": "tr_xyz789",
  "filePath": "app/page.tsx"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `traceId` | string | Yes | Trace ID from a completed scan |
| `filePath` | string | No | Specific file to summarize. Omit for whole-repo summary. |

**Behavior:**

- **With `filePath`:** Generates a user-facing page description — what a user sees and can do on this page.
- **Without `filePath`:** Generates a whole-repo summary using the complete flow structure (all named flows and files).

**Response:** `Content-Type: text/plain` — streamed summary text.

---

### `POST /api/ask`

Ask a free-form question about the analyzed codebase. The AI has context of every function and component in the scanned project.

**Request body:**

```json
{
  "question": "Where is authentication handled?",
  "traceId": "tr_xyz789"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `question` | string | Yes | Natural language question about the codebase |
| `traceId` | string | Yes | Trace ID from a completed scan |

**Process:**

1. Loads the `StaticTrace` for the given `traceId`.
2. Flattens all nodes (up to 300) into a text index formatted as: `[id] label (nodeType) @ filePath:line`.
3. Sends the question + index to Gemini.
4. Streams the response.

**Response:** `Content-Type: text/plain` — streamed answer.

If the answer maps to a single identifiable node in the codebase, the response ends with a special marker:

```
__COMPRENDO_NODE__{"id":"n_001","label":"authOptions","filePath":"app/api/auth/[...nextauth]/route.ts"}
```

The UI uses this marker to highlight and navigate to the referenced node on the canvas.

---

## Error Handling

All endpoints return standard HTTP status codes:

| Status | Meaning |
|---|---|
| `200` | Success |
| `400` | Bad request (missing or invalid parameters) |
| `401` | Unauthorized (session required) |
| `404` | Resource not found (repo, trace, or file) |
| `500` | Internal server error |

Error response format:

```json
{
  "error": "Descriptive error message"
}
```
