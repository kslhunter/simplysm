import * as chokidar from "chokidar";
import {Logger} from "@simplysm/sd-common";

export class FileWatcher {
  public static async watch(paths: string | string[], sits: ("add" | "change" | "unlink")[], callback: (changedFiles: { type: string; filePath: string }[]) => (void | Promise<void>), millisecond?: number): Promise<void> {
    await new Promise<void>(resolve => {
      const watcher = chokidar.watch((typeof paths === "string" ? [paths] : paths).map(item => item.replace(/\\/g, "/")))
        .on("ready", () => {
          let preservedFileChanges: { type: string; filePath: string }[] = [];
          let timeout: NodeJS.Timer;

          const onWatched = (type: string, filePath: string) => {
            preservedFileChanges.push({type, filePath});

            clearTimeout(timeout);
            timeout = setTimeout(
              async () => {
                try {
                  const fileChanges = Object.clone(preservedFileChanges);
                  preservedFileChanges = [];

                  await callback(fileChanges);
                } catch (err) {
                  new Logger("@simplysm/sd-core", "FileWatcher").error(err.stack);
                }
              },
              millisecond || 300
            );
          };

          for (const sit of sits) {
            watcher.on(sit, filePath => {
              onWatched(sit, filePath);
            });
          }

          resolve();
        });
    });
  }
}
