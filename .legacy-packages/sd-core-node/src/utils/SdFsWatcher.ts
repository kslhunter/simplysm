import { SdAsyncFnDebounceQueue } from "@simplysm/sd-core-common";
import * as chokidar from "chokidar";
import type { TNormPath } from "./PathUtils";
import { PathUtils } from "./PathUtils";
import type { EventName } from "chokidar/handler.js";

export class SdFsWatcher {
  static async watchAsync(
    paths: string[],
    options?: chokidar.ChokidarOptions,
  ): Promise<SdFsWatcher> {
    return await new Promise<SdFsWatcher>((resolve) => {
      const watcher = new SdFsWatcher(paths, options);
      watcher._watcher.on("ready", () => {
        resolve(watcher);
        /*if (Object.keys(watcher.#watcher.getWatched()).length > 0) {
          resolve(watcher);
        }*/
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

  onChange(
    opt: { delay?: number },
    cb: (changeInfos: ISdFsWatcherChangeInfo[]) => void | Promise<void>,
  ): this {
    const fnQ = new SdAsyncFnDebounceQueue(opt.delay);

    let changeInfoMap = new Map<string, EventName>();

    if (!this._ignoreInitial) {
      fnQ.run(async () => {
        await cb([]);
      });
    }

    this._watcher.on("all", (event, filePath) => {
      if (!["add", "addDir", "change", "unlink", "unlinkDir"].includes(event)) return;

      const prevEvent = changeInfoMap.getOrCreate(filePath, event);
      if (prevEvent === "add" && event === "change") {
        changeInfoMap.set(filePath, "add");
      } else if (
        (prevEvent === "add" && event === "unlink") ||
        (prevEvent === "addDir" && event === "unlinkDir")
      ) {
        changeInfoMap.delete(filePath);
      } else {
        changeInfoMap.set(filePath, event);
      }

      fnQ.run(async () => {
        if (changeInfoMap.size === 0) return;
        const currChangeInfoMap = changeInfoMap;
        changeInfoMap = new Map<string, EventName>();

        const changeInfos = Array.from(currChangeInfoMap.entries()).map((en) => ({
          path: PathUtils.norm(en[0]),
          event: en[1],
        }));
        await cb(changeInfos as any);
      });
    });

    return this;
  }

  async close() {
    await this._watcher.close();
  }
}

export interface ISdFsWatcherChangeInfo {
  event: "add" | "addDir" | "change" | "unlink" | "unlinkDir";
  path: TNormPath;
}
