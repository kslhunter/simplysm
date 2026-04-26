import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { consola } from "consola";

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  start: vi.fn(),
  success: vi.fn(),
};

vi.spyOn(consola, "withTag").mockReturnValue(mockLogger as any);

const mocks = vi.hoisted(() => ({
  executeTypecheck: vi.fn(),
  executeLint: vi.fn(),
  runLintInWorker: vi.fn(),
  loadSdConfig: vi.fn(),
  discoverWorkspacePackages: vi.fn(),
}));

vi.mock("../../src/orchestrators/TypecheckOrchestrator", () => ({
  executeTypecheck: mocks.executeTypecheck,
}));

vi.mock("../../src/lint/lint-core", () => ({
  executeLint: mocks.executeLint,
}));

vi.mock("../../src/lint/lint-utils", () => ({
  runLintInWorker: mocks.runLintInWorker,
}));

vi.mock("../../src/utils/sd-config", () => ({
  loadSdConfig: mocks.loadSdConfig,
}));

vi.mock("../../src/utils/package-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/utils/package-utils")>();
  return {
    ...actual,
    discoverWorkspacePackages: mocks.discoverWorkspacePackages,
  };
});

const { runCheck } = await import("../../src/commands/check");

/**
 * Collects all calls to the given mock function's first argument into an array,
 * preserving call order for sequential assertions.
 */
function collectArgs(fn: ReturnType<typeof vi.fn>): string[] {
  return fn.mock.calls.map((call) => String(call[0]));
}

describe("runCheck", () => {
  let savedExitCode: typeof process.exitCode;

  beforeEach(() => {
    vi.clearAllMocks();
    savedExitCode = process.exitCode;
    process.exitCode = undefined;

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
  });

  afterEach(() => {
    process.exitCode = savedExitCode;
  });

  it("outputs success sections in TYPECHECK → LINT order via logger.success", async () => {
    await runCheck({ targets: [], types: ["typecheck", "lint"], fix: false });

    const successArgs = collectArgs(mockLogger.success);
    const tcIdx = successArgs.findIndex((a) => a.includes("TYPECHECK"));
    const lintIdx = successArgs.findIndex((a) => a.includes("LINT"));

    expect(tcIdx).toBeGreaterThanOrEqual(0);
    expect(lintIdx).toBeGreaterThanOrEqual(0);
    expect(tcIdx).toBeLessThan(lintIdx);
  });

  it("sets exitCode 1 when typecheck fails", async () => {
    mocks.executeTypecheck.mockResolvedValue({
      success: false, errorCount: 2, warningCount: 0, formattedOutput: "type errors",
      lint: { success: true, errorCount: 0, warningCount: 0, formattedOutput: "" },
      scriptsPackagePaths: [],
    });

    await runCheck({ targets: [], types: ["typecheck", "lint"], fix: false });

    expect(process.exitCode).toBe(1);
  });

  it("outputs failed section via logger.error with formattedOutput", async () => {
    mocks.executeTypecheck.mockResolvedValue({
      success: false, errorCount: 2, warningCount: 0, formattedOutput: "type errors",
      lint: { success: true, errorCount: 0, warningCount: 0, formattedOutput: "" },
      scriptsPackagePaths: [],
    });

    await runCheck({ targets: [], types: ["typecheck", "lint"], fix: false });

    const errorArgs = collectArgs(mockLogger.error);
    expect(errorArgs.some((a) => a.includes("TYPECHECK"))).toBe(true);
    expect(errorArgs.some((a) => a.includes("type errors"))).toBe(true);
  });

  it("outputs success summary via logger.success when all pass", async () => {
    await runCheck({ targets: [], types: ["typecheck", "lint"], fix: false });

    const successArgs = collectArgs(mockLogger.success);
    expect(successArgs.some((a) => a.includes("전체 통과"))).toBe(true);
  });

  it("outputs failure summary via logger.error when any fails", async () => {
    mocks.executeTypecheck.mockResolvedValue({
      success: false, errorCount: 1, warningCount: 0, formattedOutput: "err",
      lint: { success: true, errorCount: 0, warningCount: 0, formattedOutput: "" },
      scriptsPackagePaths: [],
    });

    await runCheck({ targets: [], types: ["typecheck", "lint"], fix: false });

    const errorArgs = collectArgs(mockLogger.error);
    expect(errorArgs.some((a) => a.includes("실패"))).toBe(true);
    expect(errorArgs.some((a) => a.includes("합계"))).toBe(true);
  });

  it("sets exitCode to 1 when lint fails", async () => {
    mocks.executeLint.mockResolvedValue({
      success: false, errorCount: 1, warningCount: 0, formattedOutput: "lint errors",
    });

    await runCheck({ targets: [], types: ["lint"], fix: false });

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

    const successArgs = collectArgs(mockLogger.success);
    expect(successArgs.some((a) => a.includes("TYPECHECK"))).toBe(true);
    expect(process.exitCode).toBeUndefined();
  });

  it("resolves test directory target to tests/ path", async () => {
    await runCheck({ targets: ["orm"], types: ["typecheck"], fix: false });

    const successArgs = collectArgs(mockLogger.success);
    expect(successArgs.some((a) => a.includes("TYPECHECK"))).toBe(true);
    expect(process.exitCode).toBeUndefined();
  });

  it("resolves mixed targets to correct paths", async () => {
    await runCheck({ targets: ["core-node", "orm"], types: ["typecheck"], fix: false });

    const successArgs = collectArgs(mockLogger.success);
    expect(successArgs.some((a) => a.includes("TYPECHECK"))).toBe(true);
    expect(process.exitCode).toBeUndefined();
  });

  it("resolves lint target to correct path", async () => {
    await runCheck({ targets: ["orm"], types: ["lint"], fix: false });

    const successArgs = collectArgs(mockLogger.success);
    expect(successArgs.some((a) => a.includes("LINT"))).toBe(true);
    expect(process.exitCode).toBeUndefined();
  });

  it("passes empty targets for all when no targets specified", async () => {
    await runCheck({ targets: [], types: ["typecheck"], fix: false });

    const successArgs = collectArgs(mockLogger.success);
    expect(successArgs.some((a) => a.includes("TYPECHECK"))).toBe(true);
    expect(process.exitCode).toBeUndefined();
  });

  describe("lint via engine integration", () => {
    beforeEach(() => {
      mocks.executeTypecheck.mockResolvedValue({
        success: true, errorCount: 0, warningCount: 0, formattedOutput: "",
        lint: { success: true, errorCount: 0, warningCount: 0, formattedOutput: "" },
        scriptsPackagePaths: [],
      });
    });

    it("outputs TYPECHECK and LINT sections when both are requested", async () => {
      await runCheck({ targets: [], types: ["typecheck", "lint"], fix: false });

      const successArgs = collectArgs(mockLogger.success);
      expect(successArgs.some((a) => a.includes("TYPECHECK"))).toBe(true);
      expect(successArgs.some((a) => a.includes("LINT"))).toBe(true);
    });

    it("sets exitCode 1 when engine lint fails", async () => {
      mocks.executeTypecheck.mockResolvedValue({
        success: true, errorCount: 0, warningCount: 0, formattedOutput: "",
        lint: { success: false, errorCount: 3, warningCount: 1, formattedOutput: "some lint output" },
        scriptsPackagePaths: [],
      });

      await runCheck({ targets: [], types: ["typecheck", "lint"], fix: false });

      expect(process.exitCode).toBe(1);
    });

    it("succeeds when scriptsPackagePaths is non-empty", async () => {
      mocks.executeTypecheck.mockResolvedValue({
        success: true, errorCount: 0, warningCount: 0, formattedOutput: "",
        lint: { success: true, errorCount: 0, warningCount: 0, formattedOutput: "" },
        scriptsPackagePaths: ["packages/sd-claude"],
      });
      mocks.runLintInWorker.mockResolvedValue({
        success: true, errorCount: 0, warningCount: 0, formattedOutput: "",
      });

      await runCheck({ targets: [], types: ["typecheck", "lint"], fix: false });

      const successArgs = collectArgs(mockLogger.success);
      expect(successArgs.some((a) => a.includes("LINT"))).toBe(true);
      expect(process.exitCode).toBeUndefined();
    });

    it("runs scripts lint when typecheck has no engine lint result", async () => {
      mocks.executeTypecheck.mockResolvedValue({
        success: true, errorCount: 0, warningCount: 0, formattedOutput: "",
        scriptsPackagePaths: ["packages/sd-codex"],
      });
      mocks.runLintInWorker.mockResolvedValue({
        success: true, errorCount: 0, warningCount: 0, formattedOutput: "",
      });

      await runCheck({ targets: [], types: ["typecheck", "lint"], fix: false });

      expect(mocks.runLintInWorker).toHaveBeenCalledWith({
        targets: ["packages/sd-codex"],
        fix: false,
        timing: false,
      });
      const successArgs = collectArgs(mockLogger.success);
      expect(successArgs.some((a) => a.includes("LINT"))).toBe(true);
      expect(process.exitCode).toBeUndefined();
    });
  });

  describe("lint-only path", () => {
    it("outputs LINT section when only lint type is requested", async () => {
      await runCheck({ targets: [], types: ["lint"], fix: false });

      const successArgs = collectArgs(mockLogger.success);
      expect(successArgs.some((a) => a.includes("LINT"))).toBe(true);
      const allArgs = [...collectArgs(mockLogger.success), ...collectArgs(mockLogger.error)];
      expect(allArgs.some((a) => a.includes("TYPECHECK"))).toBe(false);
    });

    it("handles all packages via lint including scripts", async () => {
      mocks.discoverWorkspacePackages.mockReturnValue(
        new Map([
          ["core-common", "packages/core-common"],
          ["sd-claude", "packages/sd-claude"],
        ]),
      );

      await runCheck({ targets: [], types: ["lint"], fix: false });

      const successArgs = collectArgs(mockLogger.success);
      expect(successArgs.some((a) => a.includes("LINT"))).toBe(true);
      const allArgs = [...collectArgs(mockLogger.success), ...collectArgs(mockLogger.error)];
      expect(allArgs.some((a) => a.includes("TYPECHECK"))).toBe(false);
    });

    it("succeeds with normalized target paths for lint", async () => {
      await runCheck({ targets: ["core-common"], types: ["lint"], fix: false });

      const successArgs = collectArgs(mockLogger.success);
      expect(successArgs.some((a) => a.includes("LINT"))).toBe(true);
      expect(process.exitCode).toBeUndefined();
    });

    it("succeeds when --fix is specified", async () => {
      await runCheck({ targets: [], types: ["lint"], fix: true });

      const successArgs = collectArgs(mockLogger.success);
      expect(successArgs.some((a) => a.includes("LINT"))).toBe(true);
      expect(process.exitCode).toBeUndefined();
    });

    it("succeeds when --fix is not specified", async () => {
      await runCheck({ targets: [], types: ["lint"], fix: false });

      const successArgs = collectArgs(mockLogger.success);
      expect(successArgs.some((a) => a.includes("LINT"))).toBe(true);
      expect(process.exitCode).toBeUndefined();
    });

    it("does not set exitCode when lint passes", async () => {
      mocks.executeLint.mockResolvedValue({
        success: true, errorCount: 0, warningCount: 0, formattedOutput: "",
      });

      await runCheck({ targets: [], types: ["lint"], fix: false });

      expect(process.exitCode).toBeUndefined();
    });

    it("sets exitCode 1 when lint has errors", async () => {
      mocks.executeLint.mockResolvedValue({
        success: false, errorCount: 3, warningCount: 2, formattedOutput: "lint errors",
      });

      await runCheck({ targets: [], types: ["lint"], fix: false });

      expect(process.exitCode).toBe(1);
    });

    it("does not output typecheck-related sections when only lint is requested", async () => {
      await runCheck({ targets: [], types: ["lint"], fix: false });

      const allArgs = [...collectArgs(mockLogger.success), ...collectArgs(mockLogger.error)];
      expect(allArgs.some((a) => a.includes("TYPECHECK"))).toBe(false);
    });
  });
});
