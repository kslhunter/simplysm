import * as webpack from "webpack";
import * as path from "path";
import {Logger} from "@simplysm/sd-common";
import {ProcessManager} from "@simplysm/sd-core";
import * as child_process from "child_process";

export class SdWebpackTsCheckAndDeclarationPlugin implements webpack.Plugin {
  // private readonly _startTime = Date.now();
  // private _prevTimestamps = new Map<string, number>();

  public constructor(private readonly _options: { packageKey: string; logger: Logger }) {
  }

  public apply(compiler: webpack.Compiler): void {
    let watch = false;
    compiler.hooks.watchRun.tap("SdWebpackTsCheckAndDeclarationPlugin", () => {
      watch = true;
    });

    let worker: child_process.ChildProcess;
    compiler.hooks.make.tapAsync("SdWebpackTsCheckAndDeclarationPlugin", async (compilation: webpack.compilation.Compilation, callback: (err?: Error) => void) => {
      this._options.logger.log("타입체크를 시작합니다...");

      if (watch) {
        if (!worker) {
          worker = ProcessManager.fork(
            path.resolve(__dirname, "..", "lib", "ts-check-and-declaration-worker.js"),
            [this._options.packageKey, "watch"],
            {logger: this._options.logger}
          );
        }

        const listener = (message: any) => {
          if (message.type === "finish") {
            this._options.logger.log("타입체크가 완료되었습니다.");
            worker.off("message", listener);
            callback();
          }
          else if (message.type === "warning") {
            this._options.logger.warn("타입체크중 경고가 발생하였습니다.", message.message);
          }
          else if (message.type === "error") {
            this._options.logger.error("타입체크중 에러가 발생하였습니다.", message.message);
          }
          else {
            this._options.logger.error("타입체크중 메시지가 잘못되었습니다. [" + message + "]");
          }
        };
        worker.on("message", listener);

        /*const fileTimestamps = compilation["fileTimestamps"] as Map<string, number>;
        const changedFiles = Array.from(fileTimestamps.keys())
          .filter(watchFile => (this._prevTimestamps.get(watchFile) || this._startTime) < (fileTimestamps.get(watchFile) || Infinity));
        this._prevTimestamps = fileTimestamps;
        worker.send(changedFiles);*/
        worker.send([]);
      }
      else {
        worker = ProcessManager.fork(
          path.resolve(__dirname, "..", "lib", "ts-check-and-declaration-worker.js"),
          [this._options.packageKey, "build"],
          {logger: this._options.logger}
        );
        worker.on("message", message => {
          if (message.type === "finish") {
            this._options.logger.log("타입체크가 완료되었습니다.");
          }
          else if (message.type === "warning") {
            this._options.logger.warn("타입체크중 경고가 발생하였습니다.", message.message);
          }
          else if (message.type === "error") {
            this._options.logger.error("타입체크중 에러가 발생하였습니다.", message.message);
            callback(new Error(message.message));
          }
          else {
            this._options.logger.error("타입체크중 메시지가 잘못되었습니다. [" + message + "]");
            callback(new Error("타입체크중 메시지가 잘못되었습니다."));
          }
        });
        worker.on("exit", () => {
          callback();
        });
      }
    });
  }
}