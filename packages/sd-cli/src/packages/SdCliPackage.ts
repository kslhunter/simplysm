import { INpmConfig, ISdCliPackageBuildResult, ITsconfig, TSdCliPackageConfig } from "../commons";
import path from "path";
import { FsUtil, PathUtil, SdProcess } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import { JsonConvert, NeverEntryError, ObjectUtil, StringUtil } from "@simplysm/sd-core-common";
import { SdCliNpmConfigUtil } from "../utils/SdCliNpmConfigUtil";
import { SdStorage } from "@simplysm/sd-storage";
import ts from "typescript";
import { SdCliGithubApi } from "../build-tool/SdCliGithubApi";
import cp from "child_process";
import { fileURLToPath } from "url";

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

  public async watchAsync(): Promise<void> {
    const isTs = FsUtil.exists(path.resolve(this.rootPath, "tsconfig.json"));

    if (isTs) {
      await this._genBuildTsconfigAsync();
    }

    const workerPath = fileURLToPath(await import.meta.resolve!("../worker/build-worker"));
    await new Promise<void>((resolve, reject) => {
      const worker = cp.fork(workerPath, [
        "watch",
        this.rootPath,
        JsonConvert.stringify(this.config),
        this._workspaceRootPath
      ], {
        stdio: ["pipe", "pipe", "pipe", "ipc"],
        env: process.env
      });

      worker.on("error", (err) => {
        reject(err);
      });

      worker.stdout!.pipe(process.stdout);

      worker.stderr!.pipe(process.stderr);

      worker.on("message", (json: string) => {
        const msg = JsonConvert.parse(json);
        if (msg.event === "ready") {
          resolve();
        }
        else if (msg.event === "change") {
          this.emit("change");
        }
        else if (msg.event === "complete") {
          this.emit("complete", msg.body);
        }
        else {
          throw new NeverEntryError();
        }
      });
    });
  }

  public async buildAsync(): Promise<ISdCliPackageBuildResult[]> {
    const isTs = FsUtil.exists(path.resolve(this.rootPath, "tsconfig.json"));

    if (isTs) {
      await this._genBuildTsconfigAsync();
    }

    const workerPath = fileURLToPath(await import.meta.resolve!("../worker/build-worker"));
    return await new Promise<ISdCliPackageBuildResult[]>((resolve, reject) => {
      const worker = cp.fork(workerPath, [
        "build",
        this.rootPath,
        JsonConvert.stringify(this.config),
        this._workspaceRootPath
      ], {
        env: process.env
      });

      worker.on("error", (err) => {
        reject(err);
      });

      worker.stdout!.on("data", (chunk) => {
        process.stdout.write(chunk);
      });

      worker.stderr!.on("data", (chunk) => {
        process.stderr.write(chunk);
      });

      let result: ISdCliPackageBuildResult[] = [];

      worker.on("message", (json: string) => {
        result = JsonConvert.parse(json);
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`오류와 함께 닫힘 (${code})`));
          return;
        }

        resolve(result);
      });
    });
  }

  public async publishAsync(): Promise<void> {
    if (this.config.publish !== undefined) {
      if (this.config.type === "library") {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (this.config.publish === "npm") {
          await SdProcess.spawnAsync("npm publish --quiet --access public", { cwd: this.rootPath });
        }
        else {
          throw new NeverEntryError();
        }
      }
      else {
        if (this.config.publish.type === "github") {
          const repoUrl = typeof this._npmConfig.repository === "string" ? this._npmConfig.repository : this._npmConfig.repository.url;
          const repoOwner = repoUrl.split("/").slice(-2)[0];
          const repoName = repoUrl.split("/").slice(-2)[1].replace(/\..*/g, "");

          const github = new SdCliGithubApi(
            this.config.publish.apiKey,
            repoOwner,
            repoName
          );

          await github.uploadAsync(this._npmConfig.version, this.config.publish.files.map((item) => ({
            buffer: FsUtil.readFileBuffer(path.resolve(this.rootPath, "dist", item.from)),
            name: item.to
          })));
        }
        else if (this.config.publish.type === "ftp" || this.config.publish.type === "ftps" || this.config.publish.type === "sftp") {
          const tsconfigPath = path.resolve(this.rootPath, "tsconfig-build.json");
          const tsconfig = FsUtil.readJson(tsconfigPath);
          const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this.rootPath, tsconfig.angularCompilerOptions);

          const ftp = await SdStorage.connectAsync(this.config.publish.type, {
            host: this.config.publish.host,
            port: this.config.publish.port,
            user: this.config.publish.user,
            pass: this.config.publish.pass
          });
          await ftp.uploadDirAsync(parsedTsconfig.options.outDir!, this.config.publish.path);
          await ftp.closeAsync();
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        else if (this.config.publish.type === "local-directory") {
          const tsconfigPath = path.resolve(this.rootPath, "tsconfig-build.json");
          const tsconfig = FsUtil.readJson(tsconfigPath);
          const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this.rootPath, tsconfig.angularCompilerOptions);

          const targetRootPath = this.config.publish.path.replace(/%([^%]*)%/g, (item) => {
            const envName = item.replace(/%/g, "");
            if (!StringUtil.isNullOrEmpty(this._npmConfig.version) && envName === "SD_VERSION") {
              return this._npmConfig.version;
            }
            return process.env[envName] ?? item;
          });

          const filePaths = await FsUtil.globAsync(path.resolve(this.rootPath, "**", "*"), {
            dot: true,
            nodir: true
          });

          await filePaths.parallelAsync(async (filePath) => {
            const relativeFilePath = path.relative(parsedTsconfig.options.outDir!, filePath);
            const targetPath = PathUtil.posix(targetRootPath, relativeFilePath);
            await FsUtil.copyAsync(filePath, targetPath);
          });
        }
      }
    }
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
