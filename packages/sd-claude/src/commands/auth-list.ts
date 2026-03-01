import fs from "fs";
import path from "path";
import { listProfiles, getCurrentUserID, getProfileDir } from "./auth-utils.js";

const FETCH_TIMEOUT_MS = 5000;

interface UsageData {
  utilization?: number;
  resets_at?: string;
}

interface UsageResponse {
  five_hour?: UsageData;
  daily?: UsageData;
  seven_day?: UsageData;
}

async function fetchUsage(accessToken: string): Promise<UsageResponse | undefined> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "anthropic-beta": "oauth-2025-04-20",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return undefined;
    }

    return (await response.json()) as UsageResponse;
  } catch {
    return undefined;
  }
}

function formatTimeRemaining(isoDate: string | undefined): string {
  if (isoDate == null) return "";
  try {
    const resetTime = new Date(isoDate).getTime();
    if (Number.isNaN(resetTime)) return "";

    const diffMs = resetTime - Date.now();
    if (diffMs <= 0) return "";

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const days = Math.floor(diffHours / 24);
    const hours = diffHours % 24;
    const minutes = diffMinutes % 60;

    if (days > 0) return `${String(days)}d${String(hours)}h`;
    if (hours > 0) return `${String(hours)}h${String(minutes)}m`;
    return `${String(minutes)}m`;
  } catch {
    return "";
  }
}

function formatUsage(label: string, data: UsageData | undefined): string {
  if (data == null) return `${label}: ?`;
  const pct = data.utilization != null ? `${String(Math.round(data.utilization))}%` : "?";
  const remaining = formatTimeRemaining(data.resets_at);
  return remaining ? `${label}: ${pct}(${remaining})` : `${label}: ${pct}`;
}

export async function runAuthList(homeDir?: string): Promise<void> {
  const profiles = listProfiles(homeDir);

  if (profiles.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No saved profiles.");
    return;
  }

  const currentUserID = getCurrentUserID(homeDir);
  const sorted = [...profiles].sort((a, b) => a.localeCompare(b));

  const results = await Promise.all(
    sorted.map(async (name) => {
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

      // Fetch usage via OAuth token
      const accessToken = oauth?.["accessToken"] as string | undefined;
      const expiresAt = oauth?.["expiresAt"];
      const tokenExpired = typeof expiresAt === "number" && Date.now() > expiresAt;
      const usage =
        accessToken != null && !tokenExpired ? await fetchUsage(accessToken) : undefined;

      const dailyData = usage?.daily ?? usage?.five_hour;
      const fiveHourStr = formatUsage("5h", dailyData);
      const weekStr = formatUsage("7d", usage?.seven_day);

      return `${prefix} ${name} (${email}) expires: ${expiresStr} │ ${fiveHourStr} │ ${weekStr}`;
    }),
  );

  for (const line of results) {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}
