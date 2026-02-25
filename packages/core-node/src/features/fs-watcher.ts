import { DebounceQueue } from "@simplysm/core-common";
import * as chokidar from "chokidar";
import consola from "consola";
import type { EventName } from "chokidar/handler.js";
import { Minimatch } from "minimatch";
import path from "path";
import { type NormPath, pathNorm } from "../utils/path";

//#region Helpers

/** Glob metacharacter pattern */
const GLOB_CHARS_RE = /[*?{[\]]/;

/**
 * Extracts the base directory from a glob pattern.
 * @example extractGlobBase("/home/user/src/**/*.ts") → "/home/user/src"
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
 * List of supported file change event types.
 */
const FS_WATCHER_EVENTS = ["add", "addDir", "change", "unlink", "unlinkDir"] as const;

/**
 * File change event type.
 */
export type FsWatcherEvent = (typeof FS_WATCHER_EVENTS)[number];

/**
 * File change information.
 */
export interface FsWatcherChangeInfo {
  /** Change event type */
  event: FsWatcherEvent;
  /** Changed file/directory path (normalized) */
  path: NormPath;
}

//#endregion

//#region FsWatcher

/**
 * Chokidar-based file system watcher wrapper.
 * Merges events that occur within a short time and calls the callback once.
 *
 * **Note**: The `ignoreInitial` option of chokidar is internally always set to `true`.
 * If you pass `options.ignoreInitial: false`, the callback will be called with an empty array on the first `onChange` call,
 * but the actual initial file list is not included.
 * This is intentional behavior to prevent conflicts with the event merging logic.
 *
 * @example
 * const watcher = await FsWatcher.watch(["src/**/*.ts"]);
 * watcher.onChange({ delay: 300 }, (changes) => {
 *   for (const { path, event } of changes) {
 *     console.log(`${event}: ${path}`);
 *   }
 * });
 *
 * // Close
 * await watcher.close();
 */
export class FsWatcher {
  /**
   * Starts watching files (asynchronous).
   * Waits until the ready event is emitted.
   *
   * @param paths - Array of file/directory paths or glob patterns to watch
   * @param options - chokidar options
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

    // Remove duplicate paths
    const uniquePaths = [...new Set(watchPaths)];

    this._watcher = chokidar.watch(uniquePaths, {
      persistent: true,
      ...options,
      ignoreInitial: true,
    });
    this._ignoreInitial = options?.ignoreInitial ?? this._ignoreInitial;

    // Log errors that occur during watching
    this._watcher.on("error", (err) => {
      this._logger.error("FsWatcher error:", err);
    });
  }

  /**
   * Registers a file change event handler.
   * Collects events for the specified delay time and calls the callback once.
   *
   * @param opt.delay - Event merge wait time (ms)
   * @param cb - Change event callback
   */
  onChange(
    opt: { delay?: number },
    cb: (changeInfos: FsWatcherChangeInfo[]) => void | Promise<void>,
  ): this {
    const fnQ = new DebounceQueue(opt.delay);
    this._debounceQueues.push(fnQ);

    let changeInfoMap = new Map<string, EventName>();

    // If ignoreInitial is false, call callback with empty array initially
    if (!this._ignoreInitial) {
      fnQ.run(async () => {
        await cb([]);
      });
    }

    this._watcher.on("all", (event, filePath) => {
      // Only process supported events
      if (!FS_WATCHER_EVENTS.includes(event as FsWatcherEvent)) return;

      // If glob matchers exist, apply pattern filtering
      if (this._globMatchers.length > 0) {
        const posixFilePath = filePath.replace(/\\/g, "/");
        if (!this._globMatchers.some((m) => m.match(posixFilePath))) return;
      }

      /*
       * Event merging strategy:
       * If multiple events occur for the same file within a short time, only the final state is passed.
       * - add + change → add (modification immediately after creation is considered as creation)
       * - add + unlink → no change (immediate deletion after creation is considered as no change)
       * - unlink + add → add (recreation after deletion is considered as creation)
       * - otherwise → overwrite with latest event
       */
      if (!changeInfoMap.has(filePath)) {
        changeInfoMap.set(filePath, event);
      }
      const prevEvent = changeInfoMap.get(filePath)!;

      if (prevEvent === "add" && event === "change") {
        // add followed by change → keep add
        changeInfoMap.set(filePath, "add");
      } else if (
        (prevEvent === "add" && event === "unlink") ||
        (prevEvent === "addDir" && event === "unlinkDir")
      ) {
        // add followed by unlink → no change (deletion)
        changeInfoMap.delete(filePath);
      } else if (prevEvent === "unlink" && (event === "add" || event === "change")) {
        // unlink followed by add/change → add (file recreation)
        changeInfoMap.set(filePath, "add");
      } else if (prevEvent === "unlinkDir" && event === "addDir") {
        // unlinkDir followed by addDir → addDir (directory recreation)
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
            path: pathNorm(changedPath),
            event: evt as FsWatcherEvent,
          }),
        );

        await cb(changeInfos);
      });
    });

    return this;
  }

  /**
   * Closes the file watcher.
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
