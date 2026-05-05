import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Worker } from "@simplysm/core-node";

const mockWorker = {
  build: vi.fn(),
  startWatch: vi.fn(),
  stopWatch: vi.fn(),
  terminate: vi.fn(),
  on: vi.fn(),
};

vi.spyOn(Worker, "create").mockReturnValue(mockWorker as any);

import { EsbuildClientEngine } from "../../src/engines/EsbuildClientEngine";

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

describe("EsbuildClientEngine Acceptance", () => {
  // Scenario: 프로덕션 빌드 실행
  it("프로덕션 빌드를 실행하고 EngineResult를 반환한다", async () => {
    // Given: client 패키지가 정의되어 있다
    mockWorker.build.mockResolvedValue({ success: true });

    const engine = new EsbuildClientEngine({ cwd: "/root", pkg: createMockPkg() });

    // When: run()을 호출한다
    const result = await engine.run({ js: true, dts: false });

    // Then: EngineResult에 성공 여부가 반환된다
    expect(result.build.success).toBe(true);
    expect(result.build.errors).toEqual([]);
    expect(result.build.diagnostics).toEqual([]);

    await engine.stop();
  });

  // Scenario: dev watch 모드 시작
  it("dev watch를 시작하고 serverReady로 포트를 전달받는다", async () => {
    // Given: client 패키지가 정의되어 있다
    mockWorker.startWatch.mockImplementation(() => {
      const serverReadyHandler = mockWorker.on.mock.calls.find(
        (call: any[]) => call[0] === "serverReady",
      )?.[1];
      serverReadyHandler?.({ port: 4200 });
      return Promise.resolve({ success: true });
    });

    const engine = new EsbuildClientEngine({ cwd: "/root", pkg: createMockPkg() });

    // When: startWatch()를 호출한다
    await engine.startWatch({ js: true, dts: false });

    // Then: serverReady 이벤트로 포트 번호가 전달된다
    expect(engine.port).toBe(4200);

    await engine.stop();
  });

  // Scenario: dev watch 중 파일 변경
  it("dev watch 중 빌드 이벤트를 ResultCollector에 보고한다", async () => {
    // Given: dev watch 모드가 실행 중이다
    const mockResultCollector = { add: vi.fn() };
    const mockResolver = vi.fn();
    const mockRebuildManager = { registerBuild: vi.fn(() => mockResolver) };

    mockWorker.startWatch.mockResolvedValue({ success: true });

    const engine = new EsbuildClientEngine({
      cwd: "/root",
      pkg: createMockPkg(),
      resultCollector: mockResultCollector as any,
      rebuildManager: mockRebuildManager as any,
    });

    await engine.startWatch({ js: true, dts: false });

    // When: buildStart + build 이벤트가 발생한다
    const buildStartHandler = mockWorker.on.mock.calls.find(
      (call: any[]) => call[0] === "buildStart",
    )?.[1];
    const buildHandler = mockWorker.on.mock.calls.find(
      (call: any[]) => call[0] === "build",
    )?.[1];

    buildStartHandler?.({});
    buildHandler?.({ success: true });

    // Then: ResultCollector에 결과가 추가된다
    const buildResult = mockResultCollector.add.mock.calls.find(
      (c: any[]) => c[0].type === "build",
    );
    expect(buildResult).toBeDefined();
    expect(buildResult![0].status).toBe("success");

    // And: RebuildManager의 resolver가 호출된다
    expect(mockRebuildManager.registerBuild).toHaveBeenCalled();
    expect(mockResolver).toHaveBeenCalled();

    await engine.stop();
  });

  // Scenario: 초기 빌드 실패 시 ResultCollector에 에러 보고
  it("초기 빌드 실패 시 ResultCollector에 에러가 보고된다", async () => {
    // Given: client 패키지가 정의되어 있다
    const mockResultCollector = { add: vi.fn() };

    mockWorker.startWatch.mockResolvedValue({
      success: false,
      errors: ["esbuild compilation failed"],
    });

    const engine = new EsbuildClientEngine({
      cwd: "/root",
      pkg: createMockPkg(),
      resultCollector: mockResultCollector as any,
    });

    // When: startWatch()를 호출한다
    await engine.startWatch({ js: true, dts: false });

    // Then: ResultCollector에 에러가 보고된다
    const errorReport = mockResultCollector.add.mock.calls.find(
      (c: any[]) => c[0].type === "build" && c[0].status === "error",
    );
    expect(errorReport).toBeDefined();
    expect(errorReport![0].name).toBe("my-client");

    await engine.stop();
  });

  //#region Feature 2.1: 초기 빌드 warnings → ResultCollector

  it("초기 빌드 성공 + warnings → ResultCollector에 success + warnings 저장", async () => {
    const mockResultCollector = { add: vi.fn() };

    mockWorker.startWatch.mockResolvedValue({
      success: true,
      warnings: ["unused variable"],
    });

    const engine = new EsbuildClientEngine({
      cwd: "/root",
      pkg: createMockPkg(),
      resultCollector: mockResultCollector as any,
    });

    await engine.startWatch({ js: true, dts: false });

    const warningReport = mockResultCollector.add.mock.calls.find(
      (c: any[]) => c[0].type === "build" && c[0].warnings != null,
    );
    expect(warningReport).toBeDefined();
    expect(warningReport![0].status).toBe("success");
    expect(warningReport![0].warnings).toBe("unused variable");

    await engine.stop();
  });

  it("초기 빌드 실패 + warnings → ResultCollector에 error + warnings 모두 저장", async () => {
    const mockResultCollector = { add: vi.fn() };

    mockWorker.startWatch.mockResolvedValue({
      success: false,
      errors: ["type error"],
      warnings: ["deprecated API"],
    });

    const engine = new EsbuildClientEngine({
      cwd: "/root",
      pkg: createMockPkg(),
      resultCollector: mockResultCollector as any,
    });

    await engine.startWatch({ js: true, dts: false });

    const errorReport = mockResultCollector.add.mock.calls.find(
      (c: any[]) => c[0].type === "build" && c[0].status === "error",
    );
    expect(errorReport).toBeDefined();
    expect(errorReport![0].message).toContain("type error");
    expect(errorReport![0].warnings).toBe("deprecated API");

    await engine.stop();
  });

  it("초기 빌드 성공 + warnings 없음 → ResultCollector에 추가 저장 없음", async () => {
    const mockResultCollector = { add: vi.fn() };

    mockWorker.startWatch.mockResolvedValue({ success: true });

    const engine = new EsbuildClientEngine({
      cwd: "/root",
      pkg: createMockPkg(),
      resultCollector: mockResultCollector as any,
    });

    await engine.startWatch({ js: true, dts: false });

    // setupWatchEvents에 의한 호출은 있을 수 있으나, startWatch 결과에 의한 추가 저장은 없음
    const warningReport = mockResultCollector.add.mock.calls.find(
      (c: any[]) => c[0].warnings != null,
    );
    expect(warningReport).toBeUndefined();

    await engine.stop();
  });

  //#endregion

  // Scenario: 엔진 중지
  it("stop()으로 worker를 종료하고 .dev-port를 삭제한다", async () => {
    // Given: dev watch 모드가 실행 중이고 .dev-port 파일이 존재한다
    const tmpRoot = mkdtempSync(path.join(tmpdir(), "esbuild-client-engine-"));
    try {
      const pkgDir = path.join(tmpRoot, "my-client");
      const distDir = path.join(pkgDir, "dist");
      mkdirSync(distDir, { recursive: true });
      const portFile = path.join(distDir, ".dev-port");
      writeFileSync(portFile, "4200");

      mockWorker.startWatch.mockResolvedValue({ success: true });

      const engine = new EsbuildClientEngine({
        cwd: tmpRoot,
        pkg: createMockPkg({ dir: pkgDir }),
      });

      await engine.startWatch({ js: true, dts: false });

      // When: stop()이 호출된다
      await engine.stop();

      // Then: worker가 종료된다
      expect(mockWorker.stopWatch).toHaveBeenCalled();
      expect(mockWorker.terminate).toHaveBeenCalled();

      // And: .dev-port 파일이 삭제된다
      expect(existsSync(portFile)).toBe(false);
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
