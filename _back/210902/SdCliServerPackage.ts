import { INpmConfig, ISdPackageBuildResult, ISdServerPackageConfig, ITsconfig } from "../commons";
import { ObjectUtil } from "@simplysm/sd-core-common";
import * as path from "path";
import { FsUtil, Logger } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import { SdCliServerBuilder } from "../builders/SdCliServerBuilder";
import { SdServiceServer } from "@simplysm/sd-service-node";

export class SdCliServerPackage extends EventEmitter {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);
  public readonly npmConfig: INpmConfig;

  public on(event: "change", listener: (target: "node" | "browser" | undefined) => void): this;
  public on(event: "complete", listener: (target: "node" | "browser" | undefined, results: ISdPackageBuildResult[], server?: SdServiceServer) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public constructor(public readonly rootPath: string,
                     public readonly config: ISdServerPackageConfig) {
    super();
    this.npmConfig = FsUtil.readJson(path.resolve(this.rootPath, "package.json"));
  }

  public async genBuildTsconfigAsync(): Promise<void> {
    const baseTsconfigFilePath = path.resolve(this.rootPath, "tsconfig.json");
    const baseTsconfig: ITsconfig = await FsUtil.readJsonAsync(baseTsconfigFilePath);

    const buildTsconfig: ITsconfig = ObjectUtil.clone(baseTsconfig);

    buildTsconfig.compilerOptions = buildTsconfig.compilerOptions ?? {};
    delete buildTsconfig.compilerOptions.baseUrl;
    delete buildTsconfig.compilerOptions.paths;
    buildTsconfig.compilerOptions.module = "commonjs";
    buildTsconfig.compilerOptions.target = "es2020";
    buildTsconfig.compilerOptions.lib = ["es2020"];
    buildTsconfig.compilerOptions.outDir = "dist";

    buildTsconfig.compilerOptions.declaration = false;
    delete buildTsconfig.compilerOptions.declarationDir;

    const buildTsconfigFilePath = path.resolve(this.rootPath, `sd-tsconfig.json`);
    await FsUtil.writeJsonAsync(buildTsconfigFilePath, buildTsconfig, { space: 2 });
  }

  public async buildAsync(): Promise<void> {
    const buildTsconfigFilePath = path.resolve(this.rootPath, `sd-tsconfig.json`);
    const builder = new SdCliServerBuilder(this.rootPath, buildTsconfigFilePath, process.cwd(), this.config);

    await builder
      .on("change", () => {
        this.emit("change", undefined);
      })
      .on("complete", (results) => {
        this.emit("complete", undefined, results);
      })
      .buildAsync();
  }

  public async watchAsync(): Promise<void> {
    const buildTsconfigFilePath = path.resolve(this.rootPath, `sd-tsconfig.json`);
    const builder = new SdCliServerBuilder(this.rootPath, buildTsconfigFilePath, process.cwd(), this.config);

    await builder
      .on("change", () => {
        this.emit("change", undefined);
      })
      .on("complete", (results, server) => {
        this.emit("complete", undefined, results, server);
      })
      .watchAsync();
  }
}
