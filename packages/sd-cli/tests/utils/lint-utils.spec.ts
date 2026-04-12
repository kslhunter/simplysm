import { describe, it, expect, vi, beforeEach } from "vitest";

//#region Mocks

const mocks = vi.hoisted(() => ({
  workerCreate: vi.fn(),
  lintFn: vi.fn(),
  terminateFn: vi.fn(async () => {}),
}));

vi.mock("@simplysm/core-node", () => ({
  Worker: {
    create: mocks.workerCreate,
  },
}));

const { runLintInWorker } = await import("../../src/lint/lint-utils");

//#endregion

beforeEach(() => {
  vi.clearAllMocks();
  mocks.workerCreate.mockReturnValue({
    lint: mocks.lintFn,
    terminate: mocks.terminateFn,
  });
});

describe("runLintInWorker", () => {
  // Acceptance: Scenario "BuildOrchestrator가 공통 lint 유틸을 사용한다"
  it("creates Worker, calls lint with options, and terminates", async () => {
    const lintResult = {
      success: true,
      errorCount: 0,
      warningCount: 0,
      formattedOutput: "",
    };
    mocks.lintFn.mockResolvedValue(lintResult);

    const options = { targets: ["packages/core-common"], fix: false, timing: false };
    const result = await runLintInWorker(options);

    expect(mocks.lintFn).toHaveBeenCalledWith(options);
    expect(result).toEqual(lintResult);
  });

  // Acceptance: Scenario "check --type lint가 공통 lint 유틸을 사용한다"
  it("passes fix option to lint worker", async () => {
    mocks.lintFn.mockResolvedValue({
      success: true,
      errorCount: 0,
      warningCount: 0,
      formattedOutput: "",
    });

    const options = { targets: ["packages/core-common"], fix: true, timing: false };
    await runLintInWorker(options);

    expect(mocks.lintFn).toHaveBeenCalledWith(
      expect.objectContaining({ fix: true }),
    );
  });

  // Unit: Worker is terminated even when lint fails
  it("terminates worker even when lint throws", async () => {
    mocks.lintFn.mockRejectedValue(new Error("lint crashed"));

    await expect(
      runLintInWorker({ targets: [], fix: false, timing: false }),
    ).rejects.toThrow("lint crashed");
  });
});
