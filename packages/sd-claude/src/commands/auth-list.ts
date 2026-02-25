import fs from "fs";
import path from "path";
import { listProfiles, getCurrentUserID, getProfileDir } from "./auth-utils.js";

export function runAuthList(homeDir?: string): void {
  const profiles = listProfiles(homeDir);

  if (profiles.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No saved profiles.");
    return;
  }

  const currentUserID = getCurrentUserID(homeDir);
  const sorted = [...profiles].sort((a, b) => a.localeCompare(b));

  for (const name of sorted) {
    const profileDir = getProfileDir(name, homeDir);

    const authData = JSON.parse(
      fs.readFileSync(path.join(profileDir, "auth.json"), "utf-8"),
    ) as Record<string, unknown>;

    const credData = JSON.parse(
      fs.readFileSync(path.join(profileDir, "credentials.json"), "utf-8"),
    ) as Record<string, unknown>;

    const oauthAccount = authData["oauthAccount"] as Record<string, unknown> | undefined;
    const email = (oauthAccount?.["emailAddress"] as string | undefined) ?? "";
    const userID = authData["userID"] as string | undefined;
    const oauth = credData["claudeAiOauth"] as Record<string, unknown> | undefined;
    let expiresStr = "unknown";
    if (oauth != null && typeof oauth["expiresAt"] === "number") {
      const d = new Date(oauth["expiresAt"]);
      expiresStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    const isActive = currentUserID != null && userID === currentUserID;
    const prefix = isActive ? "*" : " ";

    // eslint-disable-next-line no-console
    console.log(`${prefix} ${name} (${email}) expires: ${expiresStr}`);
  }
}
