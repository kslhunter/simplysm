import { INpmConfig, ISdCliPackageBuildResult, ITsconfig, TSdCliPackageConfig } from "../commons";
import path from "path";
import { FsUtil, SdProcess } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { SdCliTsLibBuilder } from "../builder/SdCliTsLibBuilder";
import { SdCliJsLibBuilder } from "../builder/SdCliJsLibBuilder";

export class SdCliPackage extends EventEmitter {
  private readonly _npmConfig: INpmConfig;

  public get name(): string {
    return this._npmConfig.name;
  }

  public get allDependencies(): string[] {
    return [
      ...Object.keys(this._npmConfig.dependencies ?? {}),
      ...Object.keys(this._npmConfig.optionalDependencies ?? {}),
      ...Object.keys(this._npmConfig.devDependencies ?? {}),
      ...Object.keys(this._npmConfig.peerDependencies ?? {})
    ].distinct();
  }

  public constructor(private readonly _workspaceRootPath: string,
                     private readonly _rootPath: string,
                     private readonly _config: TSdCliPackageConfig) {
    super();

    const npmConfigFilePath = path.resolve(this._rootPath, "package.json");
    this._npmConfig = FsUtil.readJson(npmConfigFilePath);
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (results: ISdCliPackageBuildResult[]) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public async setNewVersionAsync(newVersion: string, pkgNames: string[]): Promise<void> {
    this._npmConfig.version = newVersion;

    const updateDepVersion = (deps: Record<string, string> | undefined): void => {
      if (!deps) return;
      for (const depName of Object.keys(deps)) {
        if (pkgNames.includes(depName)) {
          deps[depName] = newVersion;
        }
      }
    };
    updateDepVersion(this._npmConfig.dependencies);
    updateDepVersion(this._npmConfig.optionalDependencies);
    updateDepVersion(this._npmConfig.devDependencies);
    updateDepVersion(this._npmConfig.peerDependencies);

    const npmConfigFilePath = path.resolve(this._rootPath, "package.json");
    await FsUtil.writeJsonAsync(npmConfigFilePath, this._npmConfig, { space: 2 });
  }

  public async watchAsync(): Promise<void> {
    const isTs = FsUtil.exists(path.resolve(this._rootPath, "tsconfig.json"));

    if (isTs) {
      await this._genBuildTsconfigAsync();
    }

    const isAngular = isTs && this.allDependencies.includes("@angular/core");
    const builder = !isTs ? new SdCliJsLibBuilder(this._rootPath) : new SdCliTsLibBuilder(this._rootPath, isAngular);

    await builder
      .on("change", () => {
        this.emit("change");
      })
      .on("complete", (results) => {
        this.emit("complete", results);
      })
      .watchAsync();
  }

  public async buildAsync(): Promise<ISdCliPackageBuildResult[]> {
    const isTs = FsUtil.exists(path.resolve(this._rootPath, "tsconfig.json"));

    if (isTs) {
      await this._genBuildTsconfigAsync();
    }

    const isAngular = isTs && this.allDependencies.includes("@angular/core");
    const builder = isTs ? new SdCliTsLibBuilder(this._rootPath, isAngular) : new SdCliJsLibBuilder(this._rootPath);

    return await builder.buildAsync();
  }

  public async publishAsync(): Promise<void> {
    if (this._config.type === "library" && this._config.publish === "npm") {
      await SdProcess.execAsync("npm publish --quiet --access public", { cwd: this._rootPath });
    }
  }

  private async _genBuildTsconfigAsync(): Promise<void> {
    const baseTsconfigFilePath = path.resolve(this._rootPath, "tsconfig.json");
    const baseTsconfig: ITsconfig = await FsUtil.readJsonAsync(baseTsconfigFilePath);

    const buildTsconfig: ITsconfig = ObjectUtil.clone(baseTsconfig);
    buildTsconfig.compilerOptions = buildTsconfig.compilerOptions ?? {};
    delete buildTsconfig.compilerOptions.baseUrl;
    delete buildTsconfig.compilerOptions.paths;

    const buildTsconfigFilePath = path.resolve(this._rootPath, "tsconfig-build.json");
    await FsUtil.writeJsonAsync(buildTsconfigFilePath, buildTsconfig, { space: 2 });
  }
}
