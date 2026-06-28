#!/usr/bin/env bun
/**
 * Claude Code statusline: folder | model | context% | 5h%(time) | 7d%(time) | $extra
 *
 * $extra 는 ~/.claude/.credentials.json 의 OAuth accessToken 으로 Anthropic 공식 사용량
 * 엔드포인트(api.anthropic.com/api/oauth/usage)만 조회해 표시합니다. 본인 사용량 조회
 * 용도이며 토큰을 제3자에게 전송·저장하지 않습니다.
 */

import { spawn } from "node:child_process";
import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const homeDir = getHomeDir();
const cacheFilePath = `${homeDir}/.claude/statusline-cache.json`;
const cacheDirPath = dirname(cacheFilePath);
const lockFilePath = `${homeDir}/.claude/statusline-cache.lock`;
const credentialsFilePath = `${homeDir}/.claude/.credentials.json`;
const fetchIntervalSeconds = 180;
const staleLockMilliseconds = 60_000;
const ownedLockEnvName = "SD_STATUSLINE_LOCK_OWNER";

type JsonRecord = Record<string, unknown>;

interface LockHandle {
  close(): Promise<void>;
  release(): Promise<void>;
}

function formatModel(modelId: string): string {
  const match = /^claude-(\w+)-(\d+)-(\d+)/.exec(modelId);
  if (!match) return modelId;

  const modelFamily = match[1] ?? "";
  const displayFamily = `${modelFamily.charAt(0).toUpperCase()}${modelFamily.slice(1).toLowerCase()}`;
  return `${displayFamily} ${match[2]}.${match[3]}`;
}

function formatRemaining(resetEpochSeconds: number): string {
  const deltaSeconds = resetEpochSeconds - currentEpochSeconds();
  if (deltaSeconds <= 0) return "0m";

  const totalMinutes = Math.trunc(deltaSeconds / 60);
  const days = Math.trunc(totalMinutes / (24 * 60));
  const hours = Math.trunc((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d${hours}h`;
  if (hours > 0) return `${hours}h${minutes}m`;
  return `${minutes}m`;
}

async function readCache(): Promise<JsonRecord | undefined> {
  try {
    const data = JSON.parse(await readFile(cacheFilePath, "utf8")) as unknown;
    return asRecord(data);
  } catch {
    return undefined;
  }
}

function shouldFetch(cache: JsonRecord | undefined): boolean {
  if (!cache) return true;

  const lastFetchSeconds = asNumber(cache["last_fetch_ts"]) ?? 0;
  return currentEpochSeconds() - lastFetchSeconds > fetchIntervalSeconds;
}

async function acquireLock(): Promise<LockHandle | undefined> {
  await mkdir(cacheDirPath, { recursive: true });

  const fileHandle = await openLockFile();
  if (!fileHandle) return undefined;

  await fileHandle.writeFile(`${process.pid}\n`, "utf8");

  const close = async (): Promise<void> => {
    await fileHandle.close().catch(() => undefined);
  };

  return {
    close,
    async release(): Promise<void> {
      await close();
      await unlink(lockFilePath).catch(() => undefined);
    },
  };
}

async function openLockFile(): Promise<FileHandle | undefined> {
  try {
    return await open(lockFilePath, "wx", 0o600);
  } catch (error) {
    if (getErrorCode(error) !== "EEXIST") return undefined;
  }

  if (!(await removeStaleLockIfNeeded())) return undefined;

  try {
    return await open(lockFilePath, "wx", 0o600);
  } catch {
    return undefined;
  }
}

async function removeStaleLockIfNeeded(): Promise<boolean> {
  try {
    const lockStat = await stat(lockFilePath);
    if (Date.now() - lockStat.mtimeMs <= staleLockMilliseconds) return false;

    await unlink(lockFilePath);
    return true;
  } catch {
    return false;
  }
}

async function withExclusiveLock(callback: () => Promise<void> | void): Promise<boolean> {
  const lockHandle = await acquireLock();
  if (!lockHandle) return false;

  try {
    await callback();
    return true;
  } finally {
    await lockHandle.release();
  }
}

async function trySpawnFetch(version: string): Promise<void> {
  const lockHandle = await acquireLock().catch(() => undefined);
  if (!lockHandle) return;

  let spawned = false;
  try {
    await lockHandle.close();
    const childProcess = spawn(process.execPath, [fileURLToPath(import.meta.url), "--fetch", version], {
      detached: true,
      env: { ...process.env, [ownedLockEnvName]: "1" },
      stdio: "ignore",
    });
    childProcess.unref();
    spawned = true;
  } catch {
    // statusline should never crash Claude Code
  } finally {
    if (!spawned) await lockHandle.release();
  }
}

async function doFetch(version: string): Promise<void> {
  const ownsSpawnLock = process.env[ownedLockEnvName] === "1";
  try {
    if (ownsSpawnLock) {
      await doFetchLocked(version);
      return;
    }

    await withExclusiveLock(async () => {
      await doFetchLocked(version);
    });
  } catch {
    // statusline should never crash Claude Code
  } finally {
    if (ownsSpawnLock) await unlink(lockFilePath).catch(() => undefined);
  }
}

async function doFetchLocked(version: string): Promise<void> {
  const cache = await readCache();
  if (cache && !shouldFetch(cache)) return;

  try {
    const credentials = await readJsonFile(credentialsFilePath);
    const oauth = asRecord(credentials["claudeAiOauth"]);
    if (!oauth) throw new Error("missing claudeAiOauth");

    const token = asString(oauth["accessToken"]);
    if (!token) throw new Error("missing accessToken");

    const expiresAtMilliseconds = asNumber(oauth["expiresAt"]) ?? 0;
    if (expiresAtMilliseconds < Date.now()) {
      await writeCache(cache, "token_expired");
      return;
    }

    const usageData = await fetchUsage(token, version);
    const extraUsage = asRecord(usageData["extra_usage"]) ?? {};
    const newCache: JsonRecord = {
      "last_fetch_ts": currentEpochSeconds(),
      "extra_usage": {
        "is_enabled": asBoolean(extraUsage["is_enabled"]) ?? false,
        "used_credits": extraUsage["used_credits"],
      },
      "error": null,
    };

    await writeCacheAtomic(newCache);
  } catch (error) {
    await writeCache(cache, formatErrorMessage(error));
  }
}

async function fetchUsage(token: string, version: string): Promise<JsonRecord> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 15_000);

  try {
    const response = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
        "User-Agent": `claude-code/${version}`,
      },
      signal: abortController.signal,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = (await response.json()) as unknown;
    const usageData = asRecord(data);
    if (!usageData) throw new Error("invalid usage response");
    return usageData;
  } finally {
    clearTimeout(timeout);
  }
}

async function writeCache(oldCache: JsonRecord | undefined, errorMessage: string | null): Promise<void> {
  const data: JsonRecord = oldCache ? { ...oldCache } : {};
  data["last_fetch_ts"] = currentEpochSeconds();
  data["error"] = errorMessage;
  await writeCacheAtomic(data);
}

async function writeCacheAtomic(data: JsonRecord): Promise<void> {
  await mkdir(cacheDirPath, { recursive: true });

  const tempFilePath = `${cacheFilePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(tempFilePath, JSON.stringify(data), "utf8");
    await rename(tempFilePath, cacheFilePath);
  } catch (error) {
    await unlink(tempFilePath).catch(() => undefined);
    throw error;
  }
}

function formatRateLimit(rateLimit: JsonRecord | undefined): string {
  const usedPercentage = asNumber(rateLimit?.["used_percentage"]);
  const resetsAt = asNumber(rateLimit?.["resets_at"]);

  if (usedPercentage !== undefined && resetsAt !== undefined) {
    return `${formatPercentage(usedPercentage)}%(${formatRemaining(resetsAt)})`;
  }
  if (usedPercentage !== undefined) return `${formatPercentage(usedPercentage)}%`;
  return "?";
}

async function main(): Promise<void> {
  const stdinData = await readStdinJson();

  const workspace = asRecord(stdinData["workspace"]);
  const currentDir = asString(workspace?.["current_dir"]) ?? asString(stdinData["cwd"]) ?? "";
  const folder = currentDir ? basename(currentDir) : "?";

  const modelData = asRecord(stdinData["model"]);
  const modelId = asString(modelData?.["id"]) ?? "";
  let model = modelId ? formatModel(modelId) : "?";

  const effortLevel = asString(asRecord(stdinData["effort"])?.["level"]);
  if (effortLevel) model = `${model} ${effortLevel}`;

  const contextWindow = asRecord(stdinData["context_window"]) ?? {};
  const usedPercentage = contextWindow["used_percentage"];
  const contextText = usedPercentage !== undefined && usedPercentage !== null ? `${usedPercentage}%` : "?";

  const rateLimits = asRecord(stdinData["rate_limits"]) ?? {};
  const fiveHourText = formatRateLimit(asRecord(rateLimits["five_hour"]));
  const sevenDayText = formatRateLimit(asRecord(rateLimits["seven_day"]));

  const cache = await readCache();
  const extraText = formatExtraUsage(cache);

  const version = asString(stdinData["version"]) ?? "2.1.86";
  if (shouldFetch(cache)) await trySpawnFetch(version);

  const parts = [folder, model, contextText, fiveHourText, sevenDayText];
  if (extraText) parts.push(extraText);
  console.log(parts.join(" | "));
}

function formatExtraUsage(cache: JsonRecord | undefined): string {
  if (!cache || cache["error"]) return "";

  const extraUsage = asRecord(cache["extra_usage"]);
  if (!extraUsage) return "";

  const isEnabled = extraUsage["is_enabled"] === true;
  const usedCredits = asNumber(extraUsage["used_credits"]);
  if (!isEnabled || usedCredits === undefined) return "";

  return `$${(usedCredits / 100).toFixed(2)}`;
}

async function readJsonFile(filePath: string): Promise<JsonRecord> {
  const data = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  const record = asRecord(data);
  if (!record) throw new Error(`invalid JSON object: ${filePath}`);
  return record;
}

async function readStdinJson(): Promise<JsonRecord> {
  try {
    if (process.stdin.isTTY) return {};

    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }

    const text = Buffer.concat(chunks).toString("utf8").trim();
    if (!text) return {};

    const data = JSON.parse(text) as unknown;
    return asRecord(data) ?? {};
  } catch {
    return {};
  }
}

function basename(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const parts = normalizedPath.split("/").filter(Boolean);
  return parts.at(-1) ?? "";
}

function formatPercentage(value: number): string {
  return Number.parseFloat(value.toFixed(2)).toString();
}

function currentEpochSeconds(): number {
  return Date.now() / 1000;
}

function getHomeDir(): string {
  const candidateHomeDir = process.env["HOME"] ?? process.env["USERPROFILE"];
  return candidateHomeDir || dirname(fileURLToPath(import.meta.url));
}

function asRecord(value: unknown): JsonRecord | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as JsonRecord) : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function getErrorCode(error: unknown): string | undefined {
  const code = asRecord(error)?.["code"];
  return typeof code === "string" ? code : undefined;
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

try {
  const fetchArgIndex = process.argv.indexOf("--fetch");
  if (fetchArgIndex >= 0) {
    await doFetch(process.argv[fetchArgIndex + 1] ?? "2.1.86");
  } else {
    await main();
  }
} catch {
  // statusline should never crash Claude Code
}
