import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

//#region Mocks

const mocks = vi.hoisted(() => ({
  executeLint: vi.fn(),
}));

vi.mock("../../src/utils/lint-core", () => ({
  executeLint: mocks.executeLint,
}));

const { runLint } = await import("../../src/commands/lint");

//#endregion

//#region runLint

describe("runLint", () => {
  let savedExitCode: typeof process.exitCode;
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    savedExitCode = process.exitCode;
    process.exitCode = undefined;
    writeSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    // Default: successful lint
    mocks.executeLint.mockResolvedValue({
      success: true,
      errorCount: 0,
      warningCount: 0,
      formattedOutput: "",
    });
  });

  afterEach(() => {
    process.exitCode = savedExitCode;
    writeSpy.mockRestore();
  });

  it("writes formatted output to stdout when there are results", async () => {
    mocks.executeLint.mockResolvedValue({
      success: false,
      errorCount: 1,
      warningCount: 0,
      formattedOutput: "lint output here",
    });

    await runLint({ targets: [], fix: false, timing: false });

    expect(writeSpy).toHaveBeenCalledWith("lint output here");
  });

  it("sets exitCode to 1 when lint errors are found", async () => {
    mocks.executeLint.mockResolvedValue({
      success: false,
      errorCount: 1,
      warningCount: 0,
      formattedOutput: "errors",
    });

    await runLint({ targets: [], fix: false, timing: false });

    expect(process.exitCode).toBe(1);
  });

  it("does not set exitCode when lint passes", async () => {
    await runLint({ targets: [], fix: false, timing: false });

    expect(process.exitCode).toBeUndefined();
  });

  it("does not write to stdout when formattedOutput is empty", async () => {
    await runLint({ targets: [], fix: false, timing: false });

    expect(writeSpy).not.toHaveBeenCalled();
  });
});

//#endregion
