import { DebounceQueue } from "@simplysm/core-common";
import * as chokidar from "chokidar";
import { createLogger } from "@simplysm/core-common";
import { minimatch } from "minimatch";
import * as nodeFs from "node:fs";
import path from "path";
import { type PosixPath, posix } from "../utils/path";

//#region Native FSWatcher error guard

/*
 * Windows에서 watched 디렉토리가 사라지면 native FSWatcher가 EPERM을 emit하는데,
 * close 진행 중 race window에서 listener 없는 인스턴스가 발견되면 EventEmitter 기본
 * 동작에 의해 uncaughtException으로 throw되어 프로세스가 종료된다. prototype emit를
 * 감싸서 orphan 'error'를 swallow한다.
 */
interface FsWatcherInstance {
  listenerCount: (event: string) => number;
  emit: (event: string, ...args: unknown[]) => boolean;
  [k: symbol]: unknown;
}
const FSW_PROTO = (nodeFs as unknown as { FSWatcher?: { prototype: FsWatcherInstance } })
  .FSWatcher?.prototype;
const FSW_GUARD_FLAG = Symbol.for("@simplysm/core-node/fs-watcher/error-guard");
if (FSW_PROTO != null && FSW_PROTO[FSW_GUARD_FLAG] !== true) {
  const origEmit = FSW_PROTO.emit;
  FSW_PROTO.emit = function (this: FsWatcherInstance, event: string, ...args: unknown[]): boolean {
    if (event === "error" && this.listenerCount("error") === 0) return false;
    return origEmit.call(this, event, ...args);
  };
  FSW_PROTO[FSW_GUARD_FLAG] = true;
}

//#endregion

const GLOB_CHARS_RE = /[*?{[\]]/;
const FS_WATCHER_EVENTS = ["add", "addDir", "change", "unlink", "unlinkDir"] as const;

export type FsWatcherEvent = (typeof FS_WATCHER_EVENTS)[number];

export interface FsWatcherChangeInfo {
  event: FsWatcherEvent;
  path: PosixPath;
}

/**
 * 이벤트 병합 룩업. `${prev}+${curr}` → 병합 결과.
 * - 값 = 해당 이벤트로 갱신
 * - null = 제거 (생성 직후 삭제 등 상쇄)
 * - 룩업 미스 = 현재 이벤트로 덮어쓰기
 */
const EVENT_MERGE: Record<string, FsWatcherEvent | null> = {
  "add+change": "add",
  "add+unlink": null,
  "addDir+unlinkDir": null,
  "unlink+add": "add",
  "unlink+change": "change",
  "unlinkDir+addDir": "addDir",
};

/**
 * Glob 패턴에서 메타문자 이전까지의 base 디렉토리를 추출한다.
 */
function extractGlobBase(globPath: string): string {
  const baseSegments: string[] = [];
  for (const seg of globPath.split(/[/\\]/)) {
    if (GLOB_CHARS_RE.test(seg)) break;
    baseSegments.push(seg);
  }
  return baseSegments.join(path.sep) || path.sep;
}

/**
 * Chokidar 기반 파일 시스템 감시 래퍼.
 * 짧은 시간 내 발생한 이벤트를 병합하여 콜백을 한 번만 호출한다.
 * EPERM 발생 시 watcher를 자동 재시작한다.
 *
 * `options.ignoreInitial: false`인 경우 첫 콜백이 빈 배열로 호출된다 (실제 초기 파일 목록은
 * 포함하지 않음 — 이벤트 병합과의 충돌 방지).
 */
export class FsWatcher {
  private static readonly _MAX_RETRIES = 3;
  private static readonly _RETRY_DELAY_MS = 1000;

  static async watch(paths: string[], options?: chokidar.ChokidarOptions): Promise<FsWatcher> {
    const w = new FsWatcher(paths, options);
    try {
      await w._waitReady();
      return w;
    } catch (err) {
      await w.close().catch(() => {});
      throw err;
    }
  }

  private readonly _logger = createLogger("sd-fs-watcher");
  private readonly _paths: readonly string[];
  private readonly _options: chokidar.ChokidarOptions;
  private readonly _debounceQueues: DebounceQueue[] = [];
  private readonly _allHandlers: Array<(event: string, path: string) => void> = [];
  private readonly _creationStack: string;

  private _watcher: chokidar.FSWatcher;
  private _retryCount = 0;
  private _isRecovering = false;

  private constructor(paths: string[], options?: chokidar.ChokidarOptions) {
    this._creationStack = new Error().stack ?? "";
    this._paths = [...paths];
    this._options = { ...options };
    this._watcher = this._createChokidar();
  }

  private _createChokidar(): chokidar.FSWatcher {
    const watchPaths = [...new Set(this._paths.map(extractGlobBase))];
    const w = chokidar.watch(watchPaths, {
      persistent: true,
      ...this._options,
      ignoreInitial: true,
    });

    w.on("error", (err) => {
      const detail = err instanceof Error ? (err.stack ?? err.message) : String(err);
      this._logger.error(
        `FsWatcher 오류: ${detail}\n---- creation stack ----\n${this._creationStack}`,
      );

      if (
        err instanceof Error &&
        (err as NodeJS.ErrnoException).code === "EPERM" &&
        !this._isRecovering
      ) {
        void this._handleEperm();
      }
    });

    return w;
  }

  private _waitReady(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const onReady = () => {
        this._watcher.removeListener("error", onError);
        resolve();
      };
      const onError = (err: unknown) => {
        this._watcher.removeListener("ready", onReady);
        reject(err);
      };
      this._watcher.once("ready", onReady);
      this._watcher.once("error", onError);
    });
  }

  private async _handleEperm(): Promise<void> {
    if (this._isRecovering) return;
    this._isRecovering = true;

    while (this._retryCount < FsWatcher._MAX_RETRIES) {
      this._retryCount++;
      this._logger.warn(
        `EPERM 감지 — ${this._retryCount}/${FsWatcher._MAX_RETRIES} 재시작 시도`,
      );

      try {
        await this._watcher.close().catch(() => {});
        await new Promise((r) => setTimeout(r, FsWatcher._RETRY_DELAY_MS));

        this._watcher = this._createChokidar();
        for (const handler of this._allHandlers) this._watcher.on("all", handler);
        await this._waitReady();

        this._retryCount = 0;
        this._isRecovering = false;
        this._logger.success("watcher 재시작 완료");
        return;
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        this._logger.error(
          `watcher 재시작 실패 (${this._retryCount}/${FsWatcher._MAX_RETRIES}): ${detail}`,
        );
      }
    }

    this._logger.error(`EPERM 재시도 최대 ${FsWatcher._MAX_RETRIES}회 초과 — 중단`);
    this._isRecovering = false;
  }

  onChange(
    opt: { delay?: number },
    cb: (changeInfos: FsWatcherChangeInfo[]) => void | Promise<void>,
  ): this {
    const fnQ = new DebounceQueue(opt.delay);
    this._debounceQueues.push(fnQ);

    let pending = new Map<string, FsWatcherEvent>();

    if (this._options.ignoreInitial === false) {
      fnQ.run(async () => {
        await cb([]);
      });
    }

    const handler = (event: string, filePath: string) => {
      if (!FS_WATCHER_EVENTS.includes(event as FsWatcherEvent)) return;

      const posixFilePath = posix(filePath);
      if (!this._paths.some((p) => (
        minimatch(posixFilePath, posix(p), { dot: true }) ||
        minimatch(posixFilePath, posix(path.join(p, "**")), { dot: true })
      ))) return;

      const curr = event as FsWatcherEvent;
      const prev = pending.get(filePath);
      const key = prev != null ? `${prev}+${curr}` : "";

      if (key in EVENT_MERGE) {
        const merged = EVENT_MERGE[key];
        if (merged == null) pending.delete(filePath);
        else pending.set(filePath, merged);
      } else {
        pending.set(filePath, curr);
      }

      fnQ.run(async () => {
        if (pending.size === 0) return;
        const flushed = pending;
        pending = new Map();

        const changeInfos: FsWatcherChangeInfo[] = [];
        for (const [p, evt] of flushed) {
          changeInfos.push({ path: posix(p), event: evt });
        }
        await cb(changeInfos);
      });
    };

    this._allHandlers.push(handler);
    this._watcher.on("all", handler);
    return this;
  }

  async close(): Promise<void> {
    for (const q of this._debounceQueues) q.dispose();
    this._debounceQueues.length = 0;
    await this._watcher.close();
  }
}
