import {
  FsUtils,
  PathUtils,
  SdFsWatcher,
  SdLogger,
  SdWorker,
  type TNormPath,
} from "@simplysm/sd-core-node";
import type { ISdProjectConfig, ISdServerPackageConfig } from "../types/config/ISdProjectConfig";
import path from "path";
import type { ISdBuildMessage } from "../types/build/ISdBuildMessage";
import type { ISdBuildRunnerWorkerType } from "../types/worker/ISdBuildRunnerWorkerType";
import type { IServerWorkerType } from "../types/worker/IServerWorkerType";
import type { INpmConfig } from "../types/common-config/INpmConfig";

export class SdProjectBuildRunner {
  private static readonly _logger = SdLogger.get(["simplysm", "sd-cli", "SdProjectBuildRunner"]);

  private static readonly _buildInfoMap = new Map<
    TNormPath,
    {
      buildWorker: SdWorker<ISdBuildRunnerWorkerType>;
      watchFileSet: Set<TNormPath>;
    }
  >();

  private static readonly _serverInfoMap = new Map<
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

  private static readonly _resultCache = new Map<TNormPath, ISdBuildMessage[]>();

  static async watchAsync(opt: {
    allPkgPaths: TNormPath[];
    pkgPaths: TNormPath[];
    projConf: ISdProjectConfig;
    emitOnly: boolean;
    noEmit: boolean;
    onChange: () => void;
    onComplete: (buildMessages: ISdBuildMessage[]) => void;
  }) {
    const scopePathSet = await this._getScopePathSetAsync(
      opt.allPkgPaths,
      Object.keys(opt.projConf.localUpdates ?? {}),
    );

    const watcher = await SdFsWatcher.watchAsync(Array.from(scopePathSet), {
      ignoreInitial: false,
    });
    watcher.onChange({ delay: 300 }, async (changeInfos) => {
      // 변경된 패키지 정보 구성
      const changeFiles = changeInfos.map((item) => PathUtils.norm(item.path));

      const changedPkgInfos = opt.pkgPaths
        .map((pkgPath) => {
          let buildInfo = this._buildInfoMap.get(pkgPath);
          if (!buildInfo) return { pkgPath };

          const modifiedFileSet = new Set(
            changeFiles.filter(
              (item) =>
                buildInfo.watchFileSet.has(item) ||
                PathUtils.isChildPath(item, path.resolve(pkgPath, "src")),
            ),
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
          const pkgConf = opt.projConf.packages[path.basename(changedPkgInfo.pkgPath)]!;

          const buildWorker = new SdWorker<ISdBuildRunnerWorkerType>(
            import.meta.resolve("../workers/build-runner.worker"),
            {
              resourceLimits: {
                maxOldGenerationSizeMb: 2048,
                maxYoungGenerationSizeMb: 8,
                stackSizeMb: 2,
              },
            },
          );
          await buildWorker.run("initialize", [
            {
              options: {
                pkgPath: changedPkgInfo.pkgPath,
                scopePathSet,
                watch: {
                  dev: !pkgConf.forceProductionMode,
                  emitOnly: opt.emitOnly,
                  noEmit: opt.noEmit,
                },
              },
              pkgConf,
            },
          ]);

          const result = await buildWorker.run("rebuild", []);

          this._buildInfoMap.set(changedPkgInfo.pkgPath, {
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
          if (buildResult.buildMessages.some((item) => item.severity === "error")) continue;

          const pkgConf = opt.projConf.packages[path.basename(buildResult.pkgPath)]!;
          if (pkgConf.type === "server") {
            const serverName = path.basename(buildResult.pkgPath);
            this._logger.debug(`서버 '${serverName}' 재시작...`);

            const serverInfo = this._serverInfoMap.getOrCreate(serverName, {});
            const restartServerResult = await this._restartServerAsync(
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
            this._logger.debug(`서버 '${serverName}' 재시작...`);

            const serverInfo = this._serverInfoMap.getOrCreate(serverName, {});
            const restartServerResult = await this._restartServerAsync(
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
          if (buildResult.buildMessages.some((item) => item.severity === "error")) continue;

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

            const serverInfo = this._serverInfoMap.get(serverKey);
            if (!serverInfo || !serverInfo.worker) continue;

            const distPath = path.resolve(buildResult.pkgPath, "dist");
            serverInfo.clientMap = serverInfo.clientMap ?? new Map();
            serverInfo.clientMap.set(clientName, {
              distPath,
              buildTypes: (pkgConf.builder ? Object.keys(pkgConf.builder) : ["web"]) as any,
            });

            if (buildResult.isFirst) continue;

            this._logger.debug(`클라이언트 '${clientName}' 새로고침...`);
            await serverInfo.worker.run("broadcastReload", [
              clientName,
              new Set(
                Array.from(buildResult.emitFileSet)
                  .filter((item) => !item.endsWith(".map"))
                  .map((item) =>
                    path.relative(
                      distPath,
                      item.replace(/cordova[\\\/]/, "").replace(/electron[\\\/]/, ""),
                    ),
                  ),
              ),
            ]);
          }
        }

        // 서버 Proxy 설정
        for (const serverInfo of this._serverInfoMap.values()) {
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
        for (const serverName of this._serverInfoMap.keys()) {
          const serverInfo = this._serverInfoMap.get(serverName);
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

          this._logger.info("클라이언트 개발 서버 접속 주소\n" + clientPaths.join("\n"));
        }
      }

      // 빌드 완료 이벤트

      for (const buildResult of buildResults) {
        this._resultCache.delete(buildResult.pkgPath);
        for (const affectedFilePath of buildResult.affectedFileSet) {
          this._resultCache.delete(affectedFilePath);
        }
      }

      for (const buildResult of buildResults) {
        for (const buildMessage of buildResult.buildMessages) {
          const cacheItem = this._resultCache.getOrCreate(
            buildMessage.filePath ?? buildResult.pkgPath,
            [],
          );
          cacheItem.push(buildMessage);
        }
      }

      opt.onComplete(Array.from(this._resultCache.values()).mapMany());
    });
  }

  static async buildAsync(opt: {
    allPkgPaths: TNormPath[];
    pkgPaths: TNormPath[];
    projConf: ISdProjectConfig;
  }) {
    const scopePathSet = await this._getScopePathSetAsync(
      opt.allPkgPaths,
      Object.keys(opt.projConf.localUpdates ?? {}),
    );

    const buildResults = await opt.pkgPaths.parallelAsync(async (pkgPath) => {
      const pkgConf = opt.projConf.packages[path.basename(pkgPath)]!;

      const worker = new SdWorker<ISdBuildRunnerWorkerType>(
        import.meta.resolve("../workers/build-runner.worker"),
        {
          resourceLimits: {
            maxOldGenerationSizeMb: 2048,
            maxYoungGenerationSizeMb: 8,
            stackSizeMb: 2,
          },
        },
      );

      await worker.run("initialize", [
        {
          options: { pkgPath, scopePathSet },
          pkgConf,
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

  private static async _getScopePathSetAsync(pkgPaths: TNormPath[], localUpdateGlobs: string[]) {
    const workspacePaths = pkgPaths.mapMany((item) => [
      path.resolve(item, "src"),
      path.resolve(item, "public"),
      path.resolve(item, "public-dev"),
      path.resolve(item, "scss"),
    ]);
    const localUpdatePaths = (
      await localUpdateGlobs.mapManyAsync(
        async (glob) => await FsUtils.globAsync(path.resolve(process.cwd(), "node_modules", glob)),
      )
    ).mapMany((dir) => [path.resolve(dir, "dist"), path.resolve(dir, "scss")]);

    return new Set([...workspacePaths, ...localUpdatePaths].map((item) => PathUtils.norm(item)));
  }

  private static async _restartServerAsync(
    prevWorker: SdWorker<IServerWorkerType> | undefined,
    pkgPath: string,
    pkgConfOrPort: ISdServerPackageConfig | number,
  ): Promise<{
    worker?: SdWorker<IServerWorkerType>;
    port?: number;
  }> {
    try {
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
          resourceLimits: {
            maxOldGenerationSizeMb: 2048,
            maxYoungGenerationSizeMb: 8,
            stackSizeMb: 2,
          },
        },
      );
      const port = await worker.run("listen", [
        typeof pkgConfOrPort === "number" ? pkgConfOrPort : pkgPath,
      ]);
      this._logger.debug("서버가 시작되었습니다.");

      return { worker, port };
    } catch (err) {
      this._logger.error("서버 재시작 실패: ", err);
      return {};
    }
  }
}
