import { AsyncFnQueue } from "@simplysm/sd-core-common";
import Watcher from "watcher";
import { PathUtils, TNormPath } from "./path.utils";
import { WatcherOptions } from "watcher/dist/types";

export class SdFsWatcher {
  static watch(paths: string[], options?: WatcherOptions): SdFsWatcher {
    return new SdFsWatcher(paths, options);
  }

  private _watcher: Watcher;
  private _watchPathSet: Set<string>;

  private constructor(paths: string[], options?: WatcherOptions) {
    this._watchPathSet = new Set<string>(paths);
    this._watcher = new Watcher(Array.from(this._watchPathSet.values()), {
      recursive: true,
      ignoreInitial: true,
      persistent: true,
      ...options,
    });
  }

  onChange(
    opt: { delay?: number },
    cb: (changeInfos: ISdFsWatcherChangeInfo[]) => void | Promise<void>,
  ): this {
    const fnQ = new AsyncFnQueue();

    let changeInfoMap = new Map<string, TTargetEvent>();

    this._watcher.on("all", (event: TTargetEvent, filePath: string) => {
      const prevEvent = changeInfoMap.getOrCreate(filePath, event);
      if (prevEvent === "add" && event === "change") {
        changeInfoMap.set(filePath, "add" as TTargetEvent);
      }
      else if ((prevEvent === "add" && event === "unlink") || (prevEvent
        === "addDir"
        && event
        === "unlinkDir")) {
        changeInfoMap.delete(filePath);
      }
      else {
        changeInfoMap.set(filePath, event);
      }

      setTimeout(() => {
        fnQ.runLast(async () => {
          if (changeInfoMap.size === 0) return;
          const currentChangeInfoMap = changeInfoMap;
          changeInfoMap = new Map<string, TTargetEvent>();

          const changeInfos = Array.from(currentChangeInfoMap.entries()).map((en) => ({
            path: PathUtils.norm(en[0]),
            event: en[1],
          }));
          await cb(changeInfos);
        });
      }, opt.delay);
    });

    return this;
  }

  close() {
    this._watcher.close();
  }
}

export interface ISdFsWatcherChangeInfo {
  event: TTargetEvent;
  path: TNormPath;
}

type TTargetEvent = "add" | "addDir" | "change" | "rename" | "renameDir" | "unlink" | "unlinkDir";
