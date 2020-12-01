import * as path from "path";
import { FsUtil, Logger, PathUtil, SdProcessManager, SdProcessWorkManager } from "@simplysm/sd-core-node";
import { INpmConfig, ISdClientPackageConfig, ISdPackageBuildResult, ISdProjectConfig } from "../commons";
import { SdCliPackage } from "./SdCliPackage";
import { DateTime, NeverEntryError, ObjectUtil, Wait } from "@simplysm/sd-core-common";
import * as os from "os";
import * as semver from "semver";
import { SdProjectConfigUtil } from "../utils/SdProjectConfigUtil";
import { SdCliPathUtil } from "../utils/SdCliPathUtil";
import { SdCliLocalUpdater } from "../build-tools/SdCliLocalUpdater";
import { SdServiceServer } from "@simplysm/sd-service-node";
import { NextHandleFunction } from "connect";
import * as JSZip from "jszip";

export class SdCliProject {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  private readonly _npmConfigFilePath: string;
  private readonly _npmConfig: INpmConfig;

  private readonly _serverMap = new Map<string, SdServiceServer>();
  private readonly _middlewareMap = new Map<string, NextHandleFunction[]>();

  public constructor() {
    this._npmConfigFilePath = SdCliPathUtil.getNpmConfigFilePath(process.cwd());
    this._npmConfig = FsUtil.readJson(this._npmConfigFilePath);
  }

  public async localUpdateAsync(argv: { options: string[]; config?: string }): Promise<void> {
    const config = await SdProjectConfigUtil.loadConfigAsync(true, argv.options, argv.config);

    if (config.localUpdates) {
      this._logger.debug("로컬 라이브러리 업데이트 시작...");
      const localUpdater = new SdCliLocalUpdater(config.localUpdates);
      await localUpdater.runAsync();
      this._logger.debug("로컬 라이브러리 업데이트 완료");
    }
  }

  public async buildAsync(argv: { watch: boolean; packages: string[]; options: string[]; config?: string }): Promise<void> {
    let startTick = new DateTime().tick;

    // 프로젝트 설정 가져오기
    const config = await SdProjectConfigUtil.loadConfigAsync(argv.watch, argv.options, argv.config);

    if (config.localUpdates) {
      this._logger.debug("로컬 라이브러리 업데이트 변경감지 시작...");

      const localUpdater = new SdCliLocalUpdater(config.localUpdates);
      await localUpdater.watchAsync();
    }

    this._logger.debug("프로젝트 패키지 목록 구성...");
    const pkgs = await this._getPackagesAsync(config, argv.packages);

    this._logger.debug("프로젝트 및 패키지 버전 설정...");
    const newVersion = await this._updateVersionAsync(argv.watch);
    await pkgs.parallelAsync(async (pkg) => {
      await pkg.updateVersionAsync(this._npmConfig.name, newVersion);
    });

    this._logger.debug("패키지별 빌드 시작...");

    const buildablePackages = pkgs.filter((item) => item.config.type !== "none");

    // 패키지 빌드 결과이벤트에 따른 출력
    let isFirstComplete = false;
    let isReadyDone = false;
    let watchCount = 0;
    const totalResultsMap = new Map<string, (ISdPackageBuildResult & { packageName: string })[]>();
    for (const pkg of buildablePackages) {
      pkg
        .on("change", (type, target) => {
          if (watchCount === 0 && isFirstComplete) {
            startTick = new DateTime().tick;
          }
          watchCount++;
          this._logger.debug(`[${pkg.npmConfig.name}${target !== undefined ? `(${target})` : ""}] "${type.toUpperCase()}"을 시작합니다.`);
        })
        .on("complete", async (type, target, results, server) => {
          this._logger.debug(`[${pkg.npmConfig.name}${target !== undefined ? `(${target})` : ""}] "${type.toUpperCase()}"이 완료되었습니다.`);
          const key = pkg.npmConfig.name + "|_|" + type + "|_|" + target;
          totalResultsMap.set(key, results.map((item) => ({
            ...item,
            packageName: pkg.npmConfig.name
          })));

          if (server) {
            this._setNewServer(pkg.npmConfig.name, server);
          }

          await Wait.true(() => isReadyDone);
          setTimeout(() => {
            watchCount--;
            if (watchCount === 0) {
              const totalResults = Array.from(totalResultsMap.values()).mapMany();

              const displayResults = ObjectUtil.clone(totalResults);

              // WARN, ERROR 표시
              const warnings = Object.values(displayResults)
                .filter((item) => item.severity === "warning")
                .map((item) => item.message.trim() + "(" + item.type + ": " + item.packageName + ")")
                .distinct();
              const errors = Object.values(displayResults)
                .filter((item) => item.severity === "error")
                .map((item) => item.message.trim() + "(" + item.type + ": " + item.packageName + ")")
                .distinct();

              if (warnings.length > 0) {
                this._logger.warn(`경고 발생${os.EOL}`, warnings.join(os.EOL));
              }
              if (errors.length > 0) {
                this._logger.error(`오류 발생${os.EOL}`, errors.join(os.EOL));
              }

              if (errors.length > 0) {
                this._logger.error(`경고: ${warnings.length}건, 오류: ${errors.length}건`);
              }
              else if (warnings.length > 0) {
                this._logger.warn(`경고: ${warnings.length}건, 오류: ${errors.length}건`);
              }

              const spanTick = startTick === 0 ? 0 : (new DateTime().tick - startTick);
              this._logger.info(`모든 빌드가 완료되었습니다.${spanTick ? ` (${spanTick.toLocaleString()}ms)` : ""}`);
              startTick = 0;
              isFirstComplete = true;
            }
          }, argv.watch && isFirstComplete ? 500 : 3000);
        });
    }

    // 일단 DIST 디렉토리 삭제
    await buildablePackages.parallelAsync(async (pkg) => {
      await FsUtil.removeAsync(path.resolve(pkg.rootPath, "dist"));
      await FsUtil.removeAsync(path.resolve(pkg.rootPath, "dist-browser"));
      await FsUtil.removeAsync(path.resolve(pkg.rootPath, "dist-node"));
      await FsUtil.removeAsync(path.resolve(pkg.rootPath, "dist-types"));
    });

    // 준비
    await buildablePackages.parallelAsync(async (pkg) => {
      await Promise.all([
        pkg.genBuildTsConfigAsync(),
        pkg.runGenIndexAsync()
      ]);
    });

    // pkg 목록을 dependency에 따라 병렬로 실행
    const notNoneTypePackageNames = pkgs.filter((item) => item.config.type !== "none").map((item) => item.npmConfig.name);

    const compileCompletedPackageNames: string[] = [];
    const checkCompletedPackageNames: string[] = [];

    await Promise.all([
      buildablePackages.parallelAsync(async (pkg) => {
        await this._waitPackageCompleteAsync(pkg, notNoneTypePackageNames, compileCompletedPackageNames);
        await this._waitPackageCompleteAsync(pkg, notNoneTypePackageNames, checkCompletedPackageNames);

        const middlewares = await pkg.runCompileAsync(argv.watch);
        if (middlewares) {
          if (pkg.config.type !== "client") throw new NeverEntryError();
          const pkgConfig: ISdClientPackageConfig = pkg.config;
          this._addMiddlewares(pkgConfig.server, middlewares);

          setTimeout(async () => {
            // 서버 빌드 완료를 기다렸다가
            await Wait.true(() => compileCompletedPackageNames.includes(pkgConfig.server));

            // 서버의 www의 클라이언트 폴더에 .configs.json 파일 쓰기
            const serverPackage = pkgs.single((item) => item.npmConfig.name === pkgConfig.server)!;
            await FsUtil.writeJsonAsync(
              path.resolve(
                SdCliPathUtil.getDistPath(serverPackage.rootPath),
                "www",
                pkg.npmConfig.name.split("/").last()!,
                ".configs.json"
              ),
              pkgConfig.configs ?? {}
            );
          }, 0);
        }

        compileCompletedPackageNames.push(pkg.npmConfig.name);
      }),
      buildablePackages.parallelAsync(async (pkg) => {
        await this._waitPackageCompleteAsync(pkg, notNoneTypePackageNames, checkCompletedPackageNames);

        await pkg.runCheckAsync();

        checkCompletedPackageNames.push(pkg.npmConfig.name);
      }),
      buildablePackages.parallelAsync(async (pkg) => {
        await this._waitPackageCompleteAsync(pkg, notNoneTypePackageNames, checkCompletedPackageNames);

        await pkg.runLintAsync();
      }),
      buildablePackages.parallelAsync(async (pkg) => {
        await this._waitPackageCompleteAsync(pkg, notNoneTypePackageNames, checkCompletedPackageNames);

        await pkg.runNgGenAsync();
      })
    ]);

    isReadyDone = true;

    await Wait.true(() => isFirstComplete);
  }

  public async publishAsync(argv: { build: boolean; packages: string[]; options: string[]; config?: string; force: boolean }): Promise<void> {
    if (!argv.force && !argv.build) {
      this._logger.warn("빌드하지 않고, 배포하는것은 상당히 위험합니다.");
      const waitSec = 5;
      for (let i = waitSec; i > 0; i--) {
        if (i !== waitSec) {
          process.stdout.cursorTo(0);
        }
        process.stdout.write("프로세스를 중지하려면, 'CTRL+C'를 누르세요. " + i);
        await Wait.time(1000);
      }

      process.stdout.cursorTo(0);
      process.stdout.clearLine(0);
    }

    this._logger.debug(`배포 준비...`);

    // GIT 사용중일 경우, 커밋되지 않은 수정사항이 있는지 확인
    if (!argv.force && FsUtil.exists(path.resolve(process.cwd(), ".git"))) {
      try {
        await SdProcessManager.spawnAsync(
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
      catch (err) {
        this._logger.warn(err.message);
        const waitSec = 9;
        for (let i = waitSec; i > 0; i--) {
          if (i !== waitSec) {
            process.stdout.cursorTo(0);
          }
          process.stdout.write("프로세스를 중지하려면, 'CTRL+C'를 누르세요. " + i);
          await Wait.time(1000);
        }

        process.stdout.cursorTo(0);
        process.stdout.clearLine(0);
      }
    }

    // 빌드가 필요하면 빌드함
    if (argv.build) {
      await this.buildAsync({
        watch: false,
        packages: argv.packages,
        options: argv.options,
        config: argv.config
      });
    }
    else if (this._npmConfig.version.includes("-")) {
      throw new Error("현재 최종 버전이 빌드(배포) 버전이 아닙니다.");
    }

    const config = await SdProjectConfigUtil.loadConfigAsync(false, argv.options, argv.config);

    const pkgs = await this._getPackagesAsync(config, argv.packages);

    // 빌드시엔 빌드에서 버전업했고, 빌드가 아닌경우 여기서 버전업
    if (!argv.build) {
      const newVersion = await this._updateVersionAsync(false);
      await pkgs.parallelAsync(async (pkg) => {
        await pkg.updateVersionAsync(this._npmConfig.name, newVersion);
      });
    }

    // GIT 사용중일경우, 새 버전 커밋 및 TAG 생성
    if (FsUtil.exists(path.resolve(process.cwd(), ".git"))) {
      await SdProcessManager.spawnAsync(`git add .`, undefined, false, false);
      await SdProcessManager.spawnAsync(`git commit -m "v${this._npmConfig.version}"`, undefined, false, false);
      await SdProcessManager.spawnAsync(`git tag -a "v${this._npmConfig.version}" -m "v${this._npmConfig.version}"`, undefined, false, false);
    }

    this._logger.debug(`배포 준비 완료`);

    this._logger.debug(`배포 시작...`);

    await pkgs.parallelAsync(async (pkg) => {
      await pkg.publishAsync();
    });

    if (config.afterPublish) {
      for (const afterPublishCmd of config.afterPublish) {
        if (afterPublishCmd.type === "zip") {
          const targetRootPath = afterPublishCmd.path.replace(/%([^%]*)%/g, (item) => {
            const envName = item.replace(/%/g, "");
            if (envName === "SD_VERSION") {
              return this._npmConfig.version;
            }
            return process.env[envName] ?? item;
          });

          const filePaths = await FsUtil.globAsync(path.resolve(targetRootPath, "**", "*"), { dot: true, nodir: true });

          const zip = new JSZip();
          for (const filePath of filePaths) {
            const relativeFilePath = path.relative(targetRootPath, filePath);
            zip.file("/" + PathUtil.posix(relativeFilePath), FsUtil.createReadStream(filePath));
          }
          const zipStream = zip.generateNodeStream();
          const writeStream = FsUtil.createWriteStream(targetRootPath + ".zip");
          await new Promise<void>((resolve, reject) => {
            zipStream
              .on("error", (err: Error) => {
                reject(err);
              })
              .pipe(writeStream)
              .once("finish", () => {
                resolve();
              });
          });
        }
      }
    }

    this._logger.info(`배포 프로세스가 완료되었습니다.(v${this._npmConfig.version})`);
  }

  private async _updateVersionAsync(devMode: boolean): Promise<string> {
    // 프로젝트 및 패키지 버전 업
    const newVersion = semver.inc(this._npmConfig.version, devMode ? "prerelease" : "patch")!;
    this._npmConfig.version = newVersion;

    const updateDepVersion = (deps: Record<string, string> | undefined): void => {
      if (!deps) return;
      for (const dependencyName of Object.keys(deps)) {
        if (dependencyName.startsWith("@" + this._npmConfig.name)) {
          deps[dependencyName] = newVersion;
        }
      }
    };
    updateDepVersion(this._npmConfig.dependencies);
    updateDepVersion(this._npmConfig.devDependencies);
    updateDepVersion(this._npmConfig.peerDependencies);

    await FsUtil.writeJsonAsync(this._npmConfigFilePath, this._npmConfig, { space: 2 });

    return newVersion;
  }

  private async _getPackagesAsync(config: ISdProjectConfig, packages: string[]): Promise<SdCliPackage[]> {
    // package.json에서 workspaces를 통해 패키지 경로 목록 가져오기
    const allPackagePaths = await this._npmConfig.workspaces?.mapManyAsync(async (item) => await FsUtil.globAsync(item));
    if (!allPackagePaths) throw new NeverEntryError();

    const processWorkManager = await SdProcessWorkManager.createAsync(
      path.resolve(__dirname, `../workers/build-worker`),
      [],
      undefined,
      Math.max(Math.min((os.cpus().length / 2) - 1, allPackagePaths.length * 4), 1)
    );

    // 패키지 목록 구성
    const pkgs: SdCliPackage[] = [];
    for (const packagePath of allPackagePaths) {
      // 패키지 package.json
      const packageNpmConfigFilePath = SdCliPathUtil.getNpmConfigFilePath(packagePath);
      if (!FsUtil.exists(packageNpmConfigFilePath)) continue;
      const packageNpmConfig: INpmConfig = await FsUtil.readJsonAsync(packageNpmConfigFilePath);

      // 패키지명
      const packageName = packageNpmConfig.name;

      // 패키지 설정
      const packageConfig = config.packages[packageName];
      if (packages.length > 0 && !packages.includes(packageName)) {
        packageConfig.type = "none";
      }

      if (typeof packageConfig !== "undefined") {
        pkgs.push(new SdCliPackage(packagePath, packageNpmConfig, packageConfig, processWorkManager));
      }
    }

    return pkgs;
  }

  private async _waitPackageCompleteAsync(pkg: SdCliPackage, pkgNames: string[], completedPkgNames: string[]): Promise<void> {
    // 패키지의 의존성 패키지 중에 빌드해야할 패키지 목록에 이미 있는 의존성 패키지만 추리기
    const depNames = pkg.fullDependencies.filter((dep) => pkgNames.includes(dep));

    // 추려진 의존성 패키지별로 의존성 패키지의 빌드가 완료될때까지 기다리기
    await depNames.parallelAsync(async (depName) => {
      await Wait.true(() => completedPkgNames.includes(depName));
    });
  }

  private _setNewServer(packageName: string, server: SdServiceServer): void {
    this._serverMap.set(packageName, server);
    const middlewares = this._middlewareMap.get(packageName);
    if (middlewares) {
      server.middlewares = middlewares;
    }
    else {
      const newMiddlewares: NextHandleFunction[] = [];
      this._middlewareMap.set(packageName, newMiddlewares);
      server.middlewares = newMiddlewares;
    }
  }

  private _addMiddlewares(serverPackageName: string, middlewares: NextHandleFunction[]): void {
    if (this._middlewareMap.has(serverPackageName)) {
      this._middlewareMap.get(serverPackageName)!.push(...middlewares);
    }
    else {
      this._middlewareMap.set(serverPackageName, middlewares);
    }
  }
}