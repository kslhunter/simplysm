import * as chokidar from "chokidar";
import * as fs from "fs-extra";
import * as path from "path";
import {Logger} from "@simplism/core";

export class SdLocalUpdater {
  private readonly _logger = new Logger("@simplism/pack", `SdLocalUpdater`);

  public constructor(private readonly _packageName: string,
                     private readonly _packagePath: string) {
  }

  public async runAsync(watch?: boolean): Promise<void> {
    await new Promise<void>(resolve => {
      if (watch) {
        const watcher = chokidar.watch(this._sourcePath("**/*").replace(/\\/g, "/"))
          .on("ready", () => {
            this._logger.log(`${this._packageName} watching...`);

            watcher
              .on("add", filePath => {
                try {
                  this._logger.log(`changed: add    => ${filePath}`);

                  const relativeSourcePath = path.relative(this._sourcePath(), filePath);
                  const targetPath = this._targetPath(relativeSourcePath);
                  fs.copySync(filePath, targetPath);
                }
                catch (err) {
                  this._logger.error(err);
                }
              })
              .on("change", filePath => {
                try {
                  this._logger.log(`changed: change => ${filePath}`);

                  const relativeSourcePath = path.relative(this._sourcePath(), filePath);
                  const targetPath = this._targetPath(relativeSourcePath);
                  fs.copySync(filePath, targetPath);
                }
                catch (err) {
                  this._logger.error(err);
                }
              })
              .on("unlink", filePath => {
                try {
                  this._logger.log(`changed: unlink => ${filePath}`);

                  const relativeSourcePath = path.relative(this._sourcePath(), filePath);
                  const targetPath = this._targetPath(relativeSourcePath);
                  fs.removeSync(targetPath);
                }
                catch (err) {
                  this._logger.error(err);
                }
              });

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
