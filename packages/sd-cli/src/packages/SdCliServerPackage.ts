import { ISdPackageBuildResult, ISdServerPackageConfig, ITsconfig } from "../commons";
import { ObjectUtil } from "@simplysm/sd-core-common";
import * as path from "path";
import { FsUtil } from "@simplysm/sd-core-node";
import { SdCliServerBuilder } from "../builders/SdCliServerBuilder";
import { SdServiceServer } from "@simplysm/sd-service-node";
import { SdCliPackageBase } from "./SdCliPackageBase";
import { SdCliPublisher } from "../builders/SdCliPublisher";

export class SdCliServerPackage extends SdCliPackageBase {
  public on(event: "change", listener: (target: "node" | "browser" | undefined) => void): this;
  public on(event: "complete", listener: (target: "node" | "browser" | undefined, results: ISdPackageBuildResult[], server?: SdServiceServer) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public constructor(public readonly rootPath: string,
                     public readonly config: ISdServerPackageConfig,
                     public readonly useCache: boolean) {
    super(rootPath);
  }

  public async buildAsync(): Promise<void> {
    await this._genBuildTsconfigAsync();

    const buildTsconfigFilePath = path.resolve(this.rootPath, `sd-tsconfig.json`);
    const builder = new SdCliServerBuilder(this.rootPath, buildTsconfigFilePath, process.cwd(), this.config, this.useCache);

    await builder
      .on("change", () => {
        this.emit("change", undefined);
      })
      .on("complete", (results) => {
        this.emit("complete", undefined, results);
      })
      .buildAsync();
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

  public async watchAsync(): Promise<void> {
    await this._genBuildTsconfigAsync();

    const buildTsconfigFilePath = path.resolve(this.rootPath, `sd-tsconfig.json`);
    const builder = new SdCliServerBuilder(this.rootPath, buildTsconfigFilePath, process.cwd(), this.config, this.useCache);

    await builder
      .on("change", () => {
        this.emit("change", undefined);
      })
      .on("complete", (results, server) => {
        this.emit("complete", undefined, results, server);
      })
      .watchAsync();
  }

  private async _genBuildTsconfigAsync(): Promise<void> {
    const baseTsconfigFilePath = path.resolve(this.rootPath, "tsconfig.json");
    const baseTsconfig: ITsconfig = await FsUtil.readJsonAsync(baseTsconfigFilePath);

    const buildTsconfig: ITsconfig = ObjectUtil.clone(baseTsconfig);

    buildTsconfig.compilerOptions = buildTsconfig.compilerOptions ?? {};
    delete buildTsconfig.compilerOptions.baseUrl;
    delete buildTsconfig.compilerOptions.paths;
    buildTsconfig.compilerOptions.target = "es2019";
    buildTsconfig.compilerOptions.lib = ["es2019"];
    buildTsconfig.compilerOptions.outDir = "dist";

    buildTsconfig.compilerOptions.declaration = false;
    delete buildTsconfig.compilerOptions.declarationDir;

    const buildTsconfigFilePath = path.resolve(this.rootPath, `sd-tsconfig.json`);
    await FsUtil.writeJsonAsync(buildTsconfigFilePath, buildTsconfig, { space: 2 });
  }
}
