import * as webpack from "webpack";
import * as path from "path";
import {Logger} from "@simplism/core";
import * as child_process from "child_process";
import * as fs from "fs-extra";

export class TsLintPlugin implements webpack.Plugin {
  private readonly _startTime = Date.now();
  private _prevTimestamps = new Map<string, number>();

  public constructor(private readonly _options: {
    tsConfigPath?: string;
    packageName: string;
    logger: Logger;
    projectPath?: string;
  }) {
  }

  public apply(compiler: webpack.Compiler): void {
    let isWatch = false;
    compiler.hooks.watchRun.tap("TsLintPlugin", () => {
      isWatch = true;
    });

    let worker: child_process.ChildProcess;
    compiler.hooks.make.tapAsync("TsLintPlugin", (compilation: webpack.compilation.Compilation, callback: () => void) => {
      callback();

      const fileTimestamps = compilation["fileTimestamps"] as Map<string, number>;
      const changedFiles = Array.from(fileTimestamps.keys())
        .filter(watchFile => (this._prevTimestamps.get(watchFile) || this._startTime) < (fileTimestamps.get(watchFile) || Infinity));
      this._prevTimestamps = fileTimestamps;

      if (!worker) {
        worker = child_process.fork(
          this._loadersPath("ts-lint-worker.js"),
          [
            this._options.packageName,
            isWatch ? "watch" : "build",
            this._options.tsConfigPath
          ].filterExists(),
          {
            stdio: [undefined, undefined, undefined, "ipc"]
          }
        );
        worker.on("message", message => {
          this._options.logger.warn(`린트 경고:`, message);
        });
      }

      worker.send(changedFiles, err => {
        if (err) {
          throw err;
        }
      });
    });
  }

  private _loadersPath(...args: string[]): string {
    return fs.existsSync(path.resolve(this._options.projectPath || process.cwd(), "node_modules/@simplism/cli/loaders"))
      ? path.resolve(this._options.projectPath || process.cwd(), "node_modules/@simplism/cli/loaders", ...args)
      : path.resolve(__dirname, "../../loaders", ...args);
  }
}