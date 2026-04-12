import { describe, it, expect, vi, beforeEach } from "vitest";
import { consola } from "consola";

const mocks = vi.hoisted(() => ({
  loadSdConfig: vi.fn(),
  deserializeDiagnostic: vi.fn((d: any) => d),
  typecheckNonPackageFiles: vi.fn(),
  createTypecheckEngine: vi.fn(),
  discoverWorkspacePackages: vi.fn(),
  mergeTestsPackagesIntoConfig: vi.fn(),
}));

const mockEngines: Array<{
  run: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}> = [];

vi.mock("../../src/utils/sd-config", () => ({
  loadSdConfig: mocks.loadSdConfig,
}));

vi.mock("../../src/typecheck/typecheck-serialization", () => ({
  deserializeDiagnostic: mocks.deserializeDiagnostic,
}));

vi.mock("../../src/typecheck/typecheck-non-package", () => ({
  typecheckNonPackageFiles: mocks.typecheckNonPackageFiles,
}));

vi.mock("../../src/engines/index", () => ({
  createTypecheckEngine: mocks.createTypecheckEngine,
}));

vi.mock("../../src/utils/package-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/utils/package-utils")>();
  return {
    ...actual,
    discoverWorkspacePackages: mocks.discoverWorkspacePackages,
    mergeTestsPackagesIntoConfig: mocks.mergeTestsPackagesIntoConfig,
  };
});

vi.mock("typescript", async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  const origDefault = (orig["default"] ?? orig) as Record<string, unknown>;
  return {
    ...orig,
    default: {
      ...origDefault,
      sortAndDeduplicateDiagnostics: vi.fn((d: unknown[]) => d),
      formatDiagnosticsWithColorAndContext: vi.fn((diags: Array<{ messageText: string }>) =>
        diags.map((d) => `formatted: ${d.messageText}`).join("\n"),
      ),
    },
  };
});

const mockTypecheckLogger = {
  debug: vi.fn(),
  start: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
  withTag: vi.fn(),
};

vi.spyOn(consola, "withTag").mockImplementation((tag: string) => {
  if (tag === "sd:cli:typecheck") return mockTypecheckLogger as any;
  return {
    debug: vi.fn(),
    start: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
    withTag: vi.fn(),
  } as any;
});

const { executeTypecheck } = await import("../../src/commands/typecheck");

function createMockEngine() {
  const engine = {
    run: vi.fn().mockResolvedValue({
      success: true,
      build: { success: true, errors: [], warnings: [], diagnostics: [] },
    }),
    startWatch: vi.fn(),
    stop: vi.fn().mockResolvedValue(undefined),
  };
  mockEngines.push(engine);
  return engine;
}

function setupDefaults(packages: Record<string, any> = {}) {
  mocks.loadSdConfig.mockResolvedValue({ packages });
  mocks.createTypecheckEngine.mockImplementation(() => createMockEngine() as any);
  mocks.typecheckNonPackageFiles.mockReturnValue({
    success: true,
    errorCount: 0,
    warningCount: 0,
    diagnostics: [],
  });

  // Default: no workspace packages, merge returns packages as-is
  mocks.discoverWorkspacePackages.mockReturnValue(new Map<string, string>());
  const pathMap = new Map<string, string>();
  for (const name of Object.keys(packages)) {
    pathMap.set(name, `packages/${name}`);
  }
  mocks.mergeTestsPackagesIntoConfig.mockReturnValue({
    merged: packages,
    pathMap,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEngines.length = 0;
});

describe("executeTypecheck", () => {
  it("succeeds for library packages", async () => {
    setupDefaults({
      "core-common": { target: "neutral" },
      "core-node": { target: "node" },
    });

    const result = await executeTypecheck({ targets: [], options: [] });

    expect(result.success).toBe(true);
  });

  it("succeeds for server packages", async () => {
    setupDefaults({
      "demo-server": { target: "server" },
    });

    const result = await executeTypecheck({ targets: [], options: [] });

    expect(result.success).toBe(true);
  });

  it("excludes scripts packages from typecheck", async () => {
    setupDefaults({
      "core-common": { target: "neutral" },
      "sd-claude": { target: "scripts" },
    });

    const result = await executeTypecheck({ targets: [], options: [] });

    expect(result.success).toBe(true);
  });

  it("typechecks client packages as browser target", async () => {
    setupDefaults({
      "core-common": { target: "neutral" },
      "my-app": { target: "client", server: "demo-server" },
    });

    const result = await executeTypecheck({ targets: [], options: [] });

    expect(result.success).toBe(true);
  });

  it("runs non-package typecheck when no targets specified", async () => {
    setupDefaults({ "core-common": { target: "neutral" } });

    await executeTypecheck({ targets: [], options: [] });

    expect(mocks.typecheckNonPackageFiles).toHaveBeenCalledWith(process.cwd());
  });

  it("skips non-package typecheck when all targets are package paths", async () => {
    setupDefaults({ "core-common": { target: "neutral" } });

    await executeTypecheck({ targets: ["packages/core-common"], options: [] });

    expect(mocks.typecheckNonPackageFiles).not.toHaveBeenCalled();
  });

  it("aggregates diagnostics from engines and non-package", async () => {
    setupDefaults({ "core-node": { target: "node" } });

    const engineDiag = { category: 1, code: 2322, messageText: "engine err" };
    mocks.createTypecheckEngine.mockImplementation(() => {
      const engine = {
        run: vi.fn().mockResolvedValue({
          success: false,
          build: { success: false, errors: [], warnings: [], diagnostics: [engineDiag] },
        }),
        startWatch: vi.fn(),
        stop: vi.fn().mockResolvedValue(undefined),
      };
      mockEngines.push(engine);
      return engine as any;
    });

    const nonPkgDiag = { category: 1, code: 2345, messageText: "non-pkg err" };
    mocks.typecheckNonPackageFiles.mockReturnValue({
      success: false,
      errorCount: 1,
      warningCount: 0,
      diagnostics: [nonPkgDiag],
    });

    const result = await executeTypecheck({ targets: [], options: [] });

    expect(result.success).toBe(false);
    expect(result.errorCount).toBe(2);
  });

  it("limits concurrency of BuildEngine workers", async () => {
    const packages: Record<string, any> = {};
    for (let i = 0; i < 50; i++) {
      packages[`pkg-${i}`] = { target: "neutral" };
    }
    setupDefaults(packages);

    let active = 0;
    let maxActive = 0;
    mocks.createTypecheckEngine.mockImplementation(() => {
      const engine = {
        run: vi.fn(async () => {
          active++;
          maxActive = Math.max(maxActive, active);
          await new Promise((resolve) => setTimeout(resolve, 5));
          active--;
          return {
            success: true,
            build: { success: true, errors: [], warnings: [], diagnostics: [] },
          };
        }),
        startWatch: vi.fn(),
        stop: vi.fn().mockResolvedValue(undefined),
      };
      mockEngines.push(engine);
      return engine as any;
    });

    await executeTypecheck({ targets: [], options: [] });

    expect(maxActive).toBeLessThan(50);
    expect(maxActive).toBeGreaterThan(0);
  });

  it("reports failure when engine run fails", async () => {
    setupDefaults({ "core-node": { target: "node" } });
    mocks.createTypecheckEngine.mockImplementation(() => {
      const engine = {
        run: vi.fn().mockRejectedValue(new Error("build error")),
        startWatch: vi.fn(),
        stop: vi.fn().mockResolvedValue(undefined),
      };
      mockEngines.push(engine);
      return engine as any;
    });

    const result = await executeTypecheck({ targets: [], options: [] });

    expect(result.success).toBe(false);
  });

  it("passes options to loadSdConfig", async () => {
    setupDefaults({});

    await executeTypecheck({ targets: [], options: ["key=value"] });

    expect(mocks.loadSdConfig).toHaveBeenCalledWith(
      expect.objectContaining({ opt: ["key=value"] }),
    );
  });

  it("filters packages by targets", async () => {
    setupDefaults({
      "core-common": { target: "neutral" },
      "core-node": { target: "node" },
    });

    const result = await executeTypecheck({ targets: ["packages/core-common"], options: [] });

    expect(result.success).toBe(true);
  });

  it("returns success when no packages to typecheck", async () => {
    setupDefaults({});

    const result = await executeTypecheck({ targets: [], options: [] });

    expect(result.success).toBe(true);
  });

  describe("tests/ package integration", () => {
    // Acceptance: Scenario "typecheck가 tests/ 패키지를 일반 패키지와 동일하게 처리한다"
    it("processes tests/ packages through BuildEngine like regular packages", async () => {
      const configPackages = {
        "core-common": { target: "neutral" },
      };
      mocks.loadSdConfig.mockResolvedValue({ packages: configPackages });
      mocks.discoverWorkspacePackages.mockReturnValue(
        new Map([
          ["core-common", "packages/core-common"],
          ["orm", "tests/orm"],
        ]),
      );
      const mergedPackages = {
        ...configPackages,
        orm: { target: "node" },
      };
      const pathMap = new Map([
        ["core-common", "packages/core-common"],
        ["orm", "tests/orm"],
      ]);
      mocks.mergeTestsPackagesIntoConfig.mockReturnValue({
        merged: mergedPackages,
        pathMap,
      });
      mocks.createTypecheckEngine.mockImplementation(() => createMockEngine() as any);

      const result = await executeTypecheck({ targets: [], options: [] });

      expect(result.success).toBe(true);
    });

    // Acceptance: Scenario "typecheck 결과가 기존과 동일하다"
    it("reports tests/ package errors in same format as regular packages", async () => {
      mocks.loadSdConfig.mockResolvedValue({ packages: {} });
      mocks.discoverWorkspacePackages.mockReturnValue(new Map([["orm", "tests/orm"]]));
      mocks.mergeTestsPackagesIntoConfig.mockReturnValue({
        merged: { orm: { target: "node" } },
        pathMap: new Map([["orm", "tests/orm"]]),
      });

      const diag = { category: 1, code: 2322, messageText: "type error in test" };
      mocks.createTypecheckEngine.mockImplementation(() => {
        const engine = {
          run: vi.fn().mockResolvedValue({
            success: false,
            build: { success: false, errors: [], warnings: [], diagnostics: [diag] },
          }),
          startWatch: vi.fn(),
          stop: vi.fn().mockResolvedValue(undefined),
        };
        mockEngines.push(engine);
        return engine as any;
      });

      const result = await executeTypecheck({ targets: [], options: [] });

      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(1);
    });

    // Unit: tests/ target resolves to correct package via pathMap
    it("resolves tests/ target path to correct package name", async () => {
      mocks.loadSdConfig.mockResolvedValue({ packages: {} });
      mocks.discoverWorkspacePackages.mockReturnValue(
        new Map([
          ["core-common", "packages/core-common"],
          ["orm", "tests/orm"],
        ]),
      );
      mocks.mergeTestsPackagesIntoConfig.mockReturnValue({
        merged: { orm: { target: "node" } },
        pathMap: new Map([
          ["core-common", "packages/core-common"],
          ["orm", "tests/orm"],
        ]),
      });
      mocks.createTypecheckEngine.mockImplementation(() => createMockEngine() as any);

      const result = await executeTypecheck({ targets: ["tests/orm"], options: [] });

      expect(result.success).toBe(true);
    });
  });

  it("throws when loadSdConfig fails (fail fast)", async () => {
    mocks.loadSdConfig.mockRejectedValue(new Error("sd.config.ts not found"));
    mocks.discoverWorkspacePackages.mockReturnValue(new Map());
    mocks.mergeTestsPackagesIntoConfig.mockReturnValue({ merged: {}, pathMap: new Map() });

    await expect(executeTypecheck({ targets: [], options: [] })).rejects.toThrow(
      "sd.config.ts not found",
    );
  });

  describe("lint integration", () => {
    it("returns merged lint result when lint is enabled", async () => {
      setupDefaults({
        "core-node": { target: "node" },
        "core-browser": { target: "browser" },
      });

      // Configure engines to return lint results
      mocks.createTypecheckEngine.mockImplementation(() => {
        const engine = {
          run: vi.fn().mockResolvedValue({
            success: true,
            build: { success: true, errors: [], warnings: [], diagnostics: [] },
            lint: {
              success: false,
              errorCount: 2,
              warningCount: 1,
              formattedOutput: "lint errors from pkg",
            },
          }),
          startWatch: vi.fn(),
          stop: vi.fn().mockResolvedValue(undefined),
        };
        mockEngines.push(engine);
        return engine as any;
      });

      const result = await executeTypecheck({ targets: [], options: [], lint: true });

      expect(result.lint).toBeDefined();
      expect(result.lint!.success).toBe(false);
      // 2 engines (node + browser), each with 2 errors = 4 total
      expect(result.lint!.errorCount).toBe(4);
      expect(result.lint!.warningCount).toBe(2);
      expect(result.lint!.formattedOutput).toContain("lint errors from pkg");
    });

    it("does not return lint result when lint option is not set", async () => {
      setupDefaults({ "core-node": { target: "node" } });

      const result = await executeTypecheck({ targets: [], options: [] });

      expect(result.lint).toBeUndefined();
    });

    it("returns scriptsPackagePaths for scripts packages that are skipped", async () => {
      setupDefaults({
        "core-node": { target: "node" },
        "sd-claude": { target: "scripts" },
      });

      const result = await executeTypecheck({ targets: [], options: [], lint: true });

      expect(result.scriptsPackagePaths).toBeDefined();
      expect(result.scriptsPackagePaths).toContain("packages/sd-claude");
    });

    it("merges lint results correctly when all succeed", async () => {
      setupDefaults({ "core-node": { target: "node" } });

      mocks.createTypecheckEngine.mockImplementation(() => {
        const engine = {
          run: vi.fn().mockResolvedValue({
            success: true,
            build: { success: true, errors: [], warnings: [], diagnostics: [] },
            lint: { success: true, errorCount: 0, warningCount: 0, formattedOutput: "" },
          }),
          startWatch: vi.fn(),
          stop: vi.fn().mockResolvedValue(undefined),
        };
        mockEngines.push(engine);
        return engine as any;
      });

      const result = await executeTypecheck({ targets: [], options: [], lint: true });

      expect(result.lint).toBeDefined();
      expect(result.lint!.success).toBe(true);
      expect(result.lint!.errorCount).toBe(0);
    });
  });

  describe("진행 로그", () => {
    // Unit: phaseLabel이 대상 없음 로그에도 적용된다
    it("lint 포함 시 대상 없음 로그에 '타입체크/린트 대상 없음'이 출력된다", async () => {
      // scripts만 있고 typecheck 대상이 없는 경우, targets를 지정하여 대상 없음 분기를 탄다
      setupDefaults({});
      mocks.mergeTestsPackagesIntoConfig.mockReturnValue({
        merged: {},
        pathMap: new Map(),
      });

      await executeTypecheck({ targets: ["packages/nonexistent"], options: [], lint: true });

      const infoCalls = mockTypecheckLogger.info.mock.calls;
      const noTargetMsg = infoCalls.find((c: string[]) => c[0].includes("대상 없음"));
      expect(noTargetMsg).toBeDefined();
      expect(noTargetMsg![0]).toContain("타입체크/린트");
    });

    it("typecheck+lint 시작 로그에 '타입체크/린트 실행 중...'이 출력된다", async () => {
      setupDefaults({ "core-node": { target: "node" } });

      await executeTypecheck({ targets: [], options: [], lint: true });

      // start 로그에 "타입체크/린트" 포함
      const startCalls = mockTypecheckLogger.start.mock.calls;
      const startMsg = startCalls.find((c: string[]) => c[0].includes("실행 중"));
      expect(startMsg).toBeDefined();
      expect(startMsg![0]).toContain("타입체크/린트");
    });

    it("typecheck-only 시작 로그에 '타입체크 실행 중...'이 출력된다", async () => {
      setupDefaults({ "core-node": { target: "node" } });

      await executeTypecheck({ targets: [], options: [] });

      const startCalls = mockTypecheckLogger.start.mock.calls;
      const startMsg = startCalls.find((c: string[]) => c[0].includes("실행 중"));
      expect(startMsg).toBeDefined();
      expect(startMsg![0]).toContain("타입체크 실행 중");
      expect(startMsg![0]).not.toContain("린트");
    });

    it("typecheck+lint 완료 로그에 '타입체크/린트 실행 완료'가 출력된다", async () => {
      setupDefaults({ "core-node": { target: "node" } });

      await executeTypecheck({ targets: [], options: [], lint: true });

      const successCalls = mockTypecheckLogger.success.mock.calls;
      const successMsg = successCalls.find((c: string[]) => c[0].includes("실행 완료"));
      expect(successMsg).toBeDefined();
      expect(successMsg![0]).toContain("타입체크/린트");
    });

    it("typecheck-only 완료 로그에 '타입체크 실행 완료'가 출력된다", async () => {
      setupDefaults({ "core-node": { target: "node" } });

      await executeTypecheck({ targets: [], options: [] });

      const successCalls = mockTypecheckLogger.success.mock.calls;
      const successMsg = successCalls.find((c: string[]) => c[0].includes("실행 완료"));
      expect(successMsg).toBeDefined();
      expect(successMsg![0]).toContain("타입체크 실행 완료");
      expect(successMsg![0]).not.toContain("린트");
    });

    it("typecheck+lint 결과 로그에 lintErrorCount, lintWarningCount가 포함된다", async () => {
      setupDefaults({ "core-node": { target: "node" } });

      mocks.createTypecheckEngine.mockImplementation(() => {
        const engine = {
          run: vi.fn().mockResolvedValue({
            success: true,
            build: { success: true, errors: [], warnings: [], diagnostics: [] },
            lint: { success: false, errorCount: 2, warningCount: 1, formattedOutput: "lint err" },
          }),
          startWatch: vi.fn(),
          stop: vi.fn().mockResolvedValue(undefined),
        };
        mockEngines.push(engine);
        return engine as any;
      });

      await executeTypecheck({ targets: [], options: [], lint: true });

      // 결과 요약 로그 (error 또는 info)에 lintErrorCount, lintWarningCount 포함
      const allInfoCalls = mockTypecheckLogger.info.mock.calls;
      const allErrorCalls = mockTypecheckLogger.error.mock.calls;
      const allResultCalls = [...allInfoCalls, ...allErrorCalls];
      const resultCall = allResultCalls.find(
        (c: unknown[]) => typeof c[1] === "object" && c[1] != null && "lintErrorCount" in c[1],
      );
      expect(resultCall).toBeDefined();
      expect((resultCall![1] as Record<string, number>)["lintErrorCount"]).toBe(2);
      expect((resultCall![1] as Record<string, number>)["lintWarningCount"]).toBe(1);
    });

    it("typecheck-only 결과 로그에 lintErrorCount, lintWarningCount가 포함되지 않는다", async () => {
      setupDefaults({ "core-node": { target: "node" } });

      await executeTypecheck({ targets: [], options: [] });

      const allInfoCalls = mockTypecheckLogger.info.mock.calls;
      const allErrorCalls = mockTypecheckLogger.error.mock.calls;
      const allResultCalls = [...allInfoCalls, ...allErrorCalls];
      const resultCall = allResultCalls.find(
        (c: unknown[]) => typeof c[1] === "object" && c[1] != null && "errorCount" in c[1],
      );
      expect(resultCall).toBeDefined();
      expect(resultCall![1] as Record<string, unknown>).not.toHaveProperty("lintErrorCount");
      expect(resultCall![1] as Record<string, unknown>).not.toHaveProperty("lintWarningCount");
    });
  });

  describe("엔진 문자열 에러 출력", () => {
    // Acceptance: Scenario "엔진 내부 예외로 문자열 에러만 반환"
    it("엔진이 dts.errors에 문자열 에러만 반환하면 formattedOutput에 해당 메시지가 포함되고 errorCount가 일치한다", async () => {
      setupDefaults({ "core-node": { target: "node" } });

      mocks.createTypecheckEngine.mockImplementation(() => {
        const engine = {
          run: vi.fn().mockResolvedValue({
            success: false,
            build: {
              success: false,
              errors: ["[core-node:node] Something went wrong"],
              warnings: [],
              diagnostics: [],
            },
          }),
          startWatch: vi.fn(),
          stop: vi.fn().mockResolvedValue(undefined),
        };
        mockEngines.push(engine);
        return engine as any;
      });

      const result = await executeTypecheck({ targets: ["packages/core-node"], options: [] });

      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(1);
      expect(result.formattedOutput).toContain("[core-node:node] Something went wrong");
    });

    // Acceptance: Scenario "복수 엔진이 문자열 에러를 반환"
    it("복수 엔진이 각각 build.errors에 메시지를 반환하면 모든 에러 메시지가 formattedOutput에 포함된다", async () => {
      setupDefaults({
        "pkg-a": { target: "node" },
        "pkg-b": { target: "node" },
      });

      let callIdx = 0;
      const errorMessages = ["[pkg-a:node] Error in package A", "[pkg-b:node] Error in package B"];

      mocks.createTypecheckEngine.mockImplementation(() => {
        const idx = callIdx++;
        const engine = {
          run: vi.fn().mockResolvedValue({
            success: false,
            build: {
              success: false,
              errors: [errorMessages[idx]],
              warnings: [],
              diagnostics: [],
            },
          }),
          startWatch: vi.fn(),
          stop: vi.fn().mockResolvedValue(undefined),
        };
        mockEngines.push(engine);
        return engine as any;
      });

      const result = await executeTypecheck({ targets: [], options: [] });

      expect(result.success).toBe(false);
      expect(result.formattedOutput).toContain("[pkg-a:node] Error in package A");
      expect(result.formattedOutput).toContain("[pkg-b:node] Error in package B");
    });

    // Unit: 단일 엔진이 build.errors에 복수 메시지를 반환하면 각각 합성 Diagnostic으로 변환된다
    it("단일 엔진이 build.errors에 복수 메시지를 담으면 errorCount가 메시지 수와 일치한다", async () => {
      setupDefaults({ "core-node": { target: "node" } });

      mocks.createTypecheckEngine.mockImplementation(() => {
        const engine = {
          run: vi.fn().mockResolvedValue({
            success: false,
            build: {
              success: false,
              errors: ["Error message 1", "Error message 2", "Error message 3"],
              warnings: [],
              diagnostics: [],
            },
          }),
          startWatch: vi.fn(),
          stop: vi.fn().mockResolvedValue(undefined),
        };
        mockEngines.push(engine);
        return engine as any;
      });

      const result = await executeTypecheck({ targets: ["packages/core-node"], options: [] });

      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(3);
      expect(result.formattedOutput).toContain("Error message 1");
      expect(result.formattedOutput).toContain("Error message 2");
      expect(result.formattedOutput).toContain("Error message 3");
    });

    // Acceptance: Scenario "엔진이 diagnostics를 포함하여 반환"
    it("엔진이 diagnostics를 포함하여 반환하면 기존과 동일하게 포매팅된다", async () => {
      setupDefaults({ "core-node": { target: "node" } });

      const diag = { category: 1, code: 2322, messageText: "Type error in source" };
      mocks.createTypecheckEngine.mockImplementation(() => {
        const engine = {
          run: vi.fn().mockResolvedValue({
            success: false,
            build: { success: false, errors: [], warnings: [], diagnostics: [diag] },
          }),
          startWatch: vi.fn(),
          stop: vi.fn().mockResolvedValue(undefined),
        };
        mockEngines.push(engine);
        return engine as any;
      });

      const result = await executeTypecheck({ targets: [], options: [] });

      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(1);
      expect(result.formattedOutput).toContain("Type error in source");
    });
  });
});
