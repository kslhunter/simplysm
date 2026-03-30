import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  executeTypecheck: vi.fn(),
  executeLint: vi.fn(),
  runLintInWorker: vi.fn(),
  execa: vi.fn(),
  loadSdConfig: vi.fn(),
  discoverWorkspacePackages: vi.fn(),
}));

vi.mock("../../src/commands/typecheck", () => ({
  executeTypecheck: mocks.executeTypecheck,
}));

vi.mock("../../src/commands/lint", () => ({
  executeLint: mocks.executeLint,
}));

vi.mock("../../src/utils/lint-utils", () => ({
  runLintInWorker: mocks.runLintInWorker,
}));

vi.mock("@simplysm/core-common", () => ({
  err: { message: (e: unknown) => (e instanceof Error ? e.message : String(e)) },
  SdError: class SdError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "SdError";
    }
  },
}));

vi.mock("../../src/utils/sd-config", () => ({
  loadSdConfig: mocks.loadSdConfig,
}));

vi.mock("execa", () => ({
  execa: mocks.execa,
}));

vi.mock("../../src/utils/package-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/utils/package-utils")>();
  return {
    ...actual,
    discoverWorkspacePackages: mocks.discoverWorkspacePackages,
  };
});

vi.mock("consola", () => {
  const fns = (): Record<string, unknown> => ({
    debug: vi.fn(), start: vi.fn(), success: vi.fn(),
    info: vi.fn(), error: vi.fn(), warn: vi.fn(), log: vi.fn(), fail: vi.fn(),
    withTag: vi.fn(() => fns()),
    level: 0,
  });
  const c = fns();
  return { consola: c, default: c, LogLevels: {} };
});

const { runCheck } = await import("../../src/commands/check");

describe("runCheck", () => {
  let savedExitCode: typeof process.exitCode;
  let writeSpy: ReturnType<typeof vi.spyOn>;
  let stdoutOutput: string;

  beforeEach(() => {
    vi.clearAllMocks();
    savedExitCode = process.exitCode;
    process.exitCode = undefined;
    stdoutOutput = "";
    writeSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
      stdoutOutput += String(chunk);
      return true;
    });

    // Default: workspace packages
    mocks.discoverWorkspacePackages.mockReturnValue(
      new Map([
        ["core-node", "packages/core-node"],
        ["core-common", "packages/core-common"],
        ["storage", "packages/storage"],
        ["orm", "tests/orm"],
        ["service", "tests/service"],
      ]),
    );

    // Default: sdConfig with 3 packages
    mocks.loadSdConfig.mockResolvedValue({
      packages: {
        "core-node": { target: "node" },
        "core-common": { target: "neutral" },
        "storage": { target: "node" },
      },
    });

    // Default: typecheck + lint pass (lint result included for engine integration)
    mocks.executeTypecheck.mockResolvedValue({
      success: true, errorCount: 0, warningCount: 0, formattedOutput: "",
      lint: { success: true, errorCount: 0, warningCount: 0, formattedOutput: "" },
      scriptsPackagePaths: [],
    });
    mocks.executeLint.mockResolvedValue({
      success: true, errorCount: 0, warningCount: 0, formattedOutput: "",
    });
    mocks.runLintInWorker.mockResolvedValue({
      success: true, errorCount: 0, warningCount: 0, formattedOutput: "",
    });
    mocks.execa.mockResolvedValue({
      stdout: "Tests  1 passed", stderr: "", exitCode: 0,
    });
  });

  afterEach(() => {
    process.exitCode = savedExitCode;
    writeSpy.mockRestore();
  });

  it("runs typecheck+lint and test", async () => {
    await runCheck({ targets: [], types: ["typecheck", "lint", "test"], fix: false });

    expect(mocks.executeTypecheck).toHaveBeenCalled();
    expect(mocks.execa).toHaveBeenCalled();
  });

  it("outputs results in TYPECHECK → LINT → TEST → 요약 order", async () => {
    await runCheck({ targets: [], types: ["typecheck", "lint", "test"], fix: false });

    const tcIdx = stdoutOutput.indexOf("TYPECHECK");
    const lintIdx = stdoutOutput.indexOf("LINT");
    const testIdx = stdoutOutput.indexOf("TEST");
    const summaryIdx = stdoutOutput.indexOf("요약");

    expect(tcIdx).toBeLessThan(lintIdx);
    expect(lintIdx).toBeLessThan(testIdx);
    expect(testIdx).toBeLessThan(summaryIdx);
  });

  it("runs only specified check types", async () => {
    await runCheck({ targets: [], types: ["test"], fix: false });

    // typecheck not called when only test is requested
    expect(mocks.executeTypecheck).not.toHaveBeenCalled();
    expect(mocks.execa).toHaveBeenCalled();
  });

  it("sets exitCode 1 when typecheck fails", async () => {
    mocks.executeTypecheck.mockResolvedValue({
      success: false, errorCount: 2, warningCount: 0, formattedOutput: "type errors",
      lint: { success: true, errorCount: 0, warningCount: 0, formattedOutput: "" },
      scriptsPackagePaths: [],
    });

    await runCheck({ targets: [], types: ["typecheck", "lint", "test"], fix: false });

    expect(process.exitCode).toBe(1);
  });

  it("sets exitCode to 1 when lint fails", async () => {
    mocks.executeLint.mockResolvedValue({
      success: false, errorCount: 1, warningCount: 0, formattedOutput: "lint errors",
    });

    await runCheck({ targets: [], types: ["lint"], fix: false });

    expect(process.exitCode).toBe(1);
  });

  it("sets exitCode 1 when test fails", async () => {
    mocks.execa.mockResolvedValue({
      stdout: "3 tests failed", stderr: "", exitCode: 1,
    });

    await runCheck({ targets: [], types: ["test"], fix: false });

    expect(process.exitCode).toBe(1);
  });

  it("handles vitest execution error gracefully", async () => {
    mocks.execa.mockRejectedValue(new Error("vitest not found"));

    await runCheck({ targets: [], types: ["test"], fix: false });

    expect(process.exitCode).toBe(1);
  });

  // --- target validation ---

  it("throws error for unknown target", async () => {
    await expect(
      runCheck({ targets: ["nonexistent"], types: ["typecheck"], fix: false }),
    ).rejects.toThrow("Unknown target: nonexistent");
  });

  // --- workspace-based target resolution ---

  it("resolves package target to packages/ path", async () => {
    await runCheck({ targets: ["core-node"], types: ["typecheck"], fix: false });

    expect(mocks.executeTypecheck).toHaveBeenCalledWith(
      expect.objectContaining({ targets: ["packages/core-node"] }),
    );
  });

  it("resolves test directory target to tests/ path", async () => {
    await runCheck({ targets: ["orm"], types: ["typecheck"], fix: false });

    expect(mocks.executeTypecheck).toHaveBeenCalledWith(
      expect.objectContaining({ targets: ["tests/orm"] }),
    );
  });

  it("resolves mixed targets to correct paths", async () => {
    await runCheck({ targets: ["core-node", "orm"], types: ["typecheck"], fix: false });

    expect(mocks.executeTypecheck).toHaveBeenCalledWith(
      expect.objectContaining({ targets: ["packages/core-node", "tests/orm"] }),
    );
  });

  it("passes resolved targets to executeLint for lint", async () => {
    await runCheck({ targets: ["orm"], types: ["lint"], fix: false });

    expect(mocks.executeLint).toHaveBeenCalledWith(
      expect.objectContaining({ targets: ["tests/orm"] }),
    );
  });

  it("passes resolved paths to vitest", async () => {
    await runCheck({ targets: ["orm"], types: ["test"], fix: false });

    expect(mocks.execa).toHaveBeenCalledWith(
      "pnpm",
      ["vitest", "tests/orm", "--run"],
      expect.any(Object),
    );
  });

  it("passes empty targets for all when no targets specified", async () => {
    await runCheck({ targets: [], types: ["typecheck"], fix: false });

    expect(mocks.executeTypecheck).toHaveBeenCalledWith(
      expect.objectContaining({ targets: [] }),
    );
  });

  //#region Slice 2: check 명령어 lint 통합 (Feature 3.2)

  describe("lint via engine integration", () => {
    beforeEach(() => {
      // Default: executeTypecheck returns lint result and scriptsPackagePaths
      mocks.executeTypecheck.mockResolvedValue({
        success: true, errorCount: 0, warningCount: 0, formattedOutput: "",
        lint: { success: true, errorCount: 0, warningCount: 0, formattedOutput: "" },
        scriptsPackagePaths: [],
      });
    });

    // Scenario: check에서 별도 lint 워커가 실행되지 않는다
    it("does not call runLint when lint type is included (uses engine lint instead)", async () => {
      await runCheck({ targets: [], types: ["typecheck", "lint"], fix: false });

      expect(mocks.executeTypecheck).toHaveBeenCalledWith(
        expect.objectContaining({ lint: true }),
      );
      expect(mocks.runLintInWorker).not.toHaveBeenCalled();
    });

    // Scenario: lint 실패 시 exitCode 설정
    it("sets exitCode 1 when engine lint fails", async () => {
      mocks.executeTypecheck.mockResolvedValue({
        success: true, errorCount: 0, warningCount: 0, formattedOutput: "",
        lint: { success: false, errorCount: 3, warningCount: 1, formattedOutput: "some lint output" },
        scriptsPackagePaths: [],
      });

      await runCheck({ targets: [], types: ["typecheck", "lint"], fix: false });

      expect(process.exitCode).toBe(1);
    });

    // Scenario: check에서 scripts 패키지의 lint가 별도 실행된다
    it("calls runLint for scripts packages only when scriptsPackagePaths is non-empty", async () => {
      mocks.executeTypecheck.mockResolvedValue({
        success: true, errorCount: 0, warningCount: 0, formattedOutput: "",
        lint: { success: true, errorCount: 0, warningCount: 0, formattedOutput: "" },
        scriptsPackagePaths: ["packages/sd-claude"],
      });
      mocks.runLintInWorker.mockResolvedValue({
        success: true, errorCount: 0, warningCount: 0, formattedOutput: "",
      });

      await runCheck({ targets: [], types: ["typecheck", "lint"], fix: false });

      // runLint should be called only for scripts packages
      expect(mocks.runLintInWorker).toHaveBeenCalledWith(
        expect.objectContaining({ targets: ["packages/sd-claude"] }),
      );
    });
  });

  //#endregion

  //#region Feature 1.1: check --type lint 독립 실행

  describe("lint-only path (Feature 1.1)", () => {
    // Scenario: lint만 요청 시 executeLint() 직접 호출
    it("calls executeLint directly when only lint type is requested", async () => {
      await runCheck({ targets: [], types: ["lint"], fix: false });

      expect(mocks.executeLint).toHaveBeenCalled();
      expect(mocks.executeTypecheck).not.toHaveBeenCalled();
    });

    // Scenario: typecheck,lint 요청 시 기존 경로 유지
    it("calls executeTypecheck with lint when typecheck,lint are requested", async () => {
      await runCheck({ targets: [], types: ["typecheck", "lint"], fix: false });

      expect(mocks.executeTypecheck).toHaveBeenCalledWith(
        expect.objectContaining({ lint: true }),
      );
      expect(mocks.executeLint).not.toHaveBeenCalled();
    });

    // Scenario: lint,test 요청 시 executeLint()와 vitest 병렬 실행
    it("runs executeLint and spawnVitest in parallel when lint,test are requested", async () => {
      await runCheck({ targets: [], types: ["lint", "test"], fix: false });

      expect(mocks.executeLint).toHaveBeenCalled();
      expect(mocks.execa).toHaveBeenCalled();
      expect(mocks.executeTypecheck).not.toHaveBeenCalled();
    });

    // Scenario: scripts 패키지 포함 전체 lint
    it("handles all packages via single executeLint call including scripts", async () => {
      mocks.discoverWorkspacePackages.mockReturnValue(
        new Map([
          ["core-common", "packages/core-common"],
          ["sd-claude", "packages/sd-claude"], // scripts package
        ]),
      );

      await runCheck({ targets: [], types: ["lint"], fix: false });

      expect(mocks.executeLint).toHaveBeenCalledTimes(1);
      expect(mocks.executeTypecheck).not.toHaveBeenCalled();
    });

    // Scenario: 특정 타겟 지정 lint
    it("passes normalized target paths to executeLint", async () => {
      await runCheck({ targets: ["core-common"], types: ["lint"], fix: false });

      expect(mocks.executeLint).toHaveBeenCalledWith(
        expect.objectContaining({ targets: ["packages/core-common"] }),
      );
    });

    // Scenario: 타겟 미지정 전체 lint
    it("passes empty targets to executeLint when no targets specified", async () => {
      await runCheck({ targets: [], types: ["lint"], fix: false });

      expect(mocks.executeLint).toHaveBeenCalledWith(
        expect.objectContaining({ targets: [] }),
      );
    });

    // Scenario: --fix 옵션으로 자동 수정
    it("passes fix: true to executeLint when --fix is specified", async () => {
      await runCheck({ targets: [], types: ["lint"], fix: true });

      expect(mocks.executeLint).toHaveBeenCalledWith(
        expect.objectContaining({ fix: true }),
      );
    });

    // Scenario: --fix 없이 실행
    it("passes fix: false to executeLint when --fix is not specified", async () => {
      await runCheck({ targets: [], types: ["lint"], fix: false });

      expect(mocks.executeLint).toHaveBeenCalledWith(
        expect.objectContaining({ fix: false }),
      );
    });

    // Scenario: lint 에러 없음
    it("does not set exitCode when lint passes", async () => {
      mocks.executeLint.mockResolvedValue({
        success: true, errorCount: 0, warningCount: 0, formattedOutput: "",
      });

      await runCheck({ targets: [], types: ["lint"], fix: false });

      expect(process.exitCode).toBeUndefined();
    });

    // Scenario: lint 에러 발생
    it("sets exitCode 1 when lint has errors", async () => {
      mocks.executeLint.mockResolvedValue({
        success: false, errorCount: 3, warningCount: 2, formattedOutput: "lint errors",
      });

      await runCheck({ targets: [], types: ["lint"], fix: false });

      expect(process.exitCode).toBe(1);
    });

    // Scenario: lint 대상 파일 없음
    it("does not set exitCode when no files to lint", async () => {
      mocks.executeLint.mockResolvedValue({
        success: true, errorCount: 0, warningCount: 0, formattedOutput: "",
      });

      await runCheck({ targets: [], types: ["lint"], fix: false });

      expect(process.exitCode).toBeUndefined();
    });

    // typecheck 관련 로그 메시지가 출력되지 않는다
    it("does not output typecheck-related sections when only lint is requested", async () => {
      await runCheck({ targets: [], types: ["lint"], fix: false });

      expect(stdoutOutput).not.toContain("TYPECHECK");
    });
  });

  //#endregion
});
