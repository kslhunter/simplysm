import * as webpack from "webpack";
import * as fs from "fs-extra";
import * as path from "path";
import {Logger} from "@simplism/core";
import * as child_process from "child_process";

export class TsCheckAndDeclarationPlugin implements webpack.Plugin {
  public constructor(private readonly _options: {
    tsConfigPath?: string;
    packageName: string;
    logger: Logger;
    projectPath?: string;
  }) {

  }

  public apply(compiler: webpack.Compiler): void {
    let worker: child_process.ChildProcess;
    compiler.hooks.watchRun.tap("TsCheckAndDeclarationPlugin", () => {
      if (!worker) {
        worker = child_process.fork(
          this._loadersPath("ts-check-and-declaration-worker.js"),
          [
            this._options.packageName,
            "watch",
            this._options.tsConfigPath
          ].filterExists(),
          {
            stdio: ["inherit", "inherit", "inherit", "ipc"]
          }
        );
        worker.on("message", message => {
          this._options.logger.error(`타입 에러:`, message);
        });
      }
    });

    compiler.hooks.run.tap("TsCheckAndDeclarationPlugin", () => {
      worker = child_process.fork(
        this._loadersPath("ts-check-and-declaration-worker.js"),
        [
          this._options.packageName,
          "build",
          this._options.tsConfigPath
        ].filterExists(),
        {
          stdio: ["inherit", "inherit", "inherit", "ipc"]
        }
      );
      worker.on("message", message => {
        this._options.logger.error(`타입 에러:`, message);
      });
    });
  }

  private _loadersPath(...args: string[]): string {
    return fs.existsSync(path.resolve(this._options.projectPath || process.cwd(), "node_modules/@simplism/pack/loaders"))
      ? path.resolve(this._options.projectPath || process.cwd(), "node_modules/@simplism/pack/loaders", ...args)
      : path.resolve(__dirname, "../../loaders", ...args);
  }
}