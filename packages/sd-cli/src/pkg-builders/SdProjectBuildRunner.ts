import {
  FsUtils,
  PathUtils,
  SdFsWatcher,
  SdLogger,
  SdWorker,
  TNormPath,
} from "@simplysm/sd-core-node";
import { ISdProjectConfig, ISdServerPackageConfig } from "../types/config/ISdProjectConfig";
import path from "path";
import { ISdBuildMessage } from "../types/build/ISdBuildMessage";
import { ISdBuildRunnerWorkerType } from "../types/worker/ISdBuildRunnerWorkerType";
import { IServerWorkerType } from "../types/worker/IServerWorkerType";
import { INpmConfig } from "../types/common-config/INpmConfig";

export class SdProjectBuildRunner {
  static #logger = SdLogger.get(["simplysm", "sd-cli", "SdProjectBuildRunner"]);

  static #buildInfoMap = new Map<
    TNormPath,
    {
      buildWorker: SdWorker<ISdBuildRunnerWorkerType>;
      watchFileSet: Set<TNormPath>;
    }
  >();

  static #serverInfoMap = new Map<
    string,
    {
      worker?: SdWorker<any>;
      port?: number;
      clientMap?: Map<
        string,
        {
          distPath: string;
          buildTypes: ("web" | "electron" | "cordova")[];
        }
      >;
    }
  >();

  static #resultCache = new Map<TNormPath, ISdBuildMessage[]>();

  static async watchAsync(opt: {
    pkgPaths: TNormPath[];
    projConf: ISdProjectConfig;
    emitOnly: boolean;
    noEmit: boolean;
    onChange: () => void;
    onComplete: (buildMessages: ISdBuildMessage[]) => void;
  }) {
    const scopePathSet = await this.#getScopePathSetAsync(
      opt.pkgPaths,
      Object.keys(opt.projConf.localUpdates ?? {}),
    );

    const watcher = SdFsWatcher.watch(Array.from(scopePathSet), {
      ignoreInitial: false,
    });
    watcher.onChange({ delay: 300 }, async (changeInfos) => {
      // 변경된 패키지 정보 구성
      const changeFiles = changeInfos.map((item) => PathUtils.norm(item.path));
      const changedPkgInfos = opt.pkgPaths
        .map((pkgPath) => {
          let buildInfo = this.#buildInfoMap.get(pkgPath);
          if (!buildInfo) return { pkgPath };

          const modifiedFileSet = new Set(
            changeFiles.filter((item) => buildInfo.watchFileSet.has(item)),
          );

          if (modifiedFileSet.size < 1) return;

          return { pkgPath, buildInfo: buildInfo, modifiedFileSet };
        })
        .filterExists();
      if (changedPkgInfos.length < 1) return;

      // 변경된 패키지들에 대한 change처리
      opt.onChange();
      const buildResults = await changedPkgInfos.parallelAsync(async (changedPkgInfo) => {
        // 처음
        if (!changedPkgInfo.buildInfo) {
          const buildWorker = new SdWorker<ISdBuildRunnerWorkerType>(
            import.meta.resolve("../workers/build-runner.worker"),
          );
          await buildWorker.run("initialize", [
            {
              pkgPath: changedPkgInfo.pkgPath,
              projConf: opt.projConf,
              watch: true,
              emitOnly: opt.emitOnly,
              noEmit: opt.noEmit,
              scopePathSet: scopePathSet,
            },
          ]);

          const result = await buildWorker.run("rebuild", []);

          this.#buildInfoMap.set(changedPkgInfo.pkgPath, {
            buildWorker,
            watchFileSet: result.watchFileSet,
          });

          return {
            isFirst: true,
            pkgPath: changedPkgInfo.pkgPath,
            emitFileSet: result.emitFileSet,
            affectedFileSet: result.affectedFileSet,

            buildMessages: result.buildMessages,
          };
        }
        // changed
        else {
          const result = await changedPkgInfo.buildInfo.buildWorker.run("rebuild", [
            changedPkgInfo.modifiedFileSet,
          ]);
          changedPkgInfo.buildInfo.watchFileSet = result.watchFileSet;

          return {
            isFirst: false,
            pkgPath: changedPkgInfo.pkgPath,
            emitFileSet: result.emitFileSet,
            affectedFileSet: result.affectedFileSet,

            buildMessages: result.buildMessages,
          };
        }
      });

      if (!opt.noEmit) {
        // 서버 구성 및 재시작
        for (const buildResult of buildResults) {
          const pkgConf = opt.projConf.packages[path.basename(buildResult.pkgPath)]!;
          if (pkgConf.type === "server") {
            const serverName = path.basename(buildResult.pkgPath);
            this.#logger.debug(`서버 '${serverName}' 재시작...`);

            const serverInfo = this.#serverInfoMap.getOrCreate(serverName, {});
            const restartServerResult = await this.#restartServerAsync(
              serverInfo.worker,
              buildResult.pkgPath,
              pkgConf,
            );
            serverInfo.worker = restartServerResult.worker;
            serverInfo.port = restartServerResult.port;

            /*await serverInfo.worker.run("addPathProxy", [
              "node_modules",
              path.resolve(process.cwd(), "node_modules"),
            ]);
            if (serverInfo.clientMap) {
              for (const [clientName, clientInfo] of serverInfo.clientMap.entries()) {
                await serverInfo.worker.run("addPathProxy", [clientName, clientInfo.path]);
              }
            }*/
          } else if (pkgConf.type === "client" && typeof pkgConf.server === "object") {
            const serverName = pkgConf.server.port.toString();
            this.#logger.debug(`서버 '${serverName}' 재시작...`);

            const serverInfo = this.#serverInfoMap.getOrCreate(serverName, {});
            const restartServerResult = await this.#restartServerAsync(
              serverInfo.worker,
              buildResult.pkgPath,
              pkgConf.server.port,
            );
            serverInfo.worker = restartServerResult.worker;
            serverInfo.port = restartServerResult.port;

            /*await worker.run("addPathProxy", [
              "node_modules",
              path.resolve(process.cwd(), "node_modules"),
            ]);*/
          }
        }

        // 클라이언트 구성 및 변경 Reload
        for (const buildResult of buildResults) {
          const pkgConf = opt.projConf.packages[path.basename(buildResult.pkgPath)]!;
          if (pkgConf.type === "client") {
            const clientName = path.basename(buildResult.pkgPath);
            const serverKey =
              typeof pkgConf.server === "string"
                ? pkgConf.server
                : typeof pkgConf.server === "object"
                  ? pkgConf.server.port.toString()
                  : undefined;
            if (serverKey == null) continue;

            const serverInfo = this.#serverInfoMap.get(serverKey);
            if (!serverInfo || !serverInfo.worker) continue;

            const distPath = path.resolve(buildResult.pkgPath, "dist");
            serverInfo.clientMap = serverInfo.clientMap ?? new Map();
            serverInfo.clientMap.set(clientName, {
              distPath,
              buildTypes: (pkgConf.builder ? Object.keys(pkgConf.builder) : ["web"]) as any,
            });

            if (buildResult.isFirst) continue;

            this.#logger.debug(`클라이언트 '${clientName}' 새로고침...`);
            await serverInfo.worker.run("broadcastReload", [
              clientName,
              new Set(
                Array.from(buildResult.emitFileSet)
                  .filter((item) => !item.endsWith(".map"))
                  .map((item) => path.relative(distPath, item)),
              ),
            ]);
          }
        }

        // 서버 Proxy 설정
        for (const serverInfo of this.#serverInfoMap.values()) {
          if (!serverInfo.worker) continue;

          await serverInfo.worker.run("setPathProxy", [
            {
              ...Array.from(serverInfo.clientMap?.entries() ?? []).toObject(
                (entry) => entry[0],
                (entry) => entry[1].distPath,
              ),
              node_modules: path.resolve(process.cwd(), "node_modules"),
            },
          ]);
        }

        // 접속주소 logging
        for (const serverName of this.#serverInfoMap.keys()) {
          const serverInfo = this.#serverInfoMap.get(serverName);
          const clientPaths: string[] = [];
          for (const [clientName, clientInfo] of serverInfo?.clientMap?.entries() ?? []) {
            for (const buildType of clientInfo.buildTypes) {
              if (buildType === "web") {
                clientPaths.push(`http://localhost:${serverInfo!.port}/${clientName}/`);
              } else {
                clientPaths.push(`http://localhost:${serverInfo!.port}/${clientName}/${buildType}`);
              }
            }
          }

          this.#logger.info("클라이언트 개발 서버 접속 주소\n" + clientPaths.join("\n"));
        }
      }

      // 빌드 완료 이벤트

      for (const buildResult of buildResults) {
        this.#resultCache.delete(buildResult.pkgPath);
        for (const affectedFilePath of buildResult.affectedFileSet) {
          this.#resultCache.delete(affectedFilePath);
        }

        for (const buildMessage of buildResult.buildMessages) {
          if (
            !buildMessage.filePath ||
            PathUtils.isChildPath(buildMessage.filePath, buildResult.pkgPath)
          ) {
            const cacheItem = this.#resultCache.getOrCreate(
              buildMessage.filePath ?? buildResult.pkgPath,
              [],
            );
            cacheItem.push(buildMessage);
          }
        }
      }

      opt.onComplete(Array.from(this.#resultCache.values()).mapMany());
    });
  }

  static async buildAsync(opt: { pkgPaths: TNormPath[]; projConf: ISdProjectConfig }) {
    const buildResults = await opt.pkgPaths.parallelAsync(async (pkgPath) => {
      const worker = new SdWorker<ISdBuildRunnerWorkerType>(
        import.meta.resolve("../workers/build-runner.worker"),
      );

      await worker.run("initialize", [
        {
          pkgPath,
          projConf: opt.projConf,
        },
      ]);

      const result = await worker.run("rebuild", []);
      await worker.killAsync();
      return {
        buildMessages: result.buildMessages,
      };
    });

    return buildResults.mapMany((item) => item.buildMessages);
  }

  static async #getScopePathSetAsync(pkgPaths: TNormPath[], localUpdateGlobs: string[]) {
    const workspacePaths = pkgPaths.mapMany((item) => [
      path.resolve(item, "src"),
      path.resolve(item, "public"),
      path.resolve(item, "public-dev"),
    ]);
    const localUpdatePaths = (
      await localUpdateGlobs.mapManyAsync(
        async (key) => await FsUtils.globAsync(path.resolve(process.cwd(), "node_modules", key)),
      )
    ).mapMany((key) => [
      path.resolve(process.cwd(), "node_modules", key, "dist"),
      path.resolve(process.cwd(), "node_modules", key, "src/**/*.scss"),
    ]);

    return new Set([...workspacePaths, ...localUpdatePaths].map((item) => PathUtils.norm(item)));
  }

  static async #restartServerAsync(
    prevWorker: SdWorker<IServerWorkerType> | undefined,
    pkgPath: string,
    pkgConfOrPort: ISdServerPackageConfig | number,
  ): Promise<{
    worker: SdWorker<IServerWorkerType>;
    port: number;
  }> {
    if (prevWorker) {
      await prevWorker.killAsync();
    }

    const npmConf = FsUtils.readJson(path.resolve(pkgPath, "package.json")) as INpmConfig;

    const worker = new SdWorker<IServerWorkerType>(
      import.meta.resolve("../workers/server.worker"),
      {
        env: {
          NODE_ENV: "development",
          TZ: "Asia/Seoul",
          SD_VERSION: npmConf.version,
          ...(typeof pkgConfOrPort === "number" ? {} : pkgConfOrPort.env),
        },
      },
    );
    const port = await worker.run("listen", [
      typeof pkgConfOrPort === "number" ? pkgConfOrPort : pkgPath,
    ]);
    this.#logger.debug("서버가 시작되었습니다.");

    return { worker, port };
  }
}
