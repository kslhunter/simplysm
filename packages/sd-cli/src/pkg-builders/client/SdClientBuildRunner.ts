import { FsUtils, PathUtils, SdLogger, TNormPath } from "@simplysm/sd-core-node";
import path from "path";
import { SdBuildRunnerBase } from "../commons/SdBuildRunnerBase";
import { SdNgBundler } from "./SdNgBundler";
import { SdCliCordova } from "../../entry/SdCliCordova";
import { ISdBuildResult } from "../../types/build/ISdBuildResult";
import { INpmConfig } from "../../types/common-config/INpmConfig";
import { SdCliNgRoutesFileGenerator } from "./SdCliNgRoutesFileGenerator";
import { SdCliElectron } from "../../entry/SdCliElectron";

export class SdClientBuildRunner extends SdBuildRunnerBase<"client"> {
  protected override _logger = SdLogger.get(["simplysm", "sd-cli", "SdClientBuildRunner"]);

  #ngBundlers?: SdNgBundler[];
  #cordova?: SdCliCordova;

  protected override async _runAsync(modifiedFileSet?: Set<TNormPath>): Promise<ISdBuildResult> {
    // 최초 한번
    if (!modifiedFileSet) {
      if (!this._noEmit) {
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

        // routes
        const npmConf = FsUtils.readJson(path.resolve(this._pkgPath, "package.json")) as INpmConfig;
        if ("@angular/router" in (npmConf.dependencies ?? {})) {
          this._debug(`GEN routes.ts...`);
          await new SdCliNgRoutesFileGenerator().watchAsync(
            this._pkgPath,
            this._pkgConf.noLazyRoute,
          );
        }
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
            watch: this._watch,
            dev: this._dev,
            emitOnly: this._emitOnly ?? false,
            noEmit: this._noEmit ?? false,
            builderType: ngBundlerBuilderType,
            pkgPath: this._pkgPath,
            outputPath:
              ngBundlerBuilderType === "web"
                ? PathUtils.norm(this._pkgPath, "dist")
                : ngBundlerBuilderType === "electron" && !this._dev
                  ? PathUtils.norm(this._pkgPath, ".electron/src")
                  : ngBundlerBuilderType === "cordova" && !this._dev
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
            cordovaConfig:
              ngBundlerBuilderType === "cordova" ? this._pkgConf.builder!.cordova : undefined,
            scopePathSet: this._scopePathSet,
          }),
      );
    }

    if (modifiedFileSet) {
      for (const ngBundler of this.#ngBundlers!) {
        ngBundler.markForChanges(Array.from(modifiedFileSet));
      }
    }

    if (this._noEmit) {
      this._debug(`BUILD...`);
      const buildResults = await Promise.all(
        this.#ngBundlers!.map((builder) => builder.bundleAsync()),
      );
      const watchFileSet = new Set(buildResults.mapMany((item) => Array.from(item.watchFileSet)));
      const affectedFileSet = new Set(
        buildResults.mapMany((item) => Array.from(item.affectedFileSet)),
      );
      const emitFileSet = new Set(buildResults.mapMany((item) => Array.from(item.emitFileSet)));
      const buildMessages = buildResults.mapMany((item) => item.buildMessages).distinct();

      this._debug(`빌드 완료`);

      return {
        buildMessages,

        watchFileSet,
        affectedFileSet,
        emitFileSet,
      };
    } else {
      this._debug(`BUILD...`);
      const buildResults = await Promise.all(
        this.#ngBundlers!.map((builder) => builder.bundleAsync()),
      );
      const watchFileSet = new Set(buildResults.mapMany((item) => Array.from(item.watchFileSet)));
      const affectedFileSet = new Set(
        buildResults.mapMany((item) => Array.from(item.affectedFileSet)),
      );
      const emitFileSet = new Set(buildResults.mapMany((item) => Array.from(item.emitFileSet)));
      const buildMessages = buildResults.mapMany((item) => item.buildMessages).distinct();

      if (!this._dev && this.#cordova) {
        this._debug("CORDOVA BUILD...");
        await this.#cordova.buildAsync(path.resolve(this._pkgPath, "dist"));
      }

      if (!this._dev && this._pkgConf.builder?.electron) {
        this._debug("ELECTRON BUILD...");
        await SdCliElectron.buildAsync({
          pkgPath: this._pkgPath,
          electronConfig: this._pkgConf.builder.electron,
        });
      }

      this._debug(`빌드 완료`);

      return {
        buildMessages,

        watchFileSet,
        affectedFileSet,
        emitFileSet,
      };
    }
  }
}
