import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fsx, cpx } from "@simplysm/core-node";

const mockFsxExists = vi.spyOn(fsx, "exists");
vi.spyOn(fsx, "read");
vi.spyOn(fsx, "write").mockResolvedValue(undefined);
const mockFsxReadJson = vi.spyOn(fsx, "readJson");
vi.spyOn(fsx, "writeJson").mockResolvedValue(undefined);
vi.spyOn(fsx, "mkdir").mockResolvedValue(undefined);

const execaCalls: { command: string; args: string[]; options: unknown }[] = [];
vi.spyOn(cpx, "spawn").mockImplementation(((cmd: string, args: string[], options: unknown) => {
  execaCalls.push({
    command: cmd,
    args,
    options,
  });
  return { stdout: "", stderr: "", exitCode: 0 };
}) as never);

//#endregion

let tmpRoot: string;
let CAP_PATH: string;
let PKG_PATH: string;

beforeAll(() => {
  tmpRoot = mkdtempSync(path.join(tmpdir(), "cap-npm-config-acc-"));
  writeFileSync(path.join(tmpRoot, "pnpm-workspace.yaml"), "packages:\n  - pkg\n");
  PKG_PATH = path.join(tmpRoot, "pkg");
  CAP_PATH = path.join(PKG_PATH, ".capacitor");
});

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

function setupDefaultMocks() {
  mockFsxExists.mockImplementation(((p: string) => {
    const n = p.replace(/\\/g, "/");
    if (n.includes(".capacitor.lock")) return false;
    return true;
  }) as never);

  mockFsxReadJson.mockImplementation(((p: string) => {
    const normalized = p.replace(/\\/g, "/");
    if (normalized.includes(".capacitor/package.json")) {
      return {
        name: "com.test.app",
        version: "1.0.0",
        dependencies: {
          "@capacitor/core": "^7",
          "@capacitor/app": "^7",
          "@capacitor/android": "^7",
        },
        devDependencies: {
          "@capacitor/cli": "^7",
          "@capacitor/assets": "^3",
        },
      };
    }
    return { name: "test-pkg", version: "1.0.0" };
  }) as never);

  execaCalls.length = 0;
}

describe("initCapNpmProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it("의존성 미변경 + node_modules 존재 시 false를 반환하고 pnpm install을 실행하지 않는다", async () => {
    const { initCapNpmProject } = await import(
      "../../src/capacitor/capacitor-npm-config.js"
    );

    const changed = await initCapNpmProject(CAP_PATH, PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      platform: { android: {} },
    }, { name: "test-pkg", version: "1.0.0" }, ["android"], []);

    expect(changed).toBe(false);
  });

  it("node_modules가 없으면 true를 반환하고 pnpm install을 실행한다", async () => {
    mockFsxExists.mockImplementation(((p: string) => {
      const n = p.replace(/\\/g, "/");
      if (n.includes(".capacitor.lock")) return false;
      if (n.includes("node_modules")) return false;
      return true;
    }) as never);

    const { initCapNpmProject } = await import(
      "../../src/capacitor/capacitor-npm-config.js"
    );

    const changed = await initCapNpmProject(CAP_PATH, PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      platform: { android: {} },
    }, {
      name: "test-pkg",
      version: "1.0.0",
    }, ["android"], []);

    expect(changed).toBe(true);
  });
});
