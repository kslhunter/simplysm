import * as child_process from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import * as webpack from "webpack";
import {Wait} from "../../../sd-core/src";

export class SdTypescriptDtsPlugin implements webpack.Plugin {
  private _buildCompleted = false;
  private _lintCompleted = false;
  private _isWatching = false;
  private _startTime = Date.now();
  private _prevTimestamps = new Map<string, number>();

  public constructor(private _options: { context: string; logger: any }) {
  }

  public apply(compiler: webpack.Compiler): void {
    const buildModulePath = fs.existsSync(path.resolve(__dirname, "../ts-build-worker.ts")) ? path.resolve(__dirname, "../ts-build-worker.ts") : path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/dist/ts-build-worker.js");
    const buildWorker = child_process
      .fork(buildModulePath, [
        this._options.context,
        compiler.options.output!.path!
      ].filterExists(), {
        stdio: ["inherit", "inherit", "inherit", "ipc"]
      })
      .on("message", (msg: { type: string; message: string } | "finish") => {
        if (msg === "finish") {
          this._buildCompleted = true;
          if (!this._isWatching) {
            buildWorker.kill();
          }
        }
        else {
          this._options.logger[msg.type](`${msg.message}`);
        }
      });

    const lintModulePath = fs.existsSync(path.resolve(__dirname, "../ts-lint-worker.ts")) ? path.resolve(__dirname, "../ts-lint-worker.ts") : path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/dist/ts-lint-worker.js");
    const lintWorker = child_process
      .fork(lintModulePath, [
        this._options.context
      ].filterExists(), {
        stdio: ["inherit", "inherit", "inherit", "ipc"]
      })
      .on("message", (msg: { type: string; message: string } | "finish") => {
        if (msg === "finish") {
          this._lintCompleted = true;
          if (!this._isWatching) {
            lintWorker.kill();
          }
        }
        else {
          this._options.logger[msg.type](`${msg.message}`);
        }
      });

    compiler.hooks.watchRun.tap("SdTypescriptDtsPlugin", (comp) => {
      this._isWatching = true;
      this._buildCompleted = false;
      this._lintCompleted = false;

      const fileTimestamps = comp["fileTimestamps"] as Map<string, number>;
      const changedTsFiles = Array.from(fileTimestamps.entries())
        .filter((watchFileArr) => {
          return path.extname(watchFileArr[0]) === ".ts" &&
            !path.relative(this._options.context, watchFileArr[0]).includes("..") &&
            (this._prevTimestamps.get(watchFileArr[0]) || this._startTime) < (watchFileArr[1] || Infinity);
        })
        .map((item) => item[0].replace(/\\/g, "/"));

      this._prevTimestamps = fileTimestamps;

      this._options.logger.log("checking...");

      buildWorker.send(changedTsFiles, (err) => {
        if (err) {
          this._options.logger.error(err);
        }
      });

      lintWorker.send(changedTsFiles, (err) => {
        if (err) {
          this._options.logger.error(err);
        }
      });

      Wait.true(() => this._buildCompleted && this._lintCompleted).then(() => {
        this._options.logger.info("check complete");
      });
    });
    compiler.hooks.run.tap("SdTypescriptDtsPlugin", () => {
      this._isWatching = false;
      this._buildCompleted = false;
      this._lintCompleted = false;

      this._options.logger.log("checking...");

      buildWorker.send([], (err) => {
        if (err) {
          this._options.logger.error(err);
        }
      });

      lintWorker.send([], (err) => {
        if (err) {
          this._options.logger.error(err);
        }
      });

      Wait.true(() => this._buildCompleted && this._lintCompleted).then(() => {
        this._options.logger.info("check complete");
      });
    });
  }
}