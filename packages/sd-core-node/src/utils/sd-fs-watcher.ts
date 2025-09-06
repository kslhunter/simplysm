import { AsyncFnQueue } from "@simplysm/sd-core-common";
import * as chokidar from "chokidar";
import { PathUtils, TNormPath } from "./path.utils";
import { EventName } from "chokidar/handler";

export class SdFsWatcher {
  static async watchAsync(
    paths: string[],
    options?: chokidar.ChokidarOptions,
  ): Promise<SdFsWatcher> {
    return await new Promise<SdFsWatcher>((resolve) => {
      const watcher = new SdFsWatcher(paths, options);
      watcher.#watcher.on("ready", () => {
        if (Object.keys(watcher.#watcher.getWatched()).length > 0) {
          resolve(watcher);
        }
      });
    });
  }

  #watcher: chokidar.FSWatcher;
  #ignoreInitial = true;

  private constructor(paths: string[], options?: chokidar.ChokidarOptions) {
    this.#watcher = chokidar.watch(paths, {
      persistent: true,
      ...options,
      ignoreInitial: true,
    });
    this.#ignoreInitial = options?.ignoreInitial ?? this.#ignoreInitial;
  }

  onChange(
    opt: { delay?: number },
    cb: (changeInfos: ISdFsWatcherChangeInfo[]) => void | Promise<void>,
  ): this {
    const fnQ = new AsyncFnQueue();

    let changeInfoMap = new Map<string, EventName>();

    if (!this.#ignoreInitial) {
      fnQ.runLast(async () => {
        await cb([]);
      });
    }

    this.#watcher.on("all", (event, filePath) => {
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

      setTimeout(() => {
        fnQ.runLast(async () => {
          if (changeInfoMap.size === 0) return;
          const currChangeInfoMap = changeInfoMap;
          changeInfoMap = new Map<string, EventName>();

          const changeInfos = Array.from(currChangeInfoMap.entries()).map((en) => ({
            path: PathUtils.norm(en[0]),
            event: en[1],
          }));
          await cb(changeInfos as any);
        });
      }, opt.delay);
    });

    return this;
  }

  async close() {
    await this.#watcher.close();
  }
}

export interface ISdFsWatcherChangeInfo {
  event: "add" | "addDir" | "change" | "unlink" | "unlinkDir";
  path: TNormPath;
}
