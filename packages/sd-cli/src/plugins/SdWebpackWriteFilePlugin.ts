import * as webpack from "webpack";

export class SdWebpackWriteFilePlugin implements webpack.Plugin {
  public constructor(private readonly _files: { path: string; content: string | (() => string | Promise<string>) }[]) {
  }

  public apply(compiler: webpack.Compiler): void {
    compiler.hooks.afterEmit.tapAsync("SdWebpackWriteFilePlugin", async (compilation, callback) => {
      for (const fileInfo of this._files) {
        await new Promise<void>(async (resolve, reject) => {
          const content = typeof fileInfo.content === "string" ? fileInfo.content : (await fileInfo.content());
          compiler.outputFileSystem.writeFile(fileInfo.path, content, err => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        });
      }

      callback();
    });
  }
}