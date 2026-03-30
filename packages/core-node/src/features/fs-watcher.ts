import { DebounceQueue } from "@simplysm/core-common";
import * as chokidar from "chokidar";
import consola from "consola";
import type { EventName } from "chokidar/handler.js";
import { Minimatch } from "minimatch";
import path from "path";
import { type NormPath, norm } from "../utils/path";

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
  path: NormPath;
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

  private readonly _watcher: chokidar.FSWatcher;
  private readonly _ignoreInitial: boolean = true;
  private readonly _debounceQueues: DebounceQueue[] = [];
  private readonly _globMatchers: Minimatch[] = [];

  private readonly _logger = consola.withTag("sd-fs-watcher");

  private constructor(paths: string[], options?: chokidar.ChokidarOptions) {
    const watchPaths: string[] = [];

    for (const p of paths) {
      const posixPath = p.replace(/\\/g, "/");
      if (GLOB_CHARS_RE.test(posixPath)) {
        this._globMatchers.push(new Minimatch(posixPath, { dot: true }));
        watchPaths.push(extractGlobBase(p));
      } else {
        watchPaths.push(p);
      }
    }

    // 중복 경로 제거
    const uniquePaths = [...new Set(watchPaths)];

    this._watcher = chokidar.watch(uniquePaths, {
      persistent: true,
      ...options,
      ignoreInitial: true,
    });
    this._ignoreInitial = options?.ignoreInitial ?? this._ignoreInitial;

    // 감시 중 발생하는 오류를 로깅
    this._watcher.on("error", (err) => {
      this._logger.error("FsWatcher 오류:", err);
    });
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

    this._watcher.on("all", (event, filePath) => {
      // 지원되는 이벤트만 처리
      if (!FS_WATCHER_EVENTS.includes(event as FsWatcherEvent)) return;

      // glob matcher가 존재하면 패턴 필터링 적용
      if (this._globMatchers.length > 0) {
        const posixFilePath = filePath.replace(/\\/g, "/");
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
        changeInfoMap.set(filePath, event);
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
          ([changedPath, evt]): FsWatcherChangeInfo => ({
            path: norm(changedPath),
            event: evt as FsWatcherEvent,
          }),
        );

        await cb(changeInfos);
      });
    });

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
