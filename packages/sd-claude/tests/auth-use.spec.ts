import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import { runAuthUse } from "../src/commands/auth-use";

describe("runAuthUse", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-claude-auth-use-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
    vi.restoreAllMocks();
  });

  function setupProfile(name: string, opts?: { expiresAt?: number }): void {
    const profileDir = path.join(tmpDir, ".sd-claude", "auth", name);
    fs.mkdirSync(profileDir, { recursive: true });

    const authJson = {
      oauthAccount: { emailAddress: "work@example.com", token: "oauth-work" },
      userID: "user-work-456",
    };
    fs.writeFileSync(path.join(profileDir, "auth.json"), JSON.stringify(authJson));

    const credJson = {
      claudeAiOauth: {
        accessToken: "saved-access-token",
        refreshToken: "saved-refresh-token",
        expiresAt: opts?.expiresAt ?? Date.now() + 3_600_000,
      },
    };
    fs.writeFileSync(path.join(profileDir, "credentials.json"), JSON.stringify(credJson));
  }

  function setupClaudeJson(extra?: Record<string, unknown>): void {
    const claudeJson = {
      oauthAccount: { emailAddress: "old@example.com", token: "old-token" },
      userID: "user-old-111",
      someCustomSetting: "preserve-me",
      anotherField: 42,
      ...extra,
    };
    fs.writeFileSync(path.join(tmpDir, ".claude.json"), JSON.stringify(claudeJson));
  }

  function setupCredentialsJson(): void {
    const claudeDir = path.join(tmpDir, ".claude");
    fs.mkdirSync(claudeDir, { recursive: true });
    const credentials = { oldKey: "old-value", claudeAiOauth: { accessToken: "old-access" } };
    fs.writeFileSync(path.join(claudeDir, ".credentials.json"), JSON.stringify(credentials));
  }

  test("replaces oauthAccount and userID while preserving other fields in ~/.claude.json", () => {
    setupProfile("work");
    setupClaudeJson();
    setupCredentialsJson();

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    runAuthUse("work", tmpDir);

    const result = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".claude.json"), "utf-8"),
    ) as Record<string, unknown>;

    // oauthAccount and userID should be replaced
    expect(result["oauthAccount"]).toEqual({
      emailAddress: "work@example.com",
      token: "oauth-work",
    });
    expect(result["userID"]).toBe("user-work-456");

    // Other fields must be preserved
    expect(result["someCustomSetting"]).toBe("preserve-me");
    expect(result["anotherField"]).toBe(42);

    logSpy.mockRestore();
  });

  test("replaces credentials.json entirely", () => {
    setupProfile("work");
    setupClaudeJson();
    setupCredentialsJson();

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    runAuthUse("work", tmpDir);

    const result = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".claude", ".credentials.json"), "utf-8"),
    ) as Record<string, unknown>;

    // Should be entirely replaced with saved credentials (no oldKey)
    expect(result).toEqual({
      claudeAiOauth: {
        accessToken: "saved-access-token",
        refreshToken: "saved-refresh-token",
        expiresAt: expect.any(Number) as number,
      },
    });
    expect(result["oldKey"]).toBeUndefined();

    logSpy.mockRestore();
  });

  test("warns when token is expired (should not throw)", () => {
    const expiredTime = Date.now() - 1_000;
    setupProfile("work", { expiresAt: expiredTime });
    setupClaudeJson();
    setupCredentialsJson();

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Should NOT throw
    expect(() => runAuthUse("work", tmpDir)).not.toThrow();

    // Should warn about expired token
    expect(warnSpy).toHaveBeenCalledWith("Warning: Token expired. Run /login after switching.");

    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  test("throws when profile not found", () => {
    setupClaudeJson();
    setupCredentialsJson();

    expect(() => runAuthUse("nonexistent", tmpDir)).toThrow("Profile 'nonexistent' not found.");
  });

  test("throws with invalid name", () => {
    expect(() => runAuthUse("BAD NAME!", tmpDir)).toThrow("Invalid name");
  });

  test("logs switched message with name and email", () => {
    setupProfile("work");
    setupClaudeJson();
    setupCredentialsJson();

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    runAuthUse("work", tmpDir);

    expect(logSpy).toHaveBeenCalledWith("Switched to work (work@example.com)");

    logSpy.mockRestore();
  });
});
