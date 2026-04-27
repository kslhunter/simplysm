import { DebounceQueue } from "@simplysm/core-common";
import * as chokidar from "chokidar";
import consola from "consola";
import type { EventName } from "chokidar/handler.js";
import { Minimatch } from "minimatch";
import * as nodeFs from "node:fs";
import path from "path";
import { type PosixPath, posix } from "../utils/path";

//#region Native FSWatcher error guard

/*
 * Windows에서 watched 디렉토리가 사라지면 Node 내부 `_handle.onchange`가
 * EPERM을 emit하는데, race window(close 진행 중 등)에서 리스너가 없는 인스턴스가
 * 발견되면 EventEmitter의 기본 동작에 의해 `uncaughtException`으로 throw되어
 * 프로세스가 즉시 종료된다. prototype의 emit를 감싸서 orphan 'error'를 swallow한다.
 */
interface FsWatcherInstance {
  listenerCount: (event: string) => number;
  emit: (event: string, ...args: unknown[]) => boolean;
  [k: symbol]: unknown;
}
const FSW_CTOR = (nodeFs as unknown as { FSWatcher?: { prototype: FsWatcherInstance } }).FSWatcher;
const FSW_PROTO = FSW_CTOR?.prototype;
const FSW_GUARD_FLAG = Symbol.for("@simplysm/core-node/fs-watcher/error-guard");
if (FSW_PROTO != null && FSW_PROTO[FSW_GUARD_FLAG] !== true) {
  const origEmit = FSW_PROTO.emit;
  FSW_PROTO.emit = function patchedFsWatcherEmit(
    this: FsWatcherInstance,
    event: string,
    ...args: unknown[]
  ): boolean {
    if (event === "error" && this.listenerCount("error") === 0) {
      // chokidar/sd-fs-watcher가 error를 라우팅하기 전에 close된 native handle 등에서
      // 발생하는 orphan error. 무시하지 않으면 프로세스가 종료된다.
      return false;
    }
    return origEmit.call(this, event, ...args);
  };
  FSW_PROTO[FSW_GUARD_FLAG] = true;
}

//#endregion

//#region Helpers

/** Glob 메타문자 패턴 */
const GLOB_CHARS_RE = /[*?{[\]]/;

/**
 * Glob 패턴에서 기본 디렉토리를 추출한다.
 * @example extractGlobBase("/home/user/src/**\/*.ts") → "/home/user/src"
 */
function extractGlobBase(globPath: string): string {
  const segments = globPath.split(/[/\\]/);
  const baseSegments: string[] = [];
  for (const seg of segments) {
    if (GLOB_CHARS_RE.test(seg)) break;
    baseSegments.push(seg);
  }
  return baseSegments.join(path.sep) || path.sep;
}

//#endregion

//#region Types

/**
 * 지원되는 파일 변경 이벤트 타입 목록.
 */
const FS_WATCHER_EVENTS = ["add", "addDir", "change", "unlink", "unlinkDir"] as const;

/**
 * 파일 변경 이벤트 타입.
 */
export type FsWatcherEvent = (typeof FS_WATCHER_EVENTS)[number];

/**
 * 파일 변경 정보.
 */
export interface FsWatcherChangeInfo {
  /** 변경 이벤트 타입 */
  event: FsWatcherEvent;
  /** 변경된 파일/디렉토리 경로 (정규화됨) */
  path: PosixPath;
}

//#endregion

//#region FsWatcher

/**
 * Chokidar 기반 파일 시스템 감시 래퍼.
 * 짧은 시간 내에 발생하는 이벤트를 병합하여 콜백을 한 번만 호출한다.
 *
 * **주의**: chokidar의 `ignoreInitial` 옵션은 내부적으로 항상 `true`로 설정된다.
 * `options.ignoreInitial: false`를 전달하면 첫 번째 `onChange` 호출 시 빈 배열로 콜백이 호출되지만,
 * 실제 초기 파일 목록은 포함되지 않는다.
 * 이는 이벤트 병합 로직과의 충돌을 방지하기 위한 의도적인 동작이다.
 *
 * @example
 * const watcher = await FsWatcher.watch(["src/**\/*.ts"]);
 * watcher.onChange({ delay: 300 }, (changes) => {
 *   for (const { path, event } of changes) {
 *     console.log(`${event}: ${path}`);
 *   }
 * });
 *
 * // 종료
 * await watcher.close();
 */
export class FsWatcher {
  private static readonly _MAX_RETRIES = 3;
  private static readonly _RETRY_DELAY_MS = 1000;

  /**
   * 파일 감시를 시작한다 (비동기).
   * ready 이벤트가 발생할 때까지 대기한다.
   *
   * @param paths - 감시할 파일/디렉토리 경로 또는 glob 패턴 배열
   * @param options - chokidar 옵션
   */
  static async watch(paths: string[], options?: chokidar.ChokidarOptions): Promise<FsWatcher> {
    return new Promise<FsWatcher>((resolve, reject) => {
      const watcher = new FsWatcher(paths, options);

      const onReady = () => {
        watcher._watcher.removeListener("error", onError);
        resolve(watcher);
      };
      const onError = (err: unknown) => {
        watcher._watcher.removeListener("ready", onReady);
        watcher.close().then(
          () => reject(err),
          () => reject(err),
        );
      };

      watcher._watcher.once("ready", onReady);
      watcher._watcher.once("error", onError);
    });
  }

  private _watcher: chokidar.FSWatcher;
  private readonly _paths: string[];
  private readonly _options: chokidar.ChokidarOptions;
  private readonly _ignoreInitial: boolean = true;
  private readonly _debounceQueues: DebounceQueue[] = [];
  private readonly _globMatchers: Minimatch[] = [];
  private readonly _allHandlers: Array<(event: string, path: string) => void> = [];
  private readonly _creationStack: string;
  private _retryCount = 0;
  private _isRecovering = false;

  private readonly _logger = consola.withTag("sd-fs-watcher");

  private constructor(paths: string[], options?: chokidar.ChokidarOptions) {
    // 생성 시점의 스택트레이스를 저장 (에러 발생 시 호출부 추적용)
    this._creationStack = new Error().stack ?? "";
    this._paths = [...paths];
    this._options = { ...options };

    this._watcher = this._buildChokidarWatcher();
    this._ignoreInitial = options?.ignoreInitial ?? this._ignoreInitial;

    this._setupErrorHandler();
  }

  /**
   * 저장된 paths와 options로 chokidar watcher를 생성한다.
   * glob 패턴에서 base 디렉토리를 추출하고 globMatchers를 재구성한다.
   */
  private _buildChokidarWatcher(): chokidar.FSWatcher {
    const watchPaths: string[] = [];
    this._globMatchers.length = 0;

    for (const p of this._paths) {
      const posixPath = posix(p);
      this._globMatchers.push(new Minimatch(posixPath, { dot: true }));
      if (GLOB_CHARS_RE.test(posixPath)) {
        watchPaths.push(extractGlobBase(p));
      } else {
        watchPaths.push(p);
      }
    }

    // 중복 경로 제거
    const uniquePaths = [...new Set(watchPaths)];

    return chokidar.watch(uniquePaths, {
      persistent: true,
      ...this._options,
      ignoreInitial: true,
    });
  }

  /**
   * chokidar watcher에 에러 핸들러를 등록한다.
   * EPERM 에러 감지 시 자동 복구를 시도한다.
   */
  private _setupErrorHandler(): void {
    this._watcher.on("error", (err) => {
      const errDetail = err instanceof Error ? (err.stack ?? err.message) : String(err);
      this._logger.error(
        `FsWatcher 오류: ${errDetail}\n---- creation stack ----\n${this._creationStack}`,
      );

      if (
        err instanceof Error &&
        "code" in err &&
        (err as NodeJS.ErrnoException).code === "EPERM" &&
        !this._isRecovering
      ) {
        void this._handleEperm();
      }
    });
  }

  /**
   * EPERM 에러 발생 시 watcher를 재생성한다.
   * 최대 _MAX_RETRIES회까지 _RETRY_DELAY_MS 간격으로 재시도한다.
   * 성공 시 재시도 카운터를 초기화한다.
   */
  private async _handleEperm(): Promise<void> {
    if (this._isRecovering) return;
    this._isRecovering = true;

    while (this._retryCount < FsWatcher._MAX_RETRIES) {
      this._retryCount++;
      this._logger.warn(
        `EPERM 감지 — ${this._retryCount}/${FsWatcher._MAX_RETRIES} watcher 재시작 시도...`,
      );

      try {
        try {
          await this._watcher.close();
        } catch {
          // close 실패 무시
        }

        await new Promise((resolve) => setTimeout(resolve, FsWatcher._RETRY_DELAY_MS));

        this._watcher = this._buildChokidarWatcher();
        this._setupErrorHandler();

        for (const handler of this._allHandlers) {
          this._watcher.on("all", handler);
        }

        await new Promise<void>((resolve, reject) => {
          const onReady = () => {
            this._watcher.removeListener("error", onError);
            resolve();
          };
          const onError = (e: unknown) => {
            this._watcher.removeListener("ready", onReady);
            reject(e);
          };
          this._watcher.once("ready", onReady);
          this._watcher.once("error", onError);
        });

        // 성공 — 카운터 초기화 후 복구 완료
        this._retryCount = 0;
        this._isRecovering = false;
        this._logger.success("watcher 재시작 완료");
        return;
      } catch (err) {
        const errDetail = err instanceof Error ? err.message : String(err);
        this._logger.error(
          `watcher 재시작 실패 (${this._retryCount}/${FsWatcher._MAX_RETRIES}): ${errDetail}`,
        );
      }
    }

    this._logger.error(
      `EPERM 재시도 최대 횟수(${FsWatcher._MAX_RETRIES}회) 초과 — 재시도 중단`,
    );
    this._isRecovering = false;
  }

  /**
   * 파일 변경 이벤트 핸들러를 등록한다.
   * 지정된 지연 시간 동안 이벤트를 수집하여 콜백을 한 번 호출한다.
   *
   * @param opt.delay - 이벤트 병합 대기 시간 (ms)
   * @param cb - 변경 이벤트 콜백
   */
  onChange(
    opt: { delay?: number },
    cb: (changeInfos: FsWatcherChangeInfo[]) => void | Promise<void>,
  ): this {
    const fnQ = new DebounceQueue(opt.delay);
    this._debounceQueues.push(fnQ);

    let changeInfoMap = new Map<string, EventName>();

    // ignoreInitial이 false이면 초기에 빈 배열로 콜백 호출
    if (!this._ignoreInitial) {
      fnQ.run(async () => {
        await cb([]);
      });
    }

    const handler = (event: string, filePath: string) => {
      // 지원되는 이벤트만 처리
      if (!FS_WATCHER_EVENTS.includes(event as FsWatcherEvent)) return;

      // glob matcher가 존재하면 패턴 필터링 적용
      if (this._globMatchers.length > 0) {
        const posixFilePath = posix(filePath);
        if (!this._globMatchers.some((m) => m.match(posixFilePath))) return;
      }

      /*
       * 이벤트 병합 전략:
       * 같은 파일에 대해 짧은 시간 내에 여러 이벤트가 발생하면, 최종 상태만 전달한다.
       * - add + change → add (생성 직후 수정은 생성으로 간주)
       * - add + unlink → 변경 없음 (생성 직후 삭제는 변경 없음으로 간주)
       * - unlink + add → add (삭제 후 재생성은 생성으로 간주)
       * - 그 외 → 최신 이벤트로 덮어쓰기
       */
      if (!changeInfoMap.has(filePath)) {
        changeInfoMap.set(filePath, event as EventName);
      }
      const prevEvent = changeInfoMap.get(filePath)!;

      if (prevEvent === "add" && event === "change") {
        // add 후 change → add 유지
        changeInfoMap.set(filePath, "add");
      } else if (
        (prevEvent === "add" && event === "unlink") ||
        (prevEvent === "addDir" && event === "unlinkDir")
      ) {
        // add 후 unlink → 변경 없음 (삭제)
        changeInfoMap.delete(filePath);
      } else if (prevEvent === "unlink" && event === "add") {
        // unlink 후 add → add (파일 재생성)
        changeInfoMap.set(filePath, "add");
      } else if (prevEvent === "unlink" && event === "change") {
        // unlink 후 change → change (이전 사이클에서 이미 존재하던 파일이 삭제 후 수정된 경우)
        changeInfoMap.set(filePath, "change");
      } else if (prevEvent === "unlinkDir" && event === "addDir") {
        // unlinkDir 후 addDir → addDir (디렉토리 재생성)
        changeInfoMap.set(filePath, "addDir");
      } else {
        changeInfoMap.set(filePath, event as EventName);
      }

      fnQ.run(async () => {
        if (changeInfoMap.size === 0) return;

        const currChangeInfoMap = changeInfoMap;
        changeInfoMap = new Map<string, EventName>();

        const changeInfos = Array.from(currChangeInfoMap.entries()).map(
          ([changedPath, evt]): FsWatcherChangeInfo => ({
            path: posix(changedPath),
            event: evt as FsWatcherEvent,
          }),
        );

        await cb(changeInfos);
      });
    };

    this._allHandlers.push(handler);
    this._watcher.on("all", handler);

    return this;
  }

  /**
   * 파일 감시자를 종료한다.
   */
  async close(): Promise<void> {
    for (const q of this._debounceQueues) {
      q.dispose();
    }
    this._debounceQueues.length = 0;
    await this._watcher.close();
  }
}

//#endregion
