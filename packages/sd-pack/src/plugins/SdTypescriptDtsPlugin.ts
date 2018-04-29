import * as child_process from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import * as ts from "typescript";
import * as webpack from "webpack";
import {Wait} from "../../../sd-core/src";

export class SdTypescriptDtsPlugin implements webpack.Plugin {
    private _buildCompleted = false;
    private _lintCompleted = false;
    private _isWatching = false;

    public constructor(private _options: { context: string; logger: any }) {
    }

    public apply(compiler: webpack.Compiler): void {
        let prevTimestamps: { [key: string]: number };

        const buildModulePath = fs.existsSync(path.resolve(__dirname, "ts-build-worker.js")) ? path.resolve(__dirname, "ts-build-worker.js") : path.resolve(__dirname, "../ts-build-worker.ts");
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

        const lintModulePath = fs.existsSync(path.resolve(__dirname, "ts-lint-worker.js")) ? path.resolve(__dirname, "ts-lint-worker.js") : path.resolve(__dirname, "../ts-lint-worker.ts");
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

        compiler.hooks.watchRun.tap(this.constructor.name, () => this._isWatching = true);
        compiler.hooks.run.tap(this.constructor.name, () => this._isWatching = false);

        compiler.hooks.make.tapAsync(this.constructor.name, async (compilation, callback) => {
            this._buildCompleted = false;
            this._lintCompleted = false;
            callback();

            const tsconfig = fs.readJsonSync(path.resolve(this._options.context, `tsconfig.json`));
            const parsed = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this._options.context);
            if (!parsed.options.declaration) return;

            const fileTimestamps = compilation["fileTimestamps"] as Map<string, number>;
            let changedTsFiles: string[] | undefined;
            if (prevTimestamps) {
                changedTsFiles = Array.from(fileTimestamps.keys())
                    .filter((fileName) => prevTimestamps[fileName] < fileTimestamps.get(fileName)!)
                    .filter((fileName) => path.extname(fileName) === ".ts");
            }

            prevTimestamps = prevTimestamps || {};
            for (const fileName of Array.from(fileTimestamps.keys())) {
                prevTimestamps[fileName] = fileTimestamps.get(fileName)!;
            }

            buildWorker.send({
                sourceFilePaths: changedTsFiles
            }, (err) => {
                if (err) {
                    this._options.logger.error(err);
                }
            });

            lintWorker.send({
                sourceFilePaths: changedTsFiles
            }, (err) => {
                if (err) {
                    this._options.logger.error(err);
                }
            });
        });

        compiler.hooks.afterEmit.tapAsync(this.constructor.name, async (compilation, callback) => {
            await Wait.true(() => this._buildCompleted && this._lintCompleted);
            callback();
        });
    }
}