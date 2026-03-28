# Comprendo

**Understand any codebase, instantly.**

Most codebases are black boxes. You clone a repo, open the files, and spend hours 
trying to piece together how everything connects. Comprendo fixes that — paste a 
GitHub repo and get an interactive map of every page, component, hook, API route, 
and function, with AI that explains any piece of it in plain English.

---

## Setup

```bash
git clone https://github.com/albinhasanaj/babydrift.git
npm install
```

Create a `.env` file in the root:

```env
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
NEXTAUTH_SECRET=any_random_string
NEXTAUTH_URL=http://localhost:3000
DATA_DIR=./data
GEMINI_API_KEY=your_gemini_api_key
```

**Getting your credentials:**

- **GitHub OAuth** — Go to [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App → set callback URL to `http://localhost:3000/api/auth/callback/github` → copy the Client ID and Client Secret
- **NEXTAUTH_SECRET** — Run `openssl rand -base64 32` and paste the output
- **GEMINI_API_KEY** — Get one free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with GitHub, and pick a repo.

---

## What it does

Sign in with GitHub. Pick any of your TypeScript repositories. Comprendo clones it, 
runs a full static analysis using the TypeScript Compiler API, and renders every 
function, component, hook, and API route as an interactive node on a zoomable canvas — 
with every import, call, and render relationship mapped as edges between them.

Click any node and Gemini explains exactly what that piece of code does, based strictly 
on its source — no hallucination, no guessing. The explanation streams in real time.

The graph also surfaces dead code — exported functions that exist in the codebase but 
are never called or imported anywhere. Having a visual map of your architecture makes 
these gaps obvious in a way that reading files never does.

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.9 |
| Auth | NextAuth.js — GitHub OAuth |
| AI | Google Gemini 2.5 Flash — streamed explanations |
| Static Analysis | TypeScript Compiler API — AST parsing |
| Graph | React Flow (@xyflow/react) |
| Database | SQLite via better-sqlite3 |
| Styling | Tailwind CSS 4 + shadcn/ui |

---

## Testing

```bash
npx jest
```

46 tests covering the scanner engine — AST parsing, file classification, 
graph construction, and end-to-end pipeline.

---

## Documentation

- [Technical Docs](TECHNICAL_DOCS.md) — architecture, scanner internals, data flow, and component breakdown
- [API Reference](API_REFERENCE.md) — all API routes with request/response schemas

---

*Built at the Tech Europe x Google DeepMind x Lovable Hackathon, March 2026.*
```