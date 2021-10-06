import * as fs from "fs";
import * as path from "path";
import { FunctionQueue } from "@simplysm/sd-core-common";
import { PathUtil } from "./PathUtil";

export class SdFsWatcher {
  private readonly _watcherMap = new Map<string, fs.FSWatcher>();
  private readonly _fnQueue = new FunctionQueue();
  private _remainedFnCount = 0;

  private _changedInfos: { event: fs.WatchEventType; filePath: string }[] = [];

  private readonly _listeners: ((changedInfos: { event: fs.WatchEventType; filePath: string }[]) => void | Promise<void>)[] = [];

  public onChange(callback: (changedInfos: { event: fs.WatchEventType; filePath: string }[]) => void | Promise<void>): this {
    this._listeners.push(callback);
    return this;
  }

  public watch(paths: string[]): void {
    const watchPaths = paths.map((item) => PathUtil.posix(item)).distinct();
    for (const watchPath of watchPaths) {
      const watcher = fs.watch(
        watchPath,
        (event, filename) => {
          this._remainedFnCount++;
          this._changedInfos.push({ event, filePath: path.resolve(watchPath, filename) });

          setTimeout(() => {
            this._fnQueue.run(async () => {
              this._remainedFnCount--;
              if (this._remainedFnCount !== 0) return;

              await this._listeners.parallelAsync(async (listener) => {
                await listener(this._changedInfos.distinct());
              });
              this._changedInfos = [];
            });
          }, 300);
        }
      ).on("error", (err) => {
        if (err["code"] === "EPERM") {
          watcher.close();
          this._watcherMap.delete(watchPath);
        }
        else {
          throw err;
        }
      });
      this._watcherMap.set(watchPath, watcher);
    }
  }

  public replaceWatchPaths(paths: string[]): void {
    const watchPaths = paths.map((item) => PathUtil.posix(item)).distinct();
    const prevWatchPaths = Array.from(this._watcherMap.keys());

    const createdWatchPaths: string[] = [];

    const diffs = prevWatchPaths.diffs(watchPaths);
    for (const diff of diffs) {
      if (diff.source !== undefined && diff.target !== undefined) {
      }
      else if (diff.source !== undefined) {
        const prevWatcher = this._watcherMap.get(diff.source)!;
        prevWatcher.close();
        this._watcherMap.delete(diff.source);
      }
      else {
        createdWatchPaths.push(diff.target);
      }
    }

    this.watch(createdWatchPaths);
  }
}
