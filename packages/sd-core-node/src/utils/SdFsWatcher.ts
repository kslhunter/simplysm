import chokidar, { ChokidarOptions, FSWatcher } from "chokidar";
import { ObjectUtil } from "@simplysm/sd-core-common";

export class SdFsWatcher {
  public static watch(paths: string[], options?: ChokidarOptions): SdFsWatcher {
    return new SdFsWatcher(paths, options);
  }

  #watcher: FSWatcher;
  #watchPathSet: Set<string>;

  private constructor(paths: string[], options?: ChokidarOptions) {
    this.#watchPathSet = new Set<string>(paths);
    this.#watcher = chokidar.watch(Array.from(this.#watchPathSet.values()), ObjectUtil.merge({
      ignoreInitial: true,
      persistent: true
    }, options));
  }

  public onChange(opt: { delay?: number }, cb: (changeInfos: ISdFsWatcherChangeInfo[]) => void | Promise<void>): this {
    const changeInfoMap = new Map<string, TSdFsWatcherEvent>();
    this.#watcher
      .on("all", (event: TSdFsWatcherEvent, filePath: string) => {
        const prevEvent = changeInfoMap.getOrCreate(filePath, event);
        if (prevEvent === "add" && event === "change") {
          changeInfoMap.set(filePath, prevEvent);
        }
        else if (
          (prevEvent === "add" && event === "unlink") ||
          (prevEvent === "addDir" && event === "unlinkDir")
        ) {
          changeInfoMap.delete(filePath);
        }
        else {
          changeInfoMap.set(filePath, event);
        }

        setTimeout(async () => {
          if (changeInfoMap.size === 0) return;
          const changeInfos = Array.from(changeInfoMap.entries()).map((en) => ({
            event: en[1],
            path: en[0]
          }));
          changeInfoMap.clear();

          await cb(changeInfos);
        }, opt.delay ?? 500);
      });

    return this;
  }

  public add(pathSet: Set<string>): void {
    for (const path of pathSet) {
      if (this.#watchPathSet.has(path)) continue;
      this.#watchPathSet.add(path);
      this.#watcher.add(path);
    }

    for (const watchPath of this.#watchPathSet) {
      if (!pathSet.has(watchPath)) {
        this.#watchPathSet.delete(watchPath);
        this.#watcher.unwatch(watchPath);
      }
    }
  }

  public async closeAsync(): Promise<void> {
    await this.#watcher.close();
  }
}

export type TSdFsWatcherEvent = "change" | "unlink" | "add" | "unlinkDir" | "addDir";

export interface ISdFsWatcherChangeInfo {
  event: TSdFsWatcherEvent;
  path: string;
}
