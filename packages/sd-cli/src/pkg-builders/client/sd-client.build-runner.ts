import { FsUtils, PathUtils, SdLogger, TNormPath } from "@simplysm/sd-core-node";
import path from "path";
import { SdNgBundler } from "./sd-ng.bundler";
import { SdCliCordova } from "../../entry/sd-cli-cordova";
import { SdCliElectron } from "../../entry/sd-cli-electron";
import { BuildRunnerBase, IBuildRunnerRunResult } from "../commons/build-runner.base";
import { SdCliNgRoutesFileGenerator } from "./sd-cli-ng-routes.file-generator";
import { INpmConfig } from "../../types/common-configs.types";

export class SdClientBuildRunner extends BuildRunnerBase<"client"> {
  protected override _logger = SdLogger.get(["simplysm", "sd-cli", "SdClientBuildRunner"]);

  private _ngBundlers?: SdNgBundler[];
  private _cordova?: SdCliCordova;

  protected override async _runAsync(
    dev: boolean,
    modifiedFileSet?: Set<TNormPath>,
  ): Promise<IBuildRunnerRunResult> {
    if (!modifiedFileSet) {
      this._debug("GEN .config...");
      const confDistPath = path.resolve(this._pkgPath, "dist/.config.json");
      FsUtils.writeFile(confDistPath, JSON.stringify(this._pkgConf.configs ?? {}, undefined, 2));

      const npmConf = FsUtils.readJson(path.resolve(this._pkgPath, "package.json")) as INpmConfig;

      if ("@angular/router" in (npmConf.dependencies ?? {})) {
        if (!dev) {
          this._debug(`GEN routes.ts...`);
          SdCliNgRoutesFileGenerator.run(this._pkgPath, this._pkgConf.noLazyRoute);
        }
        else {
          this._debug(`Watch for GEN routes.ts...`);
          SdCliNgRoutesFileGenerator.watch(this._pkgPath, this._pkgConf.noLazyRoute);
        }
      }
    }
    else {
      for (const ngBundler of this._ngBundlers!) {
        ngBundler.markForChanges(Array.from(modifiedFileSet));
      }
    }

    const ngBundlerBuilderTypes = Object.keys(this._pkgConf.builder ?? { web: {} }) as (
      | "web"
      | "electron"
      | "cordova"
      )[];
    if (this._pkgConf.builder?.cordova && !this._cordova) {
      this._debug("CORDOVA 준비...");
      this._cordova = new SdCliCordova({
        pkgPath: this._pkgPath,
        config: this._pkgConf.builder.cordova,
      });
      await this._cordova.initializeAsync();
    }

    if (!this._ngBundlers) {
      this._debug(`BUILD 준비...`);

      this._ngBundlers = ngBundlerBuilderTypes.map(
        (ngBundlerBuilderType) =>
          new SdNgBundler({
            dev,
            builderType: ngBundlerBuilderType,
            pkgPath: this._pkgPath,
            outputPath:
              ngBundlerBuilderType === "web"
                ? PathUtils.norm(this._pkgPath, "dist")
                : ngBundlerBuilderType === "electron" && !dev
                  ? PathUtils.norm(this._pkgPath, ".electron/src")
                  : ngBundlerBuilderType === "cordova" && !dev
                    ? PathUtils.norm(this._pkgPath, ".cordova/www")
                    : PathUtils.norm(this._pkgPath, "dist", ngBundlerBuilderType),
            env: {
              ...this._pkgConf.env,
              ...this._pkgConf.builder?.[ngBundlerBuilderType]?.env,
            },
            external:
              ngBundlerBuilderType === "electron"
                ? (this._pkgConf.builder?.electron?.reinstallDependencies ?? [])
                : [],
            cordovaConfig: ngBundlerBuilderType === "cordova"
              ? this._pkgConf.builder!.cordova
              : undefined,
            watchScopePathSet: this._watchScopePathSet,
          }),
      );
    }

    this._debug(`BUILD...`);
    const buildResults = await Promise.all(this._ngBundlers.map((builder) => builder.bundleAsync()));
    const watchFileSet = new Set(buildResults.mapMany((item) => Array.from(item.watchFileSet)));
    const affectedFileSet = new Set(buildResults.mapMany((item) => Array.from(item.affectedFileSet)));
    const emitFileSet = new Set(buildResults.mapMany((item) => Array.from(item.emitFileSet)));
    const results = buildResults.mapMany((item) => item.results).distinct();

    if (!dev && this._cordova) {
      this._debug("CORDOVA BUILD...");
      await this._cordova.buildAsync(path.resolve(this._pkgPath, "dist"));
    }

    if (!dev && this._pkgConf.builder?.electron) {
      this._debug("ELECTRON BUILD...");
      await SdCliElectron.buildAsync({
        pkgPath: this._pkgPath,
        electronConfig: this._pkgConf.builder.electron,
      });
    }

    this._debug(`빌드 완료`);

    return {
      watchFileSet,
      affectedFileSet,
      buildMessages: results,
      emitFileSet,
    };
  }
}
