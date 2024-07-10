import {FsUtil, Logger, SdFsWatcher} from "@simplysm/sd-core-node";
import path from "path";
import {ISdCliBuilderResult} from "../commons";
import {EventEmitter} from "events";
import {SdLinter} from "../build-tools/SdLinter";

export class SdCliJsLibLinter extends EventEmitter {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", "SdCliJsLibLinter"]);
  private readonly _pkgName: string;

  public constructor(private readonly _pkgPath: string) {
    super();
    this._pkgName = path.basename(_pkgPath);
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (result: ISdCliBuilderResult) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  public async buildAsync(): Promise<ISdCliBuilderResult> {
    this._debug("LINT...");
    const srcGlobPath = path.resolve(this._pkgPath, "src/**/*.+(js|cjs|mjs)");
    const srcFilePaths = await FsUtil.globAsync(srcGlobPath);
    const lintResults = await SdLinter.lintAsync(srcFilePaths, undefined);

    this._debug(`LINT 완료`);
    return {
      affectedFilePaths: srcFilePaths,
      buildResults: lintResults
    };
  }

  public async watchAsync(): Promise<void> {
    this.emit("change");
    this._debug("LINT...");
    const srcGlobPath = path.resolve(this._pkgPath, "src/**/*.+(js|cjs|mjs)");
    const srcFilePaths = await FsUtil.globAsync(srcGlobPath);
    const lintResults = await SdLinter.lintAsync(srcFilePaths, undefined);

    this._debug(`LINT 완료`);
    this.emit("complete", {
      affectedFilePaths: srcFilePaths,
      buildResults: lintResults
    });

    SdFsWatcher
      .watch([srcGlobPath])
      .onChange({
        delay: 100
      }, async (changeInfos) => {
        const watchFilePaths = changeInfos.filter((item) => FsUtil.exists(item.path)).map((item) => item.path);
        if (watchFilePaths.length < 1) return;

        this.emit("change");
        this._debug("LINT...");
        const watchLintResults = await SdLinter.lintAsync(watchFilePaths, undefined);

        this._debug(`LINT 완료`);
        this.emit("complete", {
          affectedFilePaths: changeInfos.map((item) => item.path),
          buildResults: watchLintResults
        });
      });
  }

  private _debug(msg: string): void {
    this._logger.debug(`[${this._pkgName}] ${msg}`);
  }
}
