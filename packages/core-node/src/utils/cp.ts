import type { ChildProcess } from "child_process";
import { execSync as cpExecSync, spawn as cpSpawn, spawnSync as cpSpawnSync } from "child_process";
import { bytes } from "@simplysm/core-common";

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
      const lang = process.env["LANG"] ?? process.env["LC_ALL"] ?? "";
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

//#region exec types

export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  stdio?: "pipe" | "inherit";
  shell?: boolean;
  reject?: boolean;
}

export type ExecSyncOptions = Omit<ExecOptions, "reject">;

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
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

//#region ExecProcess

export class ExecProcess implements PromiseLike<ExecResult> {
  private readonly _process: ChildProcess;
  private readonly _promise: Promise<ExecResult>;

  constructor(cp: ChildProcess, promise: Promise<ExecResult>) {
    this._process = cp;
    this._promise = promise;
  }

  get pid(): number | undefined {
    return this._process.pid;
  }

  then<TResult1 = ExecResult, TResult2 = never>(
    onfulfilled?: ((value: ExecResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this._promise.then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<ExecResult | TResult> {
    return this._promise.catch(onrejected);
  }

  kill(signal?: NodeJS.Signals | number): boolean {
    return this._process.kill(signal);
  }
}

//#endregion

//#region exec / execSync

export function exec(cmd: string, args: string[], options?: ExecOptions): ExecProcess {
  const isInherit = options?.stdio === "inherit";

  const cp = cpSpawn(cmd, args, {
    cwd: options?.cwd,
    env: options?.env != null ? { ...process.env, ...options.env } : undefined,
    stdio: isInherit ? "inherit" : "pipe",
    shell: options?.shell ?? false,
  });

  const promise = new Promise<ExecResult>((resolve, reject) => {
    cp.on("error", (err) => {
      reject(Object.assign(err, { stdout: "", stderr: "", exitCode: 1 }));
    });

    if (isInherit) {
      cp.on("close", (code, signal) => {
        const exitCode = code ?? (signal != null ? 1 : 0);
        const result: ExecResult = { stdout: "", stderr: "", exitCode };
        if (exitCode !== 0 && options.reject !== false) {
          reject(Object.assign(new Error(`Command failed: ${cmd} ${args.join(" ")}`), result));
        } else {
          resolve(result);
        }
      });
      return;
    }

    const stdoutChunks: Uint8Array[] = [];
    const stderrChunks: Uint8Array[] = [];

    cp.stdout!.on("data", (chunk: Uint8Array) => stdoutChunks.push(chunk));
    cp.stderr!.on("data", (chunk: Uint8Array) => stderrChunks.push(chunk));

    cp.on("close", (code, signal) => {
      const exitCode = code ?? (signal != null ? 1 : 0);
      const stdout = decodeBytes(bytes.concat(stdoutChunks));
      const stderr = decodeBytes(bytes.concat(stderrChunks));
      const result: ExecResult = { stdout, stderr, exitCode };

      if (exitCode !== 0 && options?.reject !== false) {
        reject(Object.assign(new Error(`Command failed: ${cmd} ${args.join(" ")}`), result));
      } else {
        resolve(result);
      }
    });
  });

  return new ExecProcess(cp, promise);
}

export function execSync(cmd: string, args: string[], options?: ExecSyncOptions): ExecResult {
  const isInherit = options?.stdio === "inherit";

  const result = cpSpawnSync(cmd, args, {
    cwd: options?.cwd,
    env: options?.env != null ? { ...process.env, ...options.env } : undefined,
    stdio: isInherit ? "inherit" : "pipe",
    shell: options?.shell ?? false,
  });

  if (isInherit) {
    return { stdout: "", stderr: "", exitCode: result.status ?? 0 };
  }

  const stdout = decodeBytes(result.stdout as Uint8Array);
  const stderr = decodeBytes(result.stderr as Uint8Array);

  return { stdout, stderr, exitCode: result.status ?? 0 };
}

//#endregion
