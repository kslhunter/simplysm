import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fsx, cpx } from "@simplysm/core-node";

const mockFsxExists = vi.spyOn(fsx, "exists");
vi.spyOn(fsx, "write").mockResolvedValue(undefined);
const mockFsxReadJson = vi.spyOn(fsx, "readJson");
vi.spyOn(fsx, "writeJson").mockResolvedValue(undefined);
vi.spyOn(fsx, "mkdir").mockResolvedValue(undefined);
vi.spyOn(fsx, "read");

vi.spyOn(cpx, "spawn").mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });

let tmpRoot: string;
let CAP_PATH: string;
let PKG_PATH: string;

beforeAll(() => {
  tmpRoot = mkdtempSync(path.join(tmpdir(), "cap-npm-config-"));
  // 워크스페이스 루트 판정은 pnpm-workspace.yaml 기반
  writeFileSync(path.join(tmpRoot, "pnpm-workspace.yaml"), "packages:\n  - pkg\n");
  writeFileSync(path.join(tmpRoot, "package.json"), JSON.stringify({ private: true }));
  PKG_PATH = path.join(tmpRoot, "pkg");
  CAP_PATH = path.join(PKG_PATH, ".capacitor");
});

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("setupCapNpmConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFsxExists.mockResolvedValue(true);
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
  });

  it("루트 package.json이 없으면 에러를 던진다", async () => {
    mockFsxExists.mockImplementation(((p: string) => {
      const n = p.replace(/\\/g, "/");
      if (n.endsWith("package.json") && !n.includes(".capacitor")) return false;
      return true;
    }) as never);

    const { setupCapNpmConfig } = await import("../../src/capacitor/capacitor-npm-config.js");

    await expect(
      setupCapNpmConfig(
        CAP_PATH,
        PKG_PATH,
        {
          appId: "com.test.app",
          appName: "Test App",
        },
        { name: "test-pkg", version: "1.0.0" },
        [],
        [],
      ),
    ).rejects.toThrow("루트 package.json");
  });

  it(".capacitor/package.json이 없으면 빈 설정으로 시작한다", async () => {
    mockFsxExists.mockImplementation(((p: string) => {
      const n = p.replace(/\\/g, "/");
      if (n.includes(".capacitor/package.json")) return false;
      return true;
    }) as never);

    const { setupCapNpmConfig } = await import("../../src/capacitor/capacitor-npm-config.js");

    const changed = await setupCapNpmConfig(
      CAP_PATH,
      PKG_PATH,
      {
        appId: "com.test.app",
        appName: "Test App",
      },
      { name: "test-pkg", version: "1.0.0" },
      [],
      [],
    );

    // 빈 설정에서 시작하므로 dependencies가 추가되어 변경됨
    expect(changed).toBe(true);
  });
});
