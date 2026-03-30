import { describe, it, expect, vi, beforeEach } from "vitest";

//#region Mocks

// fsx mock
const mockFsxExists = vi.fn();
const mockFsxRead = vi.fn();
const mockFsxWrite = vi.fn().mockResolvedValue(undefined);
const mockFsxReadJson = vi.fn();
const mockFsxWriteJson = vi.fn().mockResolvedValue(undefined);
const mockFsxMkdir = vi.fn().mockResolvedValue(undefined);
const mockFsxRm = vi.fn().mockResolvedValue(undefined);
const mockFsxGlob = vi.fn().mockResolvedValue([]);
const mockFsxCopy = vi.fn().mockResolvedValue(undefined);

vi.mock("@simplysm/core-node", () => ({
  fsx: {
    exists: mockFsxExists,
    read: mockFsxRead,
    write: mockFsxWrite,
    readJson: mockFsxReadJson,
    writeJson: mockFsxWriteJson,
    mkdir: mockFsxMkdir,
    rm: mockFsxRm,
    glob: mockFsxGlob,
    copy: mockFsxCopy,
  },
  cpx: {
    exec: mockCpxExec,
    execSync: vi.fn().mockReturnValue({ stdout: "", stderr: "", exitCode: 0 }),
  },
}));

// env mock
let mockEnv: Record<string, unknown> = {};
vi.mock("@simplysm/core-common", () => ({
  env: new Proxy({} as Record<string, unknown>, {
    get: (_target, prop) => mockEnv[prop as string],
  }),
}));

// cpx mock (was execa) — tracks commands and resolves immediately
const execaCalls: { command: string; args: string[] }[] = [];
let execaFactory: (...args: unknown[]) => Promise<{ stdout: string; stderr: string; exitCode: number }> = () =>
  Promise.resolve({ stdout: "", stderr: "", exitCode: 0 });

const mockCpxExec = vi.fn((...args: unknown[]) => {
  execaCalls.push({ command: args[0] as string, args: (args[1] as string[] | undefined) ?? [] });
  return execaFactory(...args);
});

const mockFsWriteFile = vi.fn().mockResolvedValue(undefined);
vi.mock("node:fs", () => ({
  default: { promises: { writeFile: (...args: unknown[]) => mockFsWriteFile(...args) } },
  existsSync: (p: string) => {
    if (p.includes("pnpm-workspace.yaml")) return true;
    return false;
  },
}));

// sharp mock
vi.mock("sharp", () => ({
  default: vi.fn().mockReturnValue({
    resize: vi.fn().mockReturnThis(),
    composite: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(new Uint8Array([0])),
    toFile: vi.fn().mockResolvedValue(undefined),
  }),
}));

// consola mock
const mockLoggerDebug = vi.fn();
const mockLoggerWarn = vi.fn();
vi.mock("consola", () => ({
  consola: {
    withTag: () => ({
      debug: mockLoggerDebug,
      warn: mockLoggerWarn,
      info: vi.fn(),
    }),
  },
}));

//#endregion

//#region Helpers

const PKG_PATH = "/fake/pkg";

function setupDefaultMocks() {
  mockFsxExists.mockResolvedValue(true);

  mockFsxReadJson.mockImplementation((p: string) => {
    const normalized = p.replace(/\\/g, "/");
    if (normalized.includes(".capacitor/package.json")) {
      return {
        name: "com.test.app",
        version: "1.2.3",
        dependencies: {
          "@capacitor/core": "^7.0.0",
          "@capacitor/app": "^7.0.0",
          "@capacitor/android": "^7.0.0",
        },
        devDependencies: {
          "@capacitor/cli": "^7.0.0",
          "@capacitor/assets": "^3.0.0",
        },
      };
    }
    return { name: "test-pkg", version: "1.2.3" };
  });

  mockFsxRead.mockImplementation((p: string) => {
    const normalized = p.replace(/\\/g, "/");
    if (normalized.includes("capacitor.config.ts")) {
      return `import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.test.app",
  appName: "Test App",
  server: {
    url: "http://old-url:3000",
  },
};
export default config;`;
    }
    return "";
  });

  mockFsxGlob.mockImplementation((pattern: string) => {
    if (pattern.includes("Corretto") || pattern.includes("jdk")) {
      return ["C:/Program Files/Amazon Corretto/jdk21.0.1"];
    }
    return [];
  });

  mockEnv = { ANDROID_HOME: "C:/Android/Sdk" };

  execaCalls.length = 0;
  execaFactory = () => Promise.resolve({ stdout: "", stderr: "", exitCode: 0 });
  mockFsWriteFile.mockReset();
  mockFsWriteFile.mockResolvedValue(undefined);
}

//#endregion

describe("Capacitor.run()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  // Acceptance: Scenario "Capacitor 디바이스 실행 (run 메서드 단위 테스트)"
  it("updates server URL, runs cap copy and cap run for android", async () => {
    const { Capacitor } = await import("../../src/capacitor/capacitor.js");

    const cap = await Capacitor.create(PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      platform: { android: {} },
    });

    await cap.run("http://localhost:4200");

    // _updateServerUrl should have written the new URL
    expect(mockFsxWrite).toHaveBeenCalledWith(
      expect.stringContaining("capacitor.config.ts"),
      expect.stringContaining("http://localhost:4200"),
    );

    // cap copy android + cap run android
    const capCmds = execaCalls.filter(
      (c) => c.command === "npx" && c.args.includes("cap"),
    );
    expect(capCmds.some((c) => c.args.includes("copy") && c.args.includes("android"))).toBe(true);
    expect(capCmds.some((c) => c.args.includes("run") && c.args.includes("android"))).toBe(true);
  });

  // Unit: adb kill-server retry on cap run failure
  it("retries cap run after adb kill-server on android platform failure", async () => {
    const { Capacitor } = await import("../../src/capacitor/capacitor.js");

    let capRunCallCount = 0;
    execaFactory = (...args: unknown[]) => {
      const cmd = args[0] as string;
      const cmdArgs = (args[1] as string[] | undefined) ?? [];

      if (
        cmd === "npx" &&
        cmdArgs.includes("cap") &&
        cmdArgs.includes("run") &&
        cmdArgs.includes("android")
      ) {
        capRunCallCount++;
        if (capRunCallCount === 1) {
          // First cap run fails
          return Promise.reject(new Error("cap run failed"));
        }
      }
      return Promise.resolve({ stdout: "", stderr: "", exitCode: 0 });
    };

    const cap = await Capacitor.create(PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      platform: { android: {} },
    });

    await cap.run("http://localhost:4200");

    // adb kill-server should have been called between the two cap run attempts
    expect(
      execaCalls.some((c) => c.command === "adb" && c.args.includes("kill-server")),
    ).toBe(true);
    expect(capRunCallCount).toBe(2);
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.stringContaining("adb kill-server"),
    );
  });

  // Unit: _updateServerUrl replaces existing url
  it("replaces existing url in capacitor.config.ts", async () => {
    const { Capacitor } = await import("../../src/capacitor/capacitor.js");

    const cap = await Capacitor.create(PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      platform: { android: {} },
    });

    await cap.run("http://localhost:5555");

    const writeCall = mockFsxWrite.mock.calls.find(
      (c: string[]) => c[0].replace(/\\/g, "/").includes("capacitor.config.ts"),
    );
    expect(writeCall).toBeDefined();
    const content = writeCall![1] as string;
    expect(content).toContain('url: "http://localhost:5555"');
    expect(content).not.toContain("http://old-url:3000");
  });

  // Unit: _updateServerUrl inserts url when server block exists but no url field
  it("inserts url when server block has no url field", async () => {
    mockFsxRead.mockImplementation((p: string) => {
      if (p.replace(/\\/g, "/").includes("capacitor.config.ts")) {
        return `const config = {
  server: {
    hostname: "localhost",
  },
};`;
      }
      return "";
    });

    const { Capacitor } = await import("../../src/capacitor/capacitor.js");

    const cap = await Capacitor.create(PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      platform: { android: {} },
    });

    await cap.run("http://localhost:4200");

    const writeCall = mockFsxWrite.mock.calls.find(
      (c: string[]) => c[0].replace(/\\/g, "/").includes("capacitor.config.ts"),
    );
    expect(writeCall).toBeDefined();
    const content = writeCall![1] as string;
    expect(content).toContain('url: "http://localhost:4200"');
  });
});
