import { describe, it, expect, vi, beforeEach } from "vitest";

//#region Mocks

const mocks = vi.hoisted(() => ({
  loadAndValidateConfig: vi.fn(),
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

vi.mock("../../src/utils/orchestrator-utils", () => ({
  loadAndValidateConfig: mocks.loadAndValidateConfig,
}));

vi.mock("../../src/typecheck/typecheck-serialization", () => ({
  deserializeDiagnostic: mocks.deserializeDiagnostic,
}));

vi.mock("../../src/typecheck/typecheck-non-package", () => ({
  typecheckNonPackageFiles: mocks.typecheckNonPackageFiles,
}));

vi.mock("../../src/engines/engine-factory", () => ({
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

const { TypecheckOrchestrator } = await import(
  "../../src/orchestrators/TypecheckOrchestrator"
);

//#endregion

//#region Helpers

function createMockEngine() {
  const engine = {
    run: vi.fn().mockResolvedValue({
      build: { success: true, errors: [], warnings: [], diagnostics: [] },
    }),
    startWatch: vi.fn(),
    stop: vi.fn().mockResolvedValue(undefined),
  };
  mockEngines.push(engine);
  return engine;
}

function setupDefaults(packages: Record<string, any> = {}) {
  mocks.loadAndValidateConfig.mockResolvedValue({ packages });
  mocks.createTypecheckEngine.mockImplementation(() => createMockEngine() as any);
  mocks.typecheckNonPackageFiles.mockReturnValue({
    success: true, errorCount: 0, warningCount: 0, diagnostics: [],
  });

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

//#endregion

//#region Tests

beforeEach(() => {
  vi.clearAllMocks();
  mockEngines.length = 0;
});

describe("TypecheckOrchestrator", () => {
  // Acceptance: Scenario "TypecheckOrchestrator 정상 실행"
  it("produces correct TypecheckResult through init → start → shutdown lifecycle", async () => {
    setupDefaults({
      "core-common": { target: "neutral" },
      "core-node": { target: "node" },
    });

    const orchestrator = new TypecheckOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    const result = await orchestrator.start();
    await orchestrator.shutdown();

    expect(result.success).toBe(true);
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
    // neutral → 2 tasks (node + browser), node → 1 task = 3 engines
    expect(mocks.createTypecheckEngine).toHaveBeenCalledTimes(3);
    for (const engine of mockEngines) {
      expect(engine.run).toHaveBeenCalledWith(
        expect.objectContaining({ js: false, dts: false }),
      );
    }
  });

  // Acceptance: Scenario "엔진 성공 시 리소스 정리"
  it("calls engine.stop() after successful run", async () => {
    setupDefaults({ "core-node": { target: "node" } });

    const orchestrator = new TypecheckOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();
    await orchestrator.shutdown();

    expect(mockEngines[0].stop).toHaveBeenCalled();
  });

  // Acceptance: Scenario "엔진 실패 시 리소스 정리"
  it("calls engine.stop() even when run fails", async () => {
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

    const orchestrator = new TypecheckOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    const result = await orchestrator.start();
    await orchestrator.shutdown();

    expect(result.success).toBe(false);
    expect(mockEngines[0].stop).toHaveBeenCalled();
  });
});

// executeTypecheck 편의 함수 테스트는 tests/commands/typecheck.spec.ts에서
// 동일한 코드 경로를 통해 검증되므로 중복 삭제함

//#endregion
