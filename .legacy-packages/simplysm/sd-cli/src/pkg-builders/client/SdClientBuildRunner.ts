import type { TNormPath } from "@simplysm/sd-core-node";
import { FsUtils, SdLogger } from "@simplysm/sd-core-node";
import path from "path";
import { SdBuildRunnerBase } from "../SdBuildRunnerBase";
import { SdNgBundler } from "./SdNgBundler";
import { SdCliCordova } from "../../entry/SdCliCordova";
import type { ISdBuildResult } from "../../types/build/ISdBuildResult";
import type { INpmConfig } from "../../types/common-config/INpmConfig";
import { SdCliNgRoutesFileGenerator } from "./SdCliNgRoutesFileGenerator";
import { SdCliElectron } from "../../entry/SdCliElectron";
import type { ISdClientPackageConfig } from "../../types/config/ISdProjectConfig";
import { SdCliCapacitor } from "../../entry/SdCliCapacitor";

export class SdClientBuildRunner extends SdBuildRunnerBase<"client"> {
  protected override _logger = SdLogger.get(["simplysm", "sd-cli", "SdClientBuildRunner"]);

  private _ngBundlers?: SdNgBundler[];
  private _cordova?: SdCliCordova;
  private _capacitor?: SdCliCapacitor;

  protected override async _runAsync(modifiedFileSet?: Set<TNormPath>): Promise<ISdBuildResult> {
    // 최초 한번
    if (!modifiedFileSet) {
      if (!this._opt.watch?.noEmit) {
        // config
        this._debug("Generating '.config'...");
        const confDistPath = path.resolve(this._opt.pkgPath, "dist/.config.json");
        await FsUtils.writeFileAsync(
          confDistPath,
          JSON.stringify(this._pkgConf.configs ?? {}, undefined, 2),
        );

        // cordova
        if (this._pkgConf.builder?.cordova) {
          this._debug("Preparing Cordova...");
          this._cordova = new SdCliCordova({
            pkgPath: this._opt.pkgPath,
            config: this._pkgConf.builder.cordova,
          });
          await this._cordova.initializeAsync();
        }

        // capacitor
        if (this._pkgConf.builder?.capacitor) {
          this._debug("Preparing Capacitor...");
          this._capacitor = new SdCliCapacitor({
            pkgPath: this._opt.pkgPath,
            config: this._pkgConf.builder.capacitor,
          });
          await this._capacitor.initializeAsync();
        }

        // routes
        const npmConf = (await FsUtils.readJsonAsync(
          path.resolve(this._opt.pkgPath, "package.json"),
        )) as INpmConfig;
        if ("@angular/router" in (npmConf.dependencies ?? {})) {
          if (this._opt.watch) {
            this._debug("Starting routes.ts generator (watch mode)...");
            await new SdCliNgRoutesFileGenerator().watchAsync(
              this._opt.pkgPath,
              this._pkgConf.noLazyRoute,
            );
          } else {
            this._debug(`Generating 'routes.ts'...`);
            await new SdCliNgRoutesFileGenerator().runAsync(
              this._opt.pkgPath,
              this._pkgConf.noLazyRoute,
            );
          }
        }
      }

      // ng
      this._debug(`Preparing build...`);

      const builderTypes = Object.keys(this._pkgConf.builder ?? { web: {} }) as (keyof NonNullable<
        ISdClientPackageConfig["builder"]
      >)[];

      this._ngBundlers = builderTypes.map(
        (builderType) =>
          new SdNgBundler(this._opt, {
            builderType: builderType,
            builderConfig: this._pkgConf.builder?.[builderType],
            env: this._pkgConf.env,
          }),
      );
    }

    if (modifiedFileSet) {
      for (const ngBundler of this._ngBundlers!) {
        ngBundler.markForChanges(Array.from(modifiedFileSet));
      }
    }

    if (this._opt.watch?.noEmit) {
      this._debug(`Building...`);
      const buildResults = await Promise.all(
        this._ngBundlers!.map((builder) => builder.bundleAsync()),
      );
      const watchFileSet = new Set(buildResults.mapMany((item) => Array.from(item.watchFileSet)));
      const affectedFileSet = new Set(
        buildResults.mapMany((item) => Array.from(item.affectedFileSet)),
      );
      const emitFileSet = new Set(buildResults.mapMany((item) => Array.from(item.emitFileSet)));
      const buildMessages = buildResults.mapMany((item) => item.buildMessages).distinct();

      this._debug(`Build completed`);
      return {
        buildMessages,

        watchFileSet,
        affectedFileSet,
        emitFileSet,
      };
    } else {
      this._debug(`Building...`);
      const buildResults = await Promise.all(
        this._ngBundlers!.map((builder) => builder.bundleAsync()),
      );
      const watchFileSet = new Set(buildResults.mapMany((item) => Array.from(item.watchFileSet)));
      const affectedFileSet = new Set(
        buildResults.mapMany((item) => Array.from(item.affectedFileSet)),
      );
      const emitFileSet = new Set(buildResults.mapMany((item) => Array.from(item.emitFileSet)));
      const buildMessages = buildResults.mapMany((item) => item.buildMessages).distinct();

      if (!this._opt.watch?.dev && this._cordova) {
        this._debug("Building Cordova...");
        await this._cordova.buildAsync(path.resolve(this._opt.pkgPath, "dist"));
      }

      if (!this._opt.watch?.dev && this._capacitor) {
        this._debug("Building Capacitor...");
        await this._capacitor.buildAsync(path.resolve(this._opt.pkgPath, "dist"));
      }

      if (!this._opt.watch?.dev && this._pkgConf.builder?.electron) {
        this._debug("Bulding Electron...");
        await SdCliElectron.buildAsync({
          pkgPath: this._opt.pkgPath,
          electronConfig: this._pkgConf.builder.electron,
        });
      }

      this._debug(`Build completed`);
      return {
        buildMessages,

        watchFileSet,
        affectedFileSet,
        emitFileSet,
      };
    }
  }
}
