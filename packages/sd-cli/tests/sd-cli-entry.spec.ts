import { describe, it, expect, vi, beforeEach } from "vitest";

import * as checkCmd from "../src/commands/check";
import * as watchCmd from "../src/commands/watch";
import * as devCmd from "../src/commands/dev";
import * as buildCmd from "../src/commands/build";
import * as publishCmd from "../src/commands/publish/publish-command";
import * as replaceDepsCmd from "../src/commands/replace-deps";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(checkCmd, "runCheck").mockResolvedValue(undefined);
  vi.spyOn(watchCmd, "runWatch").mockResolvedValue(undefined);
  vi.spyOn(devCmd, "runDev").mockResolvedValue(undefined);
  vi.spyOn(buildCmd, "runBuild").mockResolvedValue(undefined);
  vi.spyOn(publishCmd, "runPublish").mockResolvedValue(undefined);
  vi.spyOn(replaceDepsCmd, "runReplaceDeps").mockResolvedValue(undefined);
});

describe("sd-cli-entry createCliParser", () => {
  it("includes expected commands", async () => {
    const { createCliParser } = await import("../src/sd-cli-entry");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      const expectedCommands = ["check", "watch", "dev", "device", "build", "publish", "replace-deps"];

      for (const cmd of expectedCommands) {
        exitSpy.mockClear();
        try {
          await createCliParser([cmd, "--help"]).exitProcess(false).parse();
        } catch {
          // yargs --help may throw after output
        }
        expect(exitSpy, `"${cmd}" should be registered`).not.toHaveBeenCalled();
      }
    } finally {
      exitSpy.mockRestore();
      errorSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  // Unit: DESIGN-002 — check --type CLI argument validation
  it("throws on invalid check --type values", async () => {
    const { createCliParser } = await import("../src/sd-cli-entry");

    await expect(
      createCliParser(["check", "--type", "typecheck,bogus"]).exitProcess(false).parse(),
    ).rejects.toThrow("Invalid check type(s): bogus");
  });

  it("accepts valid check --type values without error", async () => {
    const { createCliParser } = await import("../src/sd-cli-entry");

    // Should not throw for valid types
    await expect(
      createCliParser(["check", "--type", "typecheck,lint"]).exitProcess(false).parse(),
    ).resolves.toBeDefined();
  });

  it("throws on --type test (removed type)", async () => {
    const { createCliParser } = await import("../src/sd-cli-entry");

    await expect(
      createCliParser(["check", "--type", "test"]).exitProcess(false).parse(),
    ).rejects.toThrow("Invalid check type(s): test");
  });
});
