// @ts-check
import fs from "fs";
import os from "os";
import path from "path";
import { stdin } from "process";

//#region Constants

const STDIN_TIMEOUT_MS = 5000;
const FETCH_TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 60_000; // 1 minute
const CACHE_PATH = path.join(os.homedir(), ".claude", "usage-api-cache.json");

//#endregion

//#region Stdin

/** @returns {Promise<string>} */
function readStdin() {
  return new Promise((resolve) => {
    let data = "";

    const cleanup = () => {
      stdin.removeAllListeners("data");
      stdin.removeAllListeners("end");
      stdin.removeAllListeners("error");
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve("");
    }, STDIN_TIMEOUT_MS);

    stdin.setEncoding("utf8");
    stdin.on("data", (chunk) => {
      data += chunk;
    });
    stdin.on("end", () => {
      clearTimeout(timeout);
      cleanup();
      resolve(data);
    });
    stdin.on("error", () => {
      clearTimeout(timeout);
      cleanup();
      resolve("");
    });
  });
}

//#endregion

//#region OAuth

/** @returns {string | undefined} */
function getOAuthToken() {
  try {
    const configDir = process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude");
    const credentialsPath = path.join(configDir, ".credentials.json");
    if (!fs.existsSync(credentialsPath)) {
      return undefined;
    }

    const content = fs.readFileSync(credentialsPath, "utf-8");
    const credentials = JSON.parse(content);
    const oauth = credentials.claudeAiOauth;

    // Check token expiration
    if (oauth?.expiresAt != null && Date.now() > oauth.expiresAt) {
      return undefined;
    }

    return oauth?.accessToken;
  } catch {
    return undefined;
  }
}

/**
 * Read cached usage data from local file.
 * @returns {{ data: object, timestamp: number } | undefined}
 */
function readCache() {
  try {
    if (!fs.existsSync(CACHE_PATH)) return undefined;
    const content = fs.readFileSync(CACHE_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

/**
 * Write usage data to local cache file.
 * @param {object} data
 */
function writeCache(data) {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify({ data, timestamp: Date.now() }), "utf-8");
  } catch {
    // ignore write errors
  }
}

/**
 * Fetch Anthropic API usage information using OAuth token, with 1-minute cache.
 * @param {string} token - OAuth access token
 * @param {string} version - Claude Code version
 * @returns {Promise<{
 *   seven_day?: {utilization?: number, resets_at?: string},
 *   daily?: {utilization?: number, resets_at?: string},
 *   five_hour?: {utilization?: number, resets_at?: string},
 *   extra_usage?: {is_enabled?: boolean, monthly_limit?: number | null, used_credits?: number}
 * } | undefined>}
 */
async function fetchUsage(token, version) {
  // Return cached data if still valid
  const cache = readCache();
  if (cache != null && (Date.now() - cache.timestamp) < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
        "User-Agent": `claude-code/${version}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      // API failed — update timestamp to prevent retry for TTL duration
      writeCache(cache?.data ?? {});
      return cache?.data;
    }

    const data = await response.json();

    if (data == null || typeof data !== "object") {
      writeCache(cache?.data ?? {});
      return cache?.data;
    }

    writeCache(data);
    return data;
  } catch {
    // Network error — update timestamp to prevent retry for TTL duration
    writeCache(cache?.data ?? {});
    return cache?.data;
  }
}

//#endregion

//#region Formatting

/**
 * @param {number | undefined} value
 * @returns {string}
 */
function formatPercent(value) {
  if (value == null) return "?";
  return Math.round(value).toString();
}

/**
 * @param {string | undefined} isoDate
 * @returns {string}
 */
function formatTimeRemaining(isoDate) {
  if (isoDate == null) return "";
  try {
    const resetTime = new Date(isoDate).getTime();
    if (Number.isNaN(resetTime)) return "";

    const now = Date.now();
    const diffMs = resetTime - now;

    if (diffMs <= 0) return "";

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const days = Math.floor(diffHours / 24);
    const hours = diffHours % 24;
    const minutes = diffMinutes % 60;

    if (days > 0) {
      return `${days}d${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h${minutes}m`;
    }
    return `${minutes}m`;
  } catch {
    return "";
  }
}

//#endregion

//#region Main

/**
 * JSON information received from stdin
 * @typedef {object} StdinInput
 * @property {{display_name?: string}} [model] - Model information
 * @property {{context_window_size?: number, remaining_context_tokens?: number, current_usage?: {input_tokens?: number, output_tokens?: number, cache_creation_input_tokens?: number, cache_read_input_tokens?: number}}} [context_window] - Context window information
 * @property {{tokens_used?: number, tokens_limit?: number}} [weekly_token_usage] - Weekly token usage (fallback)
 * @property {string} [version] - Claude Code version
 */

/**
 * Output Claude Code status bar information.
 * Combine JSON received from stdin with OAuth API response to output
 * model name, context usage, and daily/weekly usage.
 */
async function main() {
  const inputStr = await readStdin();
  /** @type {StdinInput} */
  let input = {};

  if (inputStr !== "") {
    try {
      input = JSON.parse(inputStr);
    } catch {
      // Use empty object if JSON parsing fails
    }
  }

  // Basic information
  const modelName = input.model?.display_name ?? "Unknown";
  const contextSize = input.context_window?.context_window_size ?? 0;
  const usage = input.context_window?.current_usage;
  const contextUsed =
    (usage?.input_tokens ?? 0) +
    (usage?.output_tokens ?? 0) +
    (usage?.cache_creation_input_tokens ?? 0) +
    (usage?.cache_read_input_tokens ?? 0);
  const contextPercent = contextSize > 0 ? Math.round((contextUsed / contextSize) * 100) : 0;

  // Try fetching usage with OAuth token
  const token = getOAuthToken();
  let dailyPercent = "?";
  let dailyResetTime = "";
  let weekPercent = "?";
  let weekResetDay = "";
  let extraUsage = "";

  if (token != null) {
    const usageResponse = await fetchUsage(token, input.version ?? "unknown");
    if (usageResponse != null) {
      // Use daily or five_hour
      const dailyData = usageResponse.daily ?? usageResponse.five_hour;
      dailyPercent = formatPercent(dailyData?.utilization);
      dailyResetTime = formatTimeRemaining(dailyData?.resets_at);
      weekPercent = formatPercent(usageResponse.seven_day?.utilization);
      weekResetDay = formatTimeRemaining(usageResponse.seven_day?.resets_at);

      // Extra usage
      if (usageResponse.extra_usage?.is_enabled && usageResponse.extra_usage.used_credits != null) {
        extraUsage = `$${(usageResponse.extra_usage.used_credits / 100).toFixed(2)}`;
      }
    }
  }

  // Fallback: weekly_token_usage
  if (weekPercent === "?" && input.weekly_token_usage != null) {
    const used = input.weekly_token_usage.tokens_used ?? 0;
    const limit = input.weekly_token_usage.tokens_limit ?? 0;
    if (limit > 0) {
      weekPercent = Math.round((used / limit) * 100).toString();
    }
  }

  // Folder name + git branch
  const cwd = input.cwd ?? process.cwd();
  const folderName = path.basename(cwd);

  // Output
  const dailyStr = dailyResetTime ? `${dailyPercent}%(${dailyResetTime})` : `${dailyPercent}%`;
  const weekStr = weekResetDay ? `${weekPercent}%(${weekResetDay})` : `${weekPercent}%`;
  const parts = [folderName, modelName, `${contextPercent}%`, dailyStr, weekStr];
  if (extraUsage) parts.push(extraUsage);
  console.log(parts.join(" │ "));
}

void main();

//#endregion
