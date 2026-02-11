// @ts-check
import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import { stdin } from "process";

//#region Constants

const STDIN_TIMEOUT_MS = 5000;
const FETCH_TIMEOUT_MS = 3000;
const PROGRESS_BAR_SIZE = 5;
const PROGRESS_BAR_UNIT = 100 / PROGRESS_BAR_SIZE; // 20

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
 * OAuth 토큰을 사용하여 Anthropic API 사용량 정보를 조회한다.
 * @param {string} token - OAuth 액세스 토큰
 * @returns {Promise<{
 *   seven_day?: {utilization?: number, resets_at?: string},  // 7일 사용량
 *   daily?: {utilization?: number, resets_at?: string},       // 일일 사용량
 *   five_hour?: {utilization?: number, resets_at?: string},   // 5시간 사용량
 *   extra_usage?: {is_enabled?: boolean, monthly_limit?: number | null, used_credits?: number}  // extra usage
 * } | undefined>}
 */
async function fetchUsage(token) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return undefined;
    }

    const data = await response.json();

    // 응답 구조 검증
    if (data == null || typeof data !== "object") {
      return undefined;
    }

    return data;
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

/**
 * 퍼센트 값을 5칸 프로그레스 바 문자열로 변환한다.
 * 각 칸은 20%를 나타내며, 채워진 칸은 ■, 빈 칸은 □로 표시한다.
 * @param {number} percent - 0~100 범위의 퍼센트 값
 * @returns {string} 5글자 프로그레스 바 문자열 (예: "■■■□□")
 */
function formatProgressBar(percent) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  const filled = Math.round(clamped / PROGRESS_BAR_UNIT);
  const empty = PROGRESS_BAR_SIZE - filled;
  return "■".repeat(filled) + "□".repeat(empty);
}

//#endregion

//#region Main

/**
 * stdin으로 입력받은 JSON 정보
 * @typedef {object} StdinInput
 * @property {{display_name?: string}} [model] - 모델 정보
 * @property {{context_window_size?: number, remaining_context_tokens?: number, current_usage?: {input_tokens?: number, output_tokens?: number, cache_creation_input_tokens?: number, cache_read_input_tokens?: number}}} [context_window] - 컨텍스트 윈도우 정보
 * @property {{tokens_used?: number, tokens_limit?: number}} [weekly_token_usage] - 주간 토큰 사용량 (fallback용)
 */

/**
 * Claude Code 상태 표시줄 정보를 출력한다.
 * stdin으로 입력받은 JSON과 OAuth API 응답을 조합하여
 * 모델명, 컨텍스트 사용량, 일일/주간 사용량을 출력한다.
 */
async function main() {
  const inputStr = await readStdin();
  /** @type {StdinInput} */
  let input = {};

  if (inputStr !== "") {
    try {
      input = JSON.parse(inputStr);
    } catch {
      // JSON 파싱 실패 시 빈 객체 사용
    }
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
  let dailyPercent = "?";
  let dailyResetTime = "";
  let weekPercent = "?";
  let weekResetDay = "";
  let extraUsage = "";

  if (token != null) {
    const usageResponse = await fetchUsage(token);
    if (usageResponse != null) {
      // daily 또는 five_hour 사용
      const dailyData = usageResponse.daily ?? usageResponse.five_hour;
      dailyPercent = formatPercent(dailyData?.utilization);
      dailyResetTime = formatTimeRemaining(dailyData?.resets_at);
      weekPercent = formatPercent(usageResponse.seven_day?.utilization);
      weekResetDay = formatTimeRemaining(usageResponse.seven_day?.resets_at);

      // extra usage
      if (usageResponse.extra_usage?.is_enabled && usageResponse.extra_usage.used_credits != null) {
        extraUsage = `$${(usageResponse.extra_usage.used_credits / 100).toFixed(2)}`;
      }
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

  // 폴더명 + git 브랜치
  const cwd = input.cwd ?? process.cwd();
  const folderName = path.basename(cwd);
  let branch = "";
  try {
    branch = execSync("git branch --show-current", { cwd, timeout: 2000 }).toString().trim();
  } catch {
    // git 없거나 실패 시 무시
  }
  const gitPart = branch !== "" ? ` (${branch})` : "";

  // 출력
  const ctxBar = formatProgressBar(contextPercent);
  const dailyBar = dailyPercent !== "?" ? formatProgressBar(Number(dailyPercent)) : "□□□□□";
  const weekBar = weekPercent !== "?" ? formatProgressBar(Number(weekPercent)) : "□□□□□";
  const extraPart = extraUsage !== "" ? ` 💰  ${extraUsage}` : "";
  console.log(
    `🤖  ${modelName} 📊  ${ctxBar} ${contextPercent}% ─ ${dailyResetTime} ${dailyBar} ${dailyPercent}% ─ ${weekResetDay} ${weekBar} ${weekPercent}%${extraPart} 📁  ${folderName}${gitPart}`,
  );
}

void main();

//#endregion
