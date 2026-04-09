import { describe, it, expect, vi, beforeEach } from "vitest";
import { consola } from "consola";

//#region Mocks

// fsx mock
const mockFsxExists = vi.fn();
const mockFsxReadJson = vi.fn();
const mockFsxWriteJson = vi.fn().mockResolvedValue(undefined);
const mockFsxWrite = vi.fn().mockResolvedValue(undefined);
const mockFsxMkdir = vi.fn().mockResolvedValue(undefined);
const mockFsxCopy = vi.fn().mockResolvedValue(undefined);
const mockFsxReaddir = vi.fn();
const mockFsxGlob = vi.fn();

vi.mock("@simplysm/core-node", async (importOriginal) => {
  const original = await importOriginal<typeof import("@simplysm/core-node")>();
  return {
    ...original,
    fsx: {
      exists: mockFsxExists,
      readJson: mockFsxReadJson,
      writeJson: mockFsxWriteJson,
      write: mockFsxWrite,
      mkdir: mockFsxMkdir,
      copy: mockFsxCopy,
      readdir: mockFsxReaddir,
      glob: mockFsxGlob,
    },
    cpx: {
      spawn: mockCpxSpawn,
      spawnSync: vi.fn().mockReturnValue({ stdout: "", stderr: "", exitCode: 0 }),
    },
  };
});

// cpx mock (was execa)
const mockCpxSpawn = vi.fn().mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });

// esbuild mock
const mockEsbuildBuild = vi.fn().mockResolvedValue({});
let mockEsbuildOnEndCallback: ((result: { errors: unknown[] }) => void | Promise<void>) | null =
  null;
const mockEsbuildContext = vi.fn().mockImplementation((options: any) => {
  // Extract the electron-restart plugin's onEnd callback
  const plugin = options?.plugins?.find((p: any) => p.name === "electron-restart");
  if (plugin != null) {
    plugin.setup({
      onEnd: (cb: (result: { errors: unknown[] }) => void | Promise<void>) => {
        mockEsbuildOnEndCallback = cb;
      },
    });
  }
  return {
    watch: vi.fn().mockImplementation(async () => {
      // Simulate initial build success — trigger onEnd
      if (mockEsbuildOnEndCallback != null) {
        await mockEsbuildOnEndCallback({ errors: [] });
      }
    }),
    dispose: vi.fn(),
  };
});
vi.mock("esbuild", () => ({
  build: mockEsbuildBuild,
  context: mockEsbuildContext,
}));

// consola mock
const mockLoggerDebug = vi.fn();
const mockLoggerWarn = vi.fn();
const mockLoggerInfo = vi.fn();
vi.spyOn(consola, "withTag").mockReturnValue({ debug: mockLoggerDebug, warn: mockLoggerWarn, info: mockLoggerInfo } as any);

//#endregion

//#region Helpers

const PKG_PATH = "/fake/pkg";

function setupDefaultMocks() {
  mockFsxExists.mockResolvedValue(true);
  mockFsxReadJson.mockResolvedValue({
    name: "@myorg/my-app",
    version: "1.0.0",
    description: "My App",
    dependencies: {
      "better-sqlite3": "^11.0.0",
      "sharp": "^0.34.0",
    },
    devDependencies: {
      "electron": "^35.0.0",
      "@electron/rebuild": "^4.0.0",
      "electron-builder": "^26.0.0",
    },
  });
  mockFsxReaddir.mockResolvedValue(["index.html", "assets", "electron"]);
  // Default: glob returns one exe file matching the builder output
  mockFsxGlob.mockImplementation((pattern: string) => {
    const normalized = pattern.replace(/\\/g, "/");
    if (normalized.endsWith(".electron/dist/*.exe")) {
      const dir = normalized.replace("/*.exe", "");
      return Promise.resolve([dir + "/My App Setup 1.0.0.exe"]);
    }
    return Promise.resolve([]);
  });
  mockCpxSpawn.mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });
  mockEsbuildBuild.mockResolvedValue({});
}

function findWriteJson(pathFragment: string): Record<string, unknown> | undefined {
  const call = mockFsxWriteJson.mock.calls.find(
    (c) =>
      typeof c[0] === "string" &&
      c[0].replace(/\\/g, "/").includes(pathFragment),
  );
  return call ? (call[1] as Record<string, unknown>) : undefined;
}

function findElectronPackageJson(): Record<string, unknown> | undefined {
  return findWriteJson(".electron/src/package.json");
}

function findBuilderConfig(): Record<string, unknown> | undefined {
  return findWriteJson("builder-config.json");
}

function normalizedCopyCalls(): string[][] {
  return mockFsxCopy.mock.calls.map((c) => [
    (c[0] as string).replace(/\\/g, "/"),
    (c[1] as string).replace(/\\/g, "/"),
  ]);
}

//#endregion

describe("Electron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEsbuildOnEndCallback = null;
    setupDefaultMocks();
  });

  //#region Rule: 설정을 검증한다

  describe("Acceptance: appId가 없으면 에러가 발생한다", () => {
    it("appId가 빈 문자열이면 에러를 던진다", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      await expect(
        Electron.create(PKG_PATH, { appId: "" }),
      ).rejects.toThrow("appId");
    });

    it("appId가 공백만 있으면 에러를 던진다", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      await expect(
        Electron.create(PKG_PATH, { appId: "   " }),
      ).rejects.toThrow("appId");
    });
  });

  //#endregion

  //#region Rule: Electron 프로젝트를 초기화한다

  describe("인수 테스트: 초기화", () => {
    it("package.json 생성 + pnpm install + electron-rebuild를 실행한다", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      const electron = await Electron.create(PKG_PATH, {
        appId: "com.test.app",
        reinstallDependencies: ["better-sqlite3"],
      });

      await electron.initialize();

      expect(findElectronPackageJson()).toBeDefined();

      const spawnCalls = mockCpxSpawn.mock.calls;
      expect(
        spawnCalls.find((c) => c[0] === "pnpm" && (c[1] as string[]).includes("install")),
      ).toBeDefined();
      expect(
        spawnCalls.find(
          (c) => c[0] === "pnpm" && (c[1] as string[]).includes("electron-rebuild"),
        ),
      ).toBeDefined();
    });

    it("reinstallDependencies가 비어있으면 electron-rebuild를 건너뛴다", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      const electron = await Electron.create(PKG_PATH, { appId: "com.test.app" });
      await electron.initialize();

      const rebuildCall = mockCpxSpawn.mock.calls.find(
        (c) => c[0] === "pnpm" && (c[1] as string[]).includes("electron-rebuild"),
      );
      expect(rebuildCall).toBeUndefined();
    });
  });

  describe("단위: _setupPackageJson", () => {
    it("스코프 패키지명을 정규화한다", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      const electron = await Electron.create(PKG_PATH, { appId: "com.test.app" });
      await electron.initialize();

      expect(findElectronPackageJson()!["name"]).toBe("myorg-my-app");
    });

    it("reinstallDependencies 패키지를 dependencies에 포함한다", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      const electron = await Electron.create(PKG_PATH, {
        appId: "com.test.app",
        reinstallDependencies: ["better-sqlite3"],
      });
      await electron.initialize();

      const deps = findElectronPackageJson()!["dependencies"] as Record<string, string>;
      expect(deps["better-sqlite3"]).toBe("^11.0.0");
    });

    it("exclude 패키지를 dependencies에 포함한다", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      const electron = await Electron.create(PKG_PATH, { appId: "com.test.app" }, ["sharp"]);
      await electron.initialize();

      const deps = findElectronPackageJson()!["dependencies"] as Record<string, string>;
      expect(deps["sharp"]).toBe("^0.34.0");
    });

    it("package.json에 type: module이 설정된다", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      const electron = await Electron.create(PKG_PATH, { appId: "com.test.app" });
      await electron.initialize();

      expect(findElectronPackageJson()!["type"]).toBe("module");
    });

    it("postInstallScript가 설정되면 scripts.postinstall에 포함한다", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      const electron = await Electron.create(PKG_PATH, {
        appId: "com.test.app",
        postInstallScript: "node rebuild.js",
      });
      await electron.initialize();

      const scripts = findElectronPackageJson()!["scripts"] as Record<string, string>;
      expect(scripts["postinstall"]).toBe("node rebuild.js");
    });
  });

  //#endregion

  //#region Rule: 메인 프로세스를 번들링한다

  describe("Acceptance: build — esbuild 번들링", () => {
    it("src/electron-main.ts를 esbuild로 번들링한다", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      const electron = await Electron.create(PKG_PATH, {
        appId: "com.test.app",
        reinstallDependencies: ["better-sqlite3"],
      });
      await electron.build("/fake/out");

      expect(mockEsbuildBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: "node",
          target: "node20",
          format: "esm",
          bundle: true,
          external: expect.arrayContaining(["electron", "better-sqlite3"]),
        }),
      );
    });

    it("electron-main.ts가 없으면 에러가 발생한다", async () => {
      mockFsxExists.mockImplementation((p: string) => {
        if (typeof p === "string" && p.includes("electron-main.ts")) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      const { Electron } = await import("../../src/electron/electron.js");
      const electron = await Electron.create(PKG_PATH, { appId: "com.test.app" });

      await expect(electron.build("/fake/out")).rejects.toThrow("electron-main.ts");
    });

    it("config.env를 esbuild banner로 주입한다 (ELECTRON_DEV_URL 미포함)", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      const electron = await Electron.create(PKG_PATH, {
        appId: "com.test.app",
        env: { API_URL: "https://api.example.com" },
      });
      await electron.build("/fake/out");

      const callArgs = mockEsbuildBuild.mock.calls[0][0];
      const banner = callArgs.banner?.js as string;
      expect(banner).toContain("process.env");
      expect(banner).toContain("??=");
      expect(banner).toContain("API_URL");
      expect(banner).toContain("https://api.example.com");
      expect(banner).not.toContain("ELECTRON_DEV_URL");
      expect(callArgs.define).toBeUndefined();
    });

    it("ESM 배너에 createRequire shim이 포함된다", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      const electron = await Electron.create(PKG_PATH, { appId: "com.test.app" });
      await electron.build("/fake/out");

      const callArgs = mockEsbuildBuild.mock.calls[0][0];
      const banner = callArgs.banner?.js as string;
      expect(banner).toContain("createRequire");
      expect(banner).toContain("import.meta.url");
    });
  });

  //#endregion

  //#region Rule: electron-builder로 패키징한다

  describe("Unit: Web assets 복사", () => {
    it("dist 내 파일을 .electron/src에 복사하되 electron 디렉토리는 제외한다", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      const electron = await Electron.create(PKG_PATH, { appId: "com.test.app" });
      await electron.build("/fake/out");

      const copies = normalizedCopyCalls();
      expect(copies.some((c) => c[0].includes("/fake/out/index.html"))).toBe(true);
      expect(copies.some((c) => c[0].includes("/fake/out/assets"))).toBe(true);
      expect(copies.some((c) => c[0].includes("/fake/out/electron"))).toBe(false);
    });
  });

  describe("Acceptance: electron-builder 설정 생성", () => {
    it("portable=true이면 portable 타겟으로 설정한다", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      const electron = await Electron.create(PKG_PATH, {
        appId: "com.test.app",
        portable: true,
      });
      await electron.build("/fake/out");

      const config = findBuilderConfig()!;
      expect(config["appId"]).toBe("com.test.app");
      expect((config["win"] as Record<string, unknown>)["target"]).toBe("portable");
    });

    it("portable 미설정이면 nsis 타겟으로 설정한다", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      const electron = await Electron.create(PKG_PATH, { appId: "com.test.app" });
      await electron.build("/fake/out");

      const config = findBuilderConfig()!;
      expect((config["win"] as Record<string, unknown>)["target"]).toBe("nsis");
    });

    it("installerIcon이 설정되면 icon에 포함한다", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      const electron = await Electron.create(PKG_PATH, {
        appId: "com.test.app",
        installerIcon: "assets/icon.ico",
      });
      await electron.build("/fake/out");

      const config = findBuilderConfig()!;
      expect((config["icon"] as string).replace(/\\/g, "/")).toContain("assets/icon.ico");
    });

    it("nsisOptions가 설정되면 nsis에 반영한다", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      const electron = await Electron.create(PKG_PATH, {
        appId: "com.test.app",
        nsisOptions: { oneClick: false, allowToChangeInstallationDirectory: true },
      });
      await electron.build("/fake/out");

      const nsis = findBuilderConfig()!["nsis"] as Record<string, unknown>;
      expect(nsis["oneClick"]).toBe(false);
      expect(nsis["allowToChangeInstallationDirectory"]).toBe(true);
    });
  });

  //#endregion

  //#region Rule: 빌드 산출물을 관리한다

  describe("Unit: 빌드 산출물 복사", () => {
    it("portable 빌드 시 {description}-portable-latest.exe로 복사한다", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      const electron = await Electron.create(PKG_PATH, {
        appId: "com.test.app",
        portable: true,
      });
      await electron.build("/fake/out");

      const latestCopy = normalizedCopyCalls().find(
        (c) => c[1].includes("electron") && c[1].includes("latest"),
      );
      expect(latestCopy).toBeDefined();
      expect(latestCopy![1]).toContain("-portable-latest.exe");
    });

    it("NSIS 빌드 시 {description}-latest.exe로 복사한다", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      const electron = await Electron.create(PKG_PATH, { appId: "com.test.app" });
      await electron.build("/fake/out");

      const latestCopy = normalizedCopyCalls().find(
        (c) => c[1].includes("electron") && c[1].includes("latest"),
      );
      expect(latestCopy).toBeDefined();
      expect(latestCopy![1]).not.toContain("-portable-");
      expect(latestCopy![1]).toContain("-latest.exe");
    });

    it("updates/{version}.exe에 버전별 복사를 한다", async () => {
      const { Electron } = await import("../../src/electron/electron.js");

      const electron = await Electron.create(PKG_PATH, { appId: "com.test.app" });
      await electron.build("/fake/out");

      expect(
        normalizedCopyCalls().find((c) => c[1].includes("updates/1.0.0.exe")),
      ).toBeDefined();
    });

    it("빌드 산출물이 없으면 경고를 출력한다", async () => {
      mockFsxGlob.mockImplementation((pattern: string) => {
        const normalized = pattern.replace(/\\/g, "/");
        if (normalized.endsWith(".electron/dist/*.exe")) return Promise.resolve([]);
        return Promise.resolve([]);
      });

      const { Electron } = await import("../../src/electron/electron.js");

      const electron = await Electron.create(PKG_PATH, { appId: "com.test.app" });
      await electron.build("/fake/out");

      expect(mockLoggerWarn).toHaveBeenCalledWith(expect.stringContaining("빌드 산출물"));
    });
  });

  //#endregion

  //#region Rule: 개발 모드에서 Electron 앱을 실행한다

  describe("인수 테스트: run()", () => {
    // Helper: creates a deferred cpx mock where Electron process can be controlled
    function setupCpxForRun(): {
      electronKill: ReturnType<typeof vi.fn>;
      resolveElectron: () => void;
    } {
      const electronKill = vi.fn();
      let resolveElectron: () => void = () => {};

      mockCpxSpawn.mockImplementation((cmd: string, args: string[]) => {
        // pnpm exec electron . → Electron 프로세스
        if (cmd === "pnpm" && args[0] === "exec" && args[1] === "electron" && args[2] === ".") {
          const p = new Promise<void>((resolve) => {
            resolveElectron = resolve;
          }) as any;
          p.kill = electronKill;
          return p;
        }
        return Promise.resolve({ stdout: "", stderr: "", exitCode: 0 });
      });

      return { electronKill, resolveElectron: () => resolveElectron() };
    }

    it("creates esbuild context with banner for env and spawns Electron", async () => {
      const { resolveElectron } = setupCpxForRun();

      const { Electron } = await import("../../src/electron/electron.js");
      const electron = await Electron.create(PKG_PATH, { appId: "com.test.app" });

      const runPromise = electron.run("http://localhost:4200");

      // Give event loop time to set up
      await new Promise((r) => setTimeout(r, 10));

      // Resolve Electron process (simulating Electron exit)
      resolveElectron();
      await runPromise;

      // esbuild.context was called with banner containing ELECTRON_DEV_URL
      const callArgs = mockEsbuildContext.mock.calls[0][0];
      const banner = callArgs.banner?.js as string;
      expect(banner).toContain("process.env");
      expect(banner).toContain("??=");
      expect(banner).toContain("ELECTRON_DEV_URL");
      expect(banner).toContain("http://localhost:4200");
      expect(callArgs.define).toBeUndefined();

      expect(callArgs.platform).toBe("node");
      expect(callArgs.target).toBe("node20");
      expect(callArgs.format).toBe("esm");
      expect(callArgs.bundle).toBe(true);
      expect(callArgs.external).toContain("electron");

      // ESM 배너에 createRequire shim 포함
      expect(banner).toContain("createRequire");
      expect(banner).toContain("import.meta.url");
    }, 10_000);

    it("throws when electron-main.ts entry point is missing", async () => {
      mockFsxExists.mockImplementation((p: string) => {
        if (typeof p === "string" && p.includes("electron-main.ts")) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      const { Electron } = await import("../../src/electron/electron.js");
      const electron = await Electron.create(PKG_PATH, { appId: "com.test.app" });

      await expect(electron.run("http://localhost:4200")).rejects.toThrow("electron-main.ts");
    });

    it("resolves on SIGINT signal", async () => {
      const { electronKill } = setupCpxForRun();

      const { Electron } = await import("../../src/electron/electron.js");
      const electron = await Electron.create(PKG_PATH, { appId: "com.test.app" });

      const runPromise = electron.run("http://localhost:4200");

      // Give the event loop time to set up signal handlers
      await new Promise((r) => setTimeout(r, 10));

      // Emit SIGINT to trigger cleanup
      process.emit("SIGINT" as any);

      // run() should resolve after signal
      await runPromise;

      expect(electronKill).toHaveBeenCalled();
    }, 10_000);
  });

  describe("단위: run() 플러그인 동작", () => {
    it("passes custom env and ELECTRON_DEV_URL via esbuild banner", async () => {
      let resolveElectron: () => void = () => {};
      mockCpxSpawn.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === "pnpm" && args[0] === "exec" && args[1] === "electron" && args[2] === ".") {
          const p = new Promise<void>((resolve) => {
            resolveElectron = resolve;
          }) as any;
          p.kill = vi.fn();
          return p;
        }
        return Promise.resolve({ stdout: "", stderr: "", exitCode: 0 });
      });

      const { Electron } = await import("../../src/electron/electron.js");
      const electron = await Electron.create(PKG_PATH, {
        appId: "com.test.app",
        env: { CUSTOM_VAR: "test-value" },
      });

      const runPromise = electron.run("http://localhost:5555");
      await new Promise((r) => setTimeout(r, 10));
      resolveElectron();
      await runPromise;

      const callArgs = mockEsbuildContext.mock.calls[0][0];
      const banner = callArgs.banner?.js as string;
      expect(banner).toContain("ELECTRON_DEV_URL");
      expect(banner).toContain("http://localhost:5555");
      expect(banner).toContain("CUSTOM_VAR");
      expect(banner).toContain("test-value");
      expect(callArgs.define).toBeUndefined();
    }, 10_000);

    it("calls initialize() before starting esbuild context", async () => {
      let resolveElectron: () => void = () => {};
      mockCpxSpawn.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === "pnpm" && args[0] === "exec" && args[1] === "electron" && args[2] === ".") {
          const p = new Promise<void>((resolve) => {
            resolveElectron = resolve;
          }) as any;
          p.kill = vi.fn();
          return p;
        }
        return Promise.resolve({ stdout: "", stderr: "", exitCode: 0 });
      });

      const { Electron } = await import("../../src/electron/electron.js");
      const electron = await Electron.create(PKG_PATH, { appId: "com.test.app" });

      const runPromise = electron.run("http://localhost:4200");
      await new Promise((r) => setTimeout(r, 10));
      resolveElectron();
      await runPromise;

      // initialize calls pnpm install
      const pnpmInstallCall = mockCpxSpawn.mock.calls.find(
        (c: any[]) => c[0] === "pnpm" && (c[1] as string[]).includes("install"),
      );
      expect(pnpmInstallCall).toBeDefined();
    }, 10_000);
  });

  //#endregion
});
