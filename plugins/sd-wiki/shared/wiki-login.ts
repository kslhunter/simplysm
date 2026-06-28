import { spawn } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export interface WikiBackgroundLoginOptions {
  readonly pluginRoot: string;
  readonly workerScriptUrl: string;
  readonly workerArg: string;
  readonly pluginRootEnvName: string;
  readonly dataDirEnvNames?: readonly string[];
}

const DEFAULT_DATA_DIR = join(homedir(), ".claude", "sd");

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

export function triggerWikiBackgroundLogin(options: WikiBackgroundLoginOptions): void {
  const dirPath = wikiDataDir(options.dataDirEnvNames);
  const lockPath = join(dirPath, "wiki-login.lock");
  const logPath = join(dirPath, "wiki-login.log");

  let lockFd: number | undefined;
  try {
    lockFd = openSync(lockPath, "wx");
  } catch {
    return;
  }

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
    const wikiCore = (await import(pathToFileURL(join(pluginRoot, "scripts", "wiki_core.ts")).href)) as {
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

  mkdirSync(DEFAULT_DATA_DIR, { recursive: true });
  return DEFAULT_DATA_DIR;
}

function sessionSkipPath(sessionId: string, dataDirEnvNames?: readonly string[]): string {
  const safeSessionId = sessionId.replace(/[^A-Za-z0-9_.-]/gu, "_");
  return join(wikiDataDir(dataDirEnvNames), `wiki-session-no-context-${safeSessionId}.lock`);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}
