import * as webpack from "webpack";
import * as path from "path";

export class SdWebpackWriteFilePlugin implements webpack.Plugin {
  public constructor(private readonly _files: { path: string; content: string | Buffer | (() => string | Buffer | Promise<string | Buffer>) | undefined }[]) {
  }

  public apply(compiler: webpack.Compiler): void {
    compiler.hooks.afterEmit.tapAsync("SdWebpackWriteFilePlugin", async (compilation, callback) => {
      try {
        for (const fileInfo of this._files) {
          await new Promise<void>(async (resolve, reject) => {
            const content = fileInfo.content === undefined ? "{}" : (typeof fileInfo.content === "string" || fileInfo.content instanceof Buffer) ? fileInfo.content : (await fileInfo.content());
            compiler.outputFileSystem.mkdirp(path.dirname(fileInfo.path), err => {
              if (err) {
                err.message = err.message + " (file: " + fileInfo.path + ")";
                reject(err);
                return;
              }

              compiler.outputFileSystem.writeFile(fileInfo.path, content, err1 => {
                if (err1) {
                  err1.message = err1.message + " (file: " + fileInfo.path + ")";
                  reject(err1);
                  return;
                }

                resolve();
              });
            });
          });
        }

        callback();
      }
      catch (err) {
        callback(err);
      }
    });
  }
}
