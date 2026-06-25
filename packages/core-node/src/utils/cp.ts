import type { ChildProcess, SpawnOptions, SpawnSyncOptions } from "child_process";
import { execSync as cpExecSync, spawn as cpSpawn, spawnSync as cpSpawnSync } from "child_process";
import { bytes, env } from "@simplysm/core-common";

const CODE_PAGE_MAP: Record<number, string> = {
  65001: "utf-8",
  949: "euc-kr",
  932: "shift-jis",
  936: "gbk",
  950: "big5",
  1252: "windows-1252",
  1251: "windows-1251",
  1250: "windows-1250",
  874: "windows-874",
};

let _cachedEncoding: string | undefined;

export function codePageToEncoding(codePage: number): string {
  return CODE_PAGE_MAP[codePage] ?? "utf-8";
}

export function resetEncodingCache(): void {
  _cachedEncoding = undefined;
}

export function getSystemEncoding(): string {
  if (_cachedEncoding != null) return _cachedEncoding;

  try {
    if (process.platform === "win32") {
      const output = cpExecSync("chcp", { encoding: "utf-8" });
      const match = output.match(/\d+/);
      if (match) {
        _cachedEncoding = codePageToEncoding(Number(match[0]));
        return _cachedEncoding;
      }
    } else {
      const lang = env("LANG") ?? env("LC_ALL") ?? "";
      const dotIndex = lang.indexOf(".");
      if (dotIndex >= 0) {
        let encoding = lang.slice(dotIndex + 1).split("@")[0].toLowerCase();
        if (encoding === "utf8") encoding = "utf-8";
        _cachedEncoding = encoding;
        return _cachedEncoding;
      }
    }
  } catch {
    // 감지 실패 시 fallback
  }

  _cachedEncoding = "utf-8";
  return _cachedEncoding;
}

//#region spawn types

export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

//#endregion

//#region resolveStdioPipe

export function resolveStdioPipe(
  stdio: SpawnOptions["stdio"],
): { stdout: boolean; stderr: boolean } {
  if (Array.isArray(stdio)) {
    return { stdout: stdio[1] === "pipe", stderr: stdio[2] === "pipe" };
  }
  const isPipe = stdio === "pipe" || stdio == null;
  return { stdout: isPipe, stderr: isPipe };
}

//#endregion

//#region decodeBytes

export function decodeBytes(raw: Uint8Array, systemEncoding?: string): string {
  const encoding = systemEncoding ?? getSystemEncoding();

  if (encoding === "utf-8") {
    return new TextDecoder("utf-8").decode(raw);
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    return new TextDecoder(encoding).decode(raw);
  }
}

//#endregion

//#region SpawnProcess

export class SpawnProcess implements PromiseLike<SpawnResult> {
  private readonly _process: ChildProcess;
  private readonly _promise: Promise<SpawnResult>;

  constructor(cp: ChildProcess, promise: Promise<SpawnResult>) {
    this._process = cp;
    this._promise = promise;
  }

  get pid(): number | undefined {
    return this._process.pid;
  }

  get process(): ChildProcess {
    return this._process;
  }

  then<TResult1 = SpawnResult, TResult2 = never>(
    onfulfilled?: ((value: SpawnResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this._promise.then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<SpawnResult | TResult> {
    return this._promise.catch(onrejected);
  }

  kill(signal?: NodeJS.Signals | number): boolean {
    return this._process.kill(signal);
  }
}

//#endregion

//#region spawn / spawnSync

export function spawn(
  cmd: string,
  args: string[],
  options?: SpawnOptions & { reject?: boolean },
): SpawnProcess {
  // shell 옵션 + 비어있지 않은 args 조합은 DEP0190 경고를 유발한다.
  // Node 가 shell 모드에서 내부적으로 수행하는 `${cmd} ${args.join(" ")}` 합치기를
  // 미리 수행해 args 를 비우면, 셸 라인은 동일하면서 경고 조건만 사라진다.
  if (options?.shell != null && options.shell !== false && args.length > 0) {
    cmd = [cmd, ...args].join(" ");
    args = [];
  }

  // eslint-disable-next-line no-restricted-properties -- 자식 프로세스에 env 전달
  const opts: SpawnOptions = { stdio: "pipe", ...options, env: { ...process.env, ...options?.env } };

  const cp = cpSpawn(cmd, args, opts);

  const { stdout: stdoutIsPipe, stderr: stderrIsPipe } = resolveStdioPipe(opts.stdio);

  const promise = new Promise<SpawnResult>((resolve, reject) => {
    cp.on("error", (err) => {
      reject(err);
    });

    const stdoutChunks: Uint8Array[] = [];
    const stderrChunks: Uint8Array[] = [];

    if (stdoutIsPipe) {
      cp.stdout!.on("data", (chunk: Uint8Array) => stdoutChunks.push(chunk));
    }
    if (stderrIsPipe) {
      cp.stderr!.on("data", (chunk: Uint8Array) => stderrChunks.push(chunk));
    }

    cp.on("close", (code, signal) => {
      const exitCode = code ?? (signal != null ? 1 : 0);
      const stdout = stdoutIsPipe ? decodeBytes(bytes.concat(stdoutChunks)) : "";
      const stderr = stderrIsPipe ? decodeBytes(bytes.concat(stderrChunks)) : "";
      const result: SpawnResult = { stdout, stderr, exitCode };

      if (exitCode !== 0 && options?.reject !== false) {
        reject(new Error(formatCommandFailure(cmd, args, exitCode, stdout, stderr)));
      } else {
        resolve(result);
      }
    });
  });

  return new SpawnProcess(cp, promise);
}

export function spawnSync(
  cmd: string,
  args: string[],
  options?: SpawnSyncOptions & { reject?: boolean },
): SpawnResult {
  // shell 옵션 + 비어있지 않은 args 조합은 DEP0190 경고를 유발한다. (spawn 과 동일 처리)
  if (options?.shell != null && options.shell !== false && args.length > 0) {
    cmd = [cmd, ...args].join(" ");
    args = [];
  }

  const opts: SpawnSyncOptions = {
    stdio: "pipe",
    ...options,
    // eslint-disable-next-line no-restricted-properties -- 자식 프로세스에 env 전달
    env: { ...process.env, ...options?.env },
  };

  const result = cpSpawnSync(cmd, args, opts);

  const { stdout: stdoutIsPipe, stderr: stderrIsPipe } = resolveStdioPipe(opts.stdio);

  const stdout = stdoutIsPipe ? decodeBytes(result.stdout as Uint8Array) : "";
  const stderr = stderrIsPipe ? decodeBytes(result.stderr as Uint8Array) : "";
  const exitCode = result.status ?? 0;

  if (exitCode !== 0 && options?.reject !== false) {
    throw new Error(formatCommandFailure(cmd, args, exitCode, stdout, stderr));
  }

  return { stdout, stderr, exitCode };
}

function formatCommandFailure(
  cmd: string,
  args: string[],
  exitCode: number,
  stdout: string,
  stderr: string,
): string {
  const detail = (stderr.trim() || stdout.trim()).slice(-4000);
  const header = `Command failed (exit ${exitCode}): ${cmd} ${args.join(" ")}`;
  return detail ? `${header}\n${detail}` : header;
}

//#endregion
