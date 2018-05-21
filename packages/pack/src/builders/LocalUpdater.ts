import * as chokidar from "chokidar";
import * as fs from "fs-extra";
import * as path from "path";
import {Logger} from "@simplism/core";

export class LocalUpdater {
  private readonly _logger = new Logger("@simplism/pack", `LocalUpdater`);

  public constructor(private readonly _packageName: string,
                     private readonly _packagePath: string) {
  }

  public async runAsync(watch?: boolean): Promise<void> {
    await new Promise<void>(resolve => {
      if (watch) {
        const watcher = chokidar.watch(this._sourcePath("**/*").replace(/\\/g, "/"))
          .on("ready", () => {
            this._logger.log(`${this._packageName} watching...`);

            let preservedFileChanges: { type: string; filePath: string }[] = [];
            let timeout: NodeJS.Timer;

            const onWatched = (type: string, filePath: string) => {
              preservedFileChanges.push({type, filePath});

              clearTimeout(timeout);
              timeout = setTimeout(
                () => {
                  try {
                    if (preservedFileChanges.every(item => path.extname(item.filePath) === ".ts")) {
                      return;
                    }

                    const fileChanges = preservedFileChanges;
                    preservedFileChanges = [];

                    for (const fileChange of fileChanges) {
                      this._logger.log(`changed: ${fileChange.type}    => ${fileChange.filePath}`);

                      const relativeSourcePath = path.relative(this._sourcePath(), fileChange.filePath);
                      const targetPath = this._targetPath(relativeSourcePath);
                      if (type === "remove") {
                        fs.removeSync(targetPath);
                      }
                      else {
                        fs.copySync(fileChange.filePath, targetPath);
                      }
                    }
                  }
                  catch (err) {
                    this._logger.error(err);
                  }
                },
                0
              );
            };

            watcher
              .on("add", filePath => onWatched("add", filePath))
              .on("change", filePath => onWatched("change", filePath))
              .on("unlink", filePath => onWatched("remove", filePath));

            resolve();
          });
      }
      else {
        fs.copySync(this._sourcePath(), this._targetPath());
        this._logger.log(`${this._packageName} updated`);
        resolve();
      }
    });
  }

  private _sourcePath(...args: string[]): string {
    return path.resolve(this._packagePath, ...args);
  }

  private _targetPath(...args: string[]): string {
    return path.resolve(process.cwd(), `node_modules/${this._packageName}`, ...args);
  }
}
