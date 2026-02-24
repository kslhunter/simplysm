import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import { runAuthRemove } from "../src/commands/auth-remove";

describe("runAuthRemove", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-claude-auth-remove-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  test("removes profile directory successfully", () => {
    // Set up a profile directory with auth.json
    const profileDir = path.join(tmpDir, ".sd-claude", "auth", "work");
    fs.mkdirSync(profileDir, { recursive: true });
    fs.writeFileSync(
      path.join(profileDir, "auth.json"),
      JSON.stringify({ userID: "user-123", oauthAccount: {} }),
    );
    fs.writeFileSync(
      path.join(profileDir, "credentials.json"),
      JSON.stringify({ accessToken: "abc" }),
    );

    // Set up .claude.json with a DIFFERENT userID (not active)
    fs.writeFileSync(path.join(tmpDir, ".claude.json"), JSON.stringify({ userID: "user-999" }));

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    runAuthRemove("work", tmpDir);

    expect(fs.existsSync(profileDir)).toBe(false);
    expect(logSpy).toHaveBeenCalledWith("Removed profile 'work'");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("warns when removing active profile (still removes it)", () => {
    // Set up a profile directory with auth.json
    const profileDir = path.join(tmpDir, ".sd-claude", "auth", "work");
    fs.mkdirSync(profileDir, { recursive: true });
    fs.writeFileSync(
      path.join(profileDir, "auth.json"),
      JSON.stringify({ userID: "user-123", oauthAccount: {} }),
    );

    // Set up .claude.json with the SAME userID (active)
    fs.writeFileSync(path.join(tmpDir, ".claude.json"), JSON.stringify({ userID: "user-123" }));

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    runAuthRemove("work", tmpDir);

    expect(fs.existsSync(profileDir)).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith("Warning: 'work' is currently active.");
    expect(logSpy).toHaveBeenCalledWith("Removed profile 'work'");
  });

  test("throws when profile not found", () => {
    expect(() => runAuthRemove("nonexistent", tmpDir)).toThrow("Profile 'nonexistent' not found.");
  });

  test("throws with invalid name", () => {
    expect(() => runAuthRemove("BAD NAME!", tmpDir)).toThrow("Invalid name");
  });
});
