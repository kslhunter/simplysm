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
    const organizationName =
      (oauthAccount?.["organizationName"] as string | undefined) ?? "Personal";
    const userID = authData["userID"] as string | undefined;
    const expiresAt = (credData["expiresAt"] as string | undefined) ?? "unknown";

    const isActive = currentUserID != null && userID === currentUserID;
    const prefix = isActive ? "*" : " ";

    // eslint-disable-next-line no-console
    console.log(`${prefix} ${name} (${email}) [${organizationName}] expires: ${expiresAt}`);
  }
}
