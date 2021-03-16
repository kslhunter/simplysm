import * as webpack from "webpack";
import * as path from "path";

export class SdWebpackWriteFilePlugin {
  public constructor(private readonly _files: { path: string; content: string | undefined }[]) {
  }

  public apply(compiler: webpack.Compiler): void {
    compiler.hooks.afterEmit.tapAsync("SdWebpackWriteFilePlugin", async (compilation, callback) => {
      try {
        for (const fileInfo of this._files) {
          if (fileInfo.content === undefined) {
            compiler.outputFileSystem.unlink?.(fileInfo.path, () => {
            });
          }
          else {
            await new Promise<void>((resolve, reject) => {
              const content = fileInfo.content;
              if (content !== undefined) {
                compiler.outputFileSystem.mkdirp(path.dirname(fileInfo.path), (err) => {
                  if (err != null) {
                    err.message = err.message + " (file: " + fileInfo.path + ")";
                    reject(err);
                    return;
                  }

                  compiler.outputFileSystem.writeFile(fileInfo.path, content, (err1) => {
                    if (err1 != null) {
                      err1.message = err1.message + " (file: " + fileInfo.path + ")";
                      reject(err1);
                      return;
                    }

                    resolve();
                  });
                });
              }
            });
          }
        }

        callback();
      }
      catch (err) {
        callback(err);
      }
    });
  }
}
