import * as fs from "fs-extra";
import * as path from "path";
import {Logger} from "@simplism/core";
import {FileWatcher} from "../utils/FileWatcher";

export class LocalUpdater {
  private readonly _logger = new Logger("@simplism/cli", `${this._packageName}:`);

  public constructor(private readonly _packageName: string,
                     private readonly _packagePath: string) {
  }

  public async runAsync(watch?: boolean): Promise<void> {
    if (watch) {
      this._logger.log(`로컬 업데이트 감지 시작...`);
      await FileWatcher.watch(this._sourcePath("**/*"), ["add", "change", "unlink"], files => {
        try {
          for (const file of files) {
            if (file.filePath.endsWith("package.json")) continue;

            this._logger.log(`변경됨: ${file.type}    => ${file.filePath}`);

            const relativeSourcePath = path.relative(this._sourcePath(), file.filePath);
            const targetPath = this._targetPath(relativeSourcePath);
            if (file.type === "unlink") {
              fs.removeSync(targetPath);
            }
            else {
              fs.copyFileSync(file.filePath, targetPath);
            }
          }
        }
        catch (err) {
          this._logger.error(err);
        }
      });
    }
    else {
      for (const file of fs.readdirSync(this._sourcePath())) {
        if (file === "package.json") continue;
        fs.copySync(this._sourcePath(file), this._targetPath(file));
      }

      this._logger.log(`로컬 업데이트 완료`);
    }
  }

  private _sourcePath(...args: string[]): string {
    return path.resolve(this._packagePath, ...args);
  }

  private _targetPath(...args: string[]): string {
    return path.resolve(process.cwd(), `node_modules/${this._packageName}`, ...args);
  }
}
