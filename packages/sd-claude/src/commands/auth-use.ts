import fs from "fs";
import path from "path";
import os from "os";
import { validateName, profileExists, getProfileDir } from "./auth-utils.js";

export function runAuthUse(name: string, homeDir?: string): void {
  validateName(name);

  if (!profileExists(name, homeDir)) {
    throw new Error(`Profile '${name}' not found.`);
  }

  const profileDir = getProfileDir(name, homeDir);
  const home = homeDir ?? os.homedir();

  // Read saved auth.json and credentials.json from profile directory
  const authJson = JSON.parse(fs.readFileSync(path.join(profileDir, "auth.json"), "utf-8")) as {
    oauthAccount: Record<string, unknown>;
    userID: string;
  };

  const savedCredentials = JSON.parse(
    fs.readFileSync(path.join(profileDir, "credentials.json"), "utf-8"),
  ) as Record<string, unknown>;

  // Check token expiry
  const claudeAiOauth = savedCredentials["claudeAiOauth"] as { expiresAt?: number } | undefined;
  if (claudeAiOauth?.expiresAt != null && claudeAiOauth.expiresAt < Date.now()) {
    // eslint-disable-next-line no-console
    console.warn("Warning: Token expired. Run /login after switching.");
  }

  // Read ~/.claude.json, replace ONLY oauthAccount and userID, write back
  const claudeJsonPath = path.join(home, ".claude.json");
  const claudeData = JSON.parse(fs.readFileSync(claudeJsonPath, "utf-8")) as Record<
    string,
    unknown
  >;

  claudeData["oauthAccount"] = authJson.oauthAccount;
  claudeData["userID"] = authJson.userID;

  fs.writeFileSync(claudeJsonPath, JSON.stringify(claudeData, null, 2));

  // Replace ~/.claude/.credentials.json entirely with saved credentials
  const credentialsPath = path.join(home, ".claude", ".credentials.json");
  fs.writeFileSync(credentialsPath, JSON.stringify(savedCredentials, null, 2));

  // Log the switch
  const email = (authJson.oauthAccount["emailAddress"] as string | undefined) ?? "unknown";
  // eslint-disable-next-line no-console
  console.log(`Switched to ${name} (${email})`);
}
