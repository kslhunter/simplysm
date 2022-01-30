import { FsUtil, Logger, SdProcess } from "@simplysm/sd-core-node";
import path from "path";
import { INpmConfig, ISdCliPackageBuildResult, ISdCliWorkspaceConfig } from "../commons";
import { SdCliPackage } from "../packages/SdCliPackage";
import { Wait } from "@simplysm/sd-core-common";
import os from "os";
import { SdBuildResultUtil } from "../utils/SdBuildResultUtil";
import semver from "semver/preload";

export class SdCliWorkspace {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  private readonly _npmConfig: INpmConfig;
  private readonly _config: ISdCliWorkspaceConfig;

  public constructor(private readonly _rootPath: string) {
    const npmConfigFilePath = path.resolve(this._rootPath, "package.json");
    this._npmConfig = FsUtil.readJson(npmConfigFilePath);

    this._config = FsUtil.readJson(path.resolve(this._rootPath, "simplysm.json"));
  }

  public async watchAsync(): Promise<void> {
    this._logger.debug("패키지 목록 구성...");
    const pkgs = await this._getPackagesAsync();

    this._logger.debug("패키지 이벤트 설정...");
    let changeCount = 0;
    const totalResultMap = new Map<string, ISdCliPackageBuildResult[]>();
    for (const pkg of pkgs) {
      pkg
        .on("change", () => {
          if (changeCount === 0) {
            this._logger.log("빌드를 시작합니다...");
          }
          changeCount++;
          this._logger.debug(`[${pkg.name}] 빌드를 시작합니다...`);
        })
        .on("complete", (results) => {
          this._logger.debug(`[${pkg.name}] 빌드가 완료되었습니다.`);
          totalResultMap.set(pkg.name, results);

          setTimeout(() => {
            changeCount--;
            if (changeCount === 0) {
              this._loggingResults(totalResultMap);
              this._logger.info("모든 빌드가 완료되었습니다.");
            }
          }, 500);
        });
    }

    this._logger.debug("빌드를 시작합니다...");
    const pkgNames = pkgs.map((item) => item.name);
    const buildCompletedPackageNames: string[] = [];
    await pkgs.parallelAsync(async (pkg) => {
      await Wait.until(() => !pkg.allDependencies.some((dep) => pkgNames.includes(dep) && !buildCompletedPackageNames.includes(dep)));
      await pkg.watchAsync();
      buildCompletedPackageNames.push(pkg.name);
    });
  }

  public async buildAsync(): Promise<void> {
    this._logger.debug("패키지 목록 구성...");
    const pkgs = await this._getPackagesAsync();

    this._logger.debug("프로젝트 및 패키지 버전 설정...");
    await this._upgradeVersionAsync(pkgs);

    // 빌드
    await this._buildPkgsAsync(pkgs);
  }

  private async _buildPkgsAsync(pkgs: SdCliPackage[]): Promise<void> {
    this._logger.debug("빌드를 시작합니다...");
    const pkgNames = pkgs.map((item) => item.name);
    const buildCompletedPackageNames: string[] = [];
    const totalResultMap = new Map<string, ISdCliPackageBuildResult[]>();
    await pkgs.parallelAsync(async (pkg) => {
      await Wait.until(() => !pkg.allDependencies.some((dep) => pkgNames.includes(dep) && !buildCompletedPackageNames.includes(dep)));

      this._logger.debug(`[${pkg.name}] 빌드를 시작합니다...`);
      totalResultMap.set(pkg.name, await pkg.buildAsync());
      this._logger.debug(`[${pkg.name}] 빌드가 완료되었습니다.`);

      buildCompletedPackageNames.push(pkg.name);
    });

    this._loggingResults(totalResultMap);
    this._logger.info("모든 빌드가 완료되었습니다.");
  }

  public async publishAsync(opt: { noBuild: boolean }): Promise<void> {
    if (opt.noBuild) {
      this._logger.warn("빌드하지 않고, 배포하는것은 상당히 위험합니다.");
      await this._waitSecMessageAsync("프로세스를 중지하려면, 'CTRL+C'를 누르세요.", 5);
    }

    // GIT 사용중일 경우, 커밋되지 않은 수정사항이 있는지 확인
    if (FsUtil.exists(path.resolve(process.cwd(), ".git"))) {
      this._logger.debug("GIT 커밋여부 확인...");
      const gitStatusResult = await SdProcess.execAsync("git status");
      if (gitStatusResult.includes("Changes") || gitStatusResult.includes("Untracked")) {
        throw new Error("커밋되지 않은 정보가 있습니다.");
      }
    }

    this._logger.debug("패키지 목록 구성...");
    const pkgs = await this._getPackagesAsync();

    this._logger.debug("프로젝트 및 패키지 버전 설정...");
    await this._upgradeVersionAsync(pkgs);

    // 빌드
    if (!opt.noBuild) {
      await this._buildPkgsAsync(pkgs);
    }

    // GIT 사용중일경우, 새 버전 커밋 및 TAG 생성
    if (FsUtil.exists(path.resolve(process.cwd(), ".git"))) {
      this._logger.debug("새 버전 커밋 및 TAG 생성...");
      await SdProcess.execAsync("git add .");
      await SdProcess.execAsync(`git commit -m "v${this._npmConfig.version}"`);
      await SdProcess.execAsync(`git tag -a "v${this._npmConfig.version}" -m "v${this._npmConfig.version}"`);
    }

    this._logger.debug("배포 시작...");
    await pkgs.parallelAsync(async (pkg) => {
      this._logger.debug(`[${pkg.name}] 배포를 시작합니다...`);
      await pkg.publishAsync();
      this._logger.debug(`[${pkg.name}] 배포가 완료되었습니다.`);
    });
    this._logger.info("모든 배포가 완료되었습니다.");
  }

  private async _upgradeVersionAsync(pkgs: SdCliPackage[]): Promise<void> {
    // 작업공간 package.json 버전 설정
    const newVersion = semver.inc(this._npmConfig.version, "patch")!;
    this._npmConfig.version = newVersion;

    const pkgNames = pkgs.map((item) => item.name);

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

    // 각 패키지 package.json 버전 설정
    await pkgs.parallelAsync(async (pkg) => {
      await pkg.setNewVersionAsync(newVersion, pkgNames);
    });
  }

  private async _waitSecMessageAsync(msg: string, sec: number): Promise<void> {
    for (let i = sec; i > 0; i--) {
      if (i !== sec) {
        process.stdout.cursorTo(0);
      }
      process.stdout.write(msg + " " + i);
      await Wait.time(1000);
    }

    process.stdout.cursorTo(0);
    process.stdout.clearLine(0);
  }

  private async _getPackagesAsync(): Promise<SdCliPackage[]> {
    const pkgRootPaths = await this._npmConfig.workspaces?.mapManyAsync(async (item) => await FsUtil.globAsync(item));
    if (!pkgRootPaths) {
      throw new Error("최상위 'package.json'에서 'workspaces'를 찾을 수 없습니다.");
    }

    return pkgRootPaths.map((pkgRootPath) => {
      const pkgConfig = this._config.packages[path.basename(pkgRootPath)];
      return pkgConfig ? new SdCliPackage(this._rootPath, pkgRootPath, pkgConfig) : undefined;
    }).filterExists();
  }

  private _loggingResults(totalResultMap: Map<string, ISdCliPackageBuildResult[]>): void {
    const totalResults = Array.from(totalResultMap.entries())
      .mapMany((item) => item[1].map((item1) => ({
        pkgName: item[0],
        ...item1
      })))
      .orderBy((item) => item.pkgName + "_" + item.filePath);

    const warnings = totalResults
      .filter((item) => item.severity === "warning")
      .map((item) => `${SdBuildResultUtil.getMessage(item)} (${item.pkgName})`)
      .distinct();

    const errors = totalResults
      .filter((item) => item.severity === "error")
      .map((item) => `${SdBuildResultUtil.getMessage(item)} (${item.pkgName})`)
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
  }
}
