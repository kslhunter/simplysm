import * as webpack from "webpack";
import * as path from "path";
import * as child_process from "child_process";
import {ProcessManager} from "@simplysm/sd-core";
import {Logger} from "@simplysm/sd-common";

export class SdWebpackTsLintPlugin implements webpack.Plugin {
  private readonly _startTime = Date.now();
  private _prevTimestamps = new Map<string, number>();

  public constructor(private readonly _options: { logger: Logger; packageKey: string }) {
  }

  public apply(compiler: webpack.Compiler): void {
    let watch = false;
    compiler.hooks.watchRun.tap("SdWebpackTsLintPlugin", () => {
      watch = true;
    });

    let worker: child_process.ChildProcess;
    compiler.hooks.make.tapAsync("SdWebpackTsLintPlugin", async (compilation: webpack.compilation.Compilation, callback: (err?: Error) => void) => {
      this._options.logger.log("코드검사를 시작합니다...");

      if (watch) {
        callback();

        if (!worker) {
          worker = ProcessManager.fork(
            path.resolve(__dirname, "..", "lib", "ts-lint-worker.js"),
            [this._options.packageKey, "watch"],
            {logger: this._options.logger}
          );
        }

        const listener = (message: any) => {
          if (message.type === "finish") {
            this._options.logger.log("코드검사가 완료되었습니다.");
            worker.off("message", listener);
          }
          else if (message.type === "warning") {
            this._options.logger.warn("코드검사중 경고가 발생하였습니다.", message.message);
          }
          else if (message.type === "error") {
            this._options.logger.error("코드검사중 에러가 발생하였습니다.", message.message);
          }
          else {
            this._options.logger.error("코드검사중 메시지가 잘못되었습니다. [" + message + "]");
          }
        };
        worker.on("message", listener);

        const fileTimestamps = compilation["fileTimestamps"] as Map<string, number>;
        const changedFiles = Array.from(fileTimestamps.keys())
          .filter(watchFile => (this._prevTimestamps.get(watchFile) || this._startTime) < (fileTimestamps.get(watchFile) || Infinity));
        this._prevTimestamps = fileTimestamps;
        worker.send(changedFiles);
      }
      else {
        worker = ProcessManager.fork(
          path.resolve(__dirname, "..", "lib", "ts-lint-worker.js"),
          [this._options.packageKey, "build"],
          {logger: this._options.logger}
        );
        worker.on("message", message => {
          if (message.type === "finish") {
            this._options.logger.log("코드검사가 완료되었습니다.");
          }
          else if (message.type === "warning") {
            this._options.logger.warn("코드검사중 경고가 발생하였습니다.", message.message);
          }
          else if (message.type === "error") {
            this._options.logger.error("코드검사중 에러가 발생하였습니다.", message.message);
            callback(new Error(message.message));
          }
          else {
            this._options.logger.error("코드검사중 메시지가 잘못되었습니다. [" + message + "]");
            callback(new Error("코드검사중 메시지가 잘못되었습니다."));
          }
        });
        worker.on("exit", () => {
          callback();
        });
      }
    });
  }
}