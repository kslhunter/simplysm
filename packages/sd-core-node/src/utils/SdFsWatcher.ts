import chokidar from "chokidar";
import { ObjectUtil } from "@simplysm/sd-core-common";

export class SdFsWatcher {
  private readonly _watcher: chokidar.FSWatcher;

  private constructor(paths: string[], options?: chokidar.WatchOptions) {
    this._watcher = chokidar.watch(paths, ObjectUtil.merge(options, { ignoreInitial: true, persistent: true }));
  }

  public static watch(paths: string[]): SdFsWatcher {
    return new SdFsWatcher(paths);
  }

  public onChange(opt: { delay?: number }, cb: (changeInfos: ISdFsWatcherChangeInfo[]) => void | Promise<void>): void {
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
