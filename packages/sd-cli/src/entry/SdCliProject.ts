import path from "path";
import {FsUtil, Logger, PathUtil, SdProcess} from "@simplysm/sd-core-node";
import {
  INpmConfig,
  ISdCliBuildClusterReqMessage,
  ISdCliBuildClusterResMessage,
  ISdCliConfig,
  ISdCliPackageBuildResult,
  ISdCliServerPackageConfig,
  TSdCliPackageConfig
} from "../commons";
import cp from "child_process";
import {fileURLToPath, pathToFileURL} from "url";
import {SdCliBuildResultUtil} from "../utils/SdCliBuildResultUtil";
import semver from "semver";
import {NeverEntryError, StringUtil, Wait} from "@simplysm/sd-core-common";
import {SdStorage} from "@simplysm/sd-storage";
import {SdCliLocalUpdate} from "./SdCliLocalUpdate";
import xml2js from "xml2js";

export class SdCliProject {
  public static async watchAsync(opt: {
    confFileRelPath: string;
    optNames: string[];
    pkgNames: string[];
  }): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", "SdCliProject", "watchAsync"]);

    logger.debug("프로젝트 설정 가져오기...");
    const projConf = (await import(pathToFileURL(path.resolve(process.cwd(), opt.confFileRelPath)).href)).default(true, opt.optNames) as ISdCliConfig;

    if (projConf.localUpdates) {
      logger.debug("로컬 라이브러리 업데이트 변경감지 시작...");
      await SdCliLocalUpdate.watchAsync({
        confFileRelPath: opt.confFileRelPath,
        optNames: opt.optNames
      });
    }

    logger.debug("프로젝트 package.json 가져오기...");
    const projNpmConf = (await FsUtil.readJsonAsync(path.resolve(process.cwd(), "package.json"))) as INpmConfig;

    logger.debug("패키지 목록 구성...");
    if (!projNpmConf.workspaces) {
      throw new Error("프로젝트 package.json에 workspaces가 설정되어있지 않습니다.");
    }
    const allPkgPaths = await projNpmConf.workspaces.mapManyAsync(async (item) => await FsUtil.globAsync(item));
    let pkgPaths = allPkgPaths.filter((pkgPath) => path.basename(pkgPath) in projConf.packages);
    if (opt.pkgNames.length !== 0) {
      pkgPaths = pkgPaths.filter((pkgPath) => opt.pkgNames.includes(path.basename(pkgPath)));
    }

    logger.debug("패키지 존재 확인...");
    const notExistsPkgs = Object.keys(projConf.packages).filter((pkgConfKey) => allPkgPaths.every((pkgPath) => path.basename(pkgPath) !== pkgConfKey));
    if (notExistsPkgs.length > 0) {
      throw new Error("패키지를 찾을 수 없습니다. (" + notExistsPkgs.join(", ") + ")");
    }

    logger.debug("빌드 프로세스 준비...");
    const cluster = await this._prepareClusterAsync();

    logger.debug("빌드 프로세스 이벤트 준비...");
    const resultCache = new Map<string, ISdCliPackageBuildResult[]>();
    let busyCount = 0;
    const serverInfoMap = new Map<string, {
      // server
      pkgPath?: string; // persist
      worker?: cp.ChildProcess; // persist
      port?: number;
      hasChanges: boolean;
      hasClientChanges: boolean;

      //client
      pathProxy: Record<string, string | number | undefined>; // persist
      // changeFilePaths: string[];
    }>();
    cluster.on("message", (message: ISdCliBuildClusterResMessage) => {
      if (message.type === "change") {
        if (busyCount === 0) {
          logger.log("빌드를 시작합니다...");
        }
        busyCount++;
      }
      else if (message.type === "complete") {
        for (const affectedFilePath of message.result!.affectedFilePaths) {
          resultCache.delete(affectedFilePath);
        }

        for (const buildResult of message.result!.buildResults) {
          const cacheItem = resultCache.getOrCreate(buildResult.filePath ?? "none", []);
          cacheItem.push(buildResult);
        }

        const pkgConf = message.req.projConf.packages[path.basename(message.req.pkgPath)]!;

        if (pkgConf.type === "server") {
          const pkgName = path.basename(message.req.pkgPath);
          const serverInfo = serverInfoMap.getOrCreate(pkgName, {
            hasChanges: false,
            hasClientChanges: false,
            pathProxy: {},
            // changeFilePaths: []
          });
          serverInfo.pkgPath = message.req.pkgPath;
          serverInfo.hasChanges = true;
        }

        if (pkgConf.type === "client") {
          const pkgName = path.basename(message.req.pkgPath);

          if (pkgConf.server !== undefined) {
            const serverInfo = serverInfoMap.getOrCreate(pkgConf.server, {
              hasChanges: false,
              hasClientChanges: false,
              pathProxy: {},
              // changeFilePaths: []
            });
            serverInfo.pathProxy[pkgName] = path.resolve(message.req.pkgPath, "dist");
            // serverInfo.changeFilePaths.push(...message.result!.affectedFilePaths);

            serverInfo.hasClientChanges = true;
            // serverInfo.worker?.send({type: "broadcastReload"});
          }
          else {
            const serverInfo = serverInfoMap.getOrCreate(pkgName, {
              hasChanges: false,
              hasClientChanges: false,
              pathProxy: {},
              // changeFilePaths: []
            });
            serverInfo.port = message.result!.port;
            // serverInfo.changeFilePaths.push(...message.result!.affectedFilePaths);

            serverInfo.hasClientChanges = true;
            // serverInfo.worker?.send({type: "broadcastReload"});
          }
        }

        setTimeout(async () => {
          busyCount--;
          if (busyCount === 0) {
            for (const serverPkgName of serverInfoMap.keys()) {
              const serverInfo = serverInfoMap.get(serverPkgName)!;
              if (serverInfo.pkgPath !== undefined && serverInfo.hasChanges) {
                logger.debug("서버 재시작...");
                try {
                  const restartServerResult = await this._restartServerAsync(
                    serverInfo.pkgPath,
                    projConf.packages[path.basename(serverInfo.pkgPath)] as ISdCliServerPackageConfig,
                    serverInfo.worker
                  );
                  serverInfo.worker = restartServerResult.worker;
                  serverInfo.port = restartServerResult.port;
                  serverInfo.hasChanges = false;
                }
                catch (err) {
                  logger.error(err);
                }
              }

              if (serverInfo.worker) {
                logger.debug("클라이언트 설정...");
                serverInfo.worker.send({
                  type: "setPathProxy",
                  pathProxy: serverInfo.pathProxy
                });

                if (serverInfo.hasClientChanges) {
                  logger.debug("클라이언트 새로고침...");
                  serverInfo.worker.send({type: "broadcastReload"});
                }
              }
            }

            const clientPaths: string[] = [];
            for (const serverInfo of serverInfoMap.values()) {
              if (Object.keys(serverInfo.pathProxy).length > 0) {
                for (const proxyPath of Object.keys(serverInfo.pathProxy)) {
                  clientPaths.push(`http://localhost:${serverInfo.port}/${proxyPath}/`);
                }
              }
              else {
                clientPaths.push(`http://localhost:${serverInfo.port}/`);
              }
            }
            if (clientPaths.length > 0) {
              logger.info("클라이언트 개발 서버 접속 주소\n" + clientPaths.join("\n"));
            }

            const buildResults = Array.from(resultCache.values()).mapMany();
            this._logging(buildResults, logger);
          }
        }, 300);
      }
    });

    logger.debug("빌드 프로세스 명령 전송...");
    busyCount++;
    logger.log("빌드를 시작합니다...");

    await pkgPaths.parallelAsync(async (pkgPath) => {
      const pkgConf = projConf.packages[path.basename(pkgPath)]!;
      if (pkgConf.type === "client") {
        const builderKeys = Object.keys(pkgConf.builder ?? {web: {}});
        await builderKeys.parallelAsync(async (builderKey) => {
          await this._runCommandAsync(cluster, "watch", projConf, pkgPath, builderKey);
        });
      }
      else {
        await this._runCommandAsync(cluster, "watch", projConf, pkgPath);
      }
    });

    busyCount--;
    if (busyCount === 0) {
      const buildResults = Array.from(resultCache.values()).mapMany();
      this._logging(buildResults, logger);
    }
  }

  public static async buildAsync(opt: {
    confFileRelPath: string;
    optNames: string[];
    pkgNames: string[];
  }): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", "SdCliProject", "buildAsync"]);

    logger.debug("프로젝트 설정 가져오기...");
    const projConf = (await import(pathToFileURL(path.resolve(process.cwd(), opt.confFileRelPath)).href)).default(false, opt.optNames) as ISdCliConfig;

    logger.debug("프로젝트 package.json 가져오기...");
    const projNpmConf = (await FsUtil.readJsonAsync(path.resolve(process.cwd(), "package.json"))) as INpmConfig;

    logger.debug("패키지 목록 구성...");
    if (!projNpmConf.workspaces) {
      throw new Error("프로젝트 package.json에 workspaces가 설정되어있지 않습니다.");
    }
    const allPkgPaths = await projNpmConf.workspaces.mapManyAsync(async (item) => await FsUtil.globAsync(item));
    let pkgPaths = allPkgPaths.filter((pkgPath) => path.basename(pkgPath) in projConf.packages);
    if (opt.pkgNames.length !== 0) {
      pkgPaths = pkgPaths.filter((pkgPath) => opt.pkgNames.includes(path.basename(pkgPath)));
    }

    logger.debug("프로젝트 및 패키지 버전 설정...");
    await this._upgradeVersionAsync(projNpmConf, allPkgPaths);

    logger.debug("빌드 프로세스 준비...");
    const cluster = await this._prepareClusterAsync();

    logger.debug("빌드 프로세스 명령 전달...");
    const results = (
      await pkgPaths.parallelAsync(async (pkgPath) => {
        const pkgConf = projConf.packages[path.basename(pkgPath)]!;
        if (pkgConf.type === "client") {
          const builderKeys = Object.keys(pkgConf.builder ?? {web: {}});
          return (await builderKeys.parallelAsync(async (builderKey) => {
            return await this._runCommandAsync(cluster, "build", projConf, pkgPath, builderKey);
          })).mapMany();
        }
        else {
          return await this._runCommandAsync(cluster, "build", projConf, pkgPath);
        }
      })
    ).mapMany();

    logger.debug("빌드 프로세스 닫기...");
    this._closeCluster(cluster);

    this._logging(results, logger);
  }

  public static async publishAsync(opt: {
    noBuild: boolean;
    confFileRelPath: string;
    optNames: string[];
    pkgNames: string[];
  }): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", "SdCliProject", "publishAsync"]);

    logger.debug("프로젝트 설정 가져오기...");
    const projConf = (await import(pathToFileURL(path.resolve(process.cwd(), opt.confFileRelPath)).href)).default(false, opt.optNames) as ISdCliConfig;

    logger.debug("프로젝트 package.json 가져오기...");
    const projNpmConf = (await FsUtil.readJsonAsync(path.resolve(process.cwd(), "package.json"))) as INpmConfig;

    if (opt.noBuild) {
      logger.warn("빌드하지 않고, 배포하는것은 상당히 위험합니다.");
      await this._waitSecMessageAsync("프로세스를 중지하려면, 'CTRL+C'를 누르세요.", 5);
    }

    // GIT 사용중일 경우, 커밋되지 않은 수정사항이 있는지 확인
    if (FsUtil.exists(path.resolve(process.cwd(), ".git"))) {
      logger.debug("GIT 커밋여부 확인...");
      const gitStatusResult = await SdProcess.spawnAsync("git status");
      if (gitStatusResult.includes("Changes") || gitStatusResult.includes("Untracked")) {
        throw new Error("커밋되지 않은 정보가 있습니다.\n" + gitStatusResult);
      }
    }

    logger.debug("패키지 목록 구성...");
    if (!projNpmConf.workspaces) {
      throw new Error("프로젝트 package.json에 workspaces가 설정되어있지 않습니다.");
    }
    const allPkgPaths = await projNpmConf.workspaces.mapManyAsync(async (item) => await FsUtil.globAsync(item));
    let pkgPaths = allPkgPaths.filter((pkgPath) => path.basename(pkgPath) in projConf.packages);
    if (opt.pkgNames.length !== 0) {
      pkgPaths = pkgPaths.filter((pkgPath) => opt.pkgNames.includes(path.basename(pkgPath)));
    }

    logger.debug("프로젝트 및 패키지 버전 설정...");
    await this._upgradeVersionAsync(projNpmConf, allPkgPaths);

    // 빌드
    if (!opt.noBuild) {
      logger.debug("빌드 프로세스 준비...");
      const cluster = await this._prepareClusterAsync();

      logger.debug("빌드 프로세스 명령 전달...");
      const results = (
        await pkgPaths.parallelAsync(async (pkgPath) => {
          const pkgConf = projConf.packages[path.basename(pkgPath)]!;
          if (pkgConf.type === "client") {
            const builderKeys = Object.keys(pkgConf.builder ?? {web: {}});
            return (await builderKeys.parallelAsync(async (builderKey) => {
              return await this._runCommandAsync(cluster, "build", projConf, pkgPath, builderKey);
            })).mapMany();
          }
          else {
            return await this._runCommandAsync(cluster, "build", projConf, pkgPath);
          }
        })
      ).mapMany();

      logger.debug("빌드 프로세스 닫기...");
      this._closeCluster(cluster);

      this._logging(results, logger);
    }

    // GIT 사용중일경우, 새 버전 커밋 및 TAG 생성
    if (FsUtil.exists(path.resolve(process.cwd(), ".git"))) {
      logger.debug("새 버전 커밋 및 TAG 생성...");
      await SdProcess.spawnAsync("git add .");
      await SdProcess.spawnAsync(`git commit -m "v${projNpmConf.version}"`);
      await SdProcess.spawnAsync(`git tag -a "v${projNpmConf.version}" -m "v${projNpmConf.version}"`);

      logger.debug("새 버전 푸쉬...");
      await SdProcess.spawnAsync("git push");
      await SdProcess.spawnAsync("git push --tags");
    }

    logger.debug("배포 시작...");
    await pkgPaths.parallelAsync(async (pkgPath) => {
      const pkgName = path.basename(pkgPath);
      const pkgConf = projConf.packages[pkgName];
      if (pkgConf?.publish == null) return;

      logger.debug(`[${pkgName}] 배포 시작...`);
      await this._publishPkgAsync(pkgPath, pkgConf.publish);
      logger.debug(`[${pkgName}] 배포 완료`);
    });

    logger.info(`모든 배포가 완료되었습니다. (v${projNpmConf.version})`);
  }

  private static async _publishPkgAsync(pkgPath: string, pkgPubConf: TSdCliPackageConfig["publish"]): Promise<void> {
    if (pkgPubConf === "npm") {
      await SdProcess.spawnAsync("yarn npm publish --access public", {cwd: pkgPath});
    }
    else if (pkgPubConf?.type === "local-directory") {
      const pkgNpmConf = (await FsUtil.readJsonAsync(path.resolve(pkgPath, "package.json"))) as INpmConfig;

      const targetRootPath = pkgPubConf.path.replace(/%([^%]*)%/g, (item) => {
        const envName = item.replace(/%/g, "");
        if (!StringUtil.isNullOrEmpty(pkgNpmConf.version) && envName === "SD_VERSION") {
          return pkgNpmConf.version;
        }
        return process.env[envName] ?? item;
      });

      const filePaths = await FsUtil.globAsync(path.resolve(pkgPath, "dist", "**", "*"), {
        dot: true,
        nodir: true
      });

      await filePaths.parallelAsync(async (filePath) => {
        const relativeFilePath = path.relative(path.resolve(pkgPath, "dist"), filePath);
        const targetPath = PathUtil.posix(targetRootPath, relativeFilePath);
        await FsUtil.copyAsync(filePath, targetPath);
      });
    }
    else if (pkgPubConf?.type === "ftp" || pkgPubConf?.type === "ftps" || pkgPubConf?.type === "sftp") {
      const ftp = await SdStorage.connectAsync(pkgPubConf.type, {
        host: pkgPubConf.host,
        port: pkgPubConf.port,
        user: pkgPubConf.user,
        pass: pkgPubConf.pass
      });
      await ftp.uploadDirAsync(path.resolve(pkgPath, "dist"), pkgPubConf.path ?? "/");
      await ftp.closeAsync();
    }
    else {
      throw new NeverEntryError();
    }
  }

  private static async _waitSecMessageAsync(msg: string, sec: number): Promise<void> {
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

  private static async _upgradeVersionAsync(projNpmConf: INpmConfig, allPkgPaths: string[]): Promise<void> {
    // 작업공간 package.json 버전 설정
    const newVersion = semver.inc(projNpmConf.version, "patch")!;
    projNpmConf.version = newVersion;

    const pkgNames = await allPkgPaths.mapAsync(async (pkgPath) => {
      const pkgNpmConf = await FsUtil.readJsonAsync(path.resolve(pkgPath, "package.json"));
      return pkgNpmConf.name;
    });

    const updateDepVersion = (deps: Record<string, string> | undefined): void => {
      if (!deps) return;
      for (const depName of Object.keys(deps)) {
        if (pkgNames.includes(depName)) {
          deps[depName] = newVersion;
        }
      }
    };
    updateDepVersion(projNpmConf.dependencies);
    updateDepVersion(projNpmConf.optionalDependencies);
    updateDepVersion(projNpmConf.devDependencies);
    updateDepVersion(projNpmConf.peerDependencies);

    const projNpmConfFilePath = path.resolve(process.cwd(), "package.json");
    await FsUtil.writeJsonAsync(projNpmConfFilePath, projNpmConf, {space: 2});

    // 각 패키지 package.json 버전 설정
    await allPkgPaths.parallelAsync(async (pkgPath) => {
      const pkgNpmConfFilePath = path.resolve(pkgPath, "package.json");
      const pkgNpmConf = await FsUtil.readJsonAsync(pkgNpmConfFilePath);
      pkgNpmConf.version = newVersion;

      updateDepVersion(pkgNpmConf.dependencies);
      updateDepVersion(pkgNpmConf.optionalDependencies);
      updateDepVersion(pkgNpmConf.devDependencies);
      updateDepVersion(pkgNpmConf.peerDependencies);

      await FsUtil.writeJsonAsync(pkgNpmConfFilePath, pkgNpmConf, {space: 2});

      if (FsUtil.exists(path.resolve(pkgPath, "plugin.xml"))) {
        const cordovaPluginConfFilePath = path.resolve(pkgPath, "plugin.xml");
        const cordovaPluginConfXml = await xml2js.parseStringPromise(await FsUtil.readFileAsync(cordovaPluginConfFilePath));
        cordovaPluginConfXml.plugin.$.version = newVersion;

        await FsUtil.writeFileAsync(cordovaPluginConfFilePath, new xml2js.Builder().buildObject(cordovaPluginConfXml));
      }
    });
  }

  private static _logging(buildResults: ISdCliPackageBuildResult[], logger: Logger): void {
    const messageMap = buildResults.toSetMap(item => item.severity, item => SdCliBuildResultUtil.getMessage(item));

    if (messageMap.has("message")) {
      logger.log(`알림\n${[...messageMap.get("message")!].join("\n")}`);
    }
    if (messageMap.has("suggestion")) {
      logger.info(`제안\n${[...messageMap.get("suggestion")!].join("\n")}`);
    }
    if (messageMap.has("warning")) {
      logger.warn(`경고\n${[...messageMap.get("warning")!].join("\n")}`);
    }
    if (messageMap.has("error")) {
      logger.error(`오류\n${[...messageMap.get("error")!].join("\n")}`);
    }

    logger.info("모든 빌드가 완료되었습니다.");
  }

  private static async _prepareClusterAsync(): Promise<cp.ChildProcess> {
    const logger = Logger.get(["simplysm", "sd-cli", "SdCliProject", "_runBuildClusterAsync"]);

    return await new Promise<cp.ChildProcess>(async (resolve, reject) => {
      const cluster = cp.fork(
        fileURLToPath(await import.meta.resolve!("../build-cluster")),
        [],
        {
          stdio: ["pipe", "pipe", "pipe", "ipc"],
          env: process.env
        }
      );

      cluster.stdout!.pipe(process.stdout);
      cluster.stderr!.pipe(process.stderr);

      cluster.on("exit", (code) => {
        if (code != null && code !== 0) {
          const err = new Error(`오류와 함께 닫힘 (${code})`);
          logger.error(err);
          reject(err);
          return;
        }
      });

      cluster.on("error", (err) => {
        logger.error(err);
        reject(err);
      });

      cluster.on("message", (message) => {
        if (message === "ready") {
          logger.debug("빌드 클러스터 프로세스가 준비되었습니다.");
          resolve(cluster);
        }
      });
    });
  }

  private static async _runCommandAsync(cluster: cp.ChildProcess, cmd: "watch", projConf: ISdCliConfig, pkgPath: string, builderKey?: string): Promise<void>;
  private static async _runCommandAsync(cluster: cp.ChildProcess, cmd: "build", projConf: ISdCliConfig, pkgPath: string, builderKey?: string): Promise<ISdCliPackageBuildResult[]>;
  private static async _runCommandAsync(cluster: cp.ChildProcess, cmd: "watch" | "build", projConf: ISdCliConfig, pkgPath: string, builderKey?: string): Promise<ISdCliPackageBuildResult[] | void> {
    return await new Promise<ISdCliPackageBuildResult[] | void>((resolve) => {
      const cb = (message: ISdCliBuildClusterResMessage): void => {
        if (cmd === "watch" && message.type === "ready" && message.req.cmd === cmd && message.req.pkgPath === pkgPath) {
          cluster.off("message", cb);
          resolve();
        }
        else if (cmd === "build" && message.type === "complete" && message.req.cmd === cmd && message.req.pkgPath === pkgPath) {
          cluster.off("message", cb);
          resolve(message.result?.buildResults);
        }
      };
      cluster.on("message", cb);

      cluster.send({
        cmd,
        projConf,
        pkgPath,
        builderKey
      } as ISdCliBuildClusterReqMessage);
    });
  }

  private static _closeCluster(cluster: cp.ChildProcess): void {
    cluster.kill("SIGKILL");
  }

  private static async _restartServerAsync(pkgPath: string, pkgConf: ISdCliServerPackageConfig, prevServerProcess?: cp.ChildProcess): Promise<{
    worker: cp.ChildProcess,
    port: number
  }> {
    const logger = Logger.get(["simplysm", "sd-cli", "SdCliProject", "_restartServerAsync"]);

    if (prevServerProcess) {
      prevServerProcess.kill("SIGKILL");
    }

    const npmConf = (await FsUtil.readJsonAsync(path.resolve(pkgPath, "package.json"))) as INpmConfig;

    return await new Promise<{
      worker: cp.ChildProcess,
      port: number
    }>(async (resolve, reject) => {
      const worker = cp.fork(
        fileURLToPath(await import.meta.resolve!("../server-worker")),
        [pkgPath],
        {
          stdio: ["pipe", "pipe", "pipe", "ipc"],
          env: {
            ...process.env,
            NODE_ENV: "development",
            TZ: "Asia/Seoul",
            SD_VERSION: npmConf.version,
            ...pkgConf.env
          }
        }
      );

      worker.stdout!.pipe(process.stdout);
      worker.stderr!.pipe(process.stderr);

      worker.on("exit", (code) => {
        if (code != null && code !== 0) {
          const err = new Error(`오류와 함께 닫힘 (${code})`);
          logger.error(err);
          reject(err);
          return;
        }
      });

      worker.on("error", (err) => {
        logger.error(err);
        reject(err);
      });

      worker.on("message", (message: any) => {
        if ("port" in message) {
          logger.debug("서버가 시작되었습니다.");
          resolve({
            worker,
            port: message.port
          });
        }
      });
    });
  }
}
