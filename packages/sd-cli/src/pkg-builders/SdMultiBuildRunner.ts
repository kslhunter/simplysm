import { FsUtil, Logger, PathUtil, SdWorker, TNormPath } from "@simplysm/sd-core-node";
import path from "path";
import { EventEmitter } from "events";
import { type ISdServerPackageConfig } from "../types/sd-configs.type";
import { type ISdBuildMessage, type ISdBuildRunnerResult } from "../types/build.type";
import { type TSdBuildRunnerWorkerType, type TServerWorkerType } from "../types/workers.type";
import { type INpmConfig } from "../types/common-configs.type";
import { type ISdBuildRunnerWorkerRequest } from "../types/build-runner.type";

export class SdMultiBuildRunner extends EventEmitter {
  #logger = Logger.get(["simplysm", "sd-cli", "SdMultiBuildRunner"]);

  #busyCount = 0;

  #resultCache = new Map<TNormPath, ISdBuildMessage[]>();
  #serverInfoMap = new Map<
    string,
    {
      pkgInfo?: { path: string; conf: ISdServerPackageConfig } | { port: number }; // persist
      worker?: SdWorker<TServerWorkerType>; // persist
      port?: number; // run server result
      hasChanges: boolean;
      clientChangedFileSet: Set<string>;

      // from client
      clients: Record<
        string,
        {
          buildTypes: ("web" | "electron" | "cordova")[];
          path: string;
        }
      >; // persist
    }
  >();

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (result: ISdBuildMessage[]) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  async runAsync(req: ISdBuildRunnerWorkerRequest & { cmd: "watch" }): Promise<void>;
  async runAsync(req: ISdBuildRunnerWorkerRequest & { cmd: "build" }): Promise<ISdBuildMessage[]>;
  async runAsync(req: ISdBuildRunnerWorkerRequest): Promise<ISdBuildMessage[] | void> {
    const worker = new SdWorker<TSdBuildRunnerWorkerType>(import.meta.resolve("../workers/build-runner-worker"))
      .on("change", () => {
        if (this.#busyCount === 0) {
          this.emit("change");
        }
        this.#busyCount++;
      })
      .on("complete", (result) => this.#onComplete(req, result));

    return await worker.run("run", [req]);
    /*const pkgConf = req.projConf.packages[path.basename(req.pkgPath)]!;

    const buildRunnerType =
      pkgConf.type === "server"
        ? SdServerBuildRunner
        : pkgConf.type === "client"
          ? SdClientBuildRunner
          : FsUtil.exists(path.resolve(req.pkgPath, "tsconfig.json"))
            ? SdTsLibBuildRunner
            : SdJsLibBuildRunner;

    const builder = new buildRunnerType(req.projConf, req.pkgPath)
      .on("change", () => this.#onMessage(req, { type: "change" }))
      .on("complete", (result) => this.#onMessage(req, { type: "complete", result }));

    if (req.cmd === "build") {
      const res = await builder.buildAsync();
      return res.buildMessages;
    } else {
      await builder.watchAsync();
      return;
    }*/
  }

  #onComplete(req: ISdBuildRunnerWorkerRequest, result: ISdBuildRunnerResult) {
    this.#resultCache.delete(req.pkgPath);
    for (const affectedFilePath of result.affectedFilePathSet) {
      if (PathUtil.isChildPath(affectedFilePath, req.pkgPath)) {
        this.#resultCache.delete(affectedFilePath);
      }
    }

    for (const buildMessage of result.buildMessages) {
      const cacheItem = this.#resultCache.getOrCreate(buildMessage.filePath ?? req.pkgPath, []);
      cacheItem.push(buildMessage);
    }

    const pkgConf = req.projConf.packages[path.basename(req.pkgPath)]!;

    if (pkgConf.type === "server") {
      const pkgName = path.basename(req.pkgPath);
      const serverInfo = this.#serverInfoMap.getOrCreate(pkgName, {
        hasChanges: true,
        clientChangedFileSet: new Set(),
        clients: {},
      });

      const serverPkgConf = req.projConf.packages[pkgName] as ISdServerPackageConfig;
      serverInfo.pkgInfo = {
        path: req.pkgPath,
        conf: serverPkgConf,
      };

      serverInfo.hasChanges = true;
    }
    else if (pkgConf.type === "client") {
      const pkgName = path.basename(req.pkgPath);

      if (pkgConf.server !== undefined) {
        const serverInfo = this.#serverInfoMap.getOrCreate(
          typeof pkgConf.server === "string" ? pkgConf.server : pkgConf.server.port.toString(),
          {
            hasChanges: true,
            clientChangedFileSet: new Set(),
            clients: {},
          },
        );

        if (typeof pkgConf.server !== "string") {
          serverInfo.pkgInfo = pkgConf.server;
        }

        serverInfo.clients[pkgName] = {
          path: path.resolve(req.pkgPath, "dist"),
          buildTypes: (pkgConf.builder ? Object.keys(pkgConf.builder) : ["web"]) as any,
        };

        serverInfo.clientChangedFileSet.adds(...result.emitFileSet);
      }
      else {
        const serverInfo = this.#serverInfoMap.getOrCreate(pkgName, {
          hasChanges: true,
          clientChangedFileSet: new Set(),
          clients: {},
        });

        serverInfo.clientChangedFileSet.adds(...result.emitFileSet);
      }
    }

    setTimeout(async () => {
      this.#busyCount--;
      if (this.#busyCount === 0) {
        for (const serverPkgNameOrPort of this.#serverInfoMap.keys()) {
          const serverInfo = this.#serverInfoMap.get(serverPkgNameOrPort)!;
          if (serverInfo.pkgInfo && serverInfo.hasChanges) {
            this.#logger.debug("서버 재시작...");
            try {
              const restartServerResult = await this.#restartServerAsync(serverInfo.pkgInfo, serverInfo.worker);
              serverInfo.worker = restartServerResult.worker;
              serverInfo.port = restartServerResult.port;
              serverInfo.hasChanges = false;
            }
            catch (err) {
              this.#logger.error(err);
            }
          }

          if (serverInfo.worker) {
            this.#logger.debug("클라이언트 설정...");
            await serverInfo.worker.run("setPathProxy", [
              {
                ...Object.keys(serverInfo.clients).toObject(
                  (key) => key,
                  (key) => serverInfo.clients[key].path,
                ),
                node_modules: path.resolve(process.cwd(), "node_modules"),
              },
            ]);

            if (serverInfo.clientChangedFileSet.size > 0) {
              this.#logger.debug("클라이언트 새로고침...");
              await serverInfo.worker.run("broadcastReload", [serverInfo.clientChangedFileSet]);
            }
          }
        }

        const clientPaths: string[] = [];
        for (const serverInfo of this.#serverInfoMap.values()) {
          if (Object.keys(serverInfo.clients).length > 0) {
            for (const clientPkgName of Object.keys(serverInfo.clients)) {
              for (const buildType of serverInfo.clients[clientPkgName].buildTypes) {
                if (buildType === "web") {
                  clientPaths.push(`http://localhost:${serverInfo.port}/${clientPkgName}/`);
                }
                else {
                  clientPaths.push(`http://localhost:${serverInfo.port}/${clientPkgName}/${buildType}/`);
                }
              }
            }
          }
          else {
            clientPaths.push(`http://localhost:${serverInfo.port}/`);
          }
        }
        if (clientPaths.length > 0) {
          this.#logger.info("클라이언트 개발 서버 접속 주소\n" + clientPaths.join("\n"));
        }

        const messages = Array.from(this.#resultCache.values()).mapMany();
        this.emit("complete", messages);
      }
    }, 300);
  }

  async #restartServerAsync(
    pkgInfo: { path: string; conf: ISdServerPackageConfig } | { port: number },
    prevWorker?: SdWorker<TServerWorkerType>,
  ): Promise<{
    worker: SdWorker<TServerWorkerType>;
    port: number;
  }> {
    const logger = Logger.get(["simplysm", "sd-cli", "SdMultiBuildRunner", "#restartServerAsync"]);

    if (prevWorker) {
      await prevWorker.killAsync();
    }

    const npmConf =
      "path" in pkgInfo ? (FsUtil.readJson(path.resolve(pkgInfo.path, "package.json")) as INpmConfig) : undefined;

    const worker = new SdWorker<TServerWorkerType>(import.meta.resolve("../workers/server-worker"), {
      env: {
        NODE_ENV: "development",
        TZ: "Asia/Seoul",
        SD_VERSION: npmConf?.version ?? "serverless",
        ...("path" in pkgInfo ? pkgInfo.conf.env : {}),
      },
    });
    const port = await worker.run("listen", [pkgInfo]);
    logger.debug("서버가 시작되었습니다.");

    return { worker, port };
  }
}

/*
interface IRequest {
  cmd: "watch" | "build";
  pkgPath: TNormPath;
  projConf: ISdProjectConfig;
}

type TResponse =
  | {
      type: "change";
    }
  | {
      type: "complete";
      result: ISdBuildRunnerResult;
    };
*/
