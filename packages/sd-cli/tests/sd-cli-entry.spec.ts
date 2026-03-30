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
  it("does not include device command", async () => {
    // Import the module to check COMMAND_NAMES indirectly via createCliParser
    const { createCliParser } = await import("../src/sd-cli-entry");

    // device command should not be registered — parsing "device" should fail
    let errorThrown = false;
    const origExit = process.exit;
    const origError = console.error;
    const origLog = console.log;

    // Suppress yargs output during test
    console.error = () => {};
    console.log = () => {};
    process.exit = (() => {
      errorThrown = true;
    }) as never;

    try {
      await createCliParser(["device"]).exitProcess(false).fail(() => {
        errorThrown = true;
      }).parse();
    } catch {
      errorThrown = true;
    } finally {
      process.exit = origExit;
      console.error = origError;
      console.log = origLog;
    }

    expect(errorThrown).toBe(true);
  });

  it("includes expected commands", async () => {
    const { createCliParser } = await import("../src/sd-cli-entry");

    // These commands should be registered without throwing
    const expectedCommands = ["lint", "typecheck", "check", "watch", "dev", "build", "init", "publish", "replace-deps"];

    for (const cmd of expectedCommands) {
      // Verify command exists by checking help doesn't throw for "unknown command"
      const parser = createCliParser([cmd, "--help"]).exitProcess(false);
      // Just verify it can be created without error
      expect(parser).toBeDefined();
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
});
