import { SdProjectConfigUtil } from "../utils/SdProjectConfigUtil";
import { FsUtil, Logger, SdProcessWorkManager } from "@simplysm/sd-core-node";
import { INpmConfig, ISdPackageBuildResult, ISdProjectConfig, TSdPackageConfig } from "../commons";
import * as path from "path";
import { SdCliPackage } from "./SdCliPackage";
import { FunctionQueue, StringUtil, Wait } from "@simplysm/sd-core-common";
import * as os from "os";
import { NextHandleFunction } from "connect";

export class SdCliProject {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  public readonly npmConfig: INpmConfig;

  private readonly _fnQueue = new FunctionQueue();
  private readonly _serverInfoMap = new Map<string, { middlewares: NextHandleFunction[] }>();

  public constructor(private readonly _rootPath: string) {
    this.npmConfig = FsUtil.readJson(path.resolve(this._rootPath, "package.json"));
  }

  public async buildAsync(opt?: { watch?: boolean; packages?: string[]; options?: string[]; config?: string }): Promise<void> {
    this._logger.debug("프로젝트 설정 가져오기...");
    const config = await SdProjectConfigUtil.loadConfigAsync(
      this._rootPath,
      opt?.watch,
      opt?.options,
      opt?.config
    );

    this._logger.debug("프로젝트 패키지 목록 구성...");
    const allPkgs = await this._getAllPackagesAsync(config, opt?.packages);
    const pkgs = allPkgs.filter((item) => item.config && item.config.type !== "none");

    this._logger.debug("패키지 sd-tsconfig.{target}.json 구성...");
    await pkgs.parallelAsync(async (pkg) => {
      await pkg.genBuildTsconfigAsync();
    });

    this._logger.debug("패키지 빌드 이벤트 설정...");
    let changeCount = 0;
    const totalResultMap = new Map<string, (ISdPackageBuildResult & { pkgName: string })[]>();
    for (const pkg of pkgs) {
      pkg
        .on("change", (target) => {
          this._fnQueue.run(() => {
            if (changeCount === 0) {
              this._logger.log(`빌드를 시작합니다...`);
            }
            changeCount++;
            this._logger.debug(`[${pkg.npmConfig.name}${target !== undefined ? `(${target})` : ""}] 빌드를 시작합니다.`);
          });
        })
        .on("complete", (target, results, server) => {
          this._logger.debug(`[${pkg.npmConfig.name}${target !== undefined ? `(${target})` : ""}] 빌드가 완료되었습니다.`);

          if (pkg.config?.type === "server" && server) {
            server.middlewares = this._serverInfoMap.getOrCreate(pkg.npmConfig.name, { middlewares: [] }).middlewares;
          }

          this._fnQueue.run(() => {
            totalResultMap.set(pkg.npmConfig.name + "|_|" + target, results.map((item) => ({
              ...item,
              pkgName: pkg.npmConfig.name
            })));

            changeCount--;
            if (changeCount === 0) {
              this._loggingResults(totalResultMap);
              this._logger.info(`모든 빌드가 완료되었습니다.`);
            }
          });
        });
    }

    this._logger.debug("패키지 빌드...");
    const pkgNames = pkgs.map((item) => item.npmConfig.name);

    this._logger.log(`빌드를 시작합니다...`);
    changeCount++;
    const buildCompletedPackageNames: string[] = [];
    await pkgs.parallelAsync(async (pkg) => {
      await this._waitPackageCompleteAsync(pkg, pkgNames, buildCompletedPackageNames);
      const middleware = await pkg.runBuildAsync(opt?.watch ?? false);
      if (pkg.config?.type === "client" && !StringUtil.isNullOrEmpty(pkg.config.server) && middleware) {
        const serverInfo = this._serverInfoMap.getOrCreate(pkg.config.server, { middlewares: [] });
        serverInfo.middlewares.push(middleware);
      }
      buildCompletedPackageNames.push(pkg.npmConfig.name);
    });
    changeCount--;
    this._loggingResults(totalResultMap);
    this._logger.info(`모든 빌드가 완료되었습니다.`);
  }

  private async _getAllPackagesAsync(config: ISdProjectConfig, packages?: string[]): Promise<SdCliPackage[]> {
    // package.json에서 workspaces를 통해 패키지 경로 목록 가져오기
    const allPkgPaths = await this.npmConfig.workspaces?.mapManyAsync(async (item) => await FsUtil.globAsync(item));
    if (!allPkgPaths) {
      throw new Error("프로젝트의 'package.json'에서 'workspaces'를 찾을 수 없습니다.");
    }

    // 모든 패키지의 설정 가져오기
    const allPackageInfos: { pkgPath: string; pkgConfig: TSdPackageConfig | undefined }[] = [];
    for (const pkgPath of allPkgPaths) {
      // 패키지 package.json
      const pkgNpmConfigFilePath = path.resolve(pkgPath, "package.json");
      if (!FsUtil.exists(pkgNpmConfigFilePath)) continue; // package.json파일이 없는 폴더는 무시
      const pkgNpmConfig: INpmConfig = await FsUtil.readJsonAsync(pkgNpmConfigFilePath);

      // 패키지 설정
      const packageName = pkgNpmConfig.name;
      const pkgConfig = config.packages[packageName];

      // 사용할 패키지로 설정하지 않은 패키지면 타입을 'none'으로 강제
      if (packages && packages.length > 0 && !packages.includes(packageName)) {
        if (pkgConfig) {
          pkgConfig.type = "none";
        }
      }

      allPackageInfos.push({ pkgPath, pkgConfig });
    }

    // 각 package를 위한 worker 준비
    const workerCount = allPackageInfos.sum((item) => {
      if (item.pkgConfig && item.pkgConfig.type === "library") {
        return item.pkgConfig.targets?.length ?? 1;
      }
      return 0;
    });

    const processWorkManager = await SdProcessWorkManager.createAsync(
      path.resolve(__dirname, `../workers/lib-build-worker`),
      [],
      Math.min(workerCount, Math.max(os.cpus().length - 2, 1)),
      Math.max(os.cpus().length - 2, 1)
    );

    // 패키지 목록 구성
    const pkgs: SdCliPackage[] = [];
    for (const pkgPath of allPkgPaths) {
      // 패키지 package.json
      const pkgNpmConfigFilePath = path.resolve(pkgPath, "package.json");
      if (!FsUtil.exists(pkgNpmConfigFilePath)) continue; // package.json파일이 없는 폴더는 무시
      const pkgNpmConfig: INpmConfig = await FsUtil.readJsonAsync(pkgNpmConfigFilePath);

      // 패키지 설정
      const packageName = pkgNpmConfig.name;
      const pkgConfig = config.packages[packageName];

      // 사용할 패키지로 설정하지 않은 패키지면 타입을 'none'으로 강제
      if (packages && packages.length > 0 && !packages.includes(packageName)) {
        if (pkgConfig) {
          pkgConfig.type = "none";
        }
      }

      pkgs.push(new SdCliPackage(pkgPath, pkgConfig, processWorkManager));
    }

    return pkgs;
  }

  private async _waitPackageCompleteAsync(pkg: SdCliPackage, pkgNames: string[], completedPkgNames: string[]): Promise<void> {
    // 패키지의 의존성 패키지 중에 빌드해야할 패키지 목록에 이미 있는 의존성 패키지만 추리기
    const depNames = [
      ...Object.keys(pkg.npmConfig.dependencies ?? {}),
      ...Object.keys(pkg.npmConfig.devDependencies ?? {}),
      ...Object.keys(pkg.npmConfig.peerDependencies ?? {})
    ].distinct().filter((dep) => pkgNames.includes(dep));

    // 추려진 의존성 패키지별로 의존성 패키지의 빌드가 완료될때까지 기다리기
    await depNames.parallelAsync(async (depName) => {
      await Wait.true(() => completedPkgNames.includes(depName));
    });
  }

  private _loggingResults(totalResultMap: Map<string, (ISdPackageBuildResult & { pkgName: string })[]>): void {
    const totalResults = Array.from(totalResultMap.values()).mapMany();

    const warnings = totalResults
      .filter((item) => item.severity === "warning")
      .map((item) => item.message.trim() + "(" + item.pkgName + ")");

    const errors = totalResults
      .filter((item) => item.severity === "error")
      .map((item) => item.message.trim() + "(" + item.pkgName + ")");

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
