import fs from "fs";
import path from "path";
import { Worker, type WorkerProxy } from "@simplysm/core-node";
import type { SdConfig, SdClientPackageConfig, SdServerPackageConfig } from "../sd-config.types";
import { consola } from "consola";
import { loadSdConfig } from "../utils/sd-config";
import { getVersion } from "../utils/build-env";
import { setupReplaceDeps, watchReplaceDeps, type WatchReplaceDepResult } from "../utils/replace-deps";
import type * as ClientWorkerModule from "../workers/client.worker";
import type * as ServerWorkerModule from "../workers/server.worker";
import type * as ServerRuntimeWorkerModule from "../workers/server-runtime.worker";
import { Capacitor } from "../capacitor/capacitor";
import { filterPackagesByTargets, getWatchScopes, type PackageResult } from "../utils/package-utils";
import { printErrors, printServers } from "../utils/output-utils";
import { RebuildManager } from "../utils/rebuild-manager";
import {
  registerWorkerEventHandlers,
  type BaseWorkerInfo,
  type ServerReadyEventData,
  type ServerBuildEventData,
  type ErrorEventData,
} from "../utils/worker-events";
import { SignalHandler } from "../infra/SignalHandler";

//#region Types

/**
 * Dev Orchestrator 옵션
 */
export interface DevOrchestratorOptions {
  /** dev할 패키지 필터 (빈 배열이면 모든 패키지) */
  targets: string[];
  options: string[];
}

/**
 * Client Worker 정보 (Vite dev server용)
 */
interface ClientWorkerInfo {
  name: string;
  config: SdClientPackageConfig;
  worker: WorkerProxy<typeof ClientWorkerModule>;
  isInitialBuild: boolean;
  buildResolver: (() => void) | undefined;
}

//#endregion

//#region DevOrchestrator

/**
 * Dev 모드 실행을 조율하는 Orchestrator
 *
 * Client 및 Server 패키지의 개발 모드 실행을 관리한다.
 * - `client` 타겟: Vite dev server 시작
 * - `server` 타겟: Server Build Worker + Server Runtime Worker
 * - Server-Client 프록시 연결 지원
 * - Capacitor 초기화 지원
 * - SIGINT/SIGTERM 시그널로 종료
 */
export class DevOrchestrator {
  private readonly _options: DevOrchestratorOptions;
  private readonly _logger = consola.withTag("sd:cli:dev");
  private readonly _cwd: string;

  // Config
  private _sdConfig: SdConfig | undefined;
  private _baseEnv: { VER: string; DEV: string } | undefined;
  private _watchScopes: string[] = [];

  // Package classification
  private readonly _serverPackages: Array<{ name: string; config: SdServerPackageConfig }> = [];
  private readonly _clientPackages: Array<{ name: string; config: SdClientPackageConfig }> = [];
  private readonly _serverClientsMap = new Map<string, string[]>();
  private _hasPackages = false;

  // Workers
  private _standaloneClientWorkers: ClientWorkerInfo[] = [];
  private _viteClientWorkers: ClientWorkerInfo[] = [];
  private readonly _serverBuildWorkers = new Map<
    string,
    {
      worker: WorkerProxy<typeof ServerWorkerModule>;
      buildPromise: Promise<void>;
      buildResolver: () => void;
      mainJsPath?: string;
    }
  >();
  private readonly _serverRuntimeWorkers = new Map<string, WorkerProxy<typeof ServerRuntimeWorkerModule>>();

  // State
  private readonly _results = new Map<string, PackageResult>();
  private _clientPorts: Record<string, number> = {};
  private _rebuildManager!: RebuildManager;
  private _signalHandler!: SignalHandler;
  private _replaceDepWatcher: WatchReplaceDepResult | undefined;

  constructor(options: DevOrchestratorOptions) {
    this._cwd = process.cwd();
    this._options = options;
  }

  /**
   * Orchestrator 초기화
   * - sd.config.ts 로드
   * - 패키지 분류
   * - 환경변수 준비
   */
  async initialize(): Promise<void> {
    const { targets } = this._options;
    this._logger.debug("dev 시작", { targets });

    // sd.config.ts 로드 (dev는 패키지 빌드 정보가 필요하므로 필수)
    try {
      this._sdConfig = await loadSdConfig({ cwd: this._cwd, dev: true, opt: this._options.options });
      this._logger.debug("sd.config.ts 로드 완료");
    } catch (err) {
      this._logger.error(`sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
      throw err;
    }

    // replaceDeps 설정이 있으면 symlink 교체
    if (this._sdConfig.replaceDeps != null) {
      await setupReplaceDeps(this._cwd, this._sdConfig.replaceDeps);
      this._replaceDepWatcher = await watchReplaceDeps(this._cwd, this._sdConfig.replaceDeps);
    }

    // VER, DEV 환경변수 준비
    const version = await getVersion(this._cwd);
    this._baseEnv = { VER: version, DEV: "true" };

    // watchScopes 생성 (루트 package.json에서 scope 추출)
    const rootPkgJsonPath = path.join(this._cwd, "package.json");
    const rootPkgName = JSON.parse(fs.readFileSync(rootPkgJsonPath, "utf-8")).name as string;
    this._watchScopes = getWatchScopes(rootPkgName);

    // targets 필터링
    const allPackages = filterPackagesByTargets(this._sdConfig.packages, targets);

    // client/server 패키지만 필터링
    for (const [name, config] of Object.entries(allPackages)) {
      if (config.target === "server") {
        this._serverPackages.push({ name, config });
      } else if (config.target === "client") {
        this._clientPackages.push({ name, config });
      }
    }

    if (this._serverPackages.length === 0 && this._clientPackages.length === 0) {
      process.stdout.write("⚠ dev할 client/server 패키지가 없습니다.\n");
      return;
    }

    this._hasPackages = true;

    // 서버와 연결된 클라이언트 찾기 (서버가 dev 대상인 경우만)
    const serverNames = new Set(this._serverPackages.map(({ name }) => name));
    for (const { name, config } of this._clientPackages) {
      if (typeof config.server === "string" && serverNames.has(config.server)) {
        const clients = this._serverClientsMap.get(config.server) ?? [];
        clients.push(name);
        this._serverClientsMap.set(config.server, clients);
      }
    }

    // 인프라 초기화
    this._rebuildManager = new RebuildManager(this._logger);
    this._signalHandler = new SignalHandler();

    // 배치 완료 시 에러와 서버 URL 출력
    this._rebuildManager.on("batchComplete", () => {
      printErrors(this._results);
      printServers(this._results, this._serverClientsMap);
    });
  }

  /**
   * Dev 모드 시작
   * - Worker 생성
   * - 이벤트 핸들러 등록
   * - 초기 빌드 및 서버 시작
   * - Capacitor 초기화
   */
  async start(): Promise<void> {
    if (!this._hasPackages) {
      return;
    }

    const serverNames = new Set(this._serverPackages.map(({ name }) => name));

    // Worker 경로
    const clientWorkerPath = import.meta.resolve("../workers/client.worker");
    const serverWorkerPath = import.meta.resolve("../workers/server.worker");
    const serverRuntimeWorkerPath = import.meta.resolve("../workers/server-runtime.worker");

    // 클라이언트가 단독 실행인 경우:
    // - server가 숫자인 경우
    // - server가 문자열이지만 해당 서버가 dev 대상이 아닌 경우
    this._standaloneClientWorkers = this._clientPackages
      .filter(
        ({ config }) =>
          typeof config.server === "number" || (typeof config.server === "string" && !serverNames.has(config.server)),
      )
      .map(({ name, config }) => ({
        name,
        config,
        worker: Worker.create<typeof ClientWorkerModule>(clientWorkerPath),
        isInitialBuild: true,
        buildResolver: undefined,
      }));

    // 서버에 연결된 클라이언트의 Vite Worker (서버가 dev 대상인 경우만)
    this._viteClientWorkers = this._clientPackages
      .filter(({ config }) => typeof config.server === "string" && serverNames.has(config.server))
      .map(({ name, config }) => ({
        name,
        config,
        worker: Worker.create<typeof ClientWorkerModule>(clientWorkerPath),
        isInitialBuild: true,
        buildResolver: undefined,
      }));

    // Standalone client 빌드 Promise 미리 생성
    const standaloneClientBuildPromises = new Map<string, Promise<void>>();
    for (const workerInfo of this._standaloneClientWorkers) {
      standaloneClientBuildPromises.set(
        workerInfo.name,
        new Promise<void>((resolve) => {
          workerInfo.buildResolver = resolve;
        }),
      );
    }

    // Vite client 빌드 Promise 미리 생성 (서버 연결 클라이언트)
    const viteClientBuildPromises = new Map<string, Promise<void>>();
    const viteClientReadyPromises = new Map<string, { promise: Promise<void>; resolver: () => void }>();
    for (const workerInfo of this._viteClientWorkers) {
      viteClientBuildPromises.set(
        workerInfo.name,
        new Promise<void>((resolve) => {
          workerInfo.buildResolver = resolve;
        }),
      );
      // Vite 서버 준비 완료 Promise (서버가 클라이언트 포트를 알 때까지 대기)
      let readyResolver!: () => void;
      const readyPromise = new Promise<void>((resolve) => {
        readyResolver = resolve;
      });
      viteClientReadyPromises.set(workerInfo.name, { promise: readyPromise, resolver: readyResolver });
    }

    // Server Build Worker 및 Promise 생성
    for (const { name } of this._serverPackages) {
      let resolver!: () => void;
      const promise = new Promise<void>((resolve) => {
        resolver = resolve;
      });
      this._serverBuildWorkers.set(name, {
        worker: Worker.create<typeof ServerWorkerModule>(serverWorkerPath),
        buildPromise: promise,
        buildResolver: resolver,
      });
    }

    // Server Runtime Promise (초기 서버 시작 완료 대기용)
    const serverRuntimePromises = new Map<string, { promise: Promise<void>; resolver: () => void }>();
    for (const { name } of this._serverPackages) {
      let resolver!: () => void;
      const promise = new Promise<void>((resolve) => {
        resolver = resolve;
      });
      serverRuntimePromises.set(name, { promise, resolver });
    }

    // Standalone client 이벤트 핸들러 등록 및 completeTask 함수 저장
    const clientCompleteTasks = new Map<string, (result: PackageResult) => void>();
    for (const workerInfo of this._standaloneClientWorkers) {
      const completeTask = registerWorkerEventHandlers(
        workerInfo as unknown as BaseWorkerInfo,
        {
          resultKey: `${workerInfo.name}:build`,
          listrTitle: `${workerInfo.name} (client)`,
          resultType: "build",
        },
        this._results,
        this._rebuildManager,
      );
      clientCompleteTasks.set(workerInfo.name, completeTask);

      // serverReady (Vite dev server)
      workerInfo.worker.on("serverReady", (data) => {
        const event = data as ServerReadyEventData;
        completeTask({
          name: workerInfo.name,
          target: workerInfo.config.target,
          type: "server",
          status: "running",
          port: event.port,
        });
      });
    }

    // Vite client (서버 연결) 이벤트 핸들러 등록
    for (const workerInfo of this._viteClientWorkers) {
      const completeTask = registerWorkerEventHandlers(
        workerInfo as unknown as BaseWorkerInfo,
        {
          resultKey: `${workerInfo.name}:build`,
          listrTitle: `${workerInfo.name} (client)`,
          resultType: "build",
        },
        this._results,
        this._rebuildManager,
      );
      clientCompleteTasks.set(workerInfo.name, completeTask);

      // serverReady - Vite 포트를 clientPorts에 저장 (URL은 서버를 통해 출력)
      workerInfo.worker.on("serverReady", (data) => {
        const event = data as ServerReadyEventData;
        this._logger.debug(`[${workerInfo.name}] Vite serverReady (port: ${String(event.port)})`);
        this._clientPorts[workerInfo.name] = event.port;
        // Vite 서버 준비 완료 알림 (서버가 프록시 설정을 위해 대기 중)
        viteClientReadyPromises.get(workerInfo.name)?.resolver();
        // 빌드 완료를 위해 completeTask 호출 (Vite는 build 이벤트를 발생시키지 않음)
        completeTask({
          name: workerInfo.name,
          target: workerInfo.config.target,
          type: "build",
          status: "success",
        });
      });

      // Vite client error 시에도 viteClientReadyPromises resolve
      // (서버가 await Promise.all(clientReadyPromises)에서 무한 대기하지 않도록)
      workerInfo.worker.on("error", () => {
        viteClientReadyPromises.get(workerInfo.name)?.resolver();
      });
    }

    // Server Build Worker 이벤트 핸들러 등록
    for (const { name } of this._serverPackages) {
      const serverBuild = this._serverBuildWorkers.get(name)!;
      let isFirstBuild = true;

      serverBuild.worker.on("buildStart", () => {
        if (!isFirstBuild) {
          // 리빌드 시 RebuildManager에 등록
          const resolver = this._rebuildManager.registerBuild(`${name}:server`, `${name} (server)`);
          this._serverBuildWorkers.set(name, {
            ...serverBuild,
            buildResolver: resolver,
          });
        }
      });

      serverBuild.worker.on("build", (data) => {
        const event = data as ServerBuildEventData;
        this._logger.debug(`[${name}] server build: success=${String(event.success)}`);

        if (!event.success) {
          this._results.set(`${name}:build`, {
            name,
            target: "server",
            type: "build",
            status: "error",
            message: event.errors?.join("\n"),
          });

          if (isFirstBuild) {
            isFirstBuild = false;
            serverRuntimePromises.get(name)?.resolver();
          }
          serverBuild.buildResolver();
          return;
        }

        // 빌드 성공 시 런타임 워커 시작 (async 로직은 별도 함수로 분리하여 에러 전파 방지)
        void startServerRuntime(name, event.mainJsPath).catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          this._logger.error(`[${name}] Server Runtime 시작 중 오류:`, message);

          this._results.set(`${name}:server`, {
            name,
            target: "server",
            type: "server",
            status: "error",
            message,
          });

          if (isFirstBuild) {
            isFirstBuild = false;
            serverRuntimePromises.get(name)?.resolver();
          }
          const updatedBuild = this._serverBuildWorkers.get(name)!;
          updatedBuild.buildResolver();
        });
      });

      /**
       * 서버 런타임 워커 시작.
       * async 이벤트 핸들러의 에러를 catch할 수 있도록 별도 함수로 분리.
       */
      const startServerRuntime = async (serverName: string, mainJsPath: string): Promise<void> => {
        this._logger.debug(`[${serverName}] startServerRuntime: ${mainJsPath}`);
        const updatedBuild = this._serverBuildWorkers.get(serverName)!;
        updatedBuild.mainJsPath = mainJsPath;

        // 기존 Server Runtime Worker 종료
        const existingRuntime = this._serverRuntimeWorkers.get(serverName);
        if (existingRuntime != null) {
          this._logger.info(`[${serverName}] 서버 재시작 중...`);
          await existingRuntime.terminate();
        }

        // 새 Server Runtime Worker 생성 및 시작
        const runtimeWorker = Worker.create<typeof ServerRuntimeWorkerModule>(serverRuntimeWorkerPath);
        this._serverRuntimeWorkers.set(serverName, runtimeWorker);

        // 이 서버에 연결된 클라이언트들의 Vite 서버가 준비될 때까지 대기
        const connectedClients = this._serverClientsMap.get(serverName) ?? [];
        const clientReadyPromises = connectedClients
          .map((clientName) => viteClientReadyPromises.get(clientName)?.promise)
          .filter((p): p is Promise<void> => p != null);
        this._logger.debug(`[${serverName}] 클라이언트 대기: ${String(clientReadyPromises.length)}개`);
        if (clientReadyPromises.length > 0) {
          await Promise.all(clientReadyPromises);
        }

        // 이 서버에 연결된 클라이언트 포트 수집
        const serverClientPorts: Record<string, number> = {};
        for (const clientName of connectedClients) {
          if (clientName in this._clientPorts) {
            serverClientPorts[clientName] = this._clientPorts[clientName];
          }
        }

        // Server Runtime 이벤트 핸들러
        runtimeWorker.on("serverReady", (readyData) => {
          const readyEvent = readyData as ServerReadyEventData;
          this._results.set(`${serverName}:server`, {
            name: serverName,
            target: "server",
            type: "server",
            status: "running",
            port: readyEvent.port,
          });

          if (isFirstBuild) {
            isFirstBuild = false;
            serverRuntimePromises.get(serverName)?.resolver();
          }
          updatedBuild.buildResolver();
        });

        runtimeWorker.on("error", (errorData) => {
          const errorEvent = errorData as ErrorEventData;
          this._results.set(`${serverName}:server`, {
            name: serverName,
            target: "server",
            type: "server",
            status: "error",
            message: errorEvent.message,
          });

          if (isFirstBuild) {
            isFirstBuild = false;
            serverRuntimePromises.get(serverName)?.resolver();
          }
          updatedBuild.buildResolver();
        });

        // Server Runtime 시작
        // Worker가 크래시하면 "serverReady"/"error" 이벤트 없이 종료되므로
        // promise rejection을 catch하여 무한 대기를 방지
        runtimeWorker
          .start({
            mainJsPath,
            clientPorts: serverClientPorts,
          })
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            this._logger.error(`[${serverName}] Server Runtime Worker 크래시:`, message);

            this._results.set(`${serverName}:server`, {
              name: serverName,
              target: "server",
              type: "server",
              status: "error",
              message,
            });

            if (isFirstBuild) {
              isFirstBuild = false;
              serverRuntimePromises.get(serverName)?.resolver();
            }
            updatedBuild.buildResolver();
          });
      };

      serverBuild.worker.on("error", (data) => {
        const event = data as ErrorEventData;
        this._results.set(`${name}:build`, {
          name,
          target: "server",
          type: "build",
          status: "error",
          message: event.message,
        });
        if (isFirstBuild) {
          isFirstBuild = false;
          serverRuntimePromises.get(name)?.resolver();
        }
        serverBuild.buildResolver();
      });
    }

    // Standalone client 워커 시작
    for (const workerInfo of this._standaloneClientWorkers) {
      const pkgDir = path.join(this._cwd, "packages", workerInfo.name);
      const completeTask = clientCompleteTasks.get(workerInfo.name)!;
      const clientConfig: SdClientPackageConfig = {
        ...workerInfo.config,
        env: { ...this._baseEnv, ...workerInfo.config.env },
      };
      workerInfo.worker
        .startWatch({
          name: workerInfo.name,
          config: clientConfig,
          cwd: this._cwd,
          pkgDir,
          watchScopes: this._watchScopes,
        })
        .catch((err: unknown) => {
          completeTask({
            name: workerInfo.name,
            target: workerInfo.config.target,
            type: "build",
            status: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        });
    }

    // Vite client 워커 시작 (서버 연결) - Vite 자동 포트 사용
    for (const workerInfo of this._viteClientWorkers) {
      const pkgDir = path.join(this._cwd, "packages", workerInfo.name);
      const completeTask = clientCompleteTasks.get(workerInfo.name)!;
      // Vite가 자동으로 포트를 할당하도록 설정
      const viteConfig: SdClientPackageConfig = {
        ...workerInfo.config,
        server: 0, // Vite가 자동으로 포트 할당
        env: { ...this._baseEnv, ...workerInfo.config.env },
      };
      workerInfo.worker
        .startWatch({
          name: workerInfo.name,
          config: viteConfig,
          cwd: this._cwd,
          pkgDir,
          watchScopes: this._watchScopes,
        })
        .catch((err: unknown) => {
          completeTask({
            name: workerInfo.name,
            target: workerInfo.config.target,
            type: "build",
            status: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        });
    }

    // Server Build 워커 시작
    for (const { name, config } of this._serverPackages) {
      const pkgDir = path.join(this._cwd, "packages", name);
      const serverBuild = this._serverBuildWorkers.get(name)!;
      serverBuild.worker
        .startWatch({
          name,
          cwd: this._cwd,
          pkgDir,
          env: { ...this._baseEnv, ...config.env },
          configs: config.configs,
          externals: config.externals,
        })
        .catch((err: unknown) => {
          this._results.set(`${name}:build`, {
            name,
            target: "server",
            type: "build",
            status: "error",
            message: err instanceof Error ? err.message : String(err),
          });
          serverRuntimePromises.get(name)?.resolver();
          serverBuild.buildResolver();
        });
    }

    // 초기 빌드 완료까지 대기 (병렬 실행)
    this._logger.debug("초기 빌드 시작 (Promise.allSettled)");
    const initialBuildPromises: Array<{ name: string; promise: Promise<void> }> = [
      // Standalone client
      ...this._standaloneClientWorkers.map((workerInfo) => ({
        name: `${workerInfo.name} (client)`,
        promise: standaloneClientBuildPromises.get(workerInfo.name) ?? Promise.resolve(),
      })),
      // Vite client (서버 연결)
      ...this._viteClientWorkers.map((workerInfo) => ({
        name: `${workerInfo.name} (client)`,
        promise: viteClientBuildPromises.get(workerInfo.name) ?? Promise.resolve(),
      })),
      // Server 빌드 + 런타임 시작
      ...this._serverPackages.map(({ name }) => ({
        name: `${name} (server)`,
        promise: serverRuntimePromises.get(name)?.promise ?? Promise.resolve(),
      })),
    ];

    const initialResults = await Promise.allSettled(initialBuildPromises.map((item) => item.promise));

    initialResults.forEach((result, index) => {
      const taskName = initialBuildPromises[index].name;
      if (result.status === "rejected") {
        this._logger.debug(`[${taskName}] 초기 빌드 실패:`, result.reason);
      } else {
        this._logger.debug(`[${taskName}] 초기 빌드 완료`);
      }
    });

    // Capacitor 초기화 (client 타겟 중 capacitor 설정이 있는 패키지)
    const capacitorPackages: Array<[string, SdClientPackageConfig]> = [];
    for (const { name, config } of this._clientPackages) {
      if (config.capacitor != null) {
        capacitorPackages.push([name, config]);
      }
    }

    if (capacitorPackages.length > 0) {
      for (const [name, config] of capacitorPackages) {
        const taskName = `${name} (capacitor)`;
        this._logger.start(taskName);
        const pkgDir = path.join(this._cwd, "packages", name);
        try {
          const cap = await Capacitor.create(pkgDir, config.capacitor!);
          await cap.initialize();
          this._results.set(`${name}:capacitor`, {
            name,
            target: "client",
            type: "capacitor",
            status: "success",
          });
          this._logger.success(taskName);
        } catch (err) {
          this._results.set(`${name}:capacitor`, {
            name,
            target: "client",
            type: "capacitor",
            status: "error",
            message: err instanceof Error ? err.message : String(err),
          });
          this._logger.fail(taskName);
        }
      }
    }

    // 초기 빌드 결과 출력
    printErrors(this._results);
    printServers(this._results, this._serverClientsMap);
  }

  /**
   * 종료 시그널 대기
   */
  async awaitTermination(): Promise<void> {
    if (!this._hasPackages) {
      return;
    }
    await this._signalHandler.waitForTermination();
  }

  /**
   * Orchestrator 종료
   */
  async shutdown(): Promise<void> {
    if (!this._hasPackages) {
      return;
    }

    // Worker 종료 (모든 워커)
    process.stdout.write("⏳ 종료 중...\n");
    await Promise.all([
      ...this._standaloneClientWorkers.map(({ worker }) => worker.terminate()),
      ...this._viteClientWorkers.map(({ worker }) => worker.terminate()),
      ...[...this._serverBuildWorkers.values()].map(({ worker }) => worker.terminate()),
      ...[...this._serverRuntimeWorkers.values()].map((worker) => worker.terminate()),
    ]);
    this._replaceDepWatcher?.dispose();
    process.stdout.write("✔ 완료\n");
  }
}

//#endregion
