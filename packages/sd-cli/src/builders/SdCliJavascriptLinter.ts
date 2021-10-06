import { ISdPackageBuildResult } from "../commons";
import { EventEmitter } from "events";
import { FsUtil, SdFsWatcher } from "@simplysm/sd-core-node";
import * as path from "path";
import { ESLint } from "eslint";

export class SdCliJavascriptLinter extends EventEmitter {
  public constructor(public rootPath: string) {
    super();
  }

  public on(event: "change", listener: () => void): this;
  public on(event: "complete", listener: (results: ISdPackageBuildResult[]) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public async lintAsync(watch: boolean): Promise<void> {
    this.emit("change");

    if (watch) {
      const watchPaths = await this._getWatchPathsAsync();
      const watcher = new SdFsWatcher();
      watcher
        .onChange(async (changeInfos) => {
          const dirtyFilePaths = changeInfos
            .map((changeInfo) => changeInfo.filePath)
            .filter((item) => path.basename(item).includes("."))
            .distinct();

          if (dirtyFilePaths.length === 0) return;

          this.emit("change");

          const watchPaths2 = await this._getWatchPathsAsync();
          watcher.replaceWatchPaths(watchPaths2);

          const watchResults = await this._lintAsync(dirtyFilePaths);
          this.emit("complete", watchResults);
        })
        .watch(watchPaths);
    }

    const results = await this._lintAsync();
    this.emit("complete", results);
  }

  private async _lintAsync(dirtyFilePaths?: string[]): Promise<ISdPackageBuildResult[]> {
    const linter = new ESLint();

    const filePaths = (await this._getFilePathsAsync())
      .filter((item) => !dirtyFilePaths || dirtyFilePaths.includes(item));

    const lintResults = await linter.lintFiles(filePaths);

    return lintResults.mapMany((report) => (
      report.messages.map((msg) => {
        const severity: "warning" | "error" = msg.severity === 1 ? "warning" : "error";

        return {
          filePath: report.filePath,
          severity,
          message: `${report.filePath}(${msg.line}, ${msg.column}): ${msg.ruleId ?? ""}: ${severity} ${msg.message}`
        };
      })
    ));
  }

  private async _getWatchPathsAsync(): Promise<string[]> {
    return (await FsUtil.globAsync(path.resolve(this.rootPath, "**"), { ignore: "node_modules" }))
      .filter((item) => (
        !item.includes("node_modules")
        && FsUtil.exists(item)
        && FsUtil.isDirectory(item)
      ));
  }

  private async _getFilePathsAsync(): Promise<string[]> {
    return await FsUtil.globAsync(path.resolve(this.rootPath, "**/*.js"), { ignore: "node_modules", nodir: true });
  }
}
