import { INpmConfig, ISdPackageBuildResult, ITsConfig, TSdPackageConfig } from "../commons";
import * as path from "path";
import { FsUtil, SdProcessManager, SdProcessWorker, SdProcessWorkManager } from "@simplysm/sd-core-node";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { EventEmitter } from "events";
import { SdCliPathUtil } from "../utils/SdCliPathUtil";
import { SdCliIndexFileGenerateWatcher } from "../build-tools/SdCliIndexFileGenerateWatcher";
import { SdCliServerCompiler } from "../build-tools/SdCliServerCompiler";
import { SdServiceServer } from "@simplysm/sd-service-node";
import { NextHandleFunction } from "connect";
import { SdCliClientCompiler } from "../build-tools/SdCliClientCompiler";
import { SdFtpStorage, SdSFtpStorage } from "@simplysm/sd-storage";

export class SdCliPackage extends EventEmitter {
  public get fullDependencies(): string[] {
    return [
      ...Object.keys(this.npmConfig.dependencies ?? {}),
      ...Object.keys(this.npmConfig.devDependencies ?? {}),
      ...Object.keys(this.npmConfig.peerDependencies ?? {})
    ];
  }

  public constructor(public readonly rootPath: string,
                     public readonly npmConfig: INpmConfig,
                     public readonly config: TSdPackageConfig,
                     private readonly _processWorkManager?: SdProcessWorkManager) {
    super();
  }

  public on(event: "change", listener: (type: "compile" | "check" | "lint" | "ng-gen", target: "node" | "browser" | undefined) => void): this;
  public on(event: "complete", listener: (type: "compile" | "check" | "lint" | "ng-gen", target: "node" | "browser" | undefined, results: ISdPackageBuildResult[], server?: SdServiceServer) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public async updateVersionAsync(projectName: string, newVersion: string): Promise<void> {
    this.npmConfig.version = newVersion;

    const updateDepVersion = (deps: Record<string, string> | undefined): void => {
      if (!deps) return;
      for (const dependencyName of Object.keys(deps)) {
        if (dependencyName.startsWith("@" + projectName)) {
          deps[dependencyName] = newVersion;
        }
      }
    };
    updateDepVersion(this.npmConfig.dependencies);
    updateDepVersion(this.npmConfig.devDependencies);
    updateDepVersion(this.npmConfig.peerDependencies);

    const npmConfigFilePath = SdCliPathUtil.getNpmConfigFilePath(this.rootPath);
    await FsUtil.writeJsonAsync(npmConfigFilePath, this.npmConfig, { space: 2 });
  }

  public async genBuildTsConfigAsync(): Promise<void> {
    if (this.config.type === "library") {
      if (!this.config.targets) return;

      const baseTsconfigFilePath = SdCliPathUtil.getTsConfigBaseFilePath(this.rootPath);
      const baseTsconfig: ITsConfig = await FsUtil.readJsonAsync(baseTsconfigFilePath);

      if (this.fullDependencies.includes("@angular/core")) {
        const buildTsconfig: ITsConfig = ObjectUtil.clone(baseTsconfig);
        buildTsconfig.compilerOptions = buildTsconfig.compilerOptions ?? {};

        // tsconfig-paths
        delete buildTsconfig.compilerOptions.baseUrl;
        delete buildTsconfig.compilerOptions.paths;

        // per target
        buildTsconfig.compilerOptions.target = "es5";
        buildTsconfig.compilerOptions.outDir = `dist`;
        buildTsconfig.compilerOptions.declaration = true;
        buildTsconfig.compilerOptions.declarationDir = "dist";

        const buildTsconfigFilePath = SdCliPathUtil.getTsConfigBuildFilePath(this.rootPath, "browser");
        await FsUtil.writeJsonAsync(buildTsconfigFilePath, buildTsconfig, { space: 2 });
      }
      else {
        await this.config.targets.parallelAsync(async (target, i) => {
          const buildTsconfig: ITsConfig = ObjectUtil.clone(baseTsconfig);
          buildTsconfig.compilerOptions = buildTsconfig.compilerOptions ?? {};

          // tsconfig-paths
          delete buildTsconfig.compilerOptions.baseUrl;
          delete buildTsconfig.compilerOptions.paths;

          // per target
          buildTsconfig.compilerOptions.target = target === "node" ? "es2017" : "es5";
          buildTsconfig.compilerOptions.outDir = `dist-${target}`;
          if (i === 0) {
            buildTsconfig.compilerOptions.declaration = true;
            buildTsconfig.compilerOptions.declarationDir = "dist-types";
          }
          else {
            buildTsconfig.compilerOptions.declaration = false;
            delete buildTsconfig.compilerOptions.declarationDir;
          }

          const buildTsconfigFilePath = SdCliPathUtil.getTsConfigBuildFilePath(this.rootPath, target);
          await FsUtil.writeJsonAsync(buildTsconfigFilePath, buildTsconfig, { space: 2 });
        });
      }
    }
    else {
      const isClient = this.config.type === "client-browser" || this.config.type === "client-windows";

      const baseTsconfigFilePath = SdCliPathUtil.getTsConfigBaseFilePath(this.rootPath);
      const baseTsconfig: ITsConfig = await FsUtil.readJsonAsync(baseTsconfigFilePath);

      const buildTsconfig: ITsConfig = ObjectUtil.clone(baseTsconfig);
      buildTsconfig.compilerOptions = buildTsconfig.compilerOptions ?? {};

      delete buildTsconfig.compilerOptions.baseUrl;
      delete buildTsconfig.compilerOptions.paths;
      buildTsconfig.compilerOptions.target = isClient ? "es5" : "es2017";
      buildTsconfig.compilerOptions.outDir = `dist`;
      buildTsconfig.compilerOptions.declaration = false;
      delete buildTsconfig.compilerOptions.declarationDir;

      const buildTsconfigFilePath = SdCliPathUtil.getTsConfigBuildFilePath(this.rootPath, isClient ? "browser" : "node");
      await FsUtil.writeJsonAsync(buildTsconfigFilePath, buildTsconfig, { space: 2 });
    }
  }

  public async runGenIndexAsync(): Promise<void> {
    if (this.config.type !== "library") return;
    if (!this.config.targets) return;

    if (this.npmConfig.main === undefined) return;

    await new SdCliIndexFileGenerateWatcher(this.rootPath, this.config.polyfills)
      .watchAsync();
  }

  public async runCompileAsync(watch: boolean): Promise<NextHandleFunction[] | undefined> {
    if (this.config.type === "library") {
      if (!this.config.targets) return undefined;

      await this.config.targets.parallelAsync(async (target) => {
        await this._runWorkerAsync("compile", target);
      });
    }
    else if (this.config.type === "server") {
      const serverCompiler = new SdCliServerCompiler(this.rootPath, this.config)
        .on("change", () => {
          this.emit("change", "compile", undefined);
        })
        .on("complete", (results, server) => {
          this.emit("complete", "compile", undefined, results, server);
        });
      if (watch) {
        await serverCompiler.watchAsync();
      }
      else {
        await serverCompiler.compileAsync();
      }
    }
    else if (this.config.type === "client-browser" || this.config.type === "client-windows") {
      const clientCompiler = new SdCliClientCompiler(this.rootPath, this.config)
        .on("change", () => {
          this.emit("change", "compile", undefined);
        })
        .on("complete", (results) => {
          this.emit("complete", "compile", undefined, results);
        });

      if (watch) {
        return await clientCompiler.watchAsync();
      }
      else {
        await clientCompiler.compileAsync();
      }
    }

    return undefined;
  }

  public async runCheckAsync(): Promise<void> {
    if (this.config.type === "library") {
      if (!this.config.targets) return;

      await this.config.targets.parallelAsync(async (target) => {
        await this._runWorkerAsync("check", target);
      });
    }
    else if (this.config.type === "client-browser" || this.config.type === "client-windows") {
      await this._runWorkerAsync("check", "browser");
    }
    else if (this.config.type === "server") {
      await this._runWorkerAsync("check", "node");
    }
    if (this.config.type === "test") {
      await this._runWorkerAsync("check", undefined);
    }
  }

  public async runLintAsync(): Promise<void> {
    if (this.config.type === "test") {
      await this._runWorkerAsync("lint", undefined);
    }
    else if (this.config.type === "library") {
      if (!this.config.targets || this.config.targets.length < 1) {
        await this._runWorkerAsync("lint", undefined);
      }
      else {
        await this._runWorkerAsync("lint", this.config.targets[0]);
      }
    }
    else if (this.config.type === "server") {
      await this._runWorkerAsync("lint", "node");
    }
    else if (this.config.type === "client-browser" || this.config.type === "client-windows") {
      await this._runWorkerAsync("lint", "browser");
    }
  }

  public async runNgGenAsync(): Promise<void> {
    if (this.config.type === "library") {
      if (!this.config.targets) return;
      if (!this.config.targets.includes("browser")) return;
      if (!this.fullDependencies.includes("@angular/core")) return;

      await this._runWorkerAsync("ng-gen", "browser");
    }
    else if (this.config.type === "client-browser" || this.config.type === "client-windows") {
      if (!this.fullDependencies.includes("@angular/core")) return;
      await this._runWorkerAsync("ng-gen", "browser");
    }
  }

  public async publishAsync(): Promise<void> {
    if (this.config.type === "library") {
      if (this.config.publish === "npm") {
        await SdProcessManager.spawnAsync(
          "yarn publish --access public",
          { cwd: this.rootPath },
          false
        );
      }
    }
    else if (this.config.type === "client-browser" || this.config.type === "client-windows" || this.config.type === "server") {
      if (this.config.publish?.type === "sftp") {
        const publishConfig = this.config.publish;
        const sftp = new SdSFtpStorage();
        await sftp.connectAsync({
          host: publishConfig.host,
          port: publishConfig.port,
          username: publishConfig.username,
          password: publishConfig.password
        });

        try {
          // 결과 파일 업로드
          const distPath = path.resolve(this.rootPath, `dist`);

          await sftp.uploadDirAsync(distPath, publishConfig.path);

          await sftp.closeAsync();
        }
        catch (err) {
          try {
            await sftp.closeAsync();
          }
          catch {
          }
          throw err;
        }
      }
      else if (this.config.publish?.type === "local-directory") {
        const targetRootPath = this.config.publish.path.replace(/%([^%]*)%/g, (item) => {
          const envName = item.replace(/%/g, "");
          if (envName === "SD_VERSION") {
            return this.npmConfig.version;
          }
          return process.env[envName] ?? item;
        });

        const distPath = path.resolve(this.rootPath, `dist`);

        const filePaths = await FsUtil.globAsync(path.resolve(distPath, "**", "*"), { dot: true, nodir: true });

        await filePaths.parallelAsync(async (filePath) => {
          const relativeFilePath = path.relative(distPath, filePath);
          const targetPath = path.posix.join(targetRootPath, relativeFilePath);

          await FsUtil.copyAsync(filePath, targetPath);
        });
      }
      else if (this.config.publish?.type === "ftp") {
        const publishConfig = this.config.publish;
        const ftp = new SdFtpStorage();
        await ftp.connectAsync({
          host: publishConfig.host,
          port: publishConfig.port,
          username: publishConfig.username,
          password: publishConfig.password
        });

        try {
          // 결과 파일 업로드
          const distPath = path.resolve(this.rootPath, `dist`);

          await ftp.uploadDirAsync(distPath, publishConfig.path);

          await ftp.closeAsync();
        }
        catch (err) {
          try {
            await ftp.closeAsync();
          }
          catch {
          }
          throw err;
        }
      }
    }
  }

  private async _runWorkerAsync(type: "compile" | "check" | "lint" | "ng-gen", target: "node" | "browser" | undefined): Promise<void> {
    const worker = this._processWorkManager ?
      await this._processWorkManager.getNextWorkerAsync() :
      await SdProcessWorker.createAsync(path.resolve(__dirname, `../workers/build-worker`), []);

    const sender = worker.createWorkSender();
    await sender
      .on("change", () => {
        this.emit("change", type, target);
      })
      .on("complete", (results) => {
        this.emit("complete", type, target, results);
      })
      .sendAsync(type, this.rootPath, target);
  }
}