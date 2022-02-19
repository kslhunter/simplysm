import {
  INpmConfig,
  ISdCliBuildWorkerEvent,
  ISdCliPackageBuildResult,
  ITsconfig,
  TSdCliBuildWorkerResponse,
  TSdCliPackageConfig
} from "../commons";
import path from "path";
import { FsUtil, Logger, SdProcess } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import { JsonConvert, ObjectUtil, SdError } from "@simplysm/sd-core-common";
import { SdCliNpmConfigUtil } from "../utils/SdCliNpmConfigUtil";
import { SdCliClientBuilder } from "../builder/SdCliClientBuilder";
import { NextHandleFunction } from "connect";
import { fileURLToPath } from "url";
import child_process from "child_process";

export class SdCliPackage extends EventEmitter {
  private readonly _logger: Logger;

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

    this._logger = Logger.get(["simplysm", "sd-cli", this.constructor.name, this._npmConfig.name]);
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
    if (FsUtil.exists(path.resolve(this.rootPath, "tsconfig.json"))) {
      await this._genBuildTsconfigAsync();
    }

    if (this.config.type === "client") {
      return await new SdCliClientBuilder(this.rootPath, this.config, this._workspaceRootPath)
        .on("change", () => {
          this.emit("change");
        })
        .on("complete", (results) => {
          this.emit("complete", results);
        })
        .watchAsync();
    }
    else {
      await this._runBuildWorkerAsync(true);
    }
  }

  public async buildAsync(): Promise<ISdCliPackageBuildResult[]> {
    if (FsUtil.exists(path.resolve(this.rootPath, "tsconfig.json"))) {
      await this._genBuildTsconfigAsync();
    }

    return await this._runBuildWorkerAsync(false);
  }

  public async publishAsync(): Promise<void> {
    if (this.config.type === "library" && this.config.publish === "npm") {
      await SdProcess.spawnAsync("npm publish --quiet --access public", { cwd: this.rootPath });
    }
  }

  private async _runBuildWorkerAsync(watch: true): Promise<child_process.ChildProcess>;
  private async _runBuildWorkerAsync(watch: false): Promise<ISdCliPackageBuildResult[]>;
  private async _runBuildWorkerAsync(watch: boolean): Promise<any> {
    this._logger.debug("빌드 프로세스 워커 시작...");

    const worker = child_process.fork(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../workers/sd-cli-build-worker"),
      [
        JsonConvert.stringify({
          workspaceRootPath: this._workspaceRootPath,
          rootPath: this.rootPath,
          config: this.config,
          watch
        })
      ],
      {
        ...watch ? { stdio: ["pipe", "pipe", "pipe", "ipc"] } : {},
        execArgv: process.execArgv
      }
    );

    if (watch) {
      worker.on("message", (arg) => {
        const evt: ISdCliBuildWorkerEvent = JsonConvert.parse(arg);
        if (evt.name === "change") {
          this.emit("change");
        }
        else if (evt.name === "complete") {
          this.emit("complete", evt.body);
        }
      });
    }

    worker.stderr!.on("data", (data: Buffer) => {
      this._logger.debug("내부 프로세스 메시지\n", data.toString());
    });

    return await new Promise<any>((resolve, reject) => {
      worker.stdout!.on("data", (data: Buffer) => {
        try {
          const res: TSdCliBuildWorkerResponse = JsonConvert.parse(data.toString());
          if (res.type === "error") {
            reject(new SdError(res.body, "프로세스 수행중 오류가 발생하였습니다. 내부에러를 참고하세요."));
            return;
          }
          if (watch) {
            this._logger.debug("빌드 프로세스 워커 시작");
            resolve(worker);
          }
          else {
            this._logger.debug("빌드 프로세스 워커 시작");
            resolve(res.body);
          }
        }
        catch (err) {
          this._logger.debug("내부 프로세스 메시지\n", data.toString());
        }
      });
    });
  }

  private async _genBuildTsconfigAsync(): Promise<void> {
    const baseTsconfigFilePath = path.resolve(this.rootPath, "tsconfig.json");
    const baseTsconfig: ITsconfig = await FsUtil.readJsonAsync(baseTsconfigFilePath);

    const buildTsconfig: ITsconfig = ObjectUtil.clone(baseTsconfig);
    buildTsconfig.compilerOptions = buildTsconfig.compilerOptions ?? {};
    delete buildTsconfig.compilerOptions.baseUrl;
    delete buildTsconfig.compilerOptions.paths;

    buildTsconfig.compilerOptions.declaration = Boolean(this._npmConfig.types);

    const buildTsconfigFilePath = path.resolve(this.rootPath, "tsconfig-build.json");
    await FsUtil.writeJsonAsync(buildTsconfigFilePath, buildTsconfig, { space: 2 });
  }
}
