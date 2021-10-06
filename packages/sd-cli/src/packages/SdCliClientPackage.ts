import { FsUtil } from "@simplysm/sd-core-node";
import { ISdClientPackageConfig, ISdPackageBuildResult, ITsconfig } from "../commons";
import * as path from "path";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { SdCliNgClientBuilder } from "../builders/SdCliNgClientBuilder";
import { NextHandleFunction } from "connect";
import { SdCliPackageBase } from "./SdCliPackageBase";
import { SdCliPublisher } from "../builders/SdCliPublisher";

export class SdCliClientPackage extends SdCliPackageBase {
  public on(event: "change", listener: (target: "node" | "browser" | undefined) => void): this;
  public on(event: "complete", listener: (target: "node" | "browser" | undefined, results: ISdPackageBuildResult[]) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public constructor(public readonly rootPath: string,
                     public readonly config: ISdClientPackageConfig,
                     public readonly useCache: boolean,
                     public readonly _serverPath?: string) {
    super(rootPath);
  }

  public async buildAsync(): Promise<void> {
    await this._genBuildTsconfigAsync();

    const buildTsconfigFilePath = path.resolve(this.rootPath, `sd-tsconfig.json`);
    const builder = new SdCliNgClientBuilder(this.rootPath, buildTsconfigFilePath, process.cwd(), this.config, this.useCache);

    await builder
      .on("change", () => {
        this.emit("change", undefined);
      })
      .on("complete", (results) => {
        this.emit("complete", undefined, results);
      })
      .buildAsync();
  }

  public async watchAsync(): Promise<NextHandleFunction[]> {
    await this._genBuildTsconfigAsync();

    const buildTsconfigFilePath = path.resolve(this.rootPath, `sd-tsconfig.json`);
    const builder = new SdCliNgClientBuilder(this.rootPath, buildTsconfigFilePath, process.cwd(), this.config, this.useCache);
    return await builder
      .on("change", () => {
        this.emit("change", undefined);
      })
      .on("complete", (results) => {
        this.emit("complete", undefined, results);
      })
      .watchAsync(this._serverPath);
  }

  public async publishAsync(): Promise<void> {
    if (this.config.publish) {
      const publisher = new SdCliPublisher(
        this.config.publish,
        path.resolve(this.rootPath, "dist"),
        this.npmConfig.version
      );
      await publisher.runAsync();
    }
  }

  private async _genBuildTsconfigAsync(): Promise<void> {
    const baseTsconfigFilePath = path.resolve(this.rootPath, "tsconfig.json");
    const baseTsconfig: ITsconfig = await FsUtil.readJsonAsync(baseTsconfigFilePath);

    const buildTsconfig: ITsconfig = ObjectUtil.clone(baseTsconfig);

    buildTsconfig.compilerOptions = buildTsconfig.compilerOptions ?? {};
    delete buildTsconfig.compilerOptions.baseUrl;
    delete buildTsconfig.compilerOptions.paths;
    buildTsconfig.compilerOptions.module = "es2020";
    buildTsconfig.compilerOptions.target = "es2015";
    buildTsconfig.compilerOptions.lib = ["es2015", "dom"];
    buildTsconfig.compilerOptions.outDir = `dist`;
    buildTsconfig.compilerOptions.declaration = false;
    delete buildTsconfig.compilerOptions.declarationDir;

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

    const buildTsconfigFilePath = path.resolve(this.rootPath, `sd-tsconfig.json`);
    await FsUtil.writeJsonAsync(buildTsconfigFilePath, buildTsconfig, { space: 2 });
  }
}
