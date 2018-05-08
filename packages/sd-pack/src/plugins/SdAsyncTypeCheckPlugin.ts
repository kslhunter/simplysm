import {Logger, Wait} from "@simplism/sd-core";
import * as child_process from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import * as ts from "typescript";
import * as webpack from "webpack";

export class SdAsyncTypeCheckPlugin implements webpack.Plugin {
  public constructor(private readonly _options: { packageName: string; logger: Logger }) {
  }

  public async apply(compiler: webpack.Compiler): Promise<void> {
    const contextPath = path.resolve(process.cwd(), `packages/${this._options.packageName}`);

    const tsconfigPath = path.resolve(contextPath, "tsconfig.json");
    const tsconfigJson = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));
    const tsconfig = ts.parseJsonConfigFileContent(tsconfigJson, ts.sys, contextPath);
    if (tsconfig.options.outDir) {
      fs.removeSync(tsconfig.options.outDir);
    }

    let watching = false;
    let buildCompleted = false;
    let lintCompleted = false;
    /*let prevTimestamps = new Map<string, number>();*/
    /*const startTime = Date.now();*/

    const tsBuildWorker = child_process
      .fork(
        path.resolve(__dirname, "../workers/ts-build.worker"),
        [
          "--package", this._options.packageName,
          "--noEmit"
        ],
        {
          stdio: ["inherit", "inherit", "inherit", "ipc"],
          env: process.env,
          .../[\\/]src[\\/]/.test(__dirname)
            ? {
              execArgv: [
                path.resolve(__dirname, "../../../../node_modules/ts-node/dist/bin.js"),
                "--project", path.resolve(__dirname, "../../tsconfig.json"),
                "--require", "tsconfig-paths/register"
              ]
            }
            : {}
        }
      )
      .on("message", (messages: string[]) => {
        if (messages.length > 0) {
          this._options.logger.error(`build error\n${messages.join("\n")}`);
        }
        buildCompleted = true;
      })
      .on("error", err => {
        this._options.logger.error(err);
      });

    const tsLintWorker = child_process
      .fork(
        path.resolve(__dirname, "../workers/ts-lint.worker"),
        ["--package", this._options.packageName],
        {
          stdio: ["inherit", "inherit", "inherit", "ipc"],
          env: process.env,
          .../[\\/]src[\\/]/.test(__dirname)
            ? {
              execArgv: [
                path.resolve(__dirname, "../../../../node_modules/ts-node/dist/bin.js"),
                "--project", path.resolve(__dirname, "../../tsconfig.json"),
                "--require", "tsconfig-paths/register"
              ]
            }
            : {}
        }
      )
      .on("message", (messages: string[]) => {
        if (messages.length > 0) {
          this._options.logger.warn(`lint warning\n${messages.join("\n")}`);
        }
        lintCompleted = true;
      })
      .on("error", err => {
        this._options.logger.error(err);
      });

    compiler.hooks.run.tap("SdAsyncTypeCheckPlugin", () => watching = false);
    compiler.hooks.watchRun.tap("SdAsyncTypeCheckPlugin", () => watching = true);

    compiler.hooks.afterEmit.tapAsync("SdAsyncTypeCheckPlugin", async (compilation, callback) => {
      callback();

      try {
        this._options.logger.log("type-checking...");
        buildCompleted = false;
        lintCompleted = false;

        /*const fileTimestamps = compilation["fileTimestamps"] as Map<string, number>;
        const changedTsFiles = Array.from(fileTimestamps.entries())
          .filter(watchFileArr =>
            path.extname(watchFileArr[0]) === ".ts" &&
            (prevTimestamps.get(watchFileArr[0]) || startTime) < (watchFileArr[1] || Infinity)
          )
          .map(item => item[0].replace(/\\/g, "/"));*/

        /*prevTimestamps = fileTimestamps;*/

        tsBuildWorker.send([]/*changedTsFiles*/, err => {
          if (err) this._options.logger.error(err);
        });
        tsLintWorker.send([]/*changedTsFiles*/, err => {
          if (err) this._options.logger.error(err);
        });

        await Wait.true(() => buildCompleted && lintCompleted);

        this._options.logger.info("type-check complete");

        if (!watching) {
          tsBuildWorker.kill();
          tsLintWorker.kill();
        }
      }
      catch (err) {
        this._options.logger.error(err);
      }
    });

    compiler.hooks.watchClose.tap("SdAsyncTypeCheckPlugin", () => {
      tsBuildWorker.kill();
      tsLintWorker.kill();
    });
  }
}