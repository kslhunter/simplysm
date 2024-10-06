import { FsUtil, Logger, SdFsWatcher, SdWorker } from "@simplysm/sd-core-node";
import path from "path";
import { EventEmitter } from "events";
import { ISdBuildRunnerResult, ISdProjectConfig } from "../../commons";
import { SdCliConvertMessageUtil } from "../../utils/SdCliConvertMessageUtil";
import { TSdLintWorkerType } from "../../workers/lint/lint-worker.type";

export class SdJsLibBuildRunner extends EventEmitter {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", "SdJsLibBuildRunner"]);
  private readonly _pkgName: string;
  private readonly _lintWorker: SdWorker<TSdLintWorkerType>;

  public constructor(
    private readonly _projConf: ISdProjectConfig,
    private readonly _pkgPath: string,
  ) {
    super();
    this._pkgName = path.basename(_pkgPath);

    this._lintWorker = new SdWorker(import.meta.resolve("../../workers/lint/lint-worker"));
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (result: ISdBuildRunnerResult) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  public async buildAsync(): Promise<ISdBuildRunnerResult> {
    this._debug("LINT...");
    const srcGlobPath = path.resolve(this._pkgPath, "src/**/*.js");
    const srcFilePaths = await FsUtil.globAsync(srcGlobPath);

    const lintResults = await this._lintWorker.run("lint", [
      {
        cwd: this._pkgPath,
        fileSet: new Set(srcFilePaths),
      },
    ]);
    const messages = SdCliConvertMessageUtil.convertToBuildMessagesFromEslint(lintResults);

    this._debug(`LINT 완료`);
    return {
      affectedFilePaths: srcFilePaths,
      buildMessages: messages,
    };
  }

  public async watchAsync(): Promise<void> {
    this.emit("change");
    this._debug("LINT...");
    const srcGlobPath = path.resolve(this._pkgPath, "src/**/*.js");
    const srcFilePaths = await FsUtil.globAsync(srcGlobPath);

    const lintResults = await this._lintWorker.run("lint", [
      {
        cwd: this._pkgPath,
        fileSet: new Set(srcFilePaths),
      },
    ]);
    const messages = SdCliConvertMessageUtil.convertToBuildMessagesFromEslint(lintResults);

    this._debug(`LINT 완료`);
    this.emit("complete", {
      affectedFilePaths: srcFilePaths,
      buildMessages: messages,
    });

    SdFsWatcher.watch([srcGlobPath]).onChange(
      {
        delay: 100,
      },
      async (changeInfos) => {
        const watchFilePaths = changeInfos.filter((item) => FsUtil.exists(item.path)).map((item) => item.path);
        if (watchFilePaths.length < 1) return;

        this.emit("change");
        this._debug("LINT...");
        const watchLintResults = await this._lintWorker.run("lint", [
          {
            cwd: this._pkgPath,
            fileSet: new Set(watchFilePaths),
          },
        ]);
        const watchMessages = SdCliConvertMessageUtil.convertToBuildMessagesFromEslint(watchLintResults);

        this._debug(`LINT 완료`);
        this.emit("complete", {
          affectedFilePaths: changeInfos.map((item) => item.path),
          buildMessages: watchMessages,
        });
      },
    );
  }

  private _debug(msg: string): void {
    this._logger.debug(`[${this._pkgName}] ${msg}`);
  }
}
