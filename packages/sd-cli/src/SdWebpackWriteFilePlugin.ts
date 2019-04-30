import * as webpack from "webpack";
import {Logger} from "@simplysm/sd-common";

export class SdWebpackWriteFilePlugin implements webpack.Plugin {
  public constructor(private readonly _options: { logger: Logger; files: { path: string; content: string }[] }) {
  }

  public apply(compiler: webpack.Compiler): void {
    compiler.hooks.afterEmit.tapAsync("SdWebpackWriteFilePlugin", async (compilation, callback) => {
      for (const fileInfo of this._options.files) {
        await new Promise<void>((resolve, reject) => {
          compiler.outputFileSystem.writeFile(fileInfo.path, fileInfo.content, err => {
            if (err) {
              reject(err);
            }
            resolve();
          });
        });
      }

      callback();
    });
  }
}
