# Comprendo

**Understand any codebase, instantly.**

Comprendo is an AI-powered codebase visualization platform that maps TypeScript/React repositories into interactive flow graphs. It statically analyzes source code using the TypeScript Compiler API, builds a full dependency graph of every page, component, hook, API route, and utility function, then renders the result as an explorable canvas. Integrated Google Gemini AI explains any function in plain English and answers questions about the entire codebase.

> **Further Documentation**
>
> - [API Reference](./API_REFERENCE.md) — Full documentation of every API endpoint with request/response schemas.
> - [Technical Documentation](./TECHNICAL_DOCS.md) — Architecture deep-dive, scanner engine internals, data models, and design decisions.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)
- [Project Structure](#project-structure)
- [Testing](#testing)

---

## Features

- **GitHub OAuth** — Sign in with GitHub to connect your repositories.
- **One-click repo scanning** — Clone and statically analyze any TypeScript/React repo.
- **Interactive flow graph** — Visualize the call graph from entry points (pages, API routes, layouts) through components, hooks, and utilities on a pannable/zoomable canvas.
- **File tree explorer** — Navigate the repository's file structure with flow annotations.
- **AI code explanations** — Select any function node and get a beginner-friendly explanation streamed from Gemini 2.5 Flash.
- **AI repo/file summaries** — Generate natural-language summaries of entire repositories or individual pages.
- **AI Q&A** — Ask free-form questions about the codebase; the AI maps its answer back to specific nodes in the graph.
- **Framework-aware analysis** — Plugin system auto-detects Next.js and applies framework-specific classification rules (App Router pages, layouts, API routes, middleware).

---

## Tech Stack

| Category | Technology | Purpose |
|---|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) | Full-stack React framework with server components, API routes, and file-based routing |
| **Language** | [TypeScript 5.9](https://www.typescriptlang.org/) | Type-safe development across the entire codebase |
| **Runtime** | [React 19](https://react.dev/) | UI rendering with server and client components |
| **Authentication** | [NextAuth.js 4](https://next-auth.js.org/) | GitHub OAuth 2.0 provider with JWT session strategy |
| **GitHub API** | [@octokit/rest](https://github.com/octokit/rest.js) | List user repositories, clone with token auth |
| **AI** | [Google Gemini 2.5 Flash](https://ai.google.dev/) (`@google/generative-ai`) | Code explanations, repo summaries, codebase Q&A — streamed responses |
| **Static Analysis** | [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API) | AST parsing, function/component extraction, call-site resolution, import tracking |
| **Graph Visualization** | [@xyflow/react](https://reactflow.dev/) (React Flow) | Interactive node-edge canvas for flow graphs |
| **Database** | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Embedded SQLite database for users and repos (WAL mode) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first CSS framework |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/) (base-nova style) | Pre-built accessible components (Button, Card, Badge, Avatar, Input, Separator) |
| **Icons** | [Lucide React](https://lucide.dev/) | SVG icon library |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) | Page transitions and UI animations |
| **File Discovery** | [glob](https://github.com/isaacs/node-glob) | Filesystem traversal during repository scanning |
| **Testing** | [Jest 30](https://jestjs.io/) + [ts-jest](https://kulshekhar.github.io/ts-jest/) | Unit testing for the scanner engine |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** (comes with Node.js)
- A **GitHub account** (for OAuth and repo access)
- A **Google Gemini API key** (for AI features)

### Installation

```bash
git clone https://github.com/albinhasanaj/babydrift.git
npm install
```

### Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Description | How to Get It |
|---|---|---|---|
| `GITHUB_ID` | Yes | GitHub OAuth App Client ID | Create an OAuth App at [github.com/settings/developers](https://github.com/settings/developers). Set the callback URL to `http://localhost:3000/api/auth/callback/github`. |
| `GITHUB_SECRET` | Yes | GitHub OAuth App Client Secret | Generated when you create the OAuth App above. |
| `NEXTAUTH_SECRET` | Yes | Random string used to sign/encrypt JWTs | Run `openssl rand -base64 32` in your terminal. |
| `NEXTAUTH_URL` | Yes | Base URL of your app | `http://localhost:3000` for local development. |
| `DATA_DIR` | Yes | Directory where cloned repos and the SQLite database are stored | Default: `./data` — no change needed for local dev. |
| `GEMINI_API_KEY` | Yes | Google Gemini API key | Get one free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). |

Example `.env` file:

```env
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
NEXTAUTH_SECRET=your_random_secret_string
NEXTAUTH_URL=http://localhost:3000
DATA_DIR=./data
GEMINI_API_KEY=your_gemini_api_key
```

### Running the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Other Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx jest` | Run unit tests |

---

## Testing

Tests cover the core scanner engine using **Jest** with `ts-jest`.

```bash
npx jest
```

| Test Suite | Covers |
|---|---|
| `__tests__/scanner/ast-parser.test.ts` | TypeScript AST parsing — function extraction, import tracking, call sites, JSX detection |
| `__tests__/scanner/file-classifier.test.ts` | Path-based file classification — pages, layouts, APIs, hooks, components, utilities |
| `__tests__/scanner/graph-builder.test.ts` | Graph construction — edge resolution, import linking, call/render edges |
| `__tests__/scanner/integration.test.ts` | End-to-end `scanRepo()` pipeline |

---

## License

This project was built for the Tech Europe Hackathon