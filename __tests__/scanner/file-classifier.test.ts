import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { classifyFile } from "@/lib/scanner/file-classifier";

describe("classifyFile", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "classifier-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createFile(relativePath: string, content = ""): string {
    const full = path.join(tmpDir, relativePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    return full;
  }

  test("app/page.tsx → PAGE", () => {
    createFile("app/page.tsx", "export default function Home() {}");
    const result = classifyFile("app/page.tsx", tmpDir);
    expect(result.primaryType).toBe("PAGE");
    expect(result.shouldAnalyze).toBe(true);
  });

  test("app/dashboard/page.tsx → PAGE", () => {
    createFile("app/dashboard/page.tsx", "export default function Dashboard() {}");
    const result = classifyFile("app/dashboard/page.tsx", tmpDir);
    expect(result.primaryType).toBe("PAGE");
  });

  test("app/layout.tsx → LAYOUT", () => {
    createFile("app/layout.tsx", "export default function RootLayout() {}");
    const result = classifyFile("app/layout.tsx", tmpDir);
    expect(result.primaryType).toBe("LAYOUT");
  });

  test("app/api/users/route.ts → API", () => {
    createFile("app/api/users/route.ts", "export async function GET() {}");
    const result = classifyFile("app/api/users/route.ts", tmpDir);
    expect(result.primaryType).toBe("API");
  });

  test("components/Button.tsx → COMPONENT", () => {
    createFile("components/Button.tsx", "export default function Button() {}");
    const result = classifyFile("components/Button.tsx", tmpDir);
    expect(result.primaryType).toBe("COMPONENT");
  });

  test("hooks/useAuth.ts → HOOK", () => {
    createFile("hooks/useAuth.ts", "export function useAuth() {}");
    const result = classifyFile("hooks/useAuth.ts", tmpDir);
    expect(result.primaryType).toBe("HOOK");
  });

  test("lib/utils.ts → UTILITY", () => {
    createFile("lib/utils.ts", "export function cn() {}");
    const result = classifyFile("lib/utils.ts", tmpDir);
    expect(result.primaryType).toBe("UTILITY");
  });

  test("node_modules/react/index.ts → shouldAnalyze: false", () => {
    createFile("node_modules/react/index.ts", "export {}");
    const result = classifyFile("node_modules/react/index.ts", tmpDir);
    expect(result.shouldAnalyze).toBe(false);
  });

  test("file with 'use client' → isClientComponent: true", () => {
    createFile("components/Client.tsx", "'use client';\nexport default function Client() {}");
    const result = classifyFile("components/Client.tsx", tmpDir);
    expect(result.isClientComponent).toBe(true);
  });

  test("file without 'use client' → isClientComponent: false", () => {
    createFile("components/Server.tsx", "export default function Server() {}");
    const result = classifyFile("components/Server.tsx", tmpDir);
    expect(result.isClientComponent).toBe(false);
  });

  test(".test.ts file → shouldAnalyze: false", () => {
    createFile("lib/utils.test.ts", "test('foo', () => {})");
    const result = classifyFile("lib/utils.test.ts", tmpDir);
    expect(result.shouldAnalyze).toBe(false);
  });

  test(".d.ts file → shouldAnalyze: false", () => {
    createFile("types/global.d.ts", "declare module 'foo' {}");
    const result = classifyFile("types/global.d.ts", tmpDir);
    expect(result.shouldAnalyze).toBe(false);
  });
});
