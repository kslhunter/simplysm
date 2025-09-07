import { FsUtils, SdLogger, TNormPath } from "@simplysm/sd-core-node";
import path from "path";
import { SdBuildRunnerBase } from "../SdBuildRunnerBase";
import { SdNgBundler } from "./SdNgBundler";
import { SdCliCordova } from "../../entry/SdCliCordova";
import { ISdBuildResult } from "../../types/build/ISdBuildResult";
import { INpmConfig } from "../../types/common-config/INpmConfig";
import { SdCliNgRoutesFileGenerator } from "./SdCliNgRoutesFileGenerator";
import { SdCliElectron } from "../../entry/SdCliElectron";
import { ISdClientPackageConfig } from "../../types/config/ISdProjectConfig";

export class SdClientBuildRunner extends SdBuildRunnerBase<"client"> {
  protected override _logger = SdLogger.get(["simplysm", "sd-cli", "SdClientBuildRunner"]);

  #ngBundlers?: SdNgBundler[];
  #cordova?: SdCliCordova;

  protected override async _runAsync(modifiedFileSet?: Set<TNormPath>): Promise<ISdBuildResult> {
    // 최초 한번
    if (!modifiedFileSet) {
      if (!this._opt.watch?.noEmit) {
        // config
        this._debug("GEN .config...");
        const confDistPath = path.resolve(this._opt.pkgPath, "dist/.config.json");
        FsUtils.writeFile(confDistPath, JSON.stringify(this._pkgConf.configs ?? {}, undefined, 2));

        // cordova
        if (this._pkgConf.builder?.cordova) {
          this._debug("CORDOVA 준비...");
          this.#cordova = new SdCliCordova({
            pkgPath: this._opt.pkgPath,
            config: this._pkgConf.builder.cordova,
          });
          await this.#cordova.initializeAsync();
        }

        // routes
        const npmConf = FsUtils.readJson(
          path.resolve(this._opt.pkgPath, "package.json"),
        ) as INpmConfig;
        if ("@angular/router" in (npmConf.dependencies ?? {})) {
          this._debug(`GEN routes.ts...`);
          await new SdCliNgRoutesFileGenerator().watchAsync(
            this._opt.pkgPath,
            this._pkgConf.noLazyRoute,
          );
        }
      }

      // ng
      this._debug(`BUILD 준비...`);

      const builderTypes = Object.keys(this._pkgConf.builder ?? { web: {} }) as (keyof NonNullable<
        ISdClientPackageConfig["builder"]
      >)[];

      this.#ngBundlers = builderTypes.map(
        (builderType) =>
          new SdNgBundler(this._opt, {
            builderType: builderType,
            builderConfig: this._pkgConf.builder?.[builderType],
            env: this._pkgConf.env,
          }),
      );
    }

    if (modifiedFileSet) {
      for (const ngBundler of this.#ngBundlers!) {
        ngBundler.markForChanges(Array.from(modifiedFileSet));
      }
    }

    if (this._opt.watch?.noEmit) {
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

      if (!this._opt.watch?.dev && this.#cordova) {
        this._debug("CORDOVA BUILD...");
        await this.#cordova.buildAsync(path.resolve(this._opt.pkgPath, "dist"));
      }

      if (!this._opt.watch?.dev && this._pkgConf.builder?.electron) {
        this._debug("ELECTRON BUILD...");
        await SdCliElectron.buildAsync({
          pkgPath: this._opt.pkgPath,
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
