import chokidar from "chokidar";
import {ObjectUtil} from "@simplysm/sd-core-common";

export class SdFsWatcher {
  private readonly _watcher: chokidar.FSWatcher;

  private constructor(paths: string[], options?: chokidar.WatchOptions) {
    this._watcher = chokidar.watch(paths, ObjectUtil.merge({ignoreInitial: true, persistent: true}, options));
  }

  public static watch(paths: string[], options?: chokidar.WatchOptions): SdFsWatcher {
    return new SdFsWatcher(paths, options);
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
    this._watcher.add(paths);
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
