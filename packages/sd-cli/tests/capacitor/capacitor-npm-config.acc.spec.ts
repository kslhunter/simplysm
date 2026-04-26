import { describe, it, expect, vi, beforeEach } from "vitest";

//#region Mocks

const mockFsxExists = vi.fn();
const mockFsxRead = vi.fn();
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
      read: mockFsxRead,
      write: mockFsxWrite,
      readJson: mockFsxReadJson,
      writeJson: mockFsxWriteJson,
      mkdir: mockFsxMkdir,
    },
    cpx: {
      spawn: mockCpxSpawn,
    },
  };
});

const execaCalls: { command: string; args: string[]; options: unknown }[] = [];
const mockCpxSpawn = vi.fn((...args: unknown[]) => {
  execaCalls.push({
    command: args[0] as string,
    args: (args[1] as string[] | undefined) ?? [],
    options: args[2],
  });
  return Promise.resolve({ stdout: "", stderr: "", exitCode: 0 });
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

function setupDefaultMocks() {
  mockFsxExists.mockImplementation((p: string) => {
    const n = p.replace(/\\/g, "/");
    if (n.includes(".capacitor.lock")) return false;
    return true;
  });

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
    expect(execaCalls.some((c) => c.command === "pnpm" && c.args.includes("install"))).toBe(false);
  });

  it("node_modules가 없으면 true를 반환하고 pnpm install을 실행한다", async () => {
    mockFsxExists.mockImplementation((p: string) => {
      const n = p.replace(/\\/g, "/");
      if (n.includes(".capacitor.lock")) return false;
      if (n.includes("node_modules")) return false;
      return true;
    });

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
    const installCall = execaCalls.find((c) => c.command === "pnpm" && c.args.includes("install"));
    expect(installCall).toBeDefined();
    expect(installCall?.options).toEqual(expect.objectContaining({ shell: true }));
  });

  it("최초 실행 시 cap init을 수행한다", async () => {
    mockFsxExists.mockImplementation((p: string) => {
      const n = p.replace(/\\/g, "/");
      if (n.includes("node_modules")) return false;
      if (n.includes("capacitor.config.ts")) return false;
      if (n.includes(".capacitor/package.json")) return false;
      if (n.includes("www/index.html")) return false;
      return true;
    });

    mockFsxReadJson.mockImplementation((p: string) => {
      const normalized = p.replace(/\\/g, "/");
      if (normalized.includes(".capacitor/package.json")) {
        return { name: "", version: "" };
      }
      return { name: "test-pkg", version: "1.0.0" };
    });

    const { initCapNpmProject } = await import(
      "../../src/capacitor/capacitor-npm-config.js"
    );

    await initCapNpmProject(CAP_PATH, PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
    }, { name: "test-pkg", version: "1.0.0" }, [], []);

    const capInitCall = execaCalls.find(
      (c) => c.command === "pnpm" && c.args.includes("cap") && c.args.includes("init"),
    );
    expect(capInitCall).toBeDefined();
    expect(capInitCall?.options).toEqual(expect.objectContaining({ shell: true }));
  });
});

describe("setupCapNpmConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it("플러그인을 올바르게 관리한다 (추가/제거)", async () => {
    // 기존에 @capacitor/camera가 있고, 새 설정에는 없고 unknown-plugin이 추가
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
            "@capacitor/camera": "^7",
          },
          devDependencies: { "@capacitor/cli": "^7", "@capacitor/assets": "^3" },
        };
      }
      return { name: "test-pkg", version: "1.0.0" };
    });

    const { setupCapNpmConfig } = await import(
      "../../src/capacitor/capacitor-npm-config.js"
    );

    await setupCapNpmConfig(CAP_PATH, PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      plugins: { "unknown-plugin": true },
      platform: { android: {} },
    }, { name: "test-pkg", version: "1.0.0" }, ["android"], []);

    const writeCall = mockFsxWriteJson.mock.calls[0] as [string, Record<string, unknown>, unknown];
    const deps = writeCall[1]["dependencies"] as Record<string, string>;
    expect(deps["@capacitor/camera"]).toBeUndefined();
    expect(deps["unknown-plugin"]).toBe("*");
  });

  it("exclude 패키지를 추가한다", async () => {
    mockFsxReadJson.mockImplementation((p: string) => {
      const normalized = p.replace(/\\/g, "/");
      if (normalized.includes(".capacitor/package.json")) {
        return {
          name: "com.test.app",
          version: "1.0.0",
          dependencies: { "@capacitor/core": "^7", "@capacitor/app": "^7", "@capacitor/android": "^7" },
          devDependencies: { "@capacitor/cli": "^7", "@capacitor/assets": "^3" },
        };
      }
      return {
        name: "test-pkg",
        version: "1.0.0",
        dependencies: { "jeep-sqlite": "^2.0.0" },
      };
    });

    const { setupCapNpmConfig } = await import(
      "../../src/capacitor/capacitor-npm-config.js"
    );

    await setupCapNpmConfig(CAP_PATH, PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      platform: { android: {} },
    }, {
      name: "test-pkg",
      version: "1.0.0",
      dependencies: { "jeep-sqlite": "^2.0.0" },
    }, ["android"], ["jeep-sqlite"]);

    const writeCall = mockFsxWriteJson.mock.calls[0] as [string, Record<string, unknown>, unknown];
    const deps = writeCall[1]["dependencies"] as Record<string, string>;
    expect(deps["jeep-sqlite"]).toBe("^2.0.0");
  });
});
