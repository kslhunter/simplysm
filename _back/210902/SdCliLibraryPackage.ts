import { INpmConfig, ISdLibraryPackageConfig, ISdPackageBuildResult, ITsconfig } from "../commons";
import { ObjectUtil } from "@simplysm/sd-core-common";
import * as path from "path";
import { FsUtil, Logger, SdProcessWorkManager } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import { SdCliTypescriptIndexFileGenerator } from "../builders/SdCliTypescriptIndexFileGenerator";

export class SdCliLibraryPackage extends EventEmitter {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);
  public readonly npmConfig: INpmConfig;

  public on(event: "change", listener: (target: "node" | "browser" | undefined) => void): this;
  public on(event: "complete", listener: (target: "node" | "browser" | undefined, results: ISdPackageBuildResult[]) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public constructor(public readonly rootPath: string,
                     public readonly config: ISdLibraryPackageConfig,
                     private readonly _processWorkManager: SdProcessWorkManager) {
    super();
    this.npmConfig = FsUtil.readJson(path.resolve(this.rootPath, "package.json"));
  }

  public async genBuildTsconfigAsync(): Promise<void> {
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

      buildTsconfig.compilerOptions.module = target === "node" ? "commonjs" : "es2020";
      buildTsconfig.compilerOptions.target = target === "node" ? "es2020" : "es2015";
      buildTsconfig.compilerOptions.lib = target === "node" ? ["es2020"] : ["es2015", "dom"];
      buildTsconfig.compilerOptions.outDir = `dist-${target}`;
      if (i === 0) {
        buildTsconfig.compilerOptions.declaration = true;
        buildTsconfig.compilerOptions.declarationDir = "dist-types";
      }
      else {
        buildTsconfig.compilerOptions.declaration = false;
        delete buildTsconfig.compilerOptions.declarationDir;
      }

      const buildTsconfigFilePath = path.resolve(this.rootPath, `sd-tsconfig.${target}.json`);
      await FsUtil.writeJsonAsync(buildTsconfigFilePath, buildTsconfig, { space: 2 });
    });
  }

  public async buildAsync(): Promise<void> {
    await this._runBuildAsync(false);
  }

  public async watchAsync(): Promise<void> {
    await this._runBuildAsync(true);
  }

  private async _runBuildAsync(watch: boolean): Promise<void> {
    if (this.config.autoIndex) {
      const indexFileGenerator = new SdCliTypescriptIndexFileGenerator(this.rootPath, this.config.autoIndex);
      await indexFileGenerator.generateAsync(watch);
    }

    if (!this.config.targets || this.config.targets.length < 1) {
      await this._runWorkerAsync(undefined, watch);
    }
    else {
      await this.config.targets.parallelAsync(async (target) => {
        await this._runWorkerAsync(target, watch);
      });
    }
  }

  private async _runWorkerAsync(target: "node" | "browser" | "angular" | undefined, watch: boolean): Promise<void> {
    const worker = await this._processWorkManager.getNextWorkerAsync();
    worker.on("error", (err) => {
      this._logger.error(err, this.npmConfig.name);
    });

    const sender = worker.createWorkSender();
    await sender
      .on("change", () => {
        this.emit("change", target);
      })
      .on("complete", (results) => {
        this.emit("complete", target, results);
      })
      .sendAsync(this.rootPath, target, watch);
  }
}
