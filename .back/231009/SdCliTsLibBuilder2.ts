import {FsUtil, Logger, SdFsWatcher} from "@simplysm/sd-core-node";
import path from "path";
import {ISdCliBuilderResult, ISdCliConfig, ISdCliLibPackageConfig} from "../commons";
import {EventEmitter} from "events";
import {FunctionQueue} from "@simplysm/sd-core-common";
import {SdTsIncrementalBuilder} from "../build-tools/SdTsIncrementalBuilder";
import {SdLinter} from "../build-tools/SdLinter";

export class SdCliTsLibBuilder extends EventEmitter {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", "SdCliTsLibBuilder"]);
  private readonly _pkgConf: ISdCliLibPackageConfig;

  public constructor(private readonly _projConf: ISdCliConfig,
                     private readonly _pkgPath: string,
                     private readonly _withLint: boolean) {
    super();
    this._pkgConf = this._projConf.packages[path.basename(_pkgPath)] as ISdCliLibPackageConfig;
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (result: ISdCliBuilderResult) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  public async buildAsync(): Promise<ISdCliBuilderResult> {
    this._debug("빌드 준비...");
    const sdTsProgram = await SdTsIncrementalBuilder.createAsync(this._pkgPath, () => ({emitJs: true}));

    this._debug("dist 초기화...");
    await FsUtil.removeAsync(path.resolve(this._pkgPath, "dist"));

    this._debug("BUILD...");
    const buildResult = await sdTsProgram.buildAsync();

    this._debug("LINT...");
    const lintResults = !this._withLint ? [] : await SdLinter.lintAsync(buildResult.affectedFilePaths, sdTsProgram.builderProgram!.getProgram());

    this._debug(`빌드 완료`);
    return {
      affectedFilePaths: buildResult.affectedFilePaths,
      buildResults: [...buildResult.results, ...lintResults]
    };
  }

  public async watchAsync(): Promise<void> {
    this._debug("빌드 준비...");
    const sdTsProgram = await SdTsIncrementalBuilder.createAsync(this._pkgPath, () => ({emitJs: true}));

    this._debug("dist 초기화...");
    await FsUtil.removeAsync(path.resolve(this._pkgPath, "dist"));

    this.emit("change");

    this._debug("BUILD...");
    const buildResult = await sdTsProgram.buildAsync();

    this._debug("LINT...");
    const lintResults = !this._withLint ? [] : await SdLinter.lintAsync(buildResult.affectedFilePaths, sdTsProgram.builderProgram!.getProgram());

    this._debug(`빌드 완료`);
    this.emit("complete", {
      affectedFilePaths: buildResult.affectedFilePaths,
      buildResults: [...buildResult.results, ...lintResults]
    });

    this._debug("WATCH...");
    const fnQ = new FunctionQueue();
    SdFsWatcher
      .watch([
        ...sdTsProgram.builderProgram!.getSourceFiles().map((item) => item.fileName),
        path.resolve(this._pkgPath, "src/**/*")
      ])
      .onChange({
        delay: 100
      }, (changeInfos) => {
        sdTsProgram.markChanges(changeInfos.map((item) => item.path));

        fnQ.runLast(async () => {
          this.emit("change");

          this._debug(`BUILD...`);
          const watchBuildResult = await sdTsProgram.buildAsync();

          this._debug(`LINT...`);
          const watchLintResults = !this._withLint ? [] : await SdLinter.lintAsync(watchBuildResult.affectedFilePaths, sdTsProgram.builderProgram!.getProgram());

          this._debug(`빌드 완료`);
          this.emit("complete", {
            affectedFilePaths: watchBuildResult.affectedFilePaths,
            buildResults: [...watchBuildResult.results, ...watchLintResults]
          });
        });
      });
  }

  private _debug(msg: string): void {
    this._logger.debug(`[${path.basename(this._pkgPath)}] ${msg}`);
  }
}
