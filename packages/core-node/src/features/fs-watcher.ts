import { DebounceQueue } from "@simplysm/core-common";
import * as chokidar from "chokidar";
import consola from "consola";
import type { EventName } from "chokidar/handler.js";
import { type NormPath, pathNorm } from "../utils/path";

//#region Types

/**
 * 지원하는 파일 변경 이벤트 타입 목록.
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
  path: NormPath;
}

//#endregion

//#region FsWatcher

/**
 * chokidar 기반 파일 시스템 감시 래퍼.
 * 짧은 시간 내 발생한 이벤트를 병합하여 콜백 호출.
 *
 * **주의**: chokidar의 `ignoreInitial` 옵션은 내부적으로 항상 `true`로 설정된다.
 * `options.ignoreInitial: false`를 전달하면 `onChange` 첫 호출 시 빈 배열로
 * 콜백이 호출되지만, 실제 초기 파일 목록은 포함되지 않는다.
 * 이는 이벤트 병합 로직과의 충돌을 방지하기 위한 의도된 동작이다.
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
  /**
   * 파일 감시 시작 (비동기).
   * ready 이벤트가 발생할 때까지 대기.
   *
   * @param paths - 감시할 파일/디렉토리 경로 또는 glob 패턴 배열
   * @param options - chokidar 옵션
   */
  static async watch(paths: string[], options?: chokidar.ChokidarOptions): Promise<FsWatcher> {
    return new Promise<FsWatcher>((resolve, reject) => {
      const watcher = new FsWatcher(paths, options);
      watcher._watcher.on("ready", () => {
        resolve(watcher);
      });
      watcher._watcher.on("error", reject);
    });
  }

  private readonly _watcher: chokidar.FSWatcher;
  private readonly _ignoreInitial: boolean = true;
  private readonly _debounceQueues: DebounceQueue[] = [];

  private readonly _logger = consola.withTag("sd-fs-watcher");

  private constructor(paths: string[], options?: chokidar.ChokidarOptions) {
    this._watcher = chokidar.watch(paths, {
      persistent: true,
      ...options,
      ignoreInitial: true,
    });
    this._ignoreInitial = options?.ignoreInitial ?? this._ignoreInitial;

    // 감시 중 발생하는 에러 로깅
    this._watcher.on("error", (err) => {
      this._logger.error("FsWatcher error:", err);
    });
  }

  /**
   * 파일 변경 이벤트 핸들러 등록.
   * 지정된 delay 시간 동안 이벤트를 모아서 한 번에 콜백 호출.
   *
   * @param opt.delay - 이벤트 병합 대기 시간 (ms)
   * @param cb - 변경 이벤트 콜백
   */
  onChange(opt: { delay?: number }, cb: (changeInfos: FsWatcherChangeInfo[]) => void | Promise<void>): this {
    const fnQ = new DebounceQueue(opt.delay);
    this._debounceQueues.push(fnQ);

    let changeInfoMap = new Map<string, EventName>();

    // ignoreInitial이 false면 초기에 빈 배열로 콜백 호출
    if (!this._ignoreInitial) {
      fnQ.run(async () => {
        await cb([]);
      });
    }

    this._watcher.on("all", (event, filePath) => {
      // 지원하는 이벤트만 처리
      if (!FS_WATCHER_EVENTS.includes(event as FsWatcherEvent)) return;

      /*
       * 이벤트 병합 전략:
       * 짧은 시간 내 같은 파일에 대해 여러 이벤트가 발생하면 최종 상태만 전달한다.
       * - add + change → add (생성 직후 수정은 생성으로 간주)
       * - add + unlink → 삭제 (생성 후 즉시 삭제는 변경 없음)
       * - unlink + add → add (삭제 후 재생성은 생성으로 간주)
       * - 그 외 → 최신 이벤트로 덮어씀
       */
      if (!changeInfoMap.has(filePath)) {
        changeInfoMap.set(filePath, event);
      }
      const prevEvent = changeInfoMap.get(filePath)!;

      if (prevEvent === "add" && event === "change") {
        // add 후 change → add 유지
        changeInfoMap.set(filePath, "add");
      } else if ((prevEvent === "add" && event === "unlink") || (prevEvent === "addDir" && event === "unlinkDir")) {
        // add 후 unlink → 변경 없음 (삭제)
        changeInfoMap.delete(filePath);
      } else if (prevEvent === "unlink" && (event === "add" || event === "change")) {
        // unlink 후 add/change → add (파일 재생성)
        changeInfoMap.set(filePath, "add");
      } else if (prevEvent === "unlinkDir" && event === "addDir") {
        // unlinkDir 후 addDir → addDir (디렉토리 재생성)
        changeInfoMap.set(filePath, "addDir");
      } else {
        changeInfoMap.set(filePath, event);
      }

      fnQ.run(async () => {
        if (changeInfoMap.size === 0) return;

        const currChangeInfoMap = changeInfoMap;
        changeInfoMap = new Map<string, EventName>();

        const changeInfos = Array.from(currChangeInfoMap.entries()).map(
          ([path, evt]): FsWatcherChangeInfo => ({
            path: pathNorm(path),
            event: evt as FsWatcherEvent,
          }),
        );

        await cb(changeInfos);
      });
    });

    return this;
  }

  /**
   * 파일 감시 종료.
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
