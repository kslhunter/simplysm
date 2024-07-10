import {EventEmitter} from "events";
import {FsUtil, Logger, PathUtil, SdFsWatcher} from "@simplysm/sd-core-node";
import {ISdCliBuilderResult, ISdCliClientPackageConfig, ISdCliConfig, ISdCliPackageBuildResult} from "../commons";
import {FunctionQueue} from "@simplysm/sd-core-common";
import path from "path";
import {SdNgBundler} from "../build-tools/SdNgBundler";
import {SdCliCordova} from "../build-tools/SdCliCordova";
import {SdCliNgRoutesFileGenerator} from "../build-tools/SdCliNgRoutesFileGenerator";
import {SdLinter} from "../build-tools/SdLinter";
import {SdCliElectron} from "../entry/SdCliElectron";

// import ts from "typescript";

export class SdCliClientBuilder extends EventEmitter {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", "SdCliClientBuilder"]);
  private readonly _pkgConf: ISdCliClientPackageConfig;
  private _builders?: SdNgBundler[];
  private _cordova?: SdCliCordova;

  // #program?: ts.Program;

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

    this._debug(`GEN routes.ts...`);
    await SdCliNgRoutesFileGenerator.runAsync(this._pkgPath);

    this._debug("GEN .config...");
    const confDistPath = path.resolve(this._pkgPath, "dist/.config.json");
    await FsUtil.writeFileAsync(confDistPath, JSON.stringify(this._pkgConf.configs ?? {}, undefined, 2));

    const result = await this._runAsync({dev: false});
    return {
      affectedFilePaths: Array.from(result.affectedFileSet),
      buildResults: result.buildResults
    };
  }

  public async watchAsync() {
    this.emit("change");

    this._debug("dist 초기화...");
    await FsUtil.removeAsync(path.resolve(this._pkgPath, "dist"));

    this._debug(`WATCH GEN routes.ts...`);
    await SdCliNgRoutesFileGenerator.watchAsync(this._pkgPath);

    this._debug("GEN .config...");
    const confDistPath = path.resolve(this._pkgPath, "dist/.config.json");
    await FsUtil.writeFileAsync(confDistPath, JSON.stringify(this._pkgConf.configs ?? {}, undefined, 2));

    const result = await this._runAsync({dev: true});
    this.emit("complete", {
      affectedFilePaths: Array.from(result.affectedFileSet),
      buildResults: result.buildResults
    });

    this._debug("WATCH...");
    let changeFiles: string[] = [];
    const fnQ = new FunctionQueue();
    const watcher = SdFsWatcher
      .watch(Array.from(result.watchFileSet))
      .onChange({delay: 100}, (changeInfos) => {
        changeFiles.push(...changeInfos.map((item) => item.path));

        fnQ.runLast(async () => {
          const currChangeFiles = [...changeFiles];
          changeFiles = [];

          this.emit("change");

          for (const builder of this._builders!) {
            // builder.removeCache(currChangeFiles);
            builder.markForChanges(currChangeFiles);
          }

          const watchResult = await this._runAsync({dev: true});
          this.emit("complete", {
            affectedFilePaths: Array.from(watchResult.affectedFileSet),
            buildResults: watchResult.buildResults
          });

          watcher.add(watchResult.watchFileSet);
        });
      });
  }

  private async _runAsync(opt: {
    dev: boolean;
  }): Promise<{
    watchFileSet: Set<string>;
    affectedFileSet: Set<string>;
    buildResults: ISdCliPackageBuildResult[];
  }> {
    const builderTypes = (Object.keys(this._pkgConf.builder ?? {web: {}}) as ("web" | "electron" | "cordova")[]);
    if (this._pkgConf.builder?.cordova && !this._cordova) {
      this._debug("CORDOVA 준비...");
      this._cordova = new SdCliCordova({
        pkgPath: this._pkgPath,
        config: this._pkgConf.builder.cordova
      });
      await this._cordova.initializeAsync();
    }

    if (!this._builders) {
      this._debug(`BUILD 준비...`);
      this._builders = builderTypes.map((builderType) => new SdNgBundler({
        dev: opt.dev,
        builderType: builderType,
        pkgPath: this._pkgPath,
        outputPath: builderType === "web" ? path.resolve(this._pkgPath, "dist")
          : builderType === "electron" && !opt.dev ? path.resolve(this._pkgPath, ".electron/src")
            : builderType === "cordova" && !opt.dev ? path.resolve(this._pkgPath, ".cordova/www")
              : path.resolve(this._pkgPath, "dist", builderType),
        env: {
          ...this._pkgConf.env,
          ...this._pkgConf.builder?.[builderType]?.env
        },
        cordovaConfig: builderType === "cordova" ? this._pkgConf.builder!.cordova : undefined,
      }));
    }

    this._debug(`BUILD & CHECK...`);
    const buildResults = await Promise.all(this._builders.map((builder) => builder.bundleAsync()));
    const watchFileSet = new Set(buildResults.mapMany(item => Array.from(item.watchFileSet)));
    const affectedFileSet = new Set(buildResults.mapMany(item => Array.from(item.affectedFileSet)));
    const results = buildResults.mapMany((item) => item.results).distinct();
    const firstProgram = buildResults.first()?.program;

    this._debug(`LINT...`);
    // const tsConfig = FsUtil.readJson(path.resolve(this._pkgPath, "tsconfig.json")) as ITsConfig;
    // const parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig, ts.sys, this._pkgPath);
    // this.#program = ts.createProgram({
    //   rootNames: parsedTsConfig.fileNames,
    //   options: parsedTsConfig.options,
    //   oldProgram: this.#program
    // });
    // const pkgFilePaths = filePaths.filter(item => PathUtil.isChildPath(item, this._pkgPath));
    const lintResults = await SdLinter.lintAsync(Array.from(affectedFileSet).filter(item => PathUtil.isChildPath(item, this._pkgPath)), firstProgram);

    if (!opt.dev && this._cordova) {
      this._debug("CORDOVA BUILD...");
      await this._cordova.buildAsync(path.resolve(this._pkgPath, "dist"));
    }

    if (!opt.dev && this._pkgConf.builder?.electron) {
      this._debug("ELECTRON BUILD...");
      await SdCliElectron.buildAsync({
        pkgPath: this._pkgPath,
        config: this._pkgConf.builder.electron
      });
    }

    this._debug(`빌드 완료`);
    const localUpdatePaths = Object.keys(this._projConf.localUpdates ?? {})
      .mapMany((key) => FsUtil.glob(path.resolve(this._pkgPath, "../../node_modules", key)));
    const currWatchFileSet = new Set(Array.from(watchFileSet).filter(item =>
      PathUtil.isChildPath(item, path.resolve(this._pkgPath, "../")) ||
      localUpdatePaths.some((lu) => PathUtil.isChildPath(item, lu))
    ));
    return {
      watchFileSet: currWatchFileSet,
      affectedFileSet,
      buildResults: [...results, ...lintResults]
    };
  }

  private _debug(msg: string): void {
    this._logger.debug(`[${path.basename(this._pkgPath)}] ${msg}`);
  }
}