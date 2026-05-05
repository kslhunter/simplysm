import { describe, it, expect, vi, beforeEach } from "vitest";

import * as orchestratorUtils from "../../src/utils/orchestrator-utils";
import * as typecheckSerialization from "../../src/typecheck/typecheck-serialization";
import * as typecheckNonPackage from "../../src/typecheck/typecheck-non-package";
import * as engineFactory from "../../src/engines/engine-factory";
import * as packageUtils from "../../src/utils/package-utils";

import { TypecheckOrchestrator } from "../../src/orchestrators/TypecheckOrchestrator";

const mocks = {
  loadAndValidateConfig: undefined as unknown as ReturnType<typeof vi.spyOn>,
  deserializeDiagnostic: undefined as unknown as ReturnType<typeof vi.spyOn>,
  typecheckNonPackageFiles: undefined as unknown as ReturnType<typeof vi.spyOn>,
  createTypecheckEngine: undefined as unknown as ReturnType<typeof vi.spyOn>,
  discoverWorkspacePackages: undefined as unknown as ReturnType<typeof vi.spyOn>,
  mergeTestsPackagesIntoConfig: undefined as unknown as ReturnType<typeof vi.spyOn>,
};

const mockEngines: Array<{
  run: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}> = [];

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
  vi.restoreAllMocks();
  mockEngines.length = 0;

  mocks.loadAndValidateConfig = vi.spyOn(orchestratorUtils, "loadAndValidateConfig");
  mocks.deserializeDiagnostic = vi.spyOn(typecheckSerialization, "deserializeDiagnostic")
    .mockImplementation((d: any) => d);
  mocks.typecheckNonPackageFiles = vi.spyOn(typecheckNonPackage, "typecheckNonPackageFiles");
  mocks.createTypecheckEngine = vi.spyOn(engineFactory, "createTypecheckEngine");
  mocks.discoverWorkspacePackages = vi.spyOn(packageUtils, "discoverWorkspacePackages");
  mocks.mergeTestsPackagesIntoConfig = vi.spyOn(packageUtils, "mergeTestsPackagesIntoConfig");
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
        expect.objectContaining({ js: false, dts: false, includeTests: true }),
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
