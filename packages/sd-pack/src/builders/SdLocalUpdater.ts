import * as chokidar from "chokidar";
import * as fs from "fs-extra";
import * as path from "path";
import {Logger} from "../../../sd-core/src/utils/Logger";

export class SdLocalUpdater {
  private readonly _logger = new Logger("@simplism/sd-pack", `SdLocalUpdater :: @simplism/${this._packageName}`);

  public constructor(private readonly _packageName: string) {
  }

  public async runAsync(watch?: boolean): Promise<void> {
    await new Promise<void>(resolve => {
      if (watch) {
        const watcher = chokidar.watch(this._sourcePath("**/*").replace(/\\/g, "/"))
          .on("ready", () => {
            this._logger.log("watching...");

            watcher
              .on("add", filePath => {
                try {
                  this._logger.log(`changed: add    => ${filePath}`);

                  const relativeSourcePath = path.relative(this._sourcePath(), filePath);
                  const targetPath = this._targetPath(relativeSourcePath);
                  fs.copySync(filePath, targetPath);
                } catch (err) {
                  this._logger.error(err);
                }
              })
              .on("change", filePath => {
                try {
                  this._logger.log(`changed: change => ${filePath}`);

                  const relativeSourcePath = path.relative(this._sourcePath(), filePath);
                  const targetPath = this._targetPath(relativeSourcePath);
                  fs.copySync(filePath, targetPath);
                } catch (err) {
                  this._logger.error(err);
                }
              })
              .on("unlink", filePath => {
                try {
                  this._logger.log(`changed: unlink => ${filePath}`);

                  const relativeSourcePath = path.relative(this._sourcePath(), filePath);
                  const targetPath = this._targetPath(relativeSourcePath);
                  fs.removeSync(targetPath);
                } catch (err) {
                  this._logger.error(err);
                }
              });

            resolve();
          });
      }
      else {
        fs.copySync(this._sourcePath(), this._targetPath());
        this._logger.log("updated");
        resolve();
      }
    });
  }

  private _sourcePath(...args: string[]): string {
    return path.resolve.apply(path, [process.cwd(), `../simplism/packages/${this._packageName}`].concat(args));
  }

  private _targetPath(...args: string[]): string {
    return path.resolve.apply(path, [process.cwd(), `node_modules/@simplism/${this._packageName}`].concat(args));
  }
}
