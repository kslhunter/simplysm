import { describe, it, expect, vi, beforeEach } from "vitest";

//#region Mocks

let workerFns: Record<string, (...args: any[]) => any>;
let mockSend: ReturnType<typeof vi.fn>;

// vite mocks
const mockCreateServer = vi.fn();
const mockViteBuild = vi.fn();

vi.mock("vite", () => ({
  createServer: (...args: any[]) => mockCreateServer(...args),
  build: (...args: any[]) => mockViteBuild(...args),
}));

// createClientViteConfig mock
const mockCreateClientViteConfig = vi.fn();
vi.mock("../../src/utils/vite-config.js", () => ({
  createClientViteConfig: (...args: any[]) => mockCreateClientViteConfig(...args),
}));

// loadSdConfig mock
const mockLoadSdConfig = vi.fn();
vi.mock("../../src/utils/sd-config.js", () => ({
  loadSdConfig: (...args: any[]) => mockLoadSdConfig(...args),
}));

// vite-scope-watch-plugin mock
vi.mock("../../src/utils/vite-scope-watch-plugin.js", () => ({
  sdScopeWatchPlugin: vi.fn(),
}));

// fs mock
const mockRmSync = vi.fn();
const mockMkdirSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockExistsSync = vi.fn().mockReturnValue(false);
const mockReadFileSync = vi.fn().mockReturnValue('{"name": "@scope/my-client"}');
const mockStatSync = vi.fn().mockReturnValue({ isDirectory: () => false });

vi.mock("node:fs", () => ({
  default: {
    rmSync: (...args: any[]) => mockRmSync(...args),
    mkdirSync: (...args: any[]) => mockMkdirSync(...args),
    writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
    existsSync: (...args: any[]) => mockExistsSync(...args),
    readFileSync: (...args: any[]) => mockReadFileSync(...args),
    statSync: (...args: any[]) => mockStatSync(...args),
  },
  rmSync: (...args: any[]) => mockRmSync(...args),
  mkdirSync: (...args: any[]) => mockMkdirSync(...args),
  writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
  existsSync: (...args: any[]) => mockExistsSync(...args),
  readFileSync: (...args: any[]) => mockReadFileSync(...args),
  statSync: (...args: any[]) => mockStatSync(...args),
}));

vi.mock("@simplysm/core-node", () => ({
  createWorker: vi.fn((fns: Record<string, Function>) => {
    workerFns = fns as any;
    mockSend = vi.fn();
    return { send: mockSend };
  }),
}));

vi.mock("../../src/utils/worker-utils.js", () => ({
  registerCleanupHandlers: vi.fn(),
  setupWorkerConsola: vi.fn(),
}));

//#endregion

// Dynamic import after mocking
await import("../../src/workers/client.worker");

//#region Helpers

function createBaseInfo() {
  return {
    name: "my-client",
    cwd: "/workspace",
    pkgDir: "/workspace/packages/my-client",
  };
}

//#endregion

beforeEach(() => {
  vi.clearAllMocks();
  mockExistsSync.mockReturnValue(false);
  mockReadFileSync.mockReturnValue('{"name": "@scope/my-client"}');
  mockCreateClientViteConfig.mockResolvedValue({ plugins: [] });
  // 기본: legacyModule 미설정
  mockLoadSdConfig.mockResolvedValue({
    packages: {
      "my-client": { target: "client" },
    },
  });
});

describe("client.worker", () => {
  describe("startWatch — dev mode", () => {
    // Acceptance: Scenario "legacyModule 미설정 시 기존 dev server 실행"
    it("sends serverReady event when dev server starts in non-legacy mode", async () => {
      const mockServer = {
        listen: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        httpServer: { address: () => ({ port: 4200 }) },
      };
      mockCreateServer.mockResolvedValue(mockServer);

      await workerFns["startWatch"]({
        ...createBaseInfo(),
        port: 4200,
      });

      expect(mockSend).toHaveBeenCalledWith("serverReady", { port: 4200 });

      // cleanup module-level viteServer
      await workerFns["stopWatch"]();
    });
  });


  describe("build", () => {
    // Acceptance: Scenario "Angular 컴파일 에러 시 빌드 실패 반환"
    it("returns failure with errors when Angular compilation fails", async () => {
      let capturedOnBuild: ((result: any) => void) | undefined;
      mockCreateClientViteConfig.mockImplementation((opts: any) => {
        capturedOnBuild = opts.onBuild;
        return { plugins: [] };
      });

      mockViteBuild.mockImplementation(() => {
        capturedOnBuild?.({
          success: false,
          errors: ["TS2345: type mismatch"],
          warnings: [],
        });
      });

      const result = await workerFns["build"](createBaseInfo());

      expect(result.success).toBe(false);
      expect(result.errors).toContain("TS2345: type mismatch");
    });

    // Acceptance: Scenario "Angular 컴파일 에러 없이 빌드 성공"
    it("returns success when Angular compilation has no errors", async () => {
      let capturedOnBuild: ((result: any) => void) | undefined;
      mockCreateClientViteConfig.mockImplementation((opts: any) => {
        capturedOnBuild = opts.onBuild;
        return { plugins: [] };
      });

      mockViteBuild.mockImplementation(() => {
        capturedOnBuild?.({ success: true });
      });

      const result = await workerFns["build"](createBaseInfo());

      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    // Acceptance: Scenario "Angular 컴파일 경고만 있을 때 성공 반환"
    it("returns success with warnings when compilation has warnings only", async () => {
      let capturedOnBuild: ((result: any) => void) | undefined;
      mockCreateClientViteConfig.mockImplementation((opts: any) => {
        capturedOnBuild = opts.onBuild;
        return { plugins: [] };
      });

      mockViteBuild.mockImplementation(() => {
        capturedOnBuild?.({
          success: true,
          warnings: ["deprecated API usage"],
        });
      });

      const result = await workerFns["build"](createBaseInfo());

      expect(result.success).toBe(true);
      expect(result.warnings).toContain("deprecated API usage");
    });

    // Acceptance: Scenario "ClientBuildResult에서 lint 필드 제거"
    it("does not include lint field in build result even when onBuild provides lint", async () => {
      let capturedOnBuild: ((result: any) => void) | undefined;
      mockCreateClientViteConfig.mockImplementation((opts: any) => {
        capturedOnBuild = opts.onBuild;
        return { plugins: [] };
      });

      const lintData = { success: true, errorCount: 0, warningCount: 0, formattedOutput: "" };
      mockViteBuild.mockImplementation(() => {
        capturedOnBuild?.({ success: true, lint: lintData });
      });

      const result = await workerFns["build"](createBaseInfo());

      expect(result.success).toBe(true);
      expect(result).not.toHaveProperty("lint");
    });

    // Unit: returns success true when onBuild is never called (non-Angular framework)
    it("returns success true when onBuild is never called", async () => {
      mockCreateClientViteConfig.mockResolvedValue({ plugins: [] });
      mockViteBuild.mockResolvedValue(undefined);

      const result = await workerFns["build"](createBaseInfo());

      expect(result.success).toBe(true);
    });

  });
});
