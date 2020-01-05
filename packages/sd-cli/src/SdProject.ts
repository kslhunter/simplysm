import {SdNpmConfig} from "./SdNpmConfig";
import {SdProjectConfig} from "./SdProjectConfig";
import * as path from "path";
import {SdPackage} from "./SdPackage";
import {FsUtil, FsWatcher, Logger, ProcessManager, ProcessWorkManager} from "@simplysm/sd-core-node";
import * as semver from "semver";
import * as fs from "fs-extra";
import {NotImplementError, Wait} from "@simplysm/sd-core-common";

export class SdProject {
  private constructor(private readonly _npmConfig: SdNpmConfig,
                      private readonly _config: SdProjectConfig,
                      private readonly _mode: string,
                      public packages: SdPackage[]) {
  }

  public static async createAsync(mode: "development" | "production", options: string[]): Promise<SdProject> {
    const npmConfig = await SdNpmConfig.loadAsync(process.cwd());
    const configPath = path.resolve(process.cwd(), "simplysm.json");
    const config = await SdProjectConfig.loadAsync(configPath, mode, options);


    if (!npmConfig.workspaces) {
      throw new Error("프로젝트의 package.json 에 workspaces 정의가 필요합니다.");
    }

    const packagePaths = await npmConfig.workspaces
      .mapManyAsync(async (workspace) =>
        await FsUtil.globAsync(workspace)
      );

    const packages = await packagePaths.mapAsync(async (packagePath) => await SdPackage.createAsync(config, packagePath));

    return new SdProject(npmConfig, config, mode, packages);
  }

  public async localUpdateAsync(watch: boolean = false): Promise<void> {
    // 옵션체크
    if (!this._config.localUpdates) {
      return;
    }

    const logger = Logger.get(["simplysm", "sd-cli", "local-update"]);
    logger.log(watch ? `로컬 패키지 변경감지를 시작합니다.` : `로컬 패키지 업데이트를 시작합니다.`);

    // 설정별
    await Object.keys(this._config.localUpdates).parallelAsync(async (localUpdateKey) => {
      // "node_modules'에서 로컬업데이트 설정에 맞는 패키지를 "glob"하여 대상 패키지경로 목록 가져오기
      const targetPaths = await FsUtil.globAsync(path.resolve(process.cwd(), "node_modules", localUpdateKey));


      // 대상 패키지 경로별
      await targetPaths.parallelAsync(async (targetPath) => {
        const targetName = targetPath.match(new RegExp(
          localUpdateKey.replace(/([\/.*])/g, (item) => item === "/" ? "\\/" : item === "." ? "\\." : item === "*" ? "(.*)" : item)
        ))![1];

        // 로컬 업데이트 설정에 따라, 가져올 소스 경로 추출
        const sourcePath = path.resolve(this._config.localUpdates![localUpdateKey].replace(/\*/g, targetName));
        if (!fs.pathExistsSync(sourcePath)) {
          logger.warn(`소스경로를 찾을 수 없어 무시됩니다(${sourcePath})`);
          return;
        }

        if (watch) {
          // 변경감지 시작
          await FsWatcher.watch(path.resolve(sourcePath, "**", "*"), async (changedInfos) => {
            logger.log(`'${targetName}' 파일이 변경되었습니다.`, ...changedInfos.map((item) => `[${item.type}] ${item.filePath}`));

            for (const changeInfo of changedInfos) {
              if (
                changeInfo.filePath.includes("node_modules") ||
                changeInfo.filePath.endsWith("package.json")
              ) {
                continue;
              }

              const targetFilePath = path.resolve(targetPath, path.relative(sourcePath, changeInfo.filePath));

              if (changeInfo.type === "unlink") {
                await fs.remove(targetFilePath);
              }
              else {
                await fs.copy(changeInfo.filePath, targetFilePath);
              }
            }
          }, (err) => {
            logger.error(`'${targetName}'의 변경사항을 처리하는 중에 오류가 발생하였습니다.`, err);
          });
        }
        else {
          // 소스경로에서 대상경로로 파일 복사
          await fs.copy(sourcePath, targetPath, {
            filter: (src: string) => {
              return !src.includes("node_modules") && !src.endsWith("package.json");
            }
          });
        }
      });
    });

    logger.log(watch ? `모든 로컬 패키지 변경감지가 시작되었습니다.` : `모든 로컬 패키지 업데이트가 완료되었습니다.`);
  }

  public async buildAsync(watch: boolean = false): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", "build"]);

    logger.log("빌드 준비중...");

    // 프로젝트의 package.json 버전 올리기
    this._npmConfig.version = semver.inc(this._npmConfig.version, this._mode === "development" ? "prerelease" : "patch")!;
    await this._npmConfig.saveAsync();

    // 각 패키지별 초기화
    await Promise.all(this.packages.map(async (pkg) => {
      // package.json 에 버전적용
      pkg.npmConfig.version = this._npmConfig.version;
      pkg.npmConfig.upgradeDependencyVersion(
        this.packages.toObject(
          (item) => item.npmConfig.name,
          () => this._npmConfig.version
        )
      );

      await pkg.npmConfig.saveAsync();

      if (pkg.config?.type) {
        // tsconfig 별
        await pkg.tsConfigs.parallelAsync(async (tsConfig) => {
          // tsconfig*.build.json 파일 생성
          await tsConfig.saveForBuildAsync();

          // dist 디렉토리 삭제
          await fs.remove(tsConfig.distPath);
        });
      }
    }));

    if (watch) {
      await this.localUpdateAsync(watch);
    }

    // 필요한 WORKER 생성
    const processCount = this.packages.filter((item) => item.config?.type === "library").length * 2;
    const processWorkManager = await ProcessWorkManager.createAsync(
      require.resolve(`./build-worker`),
      processCount,
      true
    );

    logger.log("빌드 프로세스를 시작합니다.");

    await Promise.all([
      // 빌드
      this.packages.map(async (pkg) => {
        if (!pkg.config?.type) {
          return;
        }

        await pkg.tsConfigs.parallelAsync(async (tsConfig) => {
          await processWorkManager.runAsync("compile", watch, tsConfig.configForBuildPath, this._mode);
        });
      }),
      // 타입체크
      this._parallelPackagesByDepAsync(async (pkg) => {
        if (!pkg.config?.type) {
          return;
        }

        await pkg.tsConfigs.parallelAsync(async (tsConfig) => {
          await processWorkManager.runAsync("check", watch, tsConfig.configForBuildPath);
        });
      })
      // TODO: 메타데이터
    ]);

    logger.info(`모든 빌드 프로세스가 완료되었습니다`);

    if (!watch) {
      await processWorkManager.closeAllAsync();
    }
  }

  public async publishAsync(build: boolean = false): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", "publish"]);

    logger.log("배포 준비중...");

    // GIT 사용중일 경우, 커밋되지 않은 수정사항이 있는지 확인
    if (await fs.pathExists(path.resolve(process.cwd(), ".git"))) {
      await ProcessManager.spawnAsync(
        "git status",
        undefined,
        (message) => {
          if (message.includes("Changes") || message.includes("Untracked")) {
            throw new Error("커밋되지 않은 정보가 있습니다.");
          }
        },
        false
      );
    }

    // 빌드가 필요하면 빌드함
    if (build) {
      await this.buildAsync(false);
    }
    // watch 버전에선 배포 불가
    else if (this._npmConfig.version.includes("-")) {
      throw new Error("현재 최종 버전이 빌드(배포) 버전이 아닙니다.");
    }

    // GIT 사용중일경우, 새 버전 커밋 및 TAG 생성
    if (build && await fs.pathExists(path.resolve(process.cwd(), ".git"))) {
      await ProcessManager.spawnAsync(
        `git add .`,
        undefined,
        false,
        false
      );

      await ProcessManager.spawnAsync(
        `git commit -m "v${this._npmConfig.version}"`,
        undefined,
        false,
        false
      );

      await ProcessManager.spawnAsync(
        `git tag -a "v${this._npmConfig.version}" -m "v${this._npmConfig.version}"`,
        {},
        false,
        false);
    }

    await this.packages.parallelAsync(async (pkg) => {
      if (!pkg.config?.publish) {
        return;
      }

      if (pkg.config?.publish === "npm") {
        const packageLogger = Logger.get(["simplysm", "sd-cli", pkg.packageKey, "npm", "publish"]);
        packageLogger.log("배포를 시작합니다.");

        await ProcessManager.spawnAsync(
          "yarn publish --access public",
          {cwd: pkg.packagePath},
          false,
          false
        );

        packageLogger.log(`배포가 완료되었습니다. ${pkg.npmConfig.version}`);
      }
      else {
        throw new NotImplementError();
      }
    });
  }

  private async _parallelPackagesByDepAsync(cb: (pkg: SdPackage) => Promise<void>): Promise<void> {
    const packages = this.packages.filter((item) => item.config?.type);

    const completedPackageNames: string[] = [];

    await packages.parallelAsync(async (pkg) => {
      // 패키지의 의존성 패키지 중에 빌드해야할 패키지 목록에 이미 있는 의존성 패키지만 추리기
      const depPackageNames = [
        ...Object.keys(pkg.npmConfig.dependencies ?? {}),
        ...Object.keys(pkg.npmConfig.devDependencies ?? {}),
        ...Object.keys(pkg.npmConfig.peerDependencies ?? {})
      ].filter((pkgDepPackageName) =>
        packages.some((targetPackage) => targetPackage.npmConfig.name === pkgDepPackageName)
      );

      // 추려진 의존성 패키지별로 의존성 패키지의 빌드가 완료될때까지 기다리기
      await Promise.all(depPackageNames.map(async (depPackageName) => {
        await Wait.true(() => completedPackageNames.includes(depPackageName));
      }));

      await cb(pkg);

      completedPackageNames.push(pkg.npmConfig.name);
    });
  }
}
