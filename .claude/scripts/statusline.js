// @ts-check
import fs from "fs";
import os from "os";
import path from "path";
import { stdin } from "process";

//#region Constants

const STDIN_TIMEOUT_MS = 5000;
const FETCH_TIMEOUT_MS = 3000;
const PROGRESS_BAR_SIZE = 5;
const PROGRESS_BAR_UNIT = 100 / PROGRESS_BAR_SIZE; // 20

//#endregion

//#region Stdin

/** @returns {Promise<string>} */
async function readStdin() {
  return await new Promise((resolve) => {
    let data = "";
    const timeout = setTimeout(() => resolve(""), STDIN_TIMEOUT_MS);
    stdin.setEncoding("utf8");
    stdin.on("data", (chunk) => {
      data += chunk;
    });
    stdin.on("end", () => {
      clearTimeout(timeout);
      resolve(data);
    });
    stdin.on("error", () => {
      clearTimeout(timeout);
      resolve("");
    });
  });
}

//#endregion

//#region OAuth

/** @returns {string | undefined} */
function getOAuthToken() {
  try {
    const credentialsPath = path.join(os.homedir(), ".claude", ".credentials.json");
    if (!fs.existsSync(credentialsPath)) {
      return undefined;
    }

    const content = fs.readFileSync(credentialsPath, "utf-8");
    const credentials = JSON.parse(content);
    const oauth = credentials.claudeAiOauth;

    // 토큰 만료 체크
    if (oauth?.expiresAt != null && Date.now() > oauth.expiresAt) {
      return undefined;
    }

    return oauth?.accessToken;
  } catch {
    return undefined;
  }
}

/**
 * @param {string} token
 * @returns {Promise<{seven_day?: {utilization?: number, resets_at?: string}, five_hour?: {utilization?: number, resets_at?: string}} | undefined>}
 */
async function fetchUsage(token) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return undefined;
    }

    return await response.json();
  } catch {
    return undefined;
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

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffHours / 24);
    const hours = diffHours % 24;

    if (days > 0) {
      return `${days}d${hours}h`;
    }
    return `${hours}h`;
  } catch {
    return "";
  }
}

/**
 * @param {number} percent
 * @returns {string}
 */
function formatProgressBar(percent) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  const filled = Math.round(clamped / PROGRESS_BAR_UNIT);
  const empty = PROGRESS_BAR_SIZE - filled;
  return "■".repeat(filled) + "□".repeat(empty);
}

//#endregion

//#region Main

async function main() {
  const inputStr = await readStdin();
  let input = {};

  try {
    input = JSON.parse(inputStr);
  } catch {
    // 파싱 실패 시 빈 객체 사용
  }

  // 기본 정보
  const modelName = input.model?.display_name ?? "Unknown";
  const contextSize = input.context_window?.context_window_size ?? 0;
  const usage = input.context_window?.current_usage;
  const contextUsed =
    (usage?.input_tokens ?? 0) +
    (usage?.output_tokens ?? 0) +
    (usage?.cache_creation_input_tokens ?? 0) +
    (usage?.cache_read_input_tokens ?? 0);
  const contextPercent = contextSize > 0 ? Math.round((contextUsed / contextSize) * 100) : 0;

  // OAuth 토큰으로 사용량 조회 시도
  const token = getOAuthToken();
  let weekPercent = "?";
  let weekResetDay = "";

  if (token != null) {
    const usageResponse = await fetchUsage(token);
    if (usageResponse != null) {
      weekPercent = formatPercent(usageResponse.seven_day?.utilization);
      weekResetDay = formatTimeRemaining(usageResponse.seven_day?.resets_at);
    }
  }

  // fallback: weekly_token_usage
  if (weekPercent === "?" && input.weekly_token_usage != null) {
    const used = input.weekly_token_usage.tokens_used ?? 0;
    const limit = input.weekly_token_usage.tokens_limit ?? 0;
    if (limit > 0) {
      weekPercent = Math.round((used / limit) * 100).toString();
    }
  }

  // 출력
  const ctxBar = formatProgressBar(contextPercent);
  const weekBar = weekPercent !== "?" ? formatProgressBar(Number(weekPercent)) : "□□□□□";
  const weekLabel = weekResetDay !== "" ? `주간(${weekResetDay})` : "주간";
  console.log(`${modelName} ${ctxBar} ${contextPercent}% ─ ${weekLabel} ${weekBar} ${weekPercent}%`);
}

void main();

//#endregion
