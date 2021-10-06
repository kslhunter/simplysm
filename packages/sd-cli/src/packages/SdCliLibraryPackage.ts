import { ISdAutoIndexConfig, ISdLibraryPackageConfig, ISdPackageBuildResult, ITsconfig } from "../commons";
import { ObjectUtil } from "@simplysm/sd-core-common";
import * as path from "path";
import { FsUtil, Logger, SdProcessManager, SdProcessWorkManager } from "@simplysm/sd-core-node";
import { SdCliPackageBase } from "./SdCliPackageBase";

export class SdCliLibraryPackage extends SdCliPackageBase {
  private readonly _logger: Logger;

  public on(event: "change", listener: (target: "node" | "browser" | undefined) => void): this;
  public on(event: "complete", listener: (target: "node" | "browser" | undefined, results: ISdPackageBuildResult[]) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public constructor(public readonly rootPath: string,
                     public readonly config: ISdLibraryPackageConfig,
                     private readonly _skipProcesses: ("emit" | "check" | "lint" | "genIndex")[],
                     private readonly _processWorkManager: SdProcessWorkManager) {
    super(rootPath);
    this._logger = Logger.get(["simplysm", "sd-cli", this.constructor.name, this.npmConfig.name]);
  }

  public async buildAsync(): Promise<void> {
    await this._runBuildAsync(false);
  }

  public async watchAsync(): Promise<void> {
    await this._runBuildAsync(true);
  }

  public async publishAsync(): Promise<void> {
    if (this.config.publish === "npm") {
      await SdProcessManager.spawnAsync(
        "yarn publish --access public",
        { cwd: this.rootPath },
        false
      );
    }
  }

  private async _runBuildAsync(watch: boolean): Promise<void> {
    await this._genBuildTsconfigAsync();

    if (!this.config.targets || this.config.targets.length < 1) {
      await this._runWorkerAsync(undefined, watch, undefined);
    }
    else {
      const autoIndexConfig = this.config.autoIndex === undefined || this.config.autoIndex === false ? undefined : this.config.autoIndex === true ? {} : this.config.autoIndex;
      await this.config.targets.parallelAsync(async (target) => {
        await this._runWorkerAsync(target, watch, autoIndexConfig);
      });
    }
  }

  private async _runWorkerAsync(target: "node" | "browser" | "angular" | undefined, watch: boolean, autoIndexConfig: ISdAutoIndexConfig | undefined): Promise<void> {
    const worker = await this._processWorkManager.getNextWorkerAsync();
    worker.on("error", (err) => {
      this._logger.error(err, target ?? "none-target");
    });

    const sender = worker.createWorkSender();
    await sender
      .on("change", () => {
        this.emit("change", target);
      })
      .on("complete", (results) => {
        this.emit("complete", target, results);
      })
      .sendAsync(this.rootPath, target, watch, this._skipProcesses, autoIndexConfig);
  }

  private async _genBuildTsconfigAsync(): Promise<void> {
    if (!this.config.targets || this.config.targets.length < 1) {
      return;
    }

    const baseTsconfigFilePath = path.resolve(this.rootPath, "tsconfig.json");
    const baseTsconfig: ITsconfig = await FsUtil.readJsonAsync(baseTsconfigFilePath);

    await this.config.targets.parallelAsync(async (target, i) => {
      const buildTsconfig: ITsconfig = ObjectUtil.clone(baseTsconfig);

      buildTsconfig.compilerOptions = buildTsconfig.compilerOptions ?? {};
      delete buildTsconfig.compilerOptions.baseUrl;
      delete buildTsconfig.compilerOptions.paths;

      buildTsconfig.compilerOptions.target = target === "node" ? "es2019" : "es2015";
      buildTsconfig.compilerOptions.lib = target === "node" ? ["es2019"] : ["es2015", "dom"];
      buildTsconfig.compilerOptions.outDir = `dist-${target}`;
      if (i === 0) {
        buildTsconfig.compilerOptions.declaration = true;
        buildTsconfig.compilerOptions.declarationDir = "dist-types";
      }
      else {
        buildTsconfig.compilerOptions.declaration = false;
        delete buildTsconfig.compilerOptions.declarationDir;
      }

      if (target === "angular") {
        buildTsconfig.compilerOptions.baseUrl = this.rootPath;
        buildTsconfig.angularCompilerOptions = {
          ...buildTsconfig.angularCompilerOptions ?? {},
          enableI18nLegacyMessageIdFormat: false,
          strictInjectionParameters: true,
          strictInputAccessModifiers: true,
          strictTemplates: true,
          strictInputTypes: false,
          strictOutputEventTypes: false
        };
      }

      const buildTsconfigFilePath = path.resolve(this.rootPath, `sd-tsconfig.${target}.json`);
      await FsUtil.writeJsonAsync(buildTsconfigFilePath, buildTsconfig, { space: 2 });
    });
  }
}
