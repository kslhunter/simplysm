import { INpmConfig, ISdCliPackageBuildResult, ITsconfig, TSdCliPackageConfig } from "../commons";
import path from "path";
import { FsUtil, SdProcess } from "@simplysm/sd-core/node";
import { EventEmitter } from "events";
import { ObjectUtil } from "@simplysm/sd-core/common";
import { SdCliTsLibBuilder } from "../builder/SdCliTsLibBuilder";
import { SdCliJsLibBuilder } from "../builder/SdCliJsLibBuilder";
import { SdCliServerBuilder } from "../builder/SdCliServerBuilder";
import { SdCliNpmConfigUtil } from "../utils/SdCliNpmConfigUtil";
import { SdCliClientBuilder } from "../builder/SdCliClientBuilder";
import { NextHandleFunction } from "connect";

export class SdCliPackage extends EventEmitter {
  private readonly _npmConfig: INpmConfig;

  public get basename(): string {
    return path.basename(this._workspaceRootPath);
  }

  public get name(): string {
    return this._npmConfig.name;
  }

  public get main(): string | undefined {
    return this._npmConfig.main;
  }

  public get allDependencies(): string[] {
    return [
      ...SdCliNpmConfigUtil.getDependencies(this._npmConfig).defaults,
      ...SdCliNpmConfigUtil.getDependencies(this._npmConfig).optionals
    ].distinct();
  }

  public constructor(private readonly _workspaceRootPath: string,
                     public readonly rootPath: string,
                     public readonly config: TSdCliPackageConfig) {
    super();

    const npmConfigFilePath = path.resolve(this.rootPath, "package.json");
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

    const npmConfigFilePath = path.resolve(this.rootPath, "package.json");
    await FsUtil.writeJsonAsync(npmConfigFilePath, this._npmConfig, { space: 2 });
  }

  public async watchAsync(): Promise<NextHandleFunction[] | void> {
    return await (await this._createBuilderAsync())
      .on("change", () => {
        this.emit("change");
      })
      .on("complete", (results) => {
        this.emit("complete", results);
      })
      .watchAsync();
  }

  public async buildAsync(): Promise<ISdCliPackageBuildResult[]> {
    return await (await this._createBuilderAsync()).buildAsync();
  }

  public async publishAsync(): Promise<void> {
    if (this.config.type === "library" && this.config.publish === "npm") {
      await SdProcess.spawnAsync("npm publish --quiet --access public", { cwd: this.rootPath });
    }
  }

  private async _createBuilderAsync(): Promise<SdCliJsLibBuilder | SdCliTsLibBuilder | SdCliServerBuilder | SdCliClientBuilder> {
    const isTs = FsUtil.exists(path.resolve(this.rootPath, "tsconfig.json"));

    if (isTs) {
      await this._genBuildTsconfigAsync();
    }

    if (this.config.type === "library") {
      // const isAngular = isTs && this.allDependencies.includes("@angular/core");
      return isTs ? new SdCliTsLibBuilder(this.rootPath) : new SdCliJsLibBuilder(this.rootPath);
    }
    else if (this.config.type === "server") {
      return new SdCliServerBuilder(this.rootPath, this.config, this._workspaceRootPath);
    }
    else {
      return new SdCliClientBuilder(this.rootPath, this.config, this._workspaceRootPath);
    }
  }

  private async _genBuildTsconfigAsync(): Promise<void> {
    const baseTsconfigFilePath = path.resolve(this.rootPath, "tsconfig.json");
    const baseTsconfig: ITsconfig = await FsUtil.readJsonAsync(baseTsconfigFilePath);

    const buildTsconfig: ITsconfig = ObjectUtil.clone(baseTsconfig);
    buildTsconfig.compilerOptions = buildTsconfig.compilerOptions ?? {};
    delete buildTsconfig.compilerOptions.baseUrl;
    delete buildTsconfig.compilerOptions.paths;

    const buildTsconfigFilePath = path.resolve(this.rootPath, "tsconfig-build.json");
    await FsUtil.writeJsonAsync(buildTsconfigFilePath, buildTsconfig, { space: 2 });
  }
}
