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

// fs mock for .dev-port deletion in stop()
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

  // Scenario: 엔진 중지
  it("stop()으로 worker를 종료하고 .dev-port를 삭제한다", async () => {
    // Given: dev watch 모드가 실행 중이다
    mockWorker.startWatch.mockResolvedValue({ success: true });

    const engine = new EsbuildClientEngine({
      cwd: "/root",
      pkg: createMockPkg({ dir: "/packages/my-client" }),
    });

    await engine.startWatch({ js: true, dts: false });

    // When: stop()이 호출된다
    await engine.stop();

    // Then: worker가 종료된다
    expect(mockWorker.stopWatch).toHaveBeenCalled();
    expect(mockWorker.terminate).toHaveBeenCalled();

    // And: .dev-port 파일 삭제가 시도된다
    expect(mockUnlinkSync).toHaveBeenCalledWith(
      expect.stringContaining(".dev-port"),
    );
  });
});
