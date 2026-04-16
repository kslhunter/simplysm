import { describe, it, expect, vi } from "vitest";

// Mock all command modules to prevent side effects during parsing
vi.mock("../src/commands/check", () => ({
  runCheck: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../src/commands/watch", () => ({
  runWatch: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../src/commands/dev", () => ({
  runDev: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../src/commands/build", () => ({
  runBuild: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../src/commands/publish", () => ({
  runPublish: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../src/commands/replace-deps", () => ({
  runReplaceDeps: vi.fn().mockResolvedValue(undefined),
}));

describe("sd-cli-entry COMMAND_NAMES", () => {
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
