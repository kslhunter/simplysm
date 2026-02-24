import fs from "fs";
import path from "path";
import {
  validateName,
  profileExists,
  getProfileDir,
  readCurrentAuth,
  readCurrentCredentials,
} from "./auth-utils.js";

export function runAuthAdd(name: string, homeDir?: string): void {
  validateName(name);

  if (profileExists(name, homeDir)) {
    throw new Error(
      `Profile '${name}' already exists. Remove it first with: sd-claude auth remove ${name}`,
    );
  }

  const { oauthAccount, userID } = readCurrentAuth(homeDir);
  const credentials = readCurrentCredentials(homeDir);

  const profileDir = getProfileDir(name, homeDir);
  fs.mkdirSync(profileDir, { recursive: true });

  fs.writeFileSync(
    path.join(profileDir, "auth.json"),
    JSON.stringify({ oauthAccount, userID }, null, 2),
  );

  fs.writeFileSync(path.join(profileDir, "credentials.json"), JSON.stringify(credentials, null, 2));

  const email = oauthAccount["emailAddress"] as string | undefined;
  // eslint-disable-next-line no-console
  console.log(`Saved profile '${name}' (${email ?? userID})`);
}
