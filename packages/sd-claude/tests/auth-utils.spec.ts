import { describe, test, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import {
  validateName,
  getProfileDir,
  profileExists,
  listProfiles,
  readCurrentAuth,
  readCurrentCredentials,
  getCurrentUserID,
} from "../src/commands/auth-utils";

describe("auth-utils", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-claude-auth-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  describe("validateName", () => {
    test("accepts lowercase letters", () => {
      expect(() => validateName("abc")).not.toThrow();
    });

    test("accepts digits", () => {
      expect(() => validateName("123")).not.toThrow();
    });

    test("accepts hyphens and underscores", () => {
      expect(() => validateName("my-profile_1")).not.toThrow();
    });

    test("rejects uppercase letters", () => {
      expect(() => validateName("ABC")).toThrow();
    });

    test("rejects spaces", () => {
      expect(() => validateName("my profile")).toThrow();
    });

    test("rejects special characters", () => {
      expect(() => validateName("my@profile")).toThrow();
    });

    test("rejects empty string", () => {
      expect(() => validateName("")).toThrow();
    });

    test("error message includes the invalid name", () => {
      expect(() => validateName("BAD!")).toThrow(/BAD!/);
    });
  });

  describe("getProfileDir", () => {
    test("returns correct path with homeDir", () => {
      const result = getProfileDir("work", tmpDir);
      expect(result).toBe(path.join(tmpDir, ".sd-claude", "auth", "work"));
    });

    test("uses os.homedir when homeDir is not provided", () => {
      const result = getProfileDir("test");
      expect(result).toBe(path.join(os.homedir(), ".sd-claude", "auth", "test"));
    });
  });

  describe("profileExists", () => {
    test("returns false when profile directory does not exist", () => {
      expect(profileExists("nonexistent", tmpDir)).toBe(false);
    });

    test("returns true when profile directory exists", () => {
      const profileDir = path.join(tmpDir, ".sd-claude", "auth", "work");
      fs.mkdirSync(profileDir, { recursive: true });
      expect(profileExists("work", tmpDir)).toBe(true);
    });
  });

  describe("listProfiles", () => {
    test("returns empty array when auth directory does not exist", () => {
      expect(listProfiles(tmpDir)).toEqual([]);
    });

    test("returns subdirectory names", () => {
      const authDir = path.join(tmpDir, ".sd-claude", "auth");
      fs.mkdirSync(path.join(authDir, "work"), { recursive: true });
      fs.mkdirSync(path.join(authDir, "personal"), { recursive: true });

      const result = listProfiles(tmpDir);
      expect(result.sort()).toEqual(["personal", "work"]);
    });

    test("ignores files in auth directory", () => {
      const authDir = path.join(tmpDir, ".sd-claude", "auth");
      fs.mkdirSync(authDir, { recursive: true });
      fs.writeFileSync(path.join(authDir, "some-file.txt"), "data");
      fs.mkdirSync(path.join(authDir, "profile1"), { recursive: true });

      expect(listProfiles(tmpDir)).toEqual(["profile1"]);
    });
  });

  describe("readCurrentAuth", () => {
    test("reads oauthAccount and userID from .claude.json", () => {
      const claudeJson = {
        oauthAccount: { email: "test@example.com", token: "abc" },
        userID: "user-123",
      };
      fs.writeFileSync(path.join(tmpDir, ".claude.json"), JSON.stringify(claudeJson));

      const result = readCurrentAuth(tmpDir);
      expect(result.oauthAccount).toEqual({ email: "test@example.com", token: "abc" });
      expect(result.userID).toBe("user-123");
    });

    test("throws when .claude.json does not exist", () => {
      expect(() => readCurrentAuth(tmpDir)).toThrow();
    });

    test("throws when oauthAccount is missing", () => {
      fs.writeFileSync(path.join(tmpDir, ".claude.json"), JSON.stringify({ userID: "user-123" }));
      expect(() => readCurrentAuth(tmpDir)).toThrow("Not logged in");
    });

    test("throws when userID is missing", () => {
      fs.writeFileSync(
        path.join(tmpDir, ".claude.json"),
        JSON.stringify({ oauthAccount: { email: "test@example.com" } }),
      );
      expect(() => readCurrentAuth(tmpDir)).toThrow("Not logged in");
    });
  });

  describe("readCurrentCredentials", () => {
    test("reads credentials from .claude/.credentials.json", () => {
      const credentials = { key: "value", secret: "s3cret" };
      const claudeDir = path.join(tmpDir, ".claude");
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(path.join(claudeDir, ".credentials.json"), JSON.stringify(credentials));

      const result = readCurrentCredentials(tmpDir);
      expect(result).toEqual({ key: "value", secret: "s3cret" });
    });

    test("throws when .credentials.json does not exist", () => {
      expect(() => readCurrentCredentials(tmpDir)).toThrow();
    });
  });

  describe("getCurrentUserID", () => {
    test("returns userID from .claude.json", () => {
      fs.writeFileSync(path.join(tmpDir, ".claude.json"), JSON.stringify({ userID: "user-456" }));
      expect(getCurrentUserID(tmpDir)).toBe("user-456");
    });

    test("returns undefined when .claude.json does not exist", () => {
      expect(getCurrentUserID(tmpDir)).toBeUndefined();
    });

    test("returns undefined when userID is missing from .claude.json", () => {
      fs.writeFileSync(
        path.join(tmpDir, ".claude.json"),
        JSON.stringify({ someOtherField: "value" }),
      );
      expect(getCurrentUserID(tmpDir)).toBeUndefined();
    });
  });
});
