import fs from "fs";
import path from "path";
import { validateName, profileExists, getProfileDir, getCurrentUserID } from "./auth-utils.js";

export function runAuthRemove(name: string, homeDir?: string): void {
  validateName(name);

  if (!profileExists(name, homeDir)) {
    throw new Error(`Profile '${name}' not found.`);
  }

  const profileDir = getProfileDir(name, homeDir);
  const authJsonPath = path.join(profileDir, "auth.json");
  const authData = JSON.parse(fs.readFileSync(authJsonPath, "utf-8")) as { userID: string };

  const currentUserID = getCurrentUserID(homeDir);
  if (currentUserID != null && currentUserID === authData.userID) {
    // eslint-disable-next-line no-console
    console.warn(`Warning: '${name}' is currently active.`);
  }

  fs.rmSync(profileDir, { recursive: true });

  // eslint-disable-next-line no-console
  console.log(`Removed profile '${name}'`);
}
