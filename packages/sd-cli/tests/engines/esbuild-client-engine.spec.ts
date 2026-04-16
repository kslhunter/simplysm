import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock factories (vi.mock is hoisted) ---

const mockWorker = {
  build: vi.fn(),
  startWatch: vi.fn(),
  stopWatch: vi.fn(),
  terminate: vi.fn(),
  on: vi.fn(),
};

vi.mock("@simplysm/core-node", () => ({
  Worker: {
    create: vi.fn(() => mockWorker),
  },
}));

// fs mock
const mockUnlinkSync = vi.fn();
vi.mock("node:fs", () => ({
  default: {
    unlinkSync: (...args: any[]) => mockUnlinkSync(...args),
  },
  unlinkSync: (...args: any[]) => mockUnlinkSync(...args),
}));

// --- Dynamic imports after mocking ---

const { EsbuildClientEngine } = await import("../../src/engines/EsbuildClientEngine");

import type { ClientPackageInfo } from "../../src/engines/types";

// --- Helpers ---

function createMockPkg(overrides: Partial<ClientPackageInfo> = {}): ClientPackageInfo {
  return {
    name: "my-client",
    dir: "/packages/my-client",
    config: { target: "client", server: "my-server" } as any,
    ...overrides,
  };
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  mockWorker.terminate.mockResolvedValue(undefined);
  mockWorker.stopWatch.mockResolvedValue(undefined);
});

describe("EsbuildClientEngine", () => {
  describe("run()", () => {
    it("worker.build()에 ClientBuildInfo를 전달한다", async () => {
      mockWorker.build.mockResolvedValue({ success: true });

      const pkg = createMockPkg({
        config: {
          target: "client",
          server: "my-server",
          env: { API_URL: "http://localhost" },
          configs: { key: "value" },
          pwa: false,
        } as any,
      });

      const engine = new EsbuildClientEngine({
        cwd: "/root",
        pkg,
        outDir: "/custom/out",
        base: "/app/",
      });

      await engine.run({ js: true, dts: false });

      expect(mockWorker.build).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "my-client",
          cwd: "/root",
          pkgDir: "/packages/my-client",
          env: { API_URL: "http://localhost" },
          configs: { key: "value" },
          pwa: false,
          outDir: "/custom/out",
          base: "/app/",
        }),
      );

      // framework 필드가 포함되지 않아야 한다 (D3)
      const buildArg = mockWorker.build.mock.calls[0][0];
      expect(buildArg).not.toHaveProperty("framework");

      // exclude 필드가 포함되지 않아야 한다 (D4)
      expect(buildArg).not.toHaveProperty("exclude");

      await engine.stop();
    });

    it("browserSupport를 worker.build()에 전달한다", async () => {
      mockWorker.build.mockResolvedValue({ success: true });

      const browserSupport = {
        legacyModule: true,
        browserslist: "Chrome 61",
        postCss: { plugins: [["autoprefixer"] as [string]] },
      };
      const pkg = createMockPkg({
        config: {
          target: "client",
          server: "my-server",
          browserSupport,
        } as any,
      });

      const engine = new EsbuildClientEngine({ cwd: "/root", pkg });
      await engine.run({ js: true, dts: false });

      expect(mockWorker.build).toHaveBeenCalledWith(
        expect.objectContaining({ browserSupport }),
      );

      await engine.stop();
    });

    it("빌드 실패 시 에러를 EngineResult에 매핑한다", async () => {
      mockWorker.build.mockResolvedValue({
        success: false,
        errors: ["TS2345: Type error"],
        warnings: ["deprecation warning"],
      });

      const engine = new EsbuildClientEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: false });

      expect(result.build.success).toBe(false);
      expect(result.build.errors).toContain("TS2345: Type error");
      expect(result.build.warnings).toContain("deprecation warning");

      await engine.stop();
    });

    it("errors/warnings가 undefined이면 빈 배열로 매핑한다", async () => {
      mockWorker.build.mockResolvedValue({ success: true });

      const engine = new EsbuildClientEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: false });

      expect(result.build.errors).toEqual([]);
      expect(result.build.warnings).toEqual([]);

      await engine.stop();
    });
  });

  describe("startWatch()", () => {
    it("server가 number이면 포트로 전달한다", async () => {
      mockWorker.startWatch.mockResolvedValue({ success: true });

      const pkg = createMockPkg({
        config: { target: "client", server: 4200 } as any,
      });

      const engine = new EsbuildClientEngine({ cwd: "/root", pkg });
      await engine.startWatch({ js: true, dts: false });

      expect(mockWorker.startWatch).toHaveBeenCalledWith(
        expect.objectContaining({ port: 4200 }),
      );

      await engine.stop();
    });

    it("browserSupport를 worker.startWatch()에 전달한다", async () => {
      mockWorker.startWatch.mockResolvedValue({ success: true });

      const browserSupport = { browserslist: ["Chrome 61", "Firefox 60"] };
      const pkg = createMockPkg({
        config: { target: "client", server: 4200, browserSupport } as any,
      });

      const engine = new EsbuildClientEngine({ cwd: "/root", pkg });
      await engine.startWatch({ js: true, dts: false });

      expect(mockWorker.startWatch).toHaveBeenCalledWith(
        expect.objectContaining({ browserSupport }),
      );

      await engine.stop();
    });

    it("server가 string이면 port를 undefined로 전달한다", async () => {
      mockWorker.startWatch.mockResolvedValue({ success: true });

      const engine = new EsbuildClientEngine({
        cwd: "/root",
        pkg: createMockPkg({ config: { target: "client", server: "my-server" } as any }),
      });

      await engine.startWatch({ js: true, dts: false });

      expect(mockWorker.startWatch).toHaveBeenCalledWith(
        expect.objectContaining({ port: undefined }),
      );

      await engine.stop();
    });

    it("error 이벤트를 ResultCollector에 보고한다", async () => {
      const mockResultCollector = { add: vi.fn() };

      mockWorker.startWatch.mockImplementation(() => {
        const errorHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "error",
        )?.[1];
        errorHandler?.({ message: "Build failed" });
        return Promise.resolve({ success: false });
      });

      const engine = new EsbuildClientEngine({
        cwd: "/root",
        pkg: createMockPkg(),
        resultCollector: mockResultCollector as any,
      });

      await engine.startWatch({ js: true, dts: false });

      const errorResult = mockResultCollector.add.mock.calls.find(
        (c: any[]) => c[0].status === "error",
      );
      expect(errorResult).toBeDefined();
      expect(errorResult![0].message).toBe("Build failed");

      await engine.stop();
    });

    it("RebuildManager에 '{name}:build' 키 패턴으로 등록한다", async () => {
      const mockRebuildManager = { registerBuild: vi.fn(() => vi.fn()) };

      mockWorker.startWatch.mockResolvedValue({ success: true });

      const engine = new EsbuildClientEngine({
        cwd: "/root",
        pkg: createMockPkg({ name: "demo-app" }),
        rebuildManager: mockRebuildManager as any,
      });

      await engine.startWatch({ js: true, dts: false });

      const buildStartHandler = mockWorker.on.mock.calls.find(
        (call: any[]) => call[0] === "buildStart",
      )?.[1];
      buildStartHandler?.({});

      expect(mockRebuildManager.registerBuild).toHaveBeenCalledWith(
        "demo-app:build",
        expect.any(String),
      );

      await engine.stop();
    });

    it("port가 없으면 serverReady 전까지 undefined이다", async () => {
      mockWorker.startWatch.mockResolvedValue({ success: true });

      const engine = new EsbuildClientEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.startWatch({ js: true, dts: false });

      expect(engine.port).toBeUndefined();

      await engine.stop();
    });

    it("초기 빌드 실패 시 reject하지 않고 정상 완료된다", async () => {
      mockWorker.startWatch.mockResolvedValue({
        success: false,
        errors: ["Module not found: @angular/core", "Syntax error in app.ts"],
      });

      const engine = new EsbuildClientEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.startWatch({ js: true, dts: false });

      // startWatch가 reject하지 않고 정상 완료되는지 확인
      expect(mockWorker.startWatch).toHaveBeenCalled();

      await engine.stop();
    });

    it("초기 빌드 성공 시 에러 로깅을 하지 않는다", async () => {
      mockWorker.startWatch.mockResolvedValue({ success: true });

      const engine = new EsbuildClientEngine({ cwd: "/root", pkg: createMockPkg() });
      // 예외 없이 완료
      await expect(engine.startWatch({ js: true, dts: false })).resolves.toBeUndefined();

      await engine.stop();
    });

    it("초기 빌드 ��공 + warnings 시 ResultCollector에 success와 warnings가 저장된다", async () => {
      const mockResultCollector = { add: vi.fn(), get: vi.fn(), toMap: vi.fn() };
      mockWorker.startWatch.mockResolvedValue({ success: true, warnings: ["w1", "w2"] });

      const engine = new EsbuildClientEngine({
        cwd: "/root",
        pkg: createMockPkg(),
        resultCollector: mockResultCollector as any,
      });
      await engine.startWatch({ js: true, dts: false });

      const addCall = mockResultCollector.add.mock.calls.find(
        (c: any[]) => c[0].warnings != null,
      );
      expect(addCall).toBeDefined();
      expect(addCall![0]).toMatchObject({
        status: "success",
        warnings: "w1\nw2",
      });

      await engine.stop();
    });

    it("초기 빌드 실패 + warnings 시 ResultCollector에 에러와 경고 모두 저장된다", async () => {
      const mockResultCollector = { add: vi.fn(), get: vi.fn(), toMap: vi.fn() };
      mockWorker.startWatch.mockResolvedValue({
        success: false,
        errors: ["e1"],
        warnings: ["w1"],
      });

      const engine = new EsbuildClientEngine({
        cwd: "/root",
        pkg: createMockPkg(),
        resultCollector: mockResultCollector as any,
      });
      await engine.startWatch({ js: true, dts: false });

      const errorResult = mockResultCollector.add.mock.calls.find(
        (c: any[]) => c[0].status === "error",
      );
      expect(errorResult).toBeDefined();
      expect(errorResult![0]).toMatchObject({
        status: "error",
        message: "e1",
        warnings: "w1",
      });

      await engine.stop();
    });

    it("초기 빌드 성공 + warnings 없음 시 ResultCollector에 추가 저장하지 않는다", async () => {
      const mockResultCollector = { add: vi.fn(), get: vi.fn(), toMap: vi.fn() };
      mockWorker.startWatch.mockResolvedValue({ success: true });

      const engine = new EsbuildClientEngine({
        cwd: "/root",
        pkg: createMockPkg(),
        resultCollector: mockResultCollector as any,
      });
      await engine.startWatch({ js: true, dts: false });

      // setupWatchEvents에 의한 add 호출만 있고, 초기 빌드 경로의 add 호출은 없어야 한다
      const directAdd = mockResultCollector.add.mock.calls.find(
        (c: any[]) => c[0].target === "client" && (c[0].message != null || c[0].warnings != null),
      );
      expect(directAdd).toBeUndefined();

      await engine.stop();
    });

    it("scopeRebuild 이벤트를 구독하지 않는다", async () => {
      mockWorker.startWatch.mockResolvedValue({ success: true });

      const engine = new EsbuildClientEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.startWatch({ js: true, dts: false });

      const scopeRebuildSubscription = mockWorker.on.mock.calls.find(
        (call: any[]) => call[0] === "scopeRebuild",
      );
      expect(scopeRebuildSubscription).toBeUndefined();

      await engine.stop();
    });
  });

  describe("stop()", () => {
    it("run 모드에서는 stopWatch를 호출하지 않는다", async () => {
      mockWorker.build.mockResolvedValue({ success: true });

      const engine = new EsbuildClientEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.run({ js: true, dts: false });
      await engine.stop();

      expect(mockWorker.stopWatch).not.toHaveBeenCalled();
      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it("worker 생성 전 stop() 호출을 안전하게 처리한다", async () => {
      const engine = new EsbuildClientEngine({ cwd: "/root", pkg: createMockPkg() });
      await expect(engine.stop()).resolves.toBeUndefined();
    });

    it(".dev-port 파일 삭제 실패를 무시한다", async () => {
      mockUnlinkSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });

      mockWorker.build.mockResolvedValue({ success: true });

      const engine = new EsbuildClientEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.run({ js: true, dts: false });

      // 예외 없이 stop 완료
      await expect(engine.stop()).resolves.toBeUndefined();
    });
  });
});
