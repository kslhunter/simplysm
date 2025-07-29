import { EventEmitter } from "events";
import { FsUtils, ISdFsWatcherChangeInfo, PathUtils, SdFsWatcher, SdLogger, TNormPath } from "@simplysm/sd-core-node";
import { ISdProjectConfig, TSdPackageConfig } from "../../types/config.types";
import { ISdBuildMessage, ISdBuildRunnerResult } from "../../types/build.types";
import path from "path";
import { ScopePathSet } from "./scope-path";

export abstract class BuildRunnerBase<T extends "server" | "library" | "client"> extends EventEmitter {
  protected abstract _logger: SdLogger;

  protected _pkgName: string;
  protected _pkgConf: TSdPackageConfig<T>;

  protected _watchScopePathSet: ScopePathSet;

  override on(event: "change", listener: () => void): this;
  override on(event: "complete", listener: (result: ISdBuildRunnerResult) => void): this;
  override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  constructor(
    projConf: ISdProjectConfig,
    protected _pkgPath: TNormPath,
    workspaceGlobs: string[],
  ) {
    super();

    this._pkgName = path.basename(_pkgPath);
    this._pkgConf = projConf.packages[this._pkgName] as TSdPackageConfig<T>;

    const workspacePaths = workspaceGlobs
      .map((item) => PathUtils.posix(this._pkgPath, "../../", item))
      .mapMany((item) => FsUtils.glob(item));
    const localUpdatePaths = Object.keys(projConf.localUpdates ?? {}).mapMany((key) =>
      FsUtils.glob(path.resolve(this._pkgPath, "../../node_modules", key)),
    );
    this._watchScopePathSet = new ScopePathSet(
      [...workspacePaths, ...localUpdatePaths].map((item) => PathUtils.norm(item)),
    );
  }

  async buildAsync(): Promise<ISdBuildRunnerResult> {
    const distPath = path.resolve(this._pkgPath, "dist");
    if (FsUtils.exists(distPath)) {
      this._debug("dist 초기화...");
      FsUtils.remove(distPath);
    }

    const result = await this._runAsync(false);
    return {
      affectedFilePathSet: result.affectedFileSet,
      buildMessages: result.buildMessages,
      emitFileSet: result.emitFileSet,
    };
  }

  async watchAsync() {
    this.emit("change");

    const distPath = path.resolve(this._pkgPath, "dist");
    if (FsUtils.exists(distPath)) {
      this._debug("dist 초기화...");
      FsUtils.remove(distPath);
    }

    const result = await this._runAsync(!this._pkgConf.forceProductionMode);
    const res: ISdBuildRunnerResult = {
      affectedFilePathSet: result.affectedFileSet,
      buildMessages: result.buildMessages,
      emitFileSet: result.emitFileSet,
    };
    this.emit("complete", res);

    this._debug("WATCH...");
    let lastWatchFileSet = result.watchFileSet;
    SdFsWatcher.watch(this._watchScopePathSet.toArray(), {
      ignore: (filePath) =>
        filePath === path.resolve(this._pkgPath, ".cache") ||
        filePath === path.resolve(this._pkgPath, ".cordova") ||
        filePath === path.resolve(this._pkgPath, ".electron") ||
        filePath === path.resolve(this._pkgPath, "dist") ||
        (this._pkgConf.type === "client" && filePath === path.resolve(this._pkgPath, "src", "routes.ts")) ||
        (this._pkgConf.type === "library" &&
          this._pkgConf.dbContext != null &&
          filePath === path.resolve(this._pkgPath, "src", `${this._pkgConf.dbContext}.ts`)) ||
        (this._pkgConf.type === "library" &&
          !this._pkgConf.noGenIndex &&
          filePath === path.resolve(this._pkgPath, "src", "index.ts")),
    }).onChange({ delay: 100 }, async (changeInfos) => {
      const modifiedFileSet = this._getModifiedFileSet(changeInfos, lastWatchFileSet);

      if (modifiedFileSet.size < 1) return;

      this.emit("change");

      let watchResult: IBuildRunnerRunResult;
      try {
        watchResult = await this._runAsync(!this._pkgConf.forceProductionMode, modifiedFileSet);

        lastWatchFileSet = watchResult.watchFileSet;
      } catch (err) {
        watchResult = {
          affectedFileSet: modifiedFileSet,
          buildMessages: [
            {
              filePath: undefined,
              line: undefined,
              char: undefined,
              code: undefined,
              severity: "error",
              message: `파일 변경 처리 중 오류 발생: ${err}`,
              type: "watch",
            },
          ],
          emitFileSet: new Set(),
        };
      }

      this.emit("complete", {
        affectedFilePathSet: watchResult.affectedFileSet,
        buildMessages: watchResult.buildMessages,
        emitFileSet: watchResult.emitFileSet,
      });
    });
  }

  protected _getModifiedFileSet(changeInfos: ISdFsWatcherChangeInfo[], lastWatchFileSet?: Set<TNormPath>) {
    return new Set(
      (lastWatchFileSet
        ? changeInfos.filter((item) =>
            Array.from(lastWatchFileSet).some((item1) => item.path.startsWith(path.dirname(item1))),
          )
        : changeInfos
      ).map((item) => item.path),
    );
  }

  protected abstract _runAsync(dev: boolean, modifiedFileSet?: Set<TNormPath>): Promise<IBuildRunnerRunResult>;

  protected _debug(msg: string): void {
    this._logger.debug(`[${path.basename(this._pkgPath)}] ${msg}`);
  }
}

export interface IBuildRunnerRunResult {
  watchFileSet?: Set<TNormPath>;
  affectedFileSet: Set<TNormPath>;
  buildMessages: ISdBuildMessage[];
  emitFileSet: Set<TNormPath>;
}
