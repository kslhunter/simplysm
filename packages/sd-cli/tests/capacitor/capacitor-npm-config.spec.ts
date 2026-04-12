import { describe, it, expect, vi, beforeEach } from "vitest";

//#region Mocks

const mockFsxExists = vi.fn();
const mockFsxWrite = vi.fn().mockResolvedValue(undefined);
const mockFsxReadJson = vi.fn();
const mockFsxWriteJson = vi.fn().mockResolvedValue(undefined);
const mockFsxMkdir = vi.fn().mockResolvedValue(undefined);

vi.mock("@simplysm/core-node", async (importOriginal) => {
  const original = await importOriginal<typeof import("@simplysm/core-node")>();
  return {
    ...original,
    fsx: {
      exists: mockFsxExists,
      read: vi.fn(),
      write: mockFsxWrite,
      readJson: mockFsxReadJson,
      writeJson: mockFsxWriteJson,
      mkdir: mockFsxMkdir,
    },
    cpx: {
      spawn: vi.fn().mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 }),
    },
  };
});

vi.mock("node:fs", () => ({
  existsSync: (p: string) => {
    if (p.includes("pnpm-workspace.yaml")) return true;
    return false;
  },
}));

//#endregion

const CAP_PATH = "/fake/pkg/.capacitor";
const PKG_PATH = "/fake/pkg";

describe("setupCapNpmConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFsxExists.mockResolvedValue(true);
    mockFsxReadJson.mockImplementation((p: string) => {
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
    });
  });

  it("루트 package.json이 없으면 에러를 던진다", async () => {
    mockFsxExists.mockImplementation((p: string) => {
      const n = p.replace(/\\/g, "/");
      if (n.endsWith("package.json") && !n.includes(".capacitor")) return false;
      return true;
    });

    const { setupCapNpmConfig } = await import(
      "../../src/capacitor/capacitor-npm-config.js"
    );

    await expect(
      setupCapNpmConfig(CAP_PATH, PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
      }, { name: "test-pkg", version: "1.0.0" }, [], []),
    ).rejects.toThrow("루트 package.json");
  });

  it(".capacitor/package.json이 없으면 빈 설정으로 시작한다", async () => {
    mockFsxExists.mockImplementation((p: string) => {
      const n = p.replace(/\\/g, "/");
      if (n.includes(".capacitor/package.json")) return false;
      return true;
    });

    const { setupCapNpmConfig } = await import(
      "../../src/capacitor/capacitor-npm-config.js"
    );

    const changed = await setupCapNpmConfig(CAP_PATH, PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
    }, { name: "test-pkg", version: "1.0.0" }, [], []);

    // 빈 설정에서 시작하므로 dependencies가 추가되어 변경됨
    expect(changed).toBe(true);
    expect(mockFsxWriteJson).toHaveBeenCalledOnce();
  });

  it("volta 설정을 루트 package.json에서 전파한다", async () => {
    mockFsxReadJson.mockImplementation((p: string) => {
      const normalized = p.replace(/\\/g, "/");
      if (normalized.includes(".capacitor/package.json")) {
        return {
          name: "com.test.app",
          version: "1.0.0",
          dependencies: { "@capacitor/core": "^7", "@capacitor/app": "^7" },
          devDependencies: { "@capacitor/cli": "^7", "@capacitor/assets": "^3" },
        };
      }
      return { name: "test-pkg", version: "1.0.0", volta: { node: "20.18.0" } };
    });

    const { setupCapNpmConfig } = await import(
      "../../src/capacitor/capacitor-npm-config.js"
    );

    await setupCapNpmConfig(CAP_PATH, PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
    }, { name: "test-pkg", version: "1.0.0" }, [], []);

    const writeCall = mockFsxWriteJson.mock.calls[0] as [string, Record<string, unknown>, unknown];
    expect(writeCall[1]["volta"]).toEqual({ node: "20.18.0" });
  });
});
