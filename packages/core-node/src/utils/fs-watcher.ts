import { DebounceQueue } from "@simplysm/core-common";
import * as chokidar from "chokidar";
import type { EventName } from "chokidar/handler.js";
import type { NormPath } from "./path";
import { PathUtils } from "./path";

//#region Types

/**
 * 지원하는 파일 변경 이벤트 타입 목록.
 */
const SD_FS_WATCHER_EVENTS = ["add", "addDir", "change", "unlink", "unlinkDir"] as const;

/**
 * 파일 변경 이벤트 타입.
 */
export type SdFsWatcherEvent = (typeof SD_FS_WATCHER_EVENTS)[number];

/**
 * 파일 변경 정보.
 */
export interface SdFsWatcherChangeInfo {
  /** 변경 이벤트 타입 */
  event: SdFsWatcherEvent;
  /** 변경된 파일/디렉토리 경로 (정규화됨) */
  path: NormPath;
}

//#endregion

//#region SdFsWatcher

/**
 * chokidar 기반 파일 시스템 감시 래퍼.
 * 짧은 시간 내 발생한 이벤트를 병합하여 콜백 호출.
 *
 * @example
 * const watcher = await SdFsWatcher.watchAsync(["src/**\/*.ts"]);
 * watcher.onChange({ delay: 300 }, (changes) => {
 *   for (const { path, event } of changes) {
 *     console.log(`${event}: ${path}`);
 *   }
 * });
 *
 * // 종료
 * await watcher.close();
 */
export class SdFsWatcher {
  /**
   * 파일 감시 시작 (비동기).
   * ready 이벤트가 발생할 때까지 대기.
   */
  static async watchAsync(
    paths: string[],
    options?: chokidar.ChokidarOptions,
  ): Promise<SdFsWatcher> {
    return new Promise<SdFsWatcher>((resolve) => {
      const watcher = new SdFsWatcher(paths, options);
      watcher._watcher.on("ready", () => {
        resolve(watcher);
      });
    });
  }

  private readonly _watcher: chokidar.FSWatcher;
  private readonly _ignoreInitial: boolean = true;

  private constructor(paths: string[], options?: chokidar.ChokidarOptions) {
    this._watcher = chokidar.watch(paths, {
      persistent: true,
      ...options,
      ignoreInitial: true,
    });
    this._ignoreInitial = options?.ignoreInitial ?? this._ignoreInitial;
  }

  /**
   * 파일 변경 이벤트 핸들러 등록.
   * 지정된 delay 시간 동안 이벤트를 모아서 한 번에 콜백 호출.
   *
   * @param opt.delay - 이벤트 병합 대기 시간 (ms)
   * @param cb - 변경 이벤트 콜백
   */
  onChange(
    opt: { delay?: number },
    cb: (changeInfos: SdFsWatcherChangeInfo[]) => void | Promise<void>,
  ): this {
    const fnQ = new DebounceQueue(opt.delay);

    let changeInfoMap = new Map<string, EventName>();

    // ignoreInitial이 false면 초기에 빈 배열로 콜백 호출
    if (!this._ignoreInitial) {
      fnQ.run(async () => {
        await cb([]);
      });
    }

    this._watcher.on("all", (event, filePath) => {
      // 지원하는 이벤트만 처리
      if (!SD_FS_WATCHER_EVENTS.includes(event as SdFsWatcherEvent)) return;

      // 이벤트 병합 로직
      const prevEvent = changeInfoMap.getOrCreate(filePath, event);

      if (prevEvent === "add" && event === "change") {
        // add 후 change → add 유지
        changeInfoMap.set(filePath, "add");
      } else if (
        (prevEvent === "add" && event === "unlink") ||
        (prevEvent === "addDir" && event === "unlinkDir")
      ) {
        // add 후 unlink → 변경 없음 (삭제)
        changeInfoMap.delete(filePath);
      } else {
        changeInfoMap.set(filePath, event);
      }

      fnQ.run(async () => {
        if (changeInfoMap.size === 0) return;

        const currChangeInfoMap = changeInfoMap;
        changeInfoMap = new Map<string, EventName>();

        const changeInfos = Array.from(currChangeInfoMap.entries()).map(
          ([path, evt]): SdFsWatcherChangeInfo => ({
            path: PathUtils.norm(path),
            event: evt as SdFsWatcherEvent,
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
    await this._watcher.close();
  }
}

//#endregion
