import chokidar from "chokidar";
import {ObjectUtil} from "@simplysm/sd-core-common";

export class SdFsWatcher {
  public static watch(paths: string[], options?: chokidar.WatchOptions): SdFsWatcher {
    return new SdFsWatcher(paths, options);
  }

  private readonly _watcher: chokidar.FSWatcher;
  private readonly _watchPathSet: Set<string>;

  private constructor(paths: string[], options?: chokidar.WatchOptions) {
    this._watchPathSet = new Set<string>(paths);
    this._watcher = chokidar.watch(Array.from(this._watchPathSet.values()), ObjectUtil.merge({
      ignoreInitial: true,
      persistent: true
    }, options));
  }

  public onChange(opt: { delay?: number }, cb: (changeInfos: ISdFsWatcherChangeInfo[]) => void | Promise<void>): this {
    const changeInfoMap = new Map<string, TSdFsWatcherEvent>();
    this._watcher
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

  public add(paths: string[]): void {
    const pathSet = new Set<string>(paths);

    for (const path of pathSet) {
      if (this._watchPathSet.has(path)) continue;
      this._watchPathSet.add(path);
      this._watcher.add(path);
    }

    for (const watchPath of this._watchPathSet) {
      if(!pathSet.has(watchPath)){
        this._watchPathSet.delete(watchPath);
        this._watcher.unwatch(watchPath);
      }
    }
  }

  public async closeAsync(): Promise<void> {
    await this._watcher.close();
  }
}

export type TSdFsWatcherEvent = "change" | "unlink" | "add" | "unlinkDir" | "addDir";

export interface ISdFsWatcherChangeInfo {
  event: TSdFsWatcherEvent;
  path: string;
}
