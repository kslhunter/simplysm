import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import { runAuthList } from "../src/commands/auth-list";

describe("runAuthList", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-claude-auth-list-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
    vi.restoreAllMocks();
  });

  test("outputs 'No saved profiles.' when no profiles exist", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    runAuthList(tmpDir);

    expect(spy).toHaveBeenCalledWith("No saved profiles.");
  });

  test("outputs profiles sorted alphabetically with active marker", () => {
    const authDir = path.join(tmpDir, ".sd-claude", "auth");

    // Create profile "beta"
    const betaDir = path.join(authDir, "beta");
    fs.mkdirSync(betaDir, { recursive: true });
    fs.writeFileSync(
      path.join(betaDir, "auth.json"),
      JSON.stringify({
        oauthAccount: { emailAddress: "beta@example.com", organizationName: "BetaCorp" },
        userID: "user-beta",
      }),
    );
    fs.writeFileSync(
      path.join(betaDir, "credentials.json"),
      JSON.stringify({ expiresAt: "2025-06-20" }),
    );

    // Create profile "alpha"
    const alphaDir = path.join(authDir, "alpha");
    fs.mkdirSync(alphaDir, { recursive: true });
    fs.writeFileSync(
      path.join(alphaDir, "auth.json"),
      JSON.stringify({
        oauthAccount: { emailAddress: "alpha@example.com", organizationName: "AlphaCorp" },
        userID: "user-alpha",
      }),
    );
    fs.writeFileSync(
      path.join(alphaDir, "credentials.json"),
      JSON.stringify({ expiresAt: "2025-06-25" }),
    );

    // Set current userID to "user-alpha"
    fs.writeFileSync(path.join(tmpDir, ".claude.json"), JSON.stringify({ userID: "user-alpha" }));

    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    runAuthList(tmpDir);

    expect(spy).toHaveBeenCalledTimes(2);
    // alpha comes first (alphabetical), and is active
    expect(spy).toHaveBeenNthCalledWith(
      1,
      "* alpha (alpha@example.com) [AlphaCorp] expires: 2025-06-25",
    );
    // beta is not active
    expect(spy).toHaveBeenNthCalledWith(
      2,
      "  beta (beta@example.com) [BetaCorp] expires: 2025-06-20",
    );
  });

  test("shows 'Personal' when organizationName is missing", () => {
    const authDir = path.join(tmpDir, ".sd-claude", "auth");

    const profileDir = path.join(authDir, "personal");
    fs.mkdirSync(profileDir, { recursive: true });
    fs.writeFileSync(
      path.join(profileDir, "auth.json"),
      JSON.stringify({
        oauthAccount: { emailAddress: "user@gmail.com" },
        userID: "user-personal",
      }),
    );
    fs.writeFileSync(
      path.join(profileDir, "credentials.json"),
      JSON.stringify({ expiresAt: "2025-07-01" }),
    );

    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    runAuthList(tmpDir);

    expect(spy).toHaveBeenCalledWith("  personal (user@gmail.com) [Personal] expires: 2025-07-01");
  });

  test("shows 'unknown' when expiresAt is missing", () => {
    const authDir = path.join(tmpDir, ".sd-claude", "auth");

    const profileDir = path.join(authDir, "noexpiry");
    fs.mkdirSync(profileDir, { recursive: true });
    fs.writeFileSync(
      path.join(profileDir, "auth.json"),
      JSON.stringify({
        oauthAccount: { emailAddress: "noexp@example.com", organizationName: "SomeCorp" },
        userID: "user-noexp",
      }),
    );
    fs.writeFileSync(path.join(profileDir, "credentials.json"), JSON.stringify({}));

    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    runAuthList(tmpDir);

    expect(spy).toHaveBeenCalledWith("  noexpiry (noexp@example.com) [SomeCorp] expires: unknown");
  });

  test("marks active profile with * when userID matches", () => {
    const authDir = path.join(tmpDir, ".sd-claude", "auth");

    const profileDir = path.join(authDir, "work");
    fs.mkdirSync(profileDir, { recursive: true });
    fs.writeFileSync(
      path.join(profileDir, "auth.json"),
      JSON.stringify({
        oauthAccount: { emailAddress: "work@company.com", organizationName: "WorkCorp" },
        userID: "user-work",
      }),
    );
    fs.writeFileSync(
      path.join(profileDir, "credentials.json"),
      JSON.stringify({ expiresAt: "2025-12-31" }),
    );

    // Set current userID to match
    fs.writeFileSync(path.join(tmpDir, ".claude.json"), JSON.stringify({ userID: "user-work" }));

    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    runAuthList(tmpDir);

    expect(spy).toHaveBeenCalledWith("* work (work@company.com) [WorkCorp] expires: 2025-12-31");
  });

  test("non-active profile has space prefix instead of *", () => {
    const authDir = path.join(tmpDir, ".sd-claude", "auth");

    const profileDir = path.join(authDir, "other");
    fs.mkdirSync(profileDir, { recursive: true });
    fs.writeFileSync(
      path.join(profileDir, "auth.json"),
      JSON.stringify({
        oauthAccount: { emailAddress: "other@example.com", organizationName: "OtherCorp" },
        userID: "user-other",
      }),
    );
    fs.writeFileSync(
      path.join(profileDir, "credentials.json"),
      JSON.stringify({ expiresAt: "2025-08-15" }),
    );

    // Set current userID to something different
    fs.writeFileSync(
      path.join(tmpDir, ".claude.json"),
      JSON.stringify({ userID: "user-different" }),
    );

    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    runAuthList(tmpDir);

    expect(spy).toHaveBeenCalledWith("  other (other@example.com) [OtherCorp] expires: 2025-08-15");
  });
});
