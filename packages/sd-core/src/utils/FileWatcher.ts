import * as fs from "fs-extra";
import * as path from "path";
import {Wait} from "./Wait";
import {Logger} from "./Logger";
import anymatch from "anymatch";
import {DateTime} from "../types/DateTime";
import * as glob from "glob";

export class FileWatcher {
  private static readonly _logger = new Logger("@simplysm/sd-core", "FileWatcher");

  public constructor(private readonly _watchers: fs.FSWatcher[]) {

  }

  public close(): void {
    for (const watcher of this._watchers) {
      watcher.close();
    }
  }

  public static async watch(paths: string | string[], sits: FileChangeInfoType[], callback: (watcher: FileWatcher, changedFiles: IFileChangeInfo[]) => (void | Promise<void>), options: { millisecond?: number; ignoreInitial?: boolean }): Promise<FileWatcher> {
    return await new Promise<FileWatcher>(async resolve => {
      const currPaths = typeof paths === "string" ? [paths] : paths;

      let preservedFileChanges: IFileChangeInfo[] = [];
      let timeout: NodeJS.Timer;

      let processing = false;
      let thisWatcher: FileWatcher;

      const onWatched = async (type: FileChangeInfoType, filePath: string) => {
        preservedFileChanges.push({type, filePath: path.resolve(filePath)});
        await Wait.true(() => !processing);

        clearTimeout(timeout);
        timeout = setTimeout(
          async () => {
            processing = true;

            const fileChanges = Object.clone(preservedFileChanges.distinct());
            preservedFileChanges = [];

            try {
              await callback(thisWatcher, fileChanges);
            }
            catch (err) {
              FileWatcher._logger.error(err.stack);
            }

            processing = false;
          },
          options.millisecond || 100
        );
      };

      const watchers = [];
      for (const watchPath of currPaths) {
        let currWatchPath = watchPath;
        if (watchPath.includes("*")) {
          currWatchPath = watchPath.slice(0, watchPath.indexOf("*"));
        }

        const watcher = fs.watch(currWatchPath, {recursive: watchPath.includes("**")}, async (event, filename) => {
          const filePath = path.resolve(currWatchPath, filename);
          if (watchPath.includes("*")) {
            if (!anymatch(watchPath.replace(/\\/g, "/"), filePath.replace(/\\/g, "/"))) {
              return;
            }
          }

          let eventType: FileChangeInfoType;
          if (!fs.pathExistsSync(filePath)) {
            eventType = "unlink";
          }
          else if (fs.statSync(filePath).birthtime.getTime() >= (new DateTime().tick - 300)) {
            eventType = "add";
          }
          else {
            eventType = "change";
          }

          if ((sits as string[]).includes(eventType)) {
            await onWatched(eventType, filePath);
          }
        });
        watcher.on("error", err => {
          FileWatcher._logger.error(err.stack);
        });

        watchers.push(watcher);
      }
      thisWatcher = new FileWatcher(watchers);

      if (!options.ignoreInitial) {
        const globPaths = [];
        for (const currPath of currPaths) {
          if (currPath.includes("*")) {
            globPaths.push(...glob.sync(currPath));
          }
          else {
            globPaths.push(currPath);
          }
        }

        await callback(
          thisWatcher,
          globPaths.map(item => path.resolve(item)).distinct()
            .map(item => ({
              type: "add",
              filePath: item
            }))
        );
      }

      resolve(thisWatcher);
    });
  }
}

export type FileChangeInfoType = "add" | "change" | "unlink";

export interface IFileChangeInfo {
  type: FileChangeInfoType;
  filePath: string;
}