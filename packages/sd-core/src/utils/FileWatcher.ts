import * as chokidar from "chokidar";
import {Logger} from "./Logger";
import * as path from "path";

export class FileWatcher {
  public static async watch(paths: string | string[], sits: FileChangeInfoType[], callback: (changedFiles: IFileChangeInfo[]) => (void | Promise<void>), millisecond?: number): Promise<chokidar.FSWatcher> {
    return await new Promise<chokidar.FSWatcher>((resolve, reject) => {
      const watcher = chokidar.watch((typeof paths === "string" ? [paths] : paths).map(item => item.replace(/\\/g, "/")).distinct())
        .on("ready", () => {
          let preservedFileChanges: IFileChangeInfo[] = [];
          let timeout: NodeJS.Timer;

          const onWatched = (type: "add" | "change" | "unlink", filePath: string) => {
            preservedFileChanges.push({type, filePath: path.normalize(filePath)});

            clearTimeout(timeout);
            timeout = setTimeout(
              async () => {
                try {
                  const fileChanges = Object.clone(preservedFileChanges);
                  preservedFileChanges = [];

                  await callback(fileChanges);
                }
                catch (err) {
                  new Logger("@simplysm/sd-core", "FileWatcher").error(err.stack);
                }
              },
              millisecond || 100
            );
          };

          for (const sit of sits) {
            watcher.on(sit, filePath => {
              onWatched(sit, filePath);
            });
          }

          resolve(watcher);
        })
        .on("error", err => {
          reject(err);
        });
    });
  }
}

export type FileChangeInfoType = "add" | "change" | "unlink";

export interface IFileChangeInfo {
  type: FileChangeInfoType;
  filePath: string;
}
