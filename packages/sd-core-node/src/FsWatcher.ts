import * as fs from "fs";
import {DateTime, NeverEntryError, ObjectUtils, Wait} from "@simplysm/sd-core-common";
import * as path from "path";
import anymatch from "anymatch";
import {FsUtils} from "./FsUtils";

export class FsWatcher {
  private readonly _depListenerObj: { [key: string]: ((curr: fs.Stats) => void) | undefined } = {};

  private constructor(private readonly _watchers: fs.FSWatcher[],
                      private readonly _onWatched: (type: "add" | "change" | "unlink", filePath: string) => Promise<void>) {
  }

  public close(): void {
    for (const watcher of this._watchers) {
      watcher.close();
    }
  }

  public static async watchAsync(paths: string | string[],
                                 callback: (changedInfos: IFileChangeInfo[]) => void | Promise<void>,
                                 errorCallback: (err: Error) => void,
                                 options?: { aggregateTimeout?: number }): Promise<FsWatcher> {
    let preservedFileChanges: IFileChangeInfo[] = [];
    let timeout: NodeJS.Timer;
    let processing = false;

    const onWatched = async (type: "add" | "change" | "unlink", filePath: string): Promise<void> => {
      preservedFileChanges.push({type, filePath});
      await Wait.true(() => !processing);

      clearTimeout(timeout);
      timeout = setTimeout(
        async () => {
          try {
            processing = true;

            const fileChanges = ObjectUtils.clone(preservedFileChanges.distinct());
            preservedFileChanges = [];

            await callback(fileChanges);

            processing = false;
          }
          catch (err) {
            if (!(err instanceof Error)) {
              throw new NeverEntryError();
            }

            errorCallback(err);
          }
        },
        options?.aggregateTimeout ?? 100
      );
    };

    return await new Promise<FsWatcher>((resolve, reject) => {
      const watchPaths = typeof paths === "string" ? [paths] : paths;

      const watchers = [];
      for (const watchPath of watchPaths) {
        let currWatchPath = watchPath;
        if (watchPath.includes("*")) {
          currWatchPath = watchPath.slice(0, watchPath.indexOf("*"));
        }

        while (!FsUtils.exists(currWatchPath)) {
          currWatchPath = path.dirname(currWatchPath);
        }

        const watcher = fs.watch(
          currWatchPath,
          {recursive: watchPath !== currWatchPath},
          async (event, filename: string | null) => {
            if (filename == null) return;

            try {
              const fullPath = currWatchPath !== watchPath ?
                path.resolve(currWatchPath, filename) :
                currWatchPath;

              if (
                watchPath.replace(/\\/g, "/") !== fullPath.replace(/\\/g, "/") &&
                !anymatch(watchPath.replace(/\\/g, "/"), fullPath.replace(/\\/g, "/"))
              ) {
                return;
              }

              let eventType: "add" | "change" | "unlink";
              if (!fs.existsSync(fullPath)) {
                eventType = "unlink";
              }
              else if (fs.statSync(fullPath).birthtime.getTime() >= (new DateTime().tick - 300)) {
                eventType = "add";
              }
              else {
                eventType = "change";
              }

              await onWatched(eventType, fullPath);
            }
            catch (err) {
              if (!(err instanceof Error)) {
                throw new NeverEntryError();
              }

              err.message = `[${event}, ${filename}] ${err.message}`;
              err.stack = `[${event}, ${filename}]${err.stack !== undefined ? " " + err.stack : ""}`;
              errorCallback(err);
            }
          }
        ).on("error", err => {
          reject(err);
        });

        watchers.push(watcher);
      }

      resolve(new FsWatcher(watchers, onWatched));
    });
  }

  public add(filePaths: string[]): void {
    for (const filePath of filePaths) {
      if (this._depListenerObj[filePath]) continue;

      const listener = async (curr: fs.Stats): Promise<void> => {
        let eventType: "add" | "change" | "unlink";
        if (!fs.existsSync(filePath)) {
          eventType = "unlink";
        }
        else if (curr.birthtime.getTime() >= (new DateTime().tick - 300)) {
          eventType = "add";
        }
        else {
          eventType = "change";
        }

        await this._onWatched(eventType, filePath);
      };

      fs.watchFile(filePath, {interval: 100}, listener);
      this._depListenerObj[filePath] = listener;
    }
  }
}

export interface IFileChangeInfo {
  type: "add" | "change" | "unlink";
  filePath: string;
}
