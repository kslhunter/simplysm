import {NotImplementError, ObjectUtil, Wait} from "@simplysm/sd-core-common";
import * as fs from "fs-extra";
import * as path from "path";
import {ISdNpmConfig, ISdProjectConfig} from "./common";
import * as os from "os";
import * as semver from "semver";
import {FsUtil, Logger, ProcessManager} from "@simplysm/sd-core-node";

export class SdProjectBuilder {
  private readonly _options: string[];
  private _config?: ISdProjectConfig;
  private _npmConfig?: ISdNpmConfig;
  private _packageNpmConfigs?: { [path: string]: ISdNpmConfig };

  public constructor(optionsText: string | undefined,
                     private readonly _mode: "development" | "production") {
    this._options = optionsText?.split(",").map((item) => item.trim()) ?? [];
  }

  private async _getConfigAsync(): Promise<ISdProjectConfig> {
    if (!this._config) {
      const config = await fs.readJson(path.resolve(process.cwd(), "simplysm.json"));

      for (const packageName of Object.keys(config.packages)) {
        // extends 처리
        if (config.packages[packageName].extends) {
          for (const extendKey of config.packages[packageName].extends) {
            const extendObj = config.extends[extendKey];
            config.packages[packageName] = ObjectUtil.merge(config.packages[packageName], extendObj);
          }
          delete config.packages[packageName].extends;
        }

        // mode 처리
        if (config.packages[packageName][this._mode]) {
          config.packages[packageName] = ObjectUtil.merge(config.packages[packageName], config.packages[packageName][this._mode]!);
        }
        delete config.packages[packageName]["development"];
        delete config.packages[packageName]["production"];

        // options 처리
        if (this._options.length > 0) {
          const pkgOpts = Object.keys(config.packages[packageName])
            .filter((key) => key.startsWith("@") && this._options.some((opt) => opt === key.slice(1)));

          for (const pkgOpt of pkgOpts) {
            config.packages[packageName] = ObjectUtil.merge(config.packages[packageName], config.packages[packageName][pkgOpt]);
          }
        }

        for (const optKey of Object.keys(config.packages[packageName]).filter((item) => item.startsWith("@"))) {
          delete config.packages[packageName][optKey];
        }
      }

      delete config.extends;

      this._config = config;
    }

    return this._config!;
  }

  private async _getNpmConfigAsync(): Promise<ISdNpmConfig> {
    if (!this._npmConfig) {
      const filePath = path.resolve(process.cwd(), "package.json");
      this._npmConfig = await fs.readJson(filePath);
    }

    return this._npmConfig!;
  }

  private async _saveNpmConfigAsync(npmConfig: ISdNpmConfig): Promise<void> {
    this._npmConfig = npmConfig;
    await fs.writeJson(path.resolve(process.cwd(), "package.json"), npmConfig, {spaces: 2, EOL: os.EOL});
  }

  private async _getPackageNpmConfigsAsync(): Promise<{ [key: string]: ISdNpmConfig }> {
    if (!this._packageNpmConfigs) {
      const npmConfig = await this._getNpmConfigAsync();
      if (!npmConfig.workspaces) {
        throw new Error("package.json 에 workspaces 정의가 없습니다.");
      }

      const packagePaths = (
        await npmConfig.workspaces.mapAsync(async (workspace) =>
          await FsUtil.globAsync(workspace)
        )
      ).mapMany((item) => item);

      const npmConfigs: { [key: string]: ISdNpmConfig } = {};
      await Promise.all(packagePaths.map(async (packagePath) => {
        const packageNpmConfigPath = path.resolve(packagePath, "package.json");
        npmConfigs[packagePath] = await fs.readJson(packageNpmConfigPath);
      }));

      this._packageNpmConfigs = npmConfigs;
    }

    return this._packageNpmConfigs!;
  }

  private async _savePackageNpmConfigAsync(packagePath: string, npmConfig: ISdNpmConfig): Promise<void> {
    this._npmConfig = npmConfig;
    await fs.writeJson(path.resolve(packagePath, "package.json"), npmConfig, {spaces: 2, EOL: os.EOL});
  }

  private async _generateTsConfigForBuildAsync(tsConfigPath: string): Promise<string> {
    const packagePath = path.dirname(tsConfigPath);
    const isMulti = (await fs.readdir(packagePath)).filter((item) => /^tsconfig.*json$/.test(item)).length > 1;

    const tsConfig = await fs.readJson(tsConfigPath);
    const tsConfigOptions = tsConfig.compilerOptions;
    if (tsConfigOptions.baseUrl && tsConfigOptions.paths) {
      for (const tsPathKey of Object.keys(tsConfigOptions.paths)) {
        const result = [];
        for (const tsPathValue of tsConfigOptions.paths[tsPathKey] as string[]) {
          result.push(tsPathValue.replace(/\/src\/index\..*ts$/, ""));
        }
        tsConfigOptions.paths[tsPathKey] = result;
      }
    }

    if (
      isMulti &&
      (
        tsConfig.extends.startsWith("tsconfig") ||
        tsConfig.extends.startsWith("./tsconfig")
      )
    ) {
      const extendsExtName = path.extname(tsConfig.extends);
      const extendsBaseName = path.basename(tsConfig.extends, extendsExtName);
      tsConfig.extends = "./" + extendsBaseName + ".build" + extendsExtName;
    }

    const dirName = path.dirname(tsConfigPath);
    const extName = path.extname(tsConfigPath);
    const baseName = path.basename(tsConfigPath, extName);

    const tsConfigPathForBuildPath = path.resolve(dirName, baseName + ".build" + extName);
    await fs.writeJson(tsConfigPathForBuildPath, tsConfig, {spaces: 2, EOL: os.EOL});

    return tsConfigPathForBuildPath;
  }

  public async buildAsync(watch?: boolean): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", watch ? "watch" : "build"]);

    await this._updateVersionAsync();

    const packageNpmConfigs = await this._getPackageNpmConfigsAsync();
    await Promise.all(Object.keys(packageNpmConfigs).map(async (packagePath) => {
      // TODO: distPath
      // TODO: 전체 구조 다시...
      await fs.remove(path.resolve(packagePath, "dist"));
    }));

    logger.info("빌드 프로세스를 시작합니다.");

    await Promise.all([
      // build
      Promise.all(Object.keys(packageNpmConfigs).map(async (packagePath) => {
        const packageNpmConfig = packageNpmConfigs[packagePath];
        const packageName = packageNpmConfig.name;

        const config = await this._getConfigAsync();
        const packageConfig = config.packages[packageName];
        if (!packageConfig?.type) {
          return;
        }

        if (packageConfig.type === "library") {
          await this._runLibraryWorkersAsync("build", packageName, packagePath, watch);
        }
        else if (packageConfig.type === "server") {
          throw new NotImplementError();
        }
        else if (packageConfig.type === "web") {
          throw new NotImplementError();
        }
        else {
          throw new Error("패키지의 빌드 타입은 ['library', 'web', 'server']중 하나여야 합니다.");
        }
      })),
      // check
      this._parallelPackagesByDependencyAsync(async (packageName, packagePath) => {
        const config = await this._getConfigAsync();
        const packageConfig = config.packages[packageName];
        if (!packageConfig?.type) {
          return;
        }

        if (packageConfig.type === "library") {
          await this._runLibraryWorkersAsync("check", packageName, packagePath, watch);
        }
        else if (packageConfig.type === "server") {
          throw new NotImplementError();
        }
        else if (packageConfig.type === "web") {
          throw new NotImplementError();
        }
        else {
          throw new Error("패키지의 빌드 타입은 ['library', 'web', 'server']중 하나여야 합니다.");
        }
      })
    ]);

    logger.info(`모든 빌드 프로세스가 완료되었습니다`);
  }

  private async _runLibraryWorkersAsync(command: string, packageName: string, packagePath: string, watch?: boolean): Promise<void> {
    const config = await this._getConfigAsync();
    const packageConfig = config.packages[packageName];
    if (!packageConfig?.type) {
      return;
    }

    if (packageConfig.type === "library") {
      const tsConfigPaths = [path.resolve(packagePath, "tsconfig.json")];
      const tsConfigForNodePath = path.resolve(packagePath, "tsconfig-node.json");
      if (await fs.pathExists(tsConfigForNodePath)) {
        tsConfigPaths.push(tsConfigForNodePath);
      }

      await Promise.all(tsConfigPaths.map(async (tsConfigPath) => {
        const tsConfigPathForBuild = await this._generateTsConfigForBuildAsync(tsConfigPath);
        await this._runWorkerAsync({
          command,
          tsConfigPath: tsConfigPathForBuild,
          mode: this._mode,
          watch
        });
      }));
    }
  }

  private async _runWorkerAsync(args: { [key: string]: (string | number | boolean | undefined) }): Promise<void> {
    await new Promise<void>(async (resolve, reject) => {
      try {
        const worker = await ProcessManager.forkAsync(
          require.resolve(`./build-worker`),
          [
            ...Object.keys(args).map((key) => args[key] ? `--${key}=${args[key]}` : undefined).filterExists()
          ]
        );

        worker.on("message", (message: any) => {
          if (message === "done") {
            resolve();
          }
        });

        worker.on("exit", (code) => {
          if (code !== 0) {
            reject(new Error("'worker'를 실행하는 중에 오류가 발생했습니다."));
          }
        });
      }
      catch (err) {
        reject(err);
      }
    });
  }

  private async _updateVersionAsync(): Promise<void> {
    // 프로젝트의 package.json 버전 올리기
    const npmConfig = await this._getNpmConfigAsync();
    npmConfig.version = semver.inc(npmConfig.version, this._mode === "development" ? "prerelease" : "patch")!;
    await this._saveNpmConfigAsync(npmConfig);

    // 각 패키지의 package.json 에 버전적용
    const packageNpmConfigs = await this._getPackageNpmConfigsAsync();
    await Promise.all(Object.keys(packageNpmConfigs).map(async (packagePath) => {
      const packageNpmConfig = packageNpmConfigs[packagePath];

      // 프로젝트 버전 복사
      packageNpmConfig.version = npmConfig.version;

      // 의존성에 프로젝트 버전 복사
      if (packageNpmConfig.dependencies) {
        const depPackageNames = Object.keys(packageNpmConfig.dependencies)
          .filter((pkgDepPackageName) =>
            Object.values(packageNpmConfigs)
              .some((targetPackageNpmConfig) => targetPackageNpmConfig.name === pkgDepPackageName)
          );

        for (const depPackageName of depPackageNames) {
          packageNpmConfig.dependencies[depPackageName] = npmConfig.version;
        }
      }

      // 의존성(dev)에 프로젝트 버전 복사
      if (packageNpmConfig.devDependencies) {
        const devDepPackageNames = Object.keys(packageNpmConfig.devDependencies)
          .filter((pkgDepPackageName) =>
            Object.values(packageNpmConfigs)
              .some((targetPackageNpmConfig) => targetPackageNpmConfig.name === pkgDepPackageName)
          );

        for (const devDepPackageName of devDepPackageNames) {
          packageNpmConfig.devDependencies[devDepPackageName] = npmConfig.version;
        }
      }

      // 의존성(peer)에 프로젝트 버전 복사
      if (packageNpmConfig.peerDependencies) {
        const peerDepPackageNames = Object.keys(packageNpmConfig.peerDependencies)
          .filter((pkgDepPackageName) =>
            Object.values(packageNpmConfigs)
              .some((targetPackageNpmConfig) => targetPackageNpmConfig.name === pkgDepPackageName)
          );

        for (const peerDepPackageName of peerDepPackageNames) {
          packageNpmConfig.peerDependencies[peerDepPackageName] = npmConfig.version;
        }
      }

      await this._savePackageNpmConfigAsync(packagePath, packageNpmConfig);
    }));
  }

  private async _parallelPackagesByDependencyAsync(cb: (packageName: string, packagePath: string) => Promise<void>): Promise<void> {
    const completedPackageNames: string[] = [];

    const packageNpmConfigs = await this._getPackageNpmConfigsAsync();
    await Promise.all(Object.keys(packageNpmConfigs).map(async (packagePath) => {
      const packageNpmConfig = packageNpmConfigs[packagePath];

      // 패키지의 의존성 패키지 중에 빌드해야할 패키지 목록에 이미 있는 의존성 패키지만 추리기
      const depPackageNames = [
        ...Object.keys(packageNpmConfig.dependencies ?? {}),
        ...Object.keys(packageNpmConfig.devDependencies ?? {}),
        ...Object.keys(packageNpmConfig.peerDependencies ?? {})
      ].filter((pkgDepPackageName) =>
        Object.values(packageNpmConfigs)
          .some((targetPackageNpmConfig) => targetPackageNpmConfig.name === pkgDepPackageName)
      );

      // 추려진 의존성 패키지별로 의존성 패키지의 빌드가 완료될때까지 기다리기
      await Promise.all(depPackageNames.map(async (depPackageName) => {
        await Wait.true(() => completedPackageNames.includes(depPackageName));
      }));

      await cb(packageNpmConfig.name, packagePath);

      completedPackageNames.push(packageNpmConfig.name);
    }));
  }
}
