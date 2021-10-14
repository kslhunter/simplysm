import { SdProjectConfigUtil } from "../utils/SdProjectConfigUtil";
import { FsUtil, Logger, SdProcessManager, SdProcessWorkManager } from "@simplysm/sd-core-node";
import {
  INpmConfig,
  ISdClientPackageConfig,
  ISdPackageBuildResult,
  ISdProjectConfig,
  TSdPackageConfig
} from "../commons";
import * as path from "path";
import { FunctionQueue, StringUtil, Wait } from "@simplysm/sd-core-common";
import * as os from "os";
import { NextHandleFunction } from "connect";
import { SdCliLibraryPackage } from "../packages/SdCliLibraryPackage";
import { SdCliServerPackage } from "../packages/SdCliServerPackage";
import { SdCliClientPackage } from "../packages/SdCliClientPackage";
import { SdCliUnknownPackage } from "../packages/SdCliUnknownPackage";
import { SdCliLocalUpdater } from "./SdCliLocalUpdater";
import * as semver from "semver";

// TODO: Cordova
// TODO: Electron
export class SdCliProject {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  public readonly npmConfig: INpmConfig;
  public readonly npmConfigFilePath: string;

  private readonly _fnQueue = new FunctionQueue();
  private readonly _serverInfoMap = new Map<string, { middlewares: NextHandleFunction[]; clientNames: string[]; port?: number; ssl?: boolean }>();

  public constructor(private readonly _rootPath: string) {
    this.npmConfigFilePath = path.resolve(this._rootPath, "package.json");
    this.npmConfig = FsUtil.readJson(this.npmConfigFilePath);
  }

  public async buildAsync(opt: { watch?: boolean; packages?: string[]; options?: string[]; config?: string; skipProcesses?: string[] }): Promise<{ hasError: boolean }> {
    this._logger.debug("프로젝트 설정 가져오기...");
    const config = await SdProjectConfigUtil.loadConfigAsync(
      this._rootPath,
      opt.watch,
      opt.options,
      opt.config
    );

    if (opt.watch && config.localUpdates) {
      this._logger.debug("로컬 라이브러리 업데이트 변경감지 시작...");
      await new SdCliLocalUpdater(this._rootPath).localUpdateAsync(true, opt);
    }

    this._logger.debug("프로젝트 패키지 목록 구성...");
    const allPkgs = await this._getAllPackagesAsync(config, opt.packages, opt.skipProcesses ?? []);
    const pkgs = allPkgs.filter((item) => !(item instanceof SdCliUnknownPackage)) as TSdCliBuildablePackage[];

    this._logger.debug("프로젝트 및 패키지 버전 설정...");
    if (!opt.watch) {
      const newVersion = await this._upgradeVersionAsync();
      await allPkgs.parallelAsync(async (pkg) => {
        await pkg.setNewVersionAsync(this.npmConfig.name, newVersion);
      });
    }

    this._logger.debug("패키지 빌드 이벤트 설정...");
    let changeCount = 0;
    const totalResultMap = new Map<string, (ISdPackageBuildResult & { pkgName: string })[]>();
    for (const pkg of pkgs) {
      pkg
        .on("change", (target) => {
          this._logger.debug(`[${pkg.npmConfig.name}${target !== undefined ? `(${target})` : ""}] 빌드를 시작합니다.`);

          this._fnQueue.run(() => {
            if (changeCount === 0) {
              this._logger.log(`빌드를 시작합니다...`);
            }
            changeCount++;
          });
        })
        .on("complete", (target, results) => {
          this._logger.debug(`[${pkg.npmConfig.name}${target !== undefined ? `(${target})` : ""}] 빌드가 완료되었습니다.`);

          this._fnQueue.run(() => {
            totalResultMap.set(pkg.npmConfig.name + "|_|" + target, results.map((item) => ({
              ...item,
              pkgName: pkg.npmConfig.name
            })));

            setTimeout(() => {
              changeCount--;
              if (changeCount === 0) {
                this._loggingResults(totalResultMap);
                this._logger.info(`모든 빌드가 완료되었습니다.`);
                this._loggingOpenClientHrefs();
              }
            }, 100);
          });
        });

      if (pkg instanceof SdCliServerPackage) {
        pkg.on("complete", (target, results, server) => {
          if (server) {
            const serverInfo = this._serverInfoMap.getOrCreate(pkg.npmConfig.name, {
              middlewares: [],
              clientNames: []
            });
            server.middlewares = serverInfo.middlewares;
            serverInfo.port = server.options.port;
            serverInfo.ssl = server.options.ssl !== undefined;
          }
        });
      }
    }

    this._logger.debug("패키지 빌드...");
    const pkgNames = pkgs.map((item) => item.npmConfig.name);

    this._logger.log(`빌드를 시작합니다...`);
    changeCount++;
    const buildCompletedPackageNames: string[] = [];
    await pkgs.parallelAsync(async (pkg) => {
      await this._waitPackageCompleteAsync(pkg, pkgNames, buildCompletedPackageNames);

      if (opt.watch) {
        if (pkg instanceof SdCliClientPackage) {
          const middlewares = await pkg.watchAsync();
          if (!StringUtil.isNullOrEmpty(pkg.config.server)) {
            const serverInfo = this._serverInfoMap.getOrCreate(pkg.config.server, { middlewares: [], clientNames: [] });
            serverInfo.middlewares.push(...middlewares);
            serverInfo.clientNames = serverInfo.clientNames.concat([pkg.npmConfig.name.split("/").last()!]).distinct();
          }
        }
        else {
          await pkg.watchAsync();
        }
      }
      else {
        await pkg.buildAsync();
      }
      buildCompletedPackageNames.push(pkg.npmConfig.name);
    });
    changeCount--;
    this._loggingResults(totalResultMap);
    this._logger.info(`모든 빌드가 완료되었습니다.`);
    this._loggingOpenClientHrefs();

    return {
      hasError: Array.from(totalResultMap.values()).mapMany().some((item) => item.severity === "error")
    };
  }


  public async publishAsync(opt: { build: boolean; packages?: string[]; options?: string[]; config?: string }): Promise<void> {
    if (!opt.build) {
      this._logger.warn("빌드하지 않고, 배포하는것은 상당히 위험합니다.");
      await this._waitSecMessageAsync("프로세스를 중지하려면, 'CTRL+C'를 누르세요.", 5);
    }

    // GIT 사용중일 경우, 커밋되지 않은 수정사항이 있는지 확인
    if (FsUtil.exists(path.resolve(process.cwd(), ".git"))) {
      this._logger.debug(`GIT 커밋여부 확인...`);
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

    this._logger.debug("프로젝트 설정 가져오기...");
    const config = await SdProjectConfigUtil.loadConfigAsync(
      this._rootPath,
      false,
      opt.options,
      opt.config
    );

    this._logger.debug("프로젝트 패키지 목록 구성...");
    const allPkgs = await this._getAllPackagesAsync(config, opt.packages, []);
    const pkgs = allPkgs.filter((item) => !(item instanceof SdCliUnknownPackage) && item.config.publish) as TSdCliBuildablePackage[];

    // 빌드가 필요하면 빌드함
    if (opt.build) {
      this._logger.debug("빌드 수행...");
      const buildResult = await this.buildAsync({
        watch: false,
        packages: pkgs.map((item) => item.npmConfig.name)
          .filter((item) => !opt.packages || opt.packages.includes(item)),
        options: opt.options,
        config: opt.config
      });
      if (buildResult.hasError) {
        throw new Error("빌드중 에러가 발생했습니다.");
      }
    }

    // 빌드시엔 빌드에서 버전업했고, 빌드가 아닌경우 여기서 버전업
    if (!opt.build) {
      this._logger.debug("프로젝트 및 패키지 버전 설정...");
      const newVersion = await this._upgradeVersionAsync();
      await allPkgs.parallelAsync(async (pkg) => {
        await pkg.setNewVersionAsync(this.npmConfig.name, newVersion);
      });
    }

    // GIT 사용중일경우, 새 버전 커밋 및 TAG 생성
    if (FsUtil.exists(path.resolve(process.cwd(), ".git"))) {
      this._logger.debug("새 버전 커밋 및 TAG 생성...");
      await SdProcessManager.spawnAsync(`git add .`, undefined, false, false);
      await SdProcessManager.spawnAsync(`git commit -m "v${this.npmConfig.version}"`, undefined, false, false);
      await SdProcessManager.spawnAsync(`git tag -a "v${this.npmConfig.version}" -m "v${this.npmConfig.version}"`, undefined, false, false);
    }

    this._logger.debug(`배포 시작...`);

    await pkgs.parallelAsync(async (pkg) => {
      await pkg.publishAsync();
    });

    this._logger.info(`배포 프로세스가 완료되었습니다.(v${this.npmConfig.version})`);
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

  private _loggingOpenClientHrefs(): void {
    const clientHrefs = Array.from(this._serverInfoMap.values()).mapMany((serverInfo) => serverInfo.clientNames.map((clientName) => {
      const protocolStr = serverInfo.ssl ? "https://" : "http://";
      const portStr = serverInfo.port !== undefined ? `:${serverInfo.port}` : "";
      return protocolStr + "localhost" + portStr + "/" + clientName + "/";
    }));
    if (clientHrefs.length > 0) {
      this._logger.log(`오픈된 클라이언트: ${clientHrefs.join(", ")}`);
    }
  }

  private async _getAllPackagesAsync(config: ISdProjectConfig, packages: string[] | undefined, skipProcesses: string[]): Promise<TSdCliPackage[]> {
    // package.json에서 workspaces를 통해 패키지 경로 목록 가져오기
    const allPkgPaths = await this.npmConfig.workspaces?.mapManyAsync(async (item) => await FsUtil.globAsync(item));
    if (!allPkgPaths) {
      throw new Error("프로젝트의 'package.json'에서 'workspaces'를 찾을 수 없습니다.");
    }

    // 모든 패키지의 설정 가져오기
    const allPackageInfos: { rootPath: string; name: string; config: TSdPackageConfig | undefined }[] = [];
    for (const pkgPath of allPkgPaths) {
      // 패키지 package.json
      const pkgNpmConfigFilePath = path.resolve(pkgPath, "package.json");
      if (!FsUtil.exists(pkgNpmConfigFilePath)) continue; // package.json파일이 없는 폴더는 무시
      const pkgNpmConfig: INpmConfig = await FsUtil.readJsonAsync(pkgNpmConfigFilePath);

      // 패키지 설정
      const pkgName = pkgNpmConfig.name;
      const pkgConfig = config.packages[pkgName];

      // 사용할 패키지로 설정하지 않은 패키지면 타입을 'none'으로 강제
      if (packages && packages.length > 0 && !packages.includes(pkgName)) {
        allPackageInfos.push({ rootPath: pkgPath, name: pkgName, config: undefined });
      }
      else {
        allPackageInfos.push({ rootPath: pkgPath, name: pkgName, config: pkgConfig });
      }
    }

    // 각 package를 위한 worker 준비
    /*const workerCount = allPackageInfos.sum((item) => {
      if (item.config && item.config.type === "library") {
        return item.config.targets?.length ?? 1;
      }
      return 0;
    });*/

    const processWorkManager = await SdProcessWorkManager.createAsync(
      path.resolve(__dirname, `../workers/lib-build-worker`),
      [],
      this._logger/*,
      Math.min(workerCount, Math.max(os.cpus().length - 2, 1)),
      Math.max(os.cpus().length - 2, 1)*/
    );

    // 패키지 목록 구성
    const pkgs: TSdCliPackage[] = [];
    for (const pkgInfo of allPackageInfos) {
      if (pkgInfo.config?.type === "library") {
        pkgs.push(new SdCliLibraryPackage(pkgInfo.rootPath, pkgInfo.config, skipProcesses as any, processWorkManager));
      }
      else if (pkgInfo.config?.type === "client") {
        const serverPkgInfo = allPackageInfos.single((item) => item.name === (pkgInfo.config as ISdClientPackageConfig).server);
        pkgs.push(new SdCliClientPackage(pkgInfo.rootPath, pkgInfo.config, skipProcesses as any, serverPkgInfo?.rootPath));
      }
      else if (pkgInfo.config?.type === "server") {
        pkgs.push(new SdCliServerPackage(pkgInfo.rootPath, pkgInfo.config, skipProcesses as any));
      }
      else {
        pkgs.push(new SdCliUnknownPackage(pkgInfo.rootPath));
      }
    }

    return pkgs;
  }

  private async _waitPackageCompleteAsync(pkg: TSdCliPackage, pkgNames: string[], completedPkgNames: string[]): Promise<void> {
    // 패키지의 의존성 패키지 중에 빌드해야할 패키지 목록에 이미 있는 의존성 패키지만 추리기
    const depNames = [
      ...Object.keys(pkg.npmConfig.dependencies ?? {}),
      ...Object.keys(pkg.npmConfig.optionalDependencies ?? {}),
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
      .map((item) => item.message.trim() + " (" + item.pkgName + ")")
      .distinct();

    const errors = totalResults
      .filter((item) => item.severity === "error")
      .map((item) => item.message.trim() + " (" + item.pkgName + ")")
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

  private async _upgradeVersionAsync(): Promise<string> {
    // 프로젝트 및 패키지 버전 업
    const newVersion = semver.inc(this.npmConfig.version, "patch")!;
    this.npmConfig.version = newVersion;

    const updateDepVersion = (deps: Record<string, string> | undefined): void => {
      if (!deps) return;
      for (const dependencyName of Object.keys(deps)) {
        if (dependencyName.startsWith("@" + this.npmConfig.name + "/")) {
          deps[dependencyName] = newVersion;
        }
      }
    };
    updateDepVersion(this.npmConfig.dependencies);
    updateDepVersion(this.npmConfig.optionalDependencies);
    updateDepVersion(this.npmConfig.devDependencies);
    updateDepVersion(this.npmConfig.peerDependencies);

    await FsUtil.writeJsonAsync(this.npmConfigFilePath, this.npmConfig, { space: 2 });

    return newVersion;
  }
}

type TSdCliPackage = SdCliLibraryPackage | SdCliServerPackage | SdCliClientPackage | SdCliUnknownPackage;
type TSdCliBuildablePackage = SdCliLibraryPackage | SdCliServerPackage | SdCliClientPackage;
