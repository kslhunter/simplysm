import { spawn } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { defaultDataDir } from "./wiki-util.ts";

export interface WikiBackgroundLoginOptions {
  readonly pluginRoot: string;
  readonly workerScriptUrl: string;
  readonly workerArg: string;
  readonly pluginRootEnvName: string;
  readonly dataDirEnvNames?: readonly string[];
}

export function markWikiSessionSkipped(sessionId: string, dataDirEnvNames?: readonly string[]): void {
  try {
    writeFileSync(sessionSkipPath(sessionId, dataDirEnvNames), String(Date.now() / 1000), "utf8");
  } catch {
    // 세션 skip 기록 실패는 hook 흐름을 막지 않는다.
  }
}

export function isWikiSessionSkipped(sessionId: string, dataDirEnvNames?: readonly string[]): boolean {
  return existsSync(sessionSkipPath(sessionId, dataDirEnvNames));
}

const LOGIN_LOCK_TTL_SEC = 600; // 로그인 대기 한도(300초)보다 충분히 큰 값 — 이보다 오래된 lock 은 워커 비정상 종료 잔존으로 본다.

function loginLockAgeSec(lockPath: string): number | undefined {
  let startedAt: number | undefined;
  try {
    const parsed: unknown = JSON.parse(readFileSync(lockPath, "utf8"));
    if (typeof parsed === "object" && parsed !== null) {
      const value = (parsed as Record<string, unknown>)["startedAt"];
      if (typeof value === "number") startedAt = value;
    }
  } catch {
    // lock 본문 손상·미기록 — mtime 으로 폴백한다.
  }
  if (startedAt === undefined) {
    try {
      startedAt = statSync(lockPath).mtimeMs / 1000;
    } catch {
      return undefined; // lock 이 그 사이 사라짐 등 — 판단 불가.
    }
  }
  return Date.now() / 1000 - startedAt;
}

function acquireLoginLock(lockPath: string): number | undefined {
  try {
    return openSync(lockPath, "wx");
  } catch {
    // 이미 lock 이 있음 — 워커 비정상 종료로 남은 stale 이면 치우고 1회만 재획득한다.
    const ageSec = loginLockAgeSec(lockPath);
    if (ageSec === undefined || ageSec <= LOGIN_LOCK_TTL_SEC) return undefined;
    try {
      unlinkSync(lockPath);
      return openSync(lockPath, "wx");
    } catch {
      return undefined;
    }
  }
}

export function triggerWikiBackgroundLogin(options: WikiBackgroundLoginOptions): void {
  const dirPath = wikiDataDir(options.dataDirEnvNames);
  const lockPath = join(dirPath, "wiki-login.lock");
  const logPath = join(dirPath, "wiki-login.log");

  const lockFd = acquireLoginLock(lockPath);
  if (lockFd === undefined) return;

  try {
    writeFileSync(lockFd, JSON.stringify({ startedAt: Date.now() / 1000 }), "utf8");
  } finally {
    closeSync(lockFd);
  }

  let logFd: number | undefined;
  try {
    logFd = openSync(logPath, "a");
    const childProcess = spawn(process.execPath, [fileURLToPath(options.workerScriptUrl), options.workerArg, lockPath], {
      detached: true,
      env: { ...process.env, [options.pluginRootEnvName]: options.pluginRoot },
      stdio: ["ignore", "ignore", logFd],
    });
    childProcess.on("error", () => {
      // spawn 비동기 실패 — 남은 lock 을 정리해 다음 진입에서 재시도할 수 있게 한다.
      try {
        unlinkSync(lockPath);
      } catch {
        // lock 삭제 실패는 무시한다.
      }
    });
    childProcess.unref();
  } catch {
    try {
      unlinkSync(lockPath);
    } catch {
      // lock 삭제 실패는 무시한다.
    }
  } finally {
    if (logFd !== undefined) closeSync(logFd);
  }
}

export async function runWikiBackgroundLoginWorker(lockPath: string, pluginRoot: string): Promise<void> {
  try {
    const wikiCore = (await import(pathToFileURL(join(pluginRoot, "shared", "wiki-service.ts")).href)) as {
      browserLogin: () => Promise<string>;
    };
    await wikiCore.browserLogin();
  } catch (error) {
    console.error(`[위키 인증] 백그라운드 로그인 실패: ${getErrorMessage(error)}`);
  } finally {
    try {
      unlinkSync(lockPath);
    } catch {
      // lock 삭제 실패는 무시한다.
    }
  }
}

export async function runWikiBackgroundLoginWorkerFromArgv(
  argv: readonly string[],
  workerArg: string,
  pluginRootEnvName: string,
): Promise<boolean> {
  const workerIndex = argv.indexOf(workerArg);
  if (workerIndex < 0) return false;

  const lockPath = argv[workerIndex + 1];
  // lockPath 없으면 정리할 lock 도 없어 조용히 종료
  if (!lockPath) return true;

  const pluginRoot = process.env[pluginRootEnvName];
  if (!pluginRoot) {
    console.error(`[위키 인증] 백그라운드 로그인 실패: ${pluginRootEnvName} 환경변수가 없습니다.`);
    try {
      unlinkSync(lockPath);
    } catch {
      // lock 삭제 실패는 무시한다.
    }
    return true;
  }

  await runWikiBackgroundLoginWorker(lockPath, pluginRoot);
  return true;
}

function wikiDataDir(dataDirEnvNames: readonly string[] = []): string {
  for (const envVarName of dataDirEnvNames) {
    const dirPath = process.env[envVarName];
    if (dirPath) {
      mkdirSync(dirPath, { recursive: true });
      return dirPath;
    }
  }

  const dirPath = defaultDataDir();
  mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function sessionSkipPath(sessionId: string, dataDirEnvNames?: readonly string[]): string {
  const safeSessionId = sessionId.replace(/[^A-Za-z0-9_.-]/gu, "_");
  return join(wikiDataDir(dataDirEnvNames), `wiki-session-no-context-${safeSessionId}.lock`);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}
