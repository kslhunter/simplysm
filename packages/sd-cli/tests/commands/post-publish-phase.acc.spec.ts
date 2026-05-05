import { describe, it, expect, vi, beforeEach } from "vitest";
import { cpx } from "@simplysm/core-node";

const mocks = {
  execa: vi.spyOn(cpx, "spawn"),
};

import { runPostPublish } from "../../src/commands/publish/post-publish-phase";

function createLogger() {
  return {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  } as unknown as ReturnType<typeof import("consola").consola.withTag>;
}

describe("runPostPublish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes scripts with environment variable substitution", async () => {
    const logger = createLogger();
    mocks.execa.mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });

    await runPostPublish(
      [{ type: "script", cmd: "echo", args: ["v%VER%"] }],
      "14.0.1",
      "/project",
      logger,
      false,
    );

    expect(mocks.execa).toHaveBeenCalledWith("echo", ["v14.0.1"], { cwd: "/project" });
  });

  it("warns but does not throw when script fails", async () => {
    const logger = createLogger();
    mocks.execa.mockRejectedValue(new Error("script failed"));

    await runPostPublish(
      [{ type: "script", cmd: "failing-cmd", args: [] }],
      "14.0.1",
      "/project",
      logger,
      false,
    );

    expect(logger.warn).toHaveBeenCalled();
    // Should not throw
  });

  it("logs but does not execute scripts in dry-run mode", async () => {
    const logger = createLogger();

    await runPostPublish(
      [{ type: "script", cmd: "echo", args: ["v%VER%"] }],
      "14.0.1",
      "/project",
      logger,
      true,
    );

    expect(mocks.execa).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalled();
  });

  it("does nothing when scripts array is empty", async () => {
    const logger = createLogger();

    await runPostPublish([], "14.0.1", "/project", logger, false);

    expect(mocks.execa).not.toHaveBeenCalled();
  });
});
