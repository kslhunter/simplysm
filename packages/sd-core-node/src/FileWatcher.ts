import * as fs from "fs-extra";
import {DateTime, ObjectUtil, Wait} from "@simplysm/sd-core-common";
import * as path from "path";
import anymatch from "anymatch";

export class FileWatcher {
  private constructor(private readonly _watchers: fs.FSWatcher[]) {
  }

  public close(): void {
    for (const watcher of this._watchers) {
      watcher.close();
    }
  }

  public static async watch(paths: string | string[],
                            callback: (changedInfos: IFileChangeInfo[]) => void | Promise<void>,
                            errorCallback: (err: Error) => void,
                            options?: { aggregateTimeout?: number }): Promise<FileWatcher> {

    let preservedFileChanges: IFileChangeInfo[] = [];
    let timeout: NodeJS.Timer;
    let processing = false;

    const onWatched = async (type: "add" | "change" | "unlink", filePath: string) => {
      preservedFileChanges.push({type, filePath});
      await Wait.true(() => !processing);

      clearTimeout(timeout);
      timeout = setTimeout(
        async () => {
          processing = true;

          const fileChanges = ObjectUtil.clone(preservedFileChanges.distinct());
          preservedFileChanges = [];

          await callback(fileChanges);

          processing = false;
        },
        options?.aggregateTimeout ?? 100
      );
    };

    return await new Promise<FileWatcher>((resolve, reject) => {
      const watchPaths = typeof paths === "string" ? [paths] : paths;

      const watchers = [];
      for (const watchPath of watchPaths) {
        let currWatchPath = watchPath;
        if (watchPath.includes("*")) {
          currWatchPath = watchPath.slice(0, watchPath.indexOf("*"));
        }

        const watcher = fs.watch(
          currWatchPath,
          {recursive: watchPath.includes("**")},
          async (event, filename) => {
            const fullPath = path.resolve(currWatchPath, filename);
            if (watchPath.includes("*")) {
              if (
                !anymatch(
                  watchPath.replace(/\\/g, "/"),
                  fullPath.replace(/\\/g, "/")
                )
              ) {
                return;
              }
            }
            else {
              if (watchPath.replace(/\\/g, "/") !== fullPath.replace(/\\/g, "/")) {
                return;
              }
            }

            let eventType: "add" | "change" | "unlink";
            if (!fs.pathExistsSync(fullPath)) {
              eventType = "unlink";
            }
            else if (fs.statSync(fullPath).birthtime.getTime() >= (new DateTime().tick - 300)) {
              eventType = "add";
            }
            else {
              eventType = "change";
            }

            try {
              await onWatched(eventType, fullPath);
            }
            catch (err) {
              errorCallback(err);
            }
          }
        ).on("error", (err) => {
          reject(err);
        });

        watchers.push(watcher);
      }

      resolve(new FileWatcher(watchers));
    });
  }
}

export interface IFileChangeInfo {
  type: "add" | "change" | "unlink";
  filePath: string;
}