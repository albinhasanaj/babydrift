import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { scanRepo } from "@/lib/scanner";

describe("integration: scanRepo", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "integration-test-"));

    // app/page.tsx — uses NavBar component
    const appPage = `
import NavBar from "../components/NavBar";

export default function HomePage() {
  return (
    <div>
      <NavBar />
      <h1>Home</h1>
    </div>
  );
}
`;

    // app/layout.tsx
    const appLayout = `
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
`;

    // app/api/users/route.ts — calls fetchUsers from lib/api
    const apiRoute = `
import { fetchUsers } from "../../../lib/api";

export async function GET() {
  const users = await fetchUsers();
  return Response.json(users);
}
`;

    // components/NavBar.tsx
    const navBar = `
export default function NavBar() {
  return <nav>NavBar</nav>;
}
`;

    // lib/api.ts — fetchUsers (called) + formatDate (drift: exported, never called)
    const libApi = `
export async function fetchUsers() {
  return [{ id: 1, name: "Alice" }];
}

export function formatDate(date: Date) {
  return date.toISOString();
}
`;

    const files: Record<string, string> = {
      "app/page.tsx": appPage,
      "app/layout.tsx": appLayout,
      "app/api/users/route.ts": apiRoute,
      "components/NavBar.tsx": navBar,
      "lib/api.ts": libApi,
    };

    for (const [rel, content] of Object.entries(files)) {
      const full = path.join(tmpDir, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content);
    }
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  let result: Awaited<ReturnType<typeof scanRepo>>;

  beforeAll(async () => {
    result = await scanRepo(tmpDir);
  });

  test("scanRepo returns nodes for all 5 files", () => {
    const uniqueFiles = new Set(result.nodes.map((n) => n.filePath));
    expect(uniqueFiles.size).toBe(5);
  });

  test("HomePage node has type PAGE or COMPONENT", () => {
    const node = result.nodes.find((n) => n.label === "HomePage");
    expect(node).toBeDefined();
    expect(["PAGE", "COMPONENT"]).toContain(node!.type);
  });

  test("RootLayout node has type LAYOUT or COMPONENT", () => {
    const node = result.nodes.find((n) => n.label === "RootLayout");
    expect(node).toBeDefined();
    expect(["LAYOUT", "COMPONENT"]).toContain(node!.type);
  });

  test("GET node has type API", () => {
    const node = result.nodes.find((n) => n.label === "GET");
    expect(node).toBeDefined();
    expect(node!.type).toBe("API");
  });

  test("NavBar node has type COMPONENT", () => {
    const node = result.nodes.find((n) => n.label === "NavBar");
    expect(node).toBeDefined();
    expect(node!.type).toBe("COMPONENT");
  });

  test("fetchUsers node has type FUNCTION", () => {
    const node = result.nodes.find((n) => n.label === "fetchUsers");
    expect(node).toBeDefined();
    expect(node!.type).toBe("FUNCTION");
  });

  test("formatDate node has type DRIFT (exported, never called)", () => {
    const node = result.nodes.find((n) => n.label === "formatDate");
    expect(node).toBeDefined();
    expect(node!.type).toBe("DRIFT");
  });

  test("there is a RENDERS edge from HomePage to NavBar", () => {
    const edge = result.edges.find(
      (e) =>
        e.type === "RENDERS" &&
        e.source.includes("HomePage") &&
        e.target.includes("NavBar")
    );
    expect(edge).toBeDefined();
  });

  test("there is a CALLS edge from GET to fetchUsers", () => {
    const edge = result.edges.find(
      (e) =>
        e.type === "CALLS" &&
        e.source.includes("GET") &&
        e.target.includes("fetchUsers")
    );
    expect(edge).toBeDefined();
  });

  test("stats.filesAnalyzed is 5", () => {
    expect(result.stats.filesAnalyzed).toBe(5);
  });

  test("stats.driftIssues is at least 1", () => {
    expect(result.stats.driftIssues).toBeGreaterThanOrEqual(1);
  });

  test("all nodes have valid positions", () => {
    for (const node of result.nodes) {
      expect(typeof node.position.x).toBe("number");
      expect(typeof node.position.y).toBe("number");
      expect(node.position.x).toBeGreaterThanOrEqual(0);
      expect(node.position.y).toBeGreaterThanOrEqual(0);
    }
  });
});
