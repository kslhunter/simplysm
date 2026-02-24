import { describe, test, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import { runAuthAdd } from "../src/commands/auth-add";

describe("runAuthAdd", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-claude-auth-add-test-"));

    // Set up .claude.json with oauthAccount and userID
    const claudeJson = {
      oauthAccount: { emailAddress: "test@example.com", token: "oauth-token" },
      userID: "user-123",
    };
    fs.writeFileSync(path.join(tmpDir, ".claude.json"), JSON.stringify(claudeJson));

    // Set up .claude/.credentials.json
    const claudeDir = path.join(tmpDir, ".claude");
    fs.mkdirSync(claudeDir, { recursive: true });
    const credentials = { accessToken: "access-abc", refreshToken: "refresh-xyz" };
    fs.writeFileSync(path.join(claudeDir, ".credentials.json"), JSON.stringify(credentials));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  test("saves auth.json and credentials.json correctly", () => {
    runAuthAdd("work", tmpDir);

    const profileDir = path.join(tmpDir, ".sd-claude", "auth", "work");

    // Verify auth.json
    const authJson = JSON.parse(
      fs.readFileSync(path.join(profileDir, "auth.json"), "utf-8"),
    ) as Record<string, unknown>;
    expect(authJson).toEqual({
      oauthAccount: { emailAddress: "test@example.com", token: "oauth-token" },
      userID: "user-123",
    });

    // Verify credentials.json
    const credJson = JSON.parse(
      fs.readFileSync(path.join(profileDir, "credentials.json"), "utf-8"),
    ) as Record<string, unknown>;
    expect(credJson).toEqual({
      accessToken: "access-abc",
      refreshToken: "refresh-xyz",
    });
  });

  test("throws when profile already exists", () => {
    const profileDir = path.join(tmpDir, ".sd-claude", "auth", "work");
    fs.mkdirSync(profileDir, { recursive: true });

    expect(() => runAuthAdd("work", tmpDir)).toThrow(
      "Profile 'work' already exists. Remove it first with: sd-claude auth remove work",
    );
  });

  test("throws with invalid name", () => {
    expect(() => runAuthAdd("BAD NAME!", tmpDir)).toThrow("Invalid profile name");
  });

  test("throws when not logged in", () => {
    // Overwrite .claude.json without oauthAccount/userID
    fs.writeFileSync(path.join(tmpDir, ".claude.json"), JSON.stringify({ someField: "value" }));

    expect(() => runAuthAdd("work", tmpDir)).toThrow("Not logged in");
  });
});
