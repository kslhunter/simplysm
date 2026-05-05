import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as lintCore from "../../src/lint/lint-core";
import { runLint } from "../../src/commands/lint";

describe("runLint", () => {
  let savedExitCode: typeof process.exitCode;
  let writeSpy: ReturnType<typeof vi.spyOn>;
  let executeLintSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    savedExitCode = process.exitCode;
    process.exitCode = undefined;
    writeSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    executeLintSpy = vi.spyOn(lintCore, "executeLint").mockResolvedValue({
      success: true,
      errorCount: 0,
      warningCount: 0,
      formattedOutput: "",
    });
  });

  afterEach(() => {
    process.exitCode = savedExitCode;
    writeSpy.mockRestore();
    executeLintSpy.mockRestore();
  });

  it("writes formatted output to stdout when there are results", async () => {
    executeLintSpy.mockResolvedValue({
      success: false,
      errorCount: 1,
      warningCount: 0,
      formattedOutput: "lint output here",
    });

    await runLint({ targets: [], fix: false, timing: false });

    expect(writeSpy).toHaveBeenCalledWith("lint output here");
  });

  it("sets exitCode to 1 when lint errors are found", async () => {
    executeLintSpy.mockResolvedValue({
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
