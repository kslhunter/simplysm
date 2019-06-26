import * as chokidar from "chokidar";
import {Logger} from "./Logger";
import * as fs from "fs";

export class FileWatcher {
  public static async watch(paths: string | string[], sits: ("add" | "change" | "unlink")[], callback: (changedFiles: { type: "add" | "change" | "unlink"; filePath: string }[]) => (void | Promise<void>), millisecond?: number): Promise<chokidar.FSWatcher> {
    return await new Promise<chokidar.FSWatcher>(resolve => {
      const watcher = chokidar.watch((typeof paths === "string" ? [paths] : paths).map(item => item.replace(/\\/g, "/")))
        .on("ready", () => {
          let preservedFileChanges: { type: "add" | "change" | "unlink"; filePath: string }[] = [];
          let timeout: NodeJS.Timer;

          const onWatched = (type: "add" | "change" | "unlink", filePath: string) => {
            preservedFileChanges.push({type, filePath});

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
            watcher.on(sit, (filePath, stats?: fs.Stats) => {
              onWatched(sit, filePath);
            });
          }

          resolve(watcher);
        });
    });
  }
}
