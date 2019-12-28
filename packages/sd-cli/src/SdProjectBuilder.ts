import {Logger, ProcessManager} from "@simplysm/sd-core-node";
import {SdCliUtil} from "./SdCliUtil";
import * as path from "path";
import * as fs from "fs-extra";
import {ObjectUtil, Wait} from "@simplysm/sd-core-common";
import * as os from "os";
import * as ts from "typescript";
import * as semver from "semver";
import {SdPackageBuilder} from "./SdPackageBuilder";
import {SdAngularBuilder} from "./SdAngularBuilder";
import {NextHandleFunction} from "connect";
import {SdServiceServer} from "@simplysm/sd-service-server";

export class SdProjectBuilder {
  private readonly _options: string[];
  private readonly _serverMap = new Map<string, {
    server: SdServiceServer;
    middlewares: NextHandleFunction[];
    clientKeys: string[];
  }>();

  public constructor(options?: string) {
    this._options = options?.split(",").map((item) => item.trim()) || [];
  }

  public async buildAsync(watch: boolean): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", "build"]);

    // 프로젝트의 package.json 버전 올리기
    const projectNpmConfigPath = path.resolve(process.cwd(), "package.json");
    const projectNpmConfig = await fs.readJson(projectNpmConfigPath);
    projectNpmConfig.version = semver.inc(projectNpmConfig.version, watch ? "prerelease" : "patch");
    await fs.writeJson(projectNpmConfigPath, projectNpmConfig, {spaces: 2, EOL: os.EOL});

    // 각 패키지의 package.json 에 버전적용
    const packagePaths = (await fs.readdir(path.resolve(process.cwd(), "packages")))
      .map((item) => path.resolve(process.cwd(), "packages", item));
    if (await fs.pathExists(path.resolve(process.cwd(), "test"))) {
      packagePaths.push(path.resolve(process.cwd(), "test"));
    }
    await Promise.all(packagePaths.map(async (packagePath) => {
      const packageNpmConfigPath = path.resolve(packagePath, "package.json");
      const packageNpmConfig = await fs.readJson(packageNpmConfigPath);

      // 버전에 프로젝트 버전 복사
      packageNpmConfig.version = projectNpmConfig.version;

      // 의존성에 프로젝트 버전 복사
      const depKeys = Object.keys(packageNpmConfig.dependencies).filter((key) => key.startsWith("@" + projectNpmConfig.name + "/"));
      for (const depKey of depKeys) {
        packageNpmConfig.dependencies[depKey] = projectNpmConfig.version;
      }

      const devDepKeys = Object.keys(packageNpmConfig.devDependencies).filter((key) => key.startsWith("@" + projectNpmConfig.name + "/"));
      for (const depKey of devDepKeys) {
        packageNpmConfig.devDependencies[depKey] = projectNpmConfig.version;
      }

      await fs.writeJson(packageNpmConfigPath, packageNpmConfig, {spaces: 2, EOL: os.EOL});
    }));

    // "simplysm.json" 정보 가져오기
    const config = await SdCliUtil.getConfigObjAsync(watch ? "development" : "production", this._options);
    const packageKeys = Object.keys(config.packages)
      .filter((packageKey) => config.packages[packageKey].type !== "none");

    // 패키지정보별 병렬실행,
    await Promise.all(packageKeys.map(async (packageKey) => {
      const packagePath = path.resolve(process.cwd(), "packages", packageKey);
      const packageTsConfigPath = path.resolve(packagePath, "tsconfig.json");
      const packageTsConfig = await fs.readJson(packageTsConfigPath);
      const packageParsedTsConfig = ts.parseJsonConfigFileContent(packageTsConfig, ts.sys, packagePath);

      // dist 삭제
      const distPath = packageParsedTsConfig.options.outDir ? path.resolve(packageParsedTsConfig.options.outDir) : path.resolve(packagePath, "dist");
      await fs.remove(distPath);

      // tsconfig.build.json 구성
      const buildTsConfig = this._tsConfigToBuildVersion(packageTsConfig);
      await fs.writeJson(path.resolve(packagePath, "tsconfig.build.json"), buildTsConfig, {spaces: 2, EOL: os.EOL});

      // tsconfig-node.build.json 구성
      const packageTsConfigForNodePath = path.resolve(packagePath, "tsconfig-node.json");
      if (await fs.pathExists(packageTsConfigForNodePath)) {
        const packageTsConfigForNode = await fs.readJson(packageTsConfigForNodePath);
        const buildTsConfigForNode = this._tsConfigToBuildVersion(packageTsConfigForNode);
        buildTsConfigForNode.extends = "./tsconfig.build.json";
        await fs.writeJson(path.resolve(packagePath, "tsconfig-node.build.json"), buildTsConfigForNode, {
          spaces: 2,
          EOL: os.EOL
        });
      }
    }));

    logger.info("빌드 프로세스를 시작합니다.");

    await this._parallelPackagesByDepAsync(packageKeys, async (packageKey) => {
      const packageConfig = config.packages[packageKey];

      if (config.packages[packageKey].type === "web") {
        const builder = new SdAngularBuilder(packageKey);

        if (!watch) {
          await builder.buildAsync();
        }
        else {
          const middlewares = await builder.watchAsync();

          if (!packageConfig.server) {
            throw new Error(`서버 패키지가 설정되어있지 않습니다. (client, ${packageKey})`);
          }

          if (!Object.keys(config.packages).includes(packageConfig.server)) {
            throw new Error(`클라이언트를 올릴 서버 패키지가 빌드 설정에 존재하지 않습니다. (client, ${packageKey})`);
          }

          await Wait.true(() => this._serverMap.has(packageConfig.server!));
          const serverInfo = this._serverMap.get(packageConfig.server)!;

          serverInfo.clientKeys.push(packageKey);
          serverInfo.middlewares.push(...middlewares);
          for (const middleware of middlewares) {
            serverInfo.server.addMiddleware(middleware);
          }

          logger.info(`개발서버 서비스가 시작되었습니다.: http://localhost:${serverInfo.server.port}/${packageKey}/`);
        }
      }
      else {
        const builder = new SdPackageBuilder(packageKey, config.packages[packageKey]);

        if (!watch) {
          await builder.buildAsync();
        }
        else {
          await builder.watchAsync();

          if (config.packages[packageKey].type === "server") {
            // 서버 시작
            // tslint:disable-next-line:no-eval
            const server = eval(`require(path.resolve(process.cwd(), "packages", packageKey, "app.js"))`) as SdServiceServer;
            await new Promise<void>((resolve) => {
              server.on("ready", () => {
                // > 서버 맵 구성
                this._serverMap.set(packageKey, {
                  server,
                  middlewares: [],
                  clientKeys: []
                });

                resolve();
              });
            });
          }
        }
      }
    });

    logger.info("모든 빌드 프로세스가 완료되었습니다.");
  }

  public async publishAsync(build: boolean): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", "publish"]);
    logger.info(`배포를 시작합니다.`);

    // "simplysm.json" 정보 가져오기
    const config = await SdCliUtil.getConfigObjAsync("production", this._options);
    const packageKeys = Object.keys(config.packages)
      .filter((packageKey) => config.packages[packageKey].type !== "none" && config.packages[packageKey].publish);

    // GIT 사용중일 경우, 커밋되지 않은 수정사항이 있는지 확인
    if (await fs.pathExists(path.resolve(process.cwd(), ".git"))) {
      await ProcessManager.spawnAsync(
        "git status",
        {},
        (message) => {
          if (message.includes("Changes") || message.includes("Untracked")) {
            throw new Error("커밋되지 않은 정보가 있습니다.");
          }
        },
        () => {
        }
      );
    }

    // 빌드가 필요하면 빌드함
    if (build) {
      await this.buildAsync(false);
    }

    // project NPM 가져오기
    const projectNpmConfigPath = path.resolve(process.cwd(), "package.json");
    const projectNpmConfig = await fs.readJson(projectNpmConfigPath);

    // GIT 사용중일경우, 새 버전 커밋
    if (build && await fs.pathExists(path.resolve(process.cwd(), ".git"))) {
      await ProcessManager.spawnAsync(
        `git add .`,
        {},
        () => {
        },
        () => {
        }
      );

      await ProcessManager.spawnAsync(
        `git commit -m "v${projectNpmConfig.version}"`,
        {},
        () => {
        },
        () => {
        }
      );
    }

    // watch 버전에선 배포 불가
    if (projectNpmConfig.version.includes("-")) {
      throw new Error("현재 최종 버전이 빌드(배포) 버전이 아닙니다.");
    }

    // GIT 사용중일경우, TAG 생성
    if (await fs.pathExists(path.resolve(process.cwd(), ".git"))) {
      await ProcessManager.spawnAsync(
        `git tag -a "v${projectNpmConfig.version}" -m "v${projectNpmConfig.version}"`,
        {},
        () => {
        },
        () => {
        });
    }

    await Promise.all(packageKeys.map(async (packageKey) => {
      const builder = new SdPackageBuilder(packageKey, config.packages[packageKey]);
      await builder.publishAsync();
    }));

    logger.info(`모든 배포가 완료되었습니다. - v${projectNpmConfig.version}`);
  }

  private _tsConfigToBuildVersion(packageTsConfig: any): any {
    const buildTsConfig = ObjectUtil.clone(packageTsConfig);
    buildTsConfig.compilerOptions = buildTsConfig.compilerOptions || {};
    const tsOptions = buildTsConfig.compilerOptions;
    if (tsOptions.baseUrl && tsOptions.paths) {
      for (const tsPathKey of Object.keys(tsOptions.paths)) {
        const result = [];
        for (const tsPathValue of tsOptions.paths[tsPathKey] as string[]) {
          result.push(tsPathValue.replace(/\/src\/index\..*ts$/, ""));
        }
        tsOptions.paths[tsPathKey] = result;
      }
    }

    return buildTsConfig;
  }

  private async _parallelPackagesByDepAsync(packageKeys: string[], cb: (packageKey: string) => Promise<void>): Promise<void> {
    const completedPackageName: string[] = [];

    await Promise.all(packageKeys.map(async (packageKey) => {
      const projectNpmConfig = await fs.readJson(path.resolve(process.cwd(), "package.json"));
      const packagePath = path.resolve(process.cwd(), "packages", packageKey);
      const packageNpmConfig = await fs.readJson(path.resolve(packagePath, "package.json"));
      const packageName = "@" + projectNpmConfig.name + "/" + packageKey;

      // 패키지의 의존성 패키지 중에 빌드해야할 패키지 목록에 이미 있는 의존성 패키지만 추리기
      const projectOwnDepPackageNames = [
        ...Object.keys(packageNpmConfig.dependencies || {}),
        ...Object.keys(packageNpmConfig.devDependencies || {}),
        ...Object.keys(packageNpmConfig.peerDependencies || {})
      ].filter((dep) =>
        packageKeys.some((key) => ("@" + projectNpmConfig.name + "/" + key) === dep)
      );

      // 추려진 의존성 패키지별,
      for (const depPackageName of projectOwnDepPackageNames) {
        // 의존성 패키지의 빌드가 완료될때까지 기다리기
        await Wait.true(() => completedPackageName.includes(depPackageName));
      }

      await cb(packageKey);

      completedPackageName.push(packageName);
    }));
  }
}
