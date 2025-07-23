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

  #routeGenerator = new SdCliNgRoutesFileGenerator();
  #ngBundlers?: SdNgBundler[];
  #cordova?: SdCliCordova;

  #hasGenRoutesError = false;

  protected override async _runAsync(dev: boolean, modifiedFileSet?: Set<TNormPath>): Promise<IBuildRunnerRunResult> {
    // 최초 한번
    if (!modifiedFileSet) {
      // config
      this._debug("GEN .config...");
      const confDistPath = path.resolve(this._pkgPath, "dist/.config.json");
      FsUtils.writeFile(confDistPath, JSON.stringify(this._pkgConf.configs ?? {}, undefined, 2));

      // cordova
      if (this._pkgConf.builder?.cordova) {
        this._debug("CORDOVA 준비...");
        this.#cordova = new SdCliCordova({
          pkgPath: this._pkgPath,
          config: this._pkgConf.builder.cordova,
        });
        await this.#cordova.initializeAsync();
      }

      // ng
      this._debug(`BUILD 준비...`);

      const ngBundlerBuilderTypes = Object.keys(this._pkgConf.builder ?? { web: {} }) as (
        | "web"
        | "electron"
        | "cordova"
      )[];

      this.#ngBundlers = ngBundlerBuilderTypes.map(
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
              ngBundlerBuilderType === "electron" ? (this._pkgConf.builder?.electron?.reinstallDependencies ?? []) : [],
            cordovaConfig: ngBundlerBuilderType === "cordova" ? this._pkgConf.builder!.cordova : undefined,
            watchScopePathSet: this._watchScopePathSet,
          }),
      );
    }

    const npmConf = FsUtils.readJson(path.resolve(this._pkgPath, "package.json")) as INpmConfig;

    let routesFileNPath: TNormPath | undefined;
    if ("@angular/router" in (npmConf.dependencies ?? {})) {
      this._debug(`GEN routes.ts...`);
      const genRoutesResult = this.#routeGenerator.run(this._pkgPath, this._pkgConf.noLazyRoute);
      if (modifiedFileSet && (genRoutesResult.changed || this.#hasGenRoutesError)) {
        modifiedFileSet.add(PathUtils.norm(genRoutesResult.filePath));
      }
      routesFileNPath = PathUtils.norm(genRoutesResult.filePath);
    }

    if (modifiedFileSet) {
      for (const ngBundler of this.#ngBundlers!) {
        ngBundler.markForChanges(Array.from(modifiedFileSet));
      }
    }

    this._debug(`BUILD...`);
    const buildResults = await Promise.all(this.#ngBundlers!.map((builder) => builder.bundleAsync()));
    const watchFileSet = new Set(buildResults.mapMany((item) => Array.from(item.watchFileSet)));
    const affectedFileSet = new Set(buildResults.mapMany((item) => Array.from(item.affectedFileSet)));
    const emitFileSet = new Set(buildResults.mapMany((item) => Array.from(item.emitFileSet)));
    const results = buildResults.mapMany((item) => item.results).distinct();

    if (!dev && this.#cordova) {
      this._debug("CORDOVA BUILD...");
      await this.#cordova.buildAsync(path.resolve(this._pkgPath, "dist"));
    }

    if (!dev && this._pkgConf.builder?.electron) {
      this._debug("ELECTRON BUILD...");
      await SdCliElectron.buildAsync({
        pkgPath: this._pkgPath,
        electronConfig: this._pkgConf.builder.electron,
      });
    }

    this.#hasGenRoutesError = routesFileNPath != null && results.map((item) => item.filePath).includes(routesFileNPath);

    this._debug(`빌드 완료`);

    return {
      watchFileSet,
      affectedFileSet,
      buildMessages: results,
      emitFileSet,
    };
  }
}
