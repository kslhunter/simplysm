import chokidar, { ChokidarOptions, FSWatcher } from "chokidar";
import { FunctionQueue, ObjectUtil } from "@simplysm/sd-core-common";

export class SdFsWatcher {
  public static watch(paths: string[], options?: ChokidarOptions): SdFsWatcher {
    return new SdFsWatcher(paths, options);
  }

  #watcher: FSWatcher;
  #watchPathSet: Set<string>;

  private constructor(paths: string[], options?: ChokidarOptions) {
    this.#watchPathSet = new Set<string>(paths);
    this.#watcher = chokidar.watch(
      Array.from(this.#watchPathSet.values()),
      ObjectUtil.merge(
        {
          ignoreInitial: true,
          persistent: true /*,
          awaitWriteFinish: {
            stabilityThreshold: 500,
            pollInterval: 200,
          },
          atomic: true,*/,
        },
        options,
      ),
    );
  }

  onChange(opt: { delay?: number }, cb: (changeInfos: ISdFsWatcherChangeInfo[]) => void | Promise<void>): this {
    const fnQ = new FunctionQueue();

    let changeInfoMap = new Map<string, TSdFsWatcherEvent>();

    this.#watcher.on("all", (event: TSdFsWatcherEvent, filePath: string) => {
      const prevEvent = changeInfoMap.getOrCreate(filePath, event);
      if (prevEvent === "add" && event === "change") {
        changeInfoMap.set(filePath, "add");
      } else if ((prevEvent === "add" && event === "unlink") || (prevEvent === "addDir" && event === "unlinkDir")) {
        changeInfoMap.delete(filePath);
      } else {
        changeInfoMap.set(filePath, event);
      }

      setTimeout(() => {
        fnQ.runLast(async () => {
          if (changeInfoMap.size === 0) return;
          const currentChangeInfoMap = changeInfoMap;
          changeInfoMap = new Map<string, TSdFsWatcherEvent>();

          const changeInfos = Array.from(currentChangeInfoMap.entries()).map((en) => ({
            path: en[0],
            event: en[1],
          }));
          await cb(changeInfos);
        });
      }, opt.delay);
    });

    return this;
  }

  replaceWatchPaths(pathSet: Set<string>): void {
    this.#watcher.unwatch(Array.from(pathSet));
    this.#watcher.add(Array.from(this.#watchPathSet.values()));

    this.#watchPathSet = new Set<string>(pathSet);
  }

  async closeAsync(): Promise<void> {
    await this.#watcher.close();
  }
}

export type TSdFsWatcherEvent = "change" | "unlink" | "add" | "unlinkDir" | "addDir";

export interface ISdFsWatcherChangeInfo {
  event: TSdFsWatcherEvent;
  path: string;
}
