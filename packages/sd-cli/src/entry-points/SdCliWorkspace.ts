import { FsUtil, Logger, SdProcess } from "@simplysm/sd-core-node";
import path from "path";
import { INpmConfig, ISdCliConfig, ISdCliPackageBuildResult } from "../commons";
import { SdCliPackage } from "../packages/SdCliPackage";
import { Uuid, Wait } from "@simplysm/sd-core-common";
import os from "os";
import { SdCliBuildResultUtil } from "../utils/SdCliBuildResultUtil";
import semver from "semver/preload";
import { SdCliConfigUtil } from "../utils/SdCliConfigUtil";
import { SdServiceServer } from "@simplysm/sd-service-server";
import { SdCliNpm } from "./SdCliNpm";
import { SdCliLocalUpdate } from "./SdCliLocalUpdate";
import { NextHandleFunction } from "connect";

export class SdCliWorkspace {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  private readonly _npmConfig: INpmConfig;
  private readonly _serverInfoMap = new Map<string, IServerInfo>();

  public constructor(private readonly _rootPath: string) {
    const npmConfigFilePath = path.resolve(this._rootPath, "package.json");
    this._npmConfig = FsUtil.readJson(npmConfigFilePath);
  }

  public async watchAsync(opt: { confFileRelPath: string; optNames: string[] }): Promise<void> {
    this._logger.debug("프로젝트 설정 가져오기...");
    const config = await SdCliConfigUtil.loadConfigAsync(path.resolve(this._rootPath, opt.confFileRelPath), true, opt.optNames);

    if (config.localUpdates) {
      this._logger.debug("로컬 라이브러리 업데이트 변경감지 시작...");
      await new SdCliLocalUpdate(this._rootPath).watchAsync({ confFileRelPath: opt.confFileRelPath });
    }

    this._logger.debug("패키지 목록 구성...");
    const pkgs = await this._getPackagesAsync(config);

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
        .on("complete", async (results) => {
          if (pkg.config.type === "server" && !results.some((item) => item.severity === "error")) {
            await this._restartServerAsync(pkg);
          }

          this._logger.debug(`[${pkg.name}] 빌드가 완료되었습니다.`);
          totalResultMap.set(pkg.name, results);

          setTimeout(() => {
            changeCount--;
            if (changeCount === 0) {
              this._loggingResults(totalResultMap);
              this._loggingOpenClientHrefs();
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
      if (pkg.config.type === "client") {
        const middlewares = (await pkg.watchAsync()) as NextHandleFunction[];

        const serverInfo = this._serverInfoMap.getOrCreate(pkg.config.server, { middlewares: [], clientInfos: [] });
        serverInfo.middlewares.push(...middlewares);
        serverInfo.clientInfos.push({ pkgKey: pkg.name.split("/").last()! });
      }
      else {
        await pkg.watchAsync();
      }
      buildCompletedPackageNames.push(pkg.name);
    });
  }

  private async _restartServerAsync(pkg: SdCliPackage): Promise<void> {
    const entryFileRelPath = pkg.main;
    if (entryFileRelPath === undefined) {
      this._logger.error(`서버패키지(${pkg.name})의 'package.json'에서 'main'필드를 찾을 수 없습니다.`);
      return;
    }
    const entryFilePath = path.resolve(pkg.rootPath, entryFileRelPath);

    this._logger.log(`서버(${pkg.name}) 재시작...`);
    try {
      const serverInfo = this._serverInfoMap.getOrCreate(pkg.name, { middlewares: [], clientInfos: [] });
      if (serverInfo.server) {
        await serverInfo.server.closeAsync();
        delete serverInfo.server;
      }

      serverInfo.server = (await import("file:///" + entryFilePath + "?update=" + Uuid.new().toString())).default as SdServiceServer | undefined;
      if (!serverInfo.server) {
        this._logger.error(`${entryFilePath}(0, 0): 'SdServiceServer'를 'export'해야 합니다.`);
        return;
      }
      serverInfo.server.devMiddlewares = serverInfo.middlewares;
      await Wait.until(() => serverInfo.server!.isOpen);

      this._logger.log(`서버(${pkg.name}) 재시작 완료`);
    }
    catch (err) {
      this._logger.error(`서버(${pkg.name}) 재시작중 오류 발생`, err);
    }
  }

  public async buildAsync(opt: { confFileRelPath: string; optNames: string[] }): Promise<void> {
    this._logger.debug("프로젝트 설정 가져오기...");
    const config = await SdCliConfigUtil.loadConfigAsync(path.resolve(this._rootPath, opt.confFileRelPath), false, opt.optNames);

    this._logger.debug("패키지 목록 구성...");
    const pkgs = await this._getPackagesAsync(config);

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
    if (Array.from(totalResultMap.values()).mapMany().some((item) => item.severity === "error")) {
      throw new Error("빌드중 오류가 발생하였습니다.");
    }
    else {
      this._logger.info("모든 빌드가 완료되었습니다.");
    }
  }

  public async publishAsync(opt: { noBuild: boolean; confFileRelPath: string; optNames: string[] }): Promise<void> {
    this._logger.debug("프로젝트 설정 가져오기...");
    const config = await SdCliConfigUtil.loadConfigAsync(path.resolve(this._rootPath, opt.confFileRelPath), false, opt.optNames);

    if (opt.noBuild) {
      this._logger.warn("빌드하지 않고, 배포하는것은 상당히 위험합니다.");
      await this._waitSecMessageAsync("프로세스를 중지하려면, 'CTRL+C'를 누르세요.", 5);
    }

    // GIT 사용중일 경우, 커밋되지 않은 수정사항이 있는지 확인
    if (FsUtil.exists(path.resolve(process.cwd(), ".git"))) {
      this._logger.debug("GIT 커밋여부 확인...");
      const gitStatusResult = await SdProcess.spawnAsync("git status");
      if (gitStatusResult.includes("Changes") || gitStatusResult.includes("Untracked")) {
        throw new Error("커밋되지 않은 정보가 있습니다.\n" + gitStatusResult);
      }
    }

    this._logger.debug("패키지 목록 구성...");
    const pkgs = await this._getPackagesAsync(config);

    this._logger.debug("프로젝트 및 패키지 버전 설정...");
    await this._upgradeVersionAsync(pkgs);

    this._logger.debug("노드패키지 업데이트...");
    await new SdCliNpm(this._rootPath).updateAsync();

    // 빌드
    if (!opt.noBuild) {
      this._logger.debug("빌드를 시작합니다...");
      await this._buildPkgsAsync(pkgs);
    }

    // GIT 사용중일경우, 새 버전 커밋 및 TAG 생성
    if (FsUtil.exists(path.resolve(process.cwd(), ".git"))) {
      this._logger.debug("새 버전 커밋 및 TAG 생성...");
      await SdProcess.spawnAsync("git add .");
      await SdProcess.spawnAsync(`git commit -m "v${this._npmConfig.version}"`);
      await SdProcess.spawnAsync(`git tag -a "v${this._npmConfig.version}" -m "v${this._npmConfig.version}"`);
    }

    this._logger.debug("배포 시작...");
    await pkgs.parallelAsync(async (pkg) => {
      this._logger.debug(`[${pkg.name}] 배포를 시작합니다...`);
      await pkg.publishAsync();
      this._logger.debug(`[${pkg.name}] 배포가 완료되었습니다.`);
    });
    this._logger.info(`모든 배포가 완료되었습니다. (v${this._npmConfig.version})`);
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
      process.stdout.write(`${msg} ${i}`);
      await Wait.time(1000);
    }

    process.stdout.cursorTo(0);
    process.stdout.clearLine(0);
  }

  private async _getPackagesAsync(conf: ISdCliConfig): Promise<SdCliPackage[]> {
    const pkgRootPaths = await this._npmConfig.workspaces?.mapManyAsync(async (item) => await FsUtil.globAsync(item));
    if (!pkgRootPaths) {
      throw new Error("최상위 'package.json'에서 'workspaces'를 찾을 수 없습니다.");
    }


    return pkgRootPaths.map((pkgRootPath) => {
      const pkgConfig = conf.packages[path.basename(pkgRootPath)];
      return pkgConfig ? new SdCliPackage(this._rootPath, pkgRootPath, pkgConfig) : undefined;
    }).filterExists();
  }

  private _loggingResults(totalResultMap: Map<string, ISdCliPackageBuildResult[]>): void {
    const totalResults = Array.from(totalResultMap.entries())
      .mapMany((item) => item[1].map((item1) => ({
        pkgName: item[0],
        ...item1
      })))
      .orderBy((item) => `${item.pkgName}_${item.filePath}`);

    const warnings = totalResults
      .filter((item) => item.severity === "warning")
      .map((item) => `${SdCliBuildResultUtil.getMessage(item)} (${item.pkgName})`)
      .distinct();

    const errors = totalResults
      .filter((item) => item.severity === "error")
      .map((item) => `${SdCliBuildResultUtil.getMessage(item)} (${item.pkgName})`)
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

  private _loggingOpenClientHrefs(): void {
    const clientHrefs: string[] = [];

    const serverInfos = Array.from(this._serverInfoMap.values());
    for (const serverInfo of serverInfos) {
      if (!serverInfo.server) continue;

      const protocolStr = serverInfo.server.options.ssl ? "https" : "http";
      const portStr = serverInfo.server.options.port.toString();

      for (const clientInfo of serverInfo.clientInfos) {
        clientHrefs.push(`${protocolStr}://localhost:${portStr}/${clientInfo.pkgKey}/`);
      }
    }
    if (clientHrefs.length > 0) {
      this._logger.log(`오픈된 클라이언트: ${clientHrefs.join(", ")}`);
    }
  }
}

interface IServerInfo {
  server?: SdServiceServer;
  middlewares: NextHandleFunction[];
  clientInfos: { pkgKey: string }[];
}
