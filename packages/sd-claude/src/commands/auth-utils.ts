import fs from "fs";
import path from "path";
import os from "os";

const NAME_PATTERN = /^[a-z0-9_-]+$/;

export function validateName(name: string): void {
  if (!NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid name '${name}'. Use only lowercase letters, numbers, hyphens, underscores.`,
    );
  }
}

export function getProfileDir(name: string, homeDir?: string): string {
  return path.join(homeDir ?? os.homedir(), ".sd-claude", "auth", name);
}

export function profileExists(name: string, homeDir?: string): boolean {
  return fs.existsSync(getProfileDir(name, homeDir));
}

export function listProfiles(homeDir?: string): string[] {
  const authDir = path.join(homeDir ?? os.homedir(), ".sd-claude", "auth");
  if (!fs.existsSync(authDir)) {
    return [];
  }

  return fs
    .readdirSync(authDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

export function readCurrentAuth(homeDir?: string): {
  oauthAccount: Record<string, unknown>;
  userID: string;
} {
  const claudeJsonPath = path.join(homeDir ?? os.homedir(), ".claude.json");
  const data = JSON.parse(fs.readFileSync(claudeJsonPath, "utf-8")) as Record<string, unknown>;

  const oauthAccount = data["oauthAccount"] as Record<string, unknown> | undefined;
  const userID = data["userID"] as string | undefined;

  if (oauthAccount == null || userID == null) {
    throw new Error("Not logged in. Run /login first.");
  }

  return { oauthAccount, userID };
}

export function readCurrentCredentials(homeDir?: string): Record<string, unknown> {
  const credentialsPath = path.join(homeDir ?? os.homedir(), ".claude", ".credentials.json");
  return JSON.parse(fs.readFileSync(credentialsPath, "utf-8")) as Record<string, unknown>;
}

export function getCurrentUserID(homeDir?: string): string | undefined {
  const claudeJsonPath = path.join(homeDir ?? os.homedir(), ".claude.json");
  try {
    const data = JSON.parse(fs.readFileSync(claudeJsonPath, "utf-8")) as Record<string, unknown>;
    return data["userID"] as string | undefined;
  } catch {
    return undefined;
  }
}
