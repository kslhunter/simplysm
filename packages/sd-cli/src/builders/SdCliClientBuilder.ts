import {EventEmitter} from "events";
import {FsUtil, Logger, SdFsWatcher} from "@simplysm/sd-core-node";
import {ISdCliBuilderResult, ISdCliClientPackageConfig, ISdCliConfig} from "../commons";
import {FunctionQueue} from "@simplysm/sd-core-common";
import path from "path";
import {SdTsCompiler} from "../build-tools/SdTsCompiler";
import {SdNgBundler} from "../build-tools/SdNgBundler";
import {SdLinter} from "../build-tools/SdLinter";

export class SdCliClientBuilder extends EventEmitter {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", "SdCliClientBuilder"]);
  private readonly _pkgConf: ISdCliClientPackageConfig;

  public constructor(private readonly _projConf: ISdCliConfig,
                     private readonly _pkgPath: string) {
    super();
    this._pkgConf = this._projConf.packages[path.basename(_pkgPath)] as ISdCliClientPackageConfig;
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (result: ISdCliBuilderResult) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  public async buildAsync(): Promise<ISdCliBuilderResult> {
    this._debug("dist 초기화...");
    await FsUtil.removeAsync(path.resolve(this._pkgPath, "dist"));

    this._debug("GEN .config...");
    const confDistPath = this._pkgConf.server !== undefined
      ? path.resolve(this._pkgPath, "../../packages", this._pkgConf.server, "dist/www", path.basename(this._pkgPath), ".config.json")
      : path.resolve(this._pkgPath, "dist");
    await FsUtil.writeFileAsync(confDistPath, JSON.stringify(this._pkgConf.configs ?? {}, undefined, 2));

    this._debug(`BUILD 준비...`);
    const builderTypes = (Object.keys(this._pkgConf.builder ?? {web: {}}) as ("web")[]);
    const builders = builderTypes.map((builderType) => new SdNgBundler({
      dev: false,
      builderType: builderType,
      pkgPath: this._pkgPath
    }));

    const checker = new SdTsCompiler({
      pkgPath: this._pkgPath,
      emit: false,
      emitDts: false,
      globalStyle: false
    });

    this._debug(`BUILD...`);
    const buildResults = (
      await Promise.all(builders.map((builder) => builder.bundleAsync()))
    ).mapMany();

    this._debug("CHECK...");
    const checkResult = await checker.buildAsync();

    this._debug(`LINT...`);
    const lintResults = await SdLinter.lintAsync(checkResult.affectedFilePaths, checker.program);

    this._debug(`빌드 완료`);
    return {
      affectedFilePaths: checkResult.affectedFilePaths,
      buildResults: [...buildResults, ...checkResult.results, ...lintResults]
    };
  }

  public async watchAsync(): Promise<void> {
    this._debug("dist 초기화...");
    await FsUtil.removeAsync(path.resolve(this._pkgPath, "dist"));

    this._debug("GEN .config...");
    const confDistPath = this._pkgConf.server !== undefined
      ? path.resolve(this._pkgPath, "../../packages", this._pkgConf.server, "dist/www", path.basename(this._pkgPath), ".config.json")
      : path.resolve(this._pkgPath, "dist");
    await FsUtil.writeFileAsync(confDistPath, JSON.stringify(this._pkgConf.configs ?? {}, undefined, 2));

    this._debug(`BUILD 준비...`);
    const builderTypes = (Object.keys(this._pkgConf.builder ?? {web: {}}) as ("web")[]);
    const builders = builderTypes.map((builderType) => new SdNgBundler({
      dev: true,
      builderType: builderType,
      pkgPath: this._pkgPath
    }));

    const checker = new SdTsCompiler({
      pkgPath: this._pkgPath,
      emit: false,
      emitDts: false,
      globalStyle: false
    });

    this._debug("WATCH...");
    const fnQ = new FunctionQueue();
    const watcher = SdFsWatcher
      .watch([
        path.resolve(this._pkgPath, "src/**/*.*")
      ], {
        ignoreInitial: false
      })
      .onChange({
        delay: 100
      }, (changeInfos) => {
        for (const builder of builders) {
          builder.removeCache(changeInfos.map((item) => item.path));
        }

        fnQ.runLast(async () => {
          this.emit("change");

          this._debug(`BUILD...`);
          const buildResults = (
            await Promise.all(builders.map((builder) => builder.bundleAsync()))
          ).mapMany();

          this._debug("CHECK...");
          const checkResult = await checker.buildAsync();

          this._debug(`LINT...`);
          const lintResults = await SdLinter.lintAsync(checkResult.affectedFilePaths, checker.program);

          this._debug(`빌드 완료`);
          this.emit("complete", {
            affectedFilePaths: checkResult.affectedFilePaths,
            buildResults: [...buildResults, ...checkResult.results, ...lintResults]
          });

          watcher.add(checker.program.getSourceFiles().map((item) => item.fileName));
        });
      });
  }

  private _debug(msg: string): void {
    this._logger.debug(`[${path.basename(this._pkgPath)}] ${msg}`);
  }
}