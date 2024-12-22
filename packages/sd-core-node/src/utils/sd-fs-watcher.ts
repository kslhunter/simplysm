import { AsyncFnQueue } from "@simplysm/sd-core-common";
import Watcher from "watcher";
import type { WatcherOptions } from "watcher/dist/types";
import { PathUtils, type TNormPath } from "./path.utils";

export class SdFsWatcher {
  public static watch(paths: string[], options?: WatcherOptions): SdFsWatcher {
    return new SdFsWatcher(paths, options);
  }

  #watcher: Watcher;
  #watchPathSet: Set<string>;

  private constructor(paths: string[], options?: WatcherOptions) {
    this.#watchPathSet = new Set<string>(paths);
    this.#watcher = new Watcher(Array.from(this.#watchPathSet.values()), {
      recursive: true,
      ignoreInitial: true,
      persistent: true,
      ...options,
    });
  }

  onChange(opt: { delay?: number }, cb: (changeInfos: ISdFsWatcherChangeInfo[]) => void | Promise<void>): this {
    const fnQ = new AsyncFnQueue();

    let changeInfoMap = new Map<string, TTargetEvent>();

    this.#watcher.on("all", (event: TTargetEvent, filePath: string) => {
      const prevEvent = changeInfoMap.getOrCreate(filePath, event);
      if (prevEvent === "add" && event === "change") {
        changeInfoMap.set(filePath, "add" as TTargetEvent);
      } else if ((prevEvent === "add" && event === "unlink") || (prevEvent === "addDir" && event === "unlinkDir")) {
        changeInfoMap.delete(filePath);
      } else {
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
    this.#watcher.close();
  }
}

export interface ISdFsWatcherChangeInfo {
  event: TTargetEvent;
  path: TNormPath;
}

type TTargetEvent = "add" | "addDir" | "change" | "rename" | "renameDir" | "unlink" | "unlinkDir";
