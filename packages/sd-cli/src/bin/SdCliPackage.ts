import {FsUtils, Logger, ProcessManager, ProcessWorkManager} from "@simplysm/sd-core-node";
import {INpmConfig, ISdPackageInfo, TSdPackageConfig} from "../commons";
import * as path from "path";
import * as ts from "typescript";
import {ISdPackageBuildResult, SdPackageBuilder} from "../build-tools/SdPackageBuilder";
import {EventEmitter} from "events";
import {NeverEntryError, ObjectUtils, SdError} from "@simplysm/sd-core-common";
import {NextHandleFunction} from "connect";
import {SdServiceClient} from "@simplysm/sd-service-node";

export class SdCliPackage extends EventEmitter {
  public get name(): string {
    return this.info.npmConfig.name;
  }

  public get dependencies(): string[] {
    return [
      ...Object.keys(this.info.npmConfig.dependencies ?? {}),
      ...Object.keys(this.info.npmConfig.devDependencies ?? {}),
      ...Object.keys(this.info.npmConfig.peerDependencies ?? {})
    ];
  }

  public get entryFilePath(): string | undefined {
    if (this.info.npmConfig.main === undefined) return undefined;
    return path.resolve(this.info.rootPath, this.info.npmConfig.main);
  }

  private get _isAngular(): boolean {
    return this.info.npmConfig.dependencies !== undefined &&
      Object.keys(this.info.npmConfig.dependencies).includes("@angular/core");
  }

  public static async createAsync(rootPath: string, npmConfig: INpmConfig, npmConfigPath: string, config: TSdPackageConfig | undefined, devMode: boolean): Promise<SdCliPackage> {
    const info: Partial<ISdPackageInfo> = {rootPath};

    const tsConfigPath = path.resolve(rootPath, "tsconfig.json");
    if (FsUtils.exists(tsConfigPath)) {
      const tsConfig = await FsUtils.readJsonAsync(tsConfigPath);

      info.tsConfig = {
        filePath: tsConfigPath,
        config: tsConfig
      };

      if (config) {
        let targets: ("browser" | "node")[] | undefined;
        if (config.type === "library") {
          targets = config.targets;
        }
        else if (config.type === "server") {
          targets = ["node"];
        }
        else {
          targets = ["browser"];
        }

        if (targets) {
          await targets.parallelAsync(async target => {
            const tsConfigForBuildPath = path.resolve(rootPath, `tsconfig-${target}.build.json`);

            info.tsConfigForBuild = info.tsConfigForBuild ?? {};
            info.tsConfigForBuild[target] = {
              filePath: tsConfigForBuildPath
            };

            if (FsUtils.exists(tsConfigForBuildPath)) {
              info.tsConfigForBuild[target]!.config = await FsUtils.readJsonAsync(tsConfigForBuildPath);
            }
          });
        }
      }
    }

    info.npmConfig = npmConfig;
    info.npmConfigPath = npmConfigPath;
    info.config = config;

    const logger = Logger.get(["simplysm", "sd-cli", "package", info.npmConfig.name]);

    return new SdCliPackage(info as ISdPackageInfo, devMode, logger);
  }

  private constructor(public readonly info: ISdPackageInfo,
                      private readonly _devMode: boolean,
                      private readonly _logger: Logger) {
    super();
  }

  public on(event: "change", listener: (arg: { packageName: string; command: string; target?: string; filePaths?: string[] }) => void): this;
  public on(event: "complete", listener: (arg: { packageName: string; command: string; target?: string; results: ISdPackageBuildResult[] }) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public async updateVersionAsync(version: string, dependencyNames: string[]): Promise<void> {
    this.info.npmConfig.version = version;

    const fn = (currDeps: { [key: string]: string | undefined } | undefined): void => {
      if (currDeps) {
        for (const dependencyName of dependencyNames) {
          if (currDeps[dependencyName] !== undefined) {
            currDeps[dependencyName] = version;
          }
        }
      }
    };

    fn(this.info.npmConfig.dependencies);
    fn(this.info.npmConfig.devDependencies);
    fn(this.info.npmConfig.peerDependencies);

    await FsUtils.writeJsonAsync(this.info.npmConfigPath, this.info.npmConfig, {space: 2});
  }

  public async createTsBuildConfigAsync(): Promise<void> {
    // if (!this._info.config) return;
    if (!this.info.tsConfigForBuild) return;

    const targets: ("node" | "browser")[] = Object.keys(this.info.tsConfigForBuild) as ("node" | "browser")[];

    if (!this.info.tsConfig) return;
    if (!this.info.tsConfigForBuild) return;
    const parsedTsConfig = ts.parseJsonConfigFileContent(this.info.tsConfig.config, ts.sys, this.info.rootPath);

    await targets.parallelAsync(async target => {
      if (!this.info.tsConfig) throw new NeverEntryError();
      if (!this.info.tsConfigForBuild) throw new NeverEntryError();
      if (!this.info.tsConfigForBuild[target]) return;

      const config = ObjectUtils.clone(this.info.tsConfig.config);
      const options = config.compilerOptions;

      delete options.baseUrl;
      delete options.paths;

      options.target = target === "browser" ? "es5" : "es2017";

      if (targets.length > 1 && target !== "node") {

        const defaultDistPath = parsedTsConfig.options.outDir !== undefined ?
          path.resolve(parsedTsConfig.options.outDir) :
          path.resolve(this.info.rootPath, "dist");

        options.outDir = path.relative(this.info.rootPath, defaultDistPath) + "-" + target;
        options.declaration = false;
      }

      await FsUtils.writeJsonAsync(this.info.tsConfigForBuild[target]!.filePath, config, {space: 2});

      this.info.tsConfigForBuild[target]!.config = config;
    });
  }

  public async removeDistPathAsync(): Promise<void> {
    const targets = this.info.tsConfigForBuild ? Object.keys(this.info.tsConfigForBuild) : undefined;
    if (!targets) return;

    await targets.parallelAsync(async target => {
      const parsedTsConfig = ts.parseJsonConfigFileContent(this.info.tsConfigForBuild![target].config, ts.sys, this.info.rootPath);

      const distPath = parsedTsConfig.options.outDir !== undefined ?
        path.resolve(parsedTsConfig.options.outDir) :
        path.resolve(this.info.rootPath, "dist");

      await FsUtils.removeAsync(distPath);
    });
  }

  public async genIndexAsync(processManager: ProcessWorkManager): Promise<void> {
    if (this.info.config?.type === undefined || this.info.config.type === "none") return;

    if (this.info.config?.type !== "library") return;
    if (this.info.npmConfig?.main === undefined) return;

    const target = this.info.tsConfigForBuild ? Object.keys(this.info.tsConfigForBuild)[0] : undefined;
    if (target === undefined) return;

    await this._runAsync(processManager, "gen-index", target);
  }

  public async lintAsync(processManager: ProcessWorkManager): Promise<void> {
    // if (this.info.config?.type === undefined || this.info.config.type === "none") return;

    const targets = this.info.tsConfigForBuild ? Object.keys(this.info.tsConfigForBuild) : undefined;
    const target = targets === undefined ? undefined :
      targets.length === 1 ? targets[0] :
        targets.single(item => item === "node");

    await this._runAsync(processManager, "lint", target);
  }

  public async checkAsync(processManager: ProcessWorkManager): Promise<void> {
    if (this.info.config?.type === undefined || this.info.config.type === "none") return;

    const targets = this.info.tsConfigForBuild ? Object.keys(this.info.tsConfigForBuild) : undefined;
    if (!targets) return;

    await targets.parallelAsync(async target => {
      await this._runAsync(processManager, "check", target);
    });
  }

  public async compileAsync(processManager: ProcessWorkManager): Promise<void | NextHandleFunction[]> {
    if (this.info.config?.type === undefined || this.info.config.type === "none") return;

    if (this.info.config?.type === "library") {
      const targets = this.info.tsConfigForBuild ? Object.keys(this.info.tsConfigForBuild) : undefined;
      if (!targets) return;

      await targets.parallelAsync(async target => {
        await this._runAsync(processManager, "compile", target);
      });
    }
    else if (this.info.config?.type === "server") {
      await this._runAsync(processManager, "compile", "node");
    }
    else {
      throw new NeverEntryError();
    }
  }

  public async compileClientAsync(watch: boolean): Promise<void | NextHandleFunction[]> {
    if (this.info.config?.type !== "web") throw new NeverEntryError();

    const command = "compile";
    const target = "browser";

    return await new SdPackageBuilder(this.info, command, target, this._devMode)
      .on("change", filePaths => {
        this.emit("change", {packageName: this.name, command, target, filePaths});
      })
      .on("complete", results => {
        this.emit("complete", {packageName: this.name, command, target, results});
      })
      .runClientAsync(watch);
  }

  public async genNgAsync(processManager: ProcessWorkManager): Promise<void> {
    if (this.info.config?.type === undefined || this.info.config.type === "none") return;

    if (!this._isAngular) return;

    const targets = this.info.tsConfigForBuild ? Object.keys(this.info.tsConfigForBuild) : undefined;
    if (!targets) return;

    await targets.filter(item => item === "browser").parallelAsync(async target => {
      await this._runAsync(processManager, "gen-ng", target);
    });
  }

  public async publishAsync(): Promise<void> {
    if (this.info.config?.type === undefined || this.info.config.type === "none") return;

    if (this.info.config?.type === "library" && this.info.config.publish === "npm") {
      await ProcessManager.spawnAsync(
        "yarn publish --access public",
        {cwd: this.info.rootPath},
        false,
        false
      );
    }
    else if (this.info.config?.type !== "library" && this.info.config.publish !== undefined && this.info.config.publish.type === "simplysm") {
      const publishConfig = this.info.config.publish;

      const wsClient = new SdServiceClient(
        publishConfig.port ?? (publishConfig.ssl ? 443 : 80),
        publishConfig.host,
        publishConfig.ssl
      );
      await wsClient.connectAsync();

      // 결과 파일 업로드

      const targets = this.info.tsConfigForBuild ? Object.keys(this.info.tsConfigForBuild) : undefined;
      if (!targets) return;

      const fileInfos: { [key: string]: { total: number; current: number } } = {};
      await targets.parallelAsync(async target => {
        const parsedTsConfig = ts.parseJsonConfigFileContent(this.info.tsConfigForBuild![target].config, ts.sys, this.info.rootPath);

        const distPath = parsedTsConfig.options.outDir !== undefined ?
          path.resolve(parsedTsConfig.options.outDir) :
          path.resolve(this.info.rootPath, "dist");

        const filePaths = await FsUtils.globAsync(path.resolve(distPath, "**", "*"), {dot: true, nodir: true});

        await filePaths.parallelAsync(async filePath => {
          const relativeFilePath = path.relative(distPath, filePath);
          const targetPath = path.posix.join(publishConfig.path, relativeFilePath);

          try {
            await wsClient.uploadAsync(filePath, targetPath, {
              progressCallback: progress => {
                fileInfos[filePath] = fileInfos[filePath] ?? {};
                fileInfos[filePath].current = progress.current;
                fileInfos[filePath].total = progress.total;

                const displayCurrent = Object.values(fileInfos).sum(item => item.current);
                const displayTotal = Object.values(fileInfos).sum(item => item.total);
                this._logger.debug(`파일 업로드 : (${(Math.floor(displayCurrent * 10000 / displayTotal) / 100).toFixed(2).padStart(6, " ")}%) ${displayCurrent.toLocaleString()} / ${displayTotal.toLocaleString()}`);
              }
            });
          }
          catch (err) {
            throw new SdError(err, this.info.npmConfig.name);
          }
        });
      });

      await wsClient.closeAsync();
    }
  }

  private async _runAsync(processManager: ProcessWorkManager, command: string, target?: string): Promise<void> {
    this._logger.debug("workerRun: " + this.name + ": " + command + ": " + target);

    await processManager.getNextWorker()
      .on("change", data => {
        if (
          data.packageName === this.name &&
          data.command === command &&
          data.target === target
        ) {
          this.emit("change", data);
        }
      })
      .on("complete", data => {
        if (
          data.packageName === this.name &&
          data.command === command &&
          data.target === target
        ) {
          this.emit("complete", data);
        }
      })
      .sendAsync(this.info, command, target, this._devMode);

    this._logger.debug("workerRun: " + this.name + ": " + command + ": " + target + ": end");
  }
}