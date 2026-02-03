import path from "path";
import { Listr } from "listr2";
import { Worker, type WorkerProxy } from "@simplysm/core-node";
import type {
  BuildTarget,
  SdConfig,
  SdPackageConfig,
  SdClientPackageConfig,
  SdServerPackageConfig,
} from "../sd-config.types";
import { consola } from "consola";
import { loadSdConfig } from "../utils/sd-config";
import type { TypecheckEnv } from "../utils/tsconfig";
import type * as WatchWorkerModule from "../workers/watch.worker";
import type * as DtsWorkerModule from "../workers/dts.worker";
import type * as ServerBuildWorkerModule from "../workers/server-build.worker";
import type * as ServerRuntimeWorkerModule from "../workers/server-runtime.worker";
import { Capacitor } from "../capacitor/capacitor";

//#region Types

/**
 * Watch 명령 옵션
 */
export interface WatchOptions {
  /** watch할 패키지 필터 (빈 배열이면 모든 패키지) */
  targets: string[];
  options: string[];
}

/**
 * Esbuild Worker 정보 (JS 빌드용)
 */
interface EsbuildWorkerInfo {
  name: string;
  config: SdPackageConfig;
  worker: WorkerProxy<typeof WatchWorkerModule>;
  isInitialBuild: boolean;
  buildResolver: (() => void) | undefined;
}

/**
 * DTS Worker 정보 (.d.ts 생성용)
 */
interface DtsWorkerInfo {
  name: string;
  config: SdPackageConfig;
  env: TypecheckEnv;
  worker: WorkerProxy<typeof DtsWorkerModule>;
  isInitialBuild: boolean;
  buildResolver: (() => void) | undefined;
}

/**
 * 패키지 결과 상태
 */
interface PackageResult {
  name: string;
  target: string;
  type: "build" | "dts" | "server" | "capacitor";
  status: "success" | "error" | "server";
  message?: string;
  port?: number;
}

/** Worker 빌드 완료 이벤트 데이터 */
interface BuildEventData {
  success: boolean;
  errors?: string[];
}

/** Worker 에러 이벤트 데이터 */
interface ErrorEventData {
  message: string;
}

/** Worker 서버 준비 이벤트 데이터 */
interface ServerReadyEventData {
  port: number;
}

/** Server Build 완료 이벤트 데이터 */
interface ServerBuildEventData {
  success: boolean;
  mainJsPath: string;
  errors?: string[];
}

//#endregion

//#region RebuildListrManager

/**
 * 리빌드 시 Listr 실행을 관리하는 클래스
 *
 * 여러 Worker가 동시에 buildStart를 발생시킬 때, 한 번에 하나의 Listr만 실행되도록 보장합니다.
 * 실행 중에 들어온 빌드 요청은 pending에 모아두었다가 현재 배치가 완료되면 다음 배치로 실행합니다.
 */
class RebuildListrManager {
  private _isRunning = false;
  private readonly _pendingBuilds = new Map<string, { title: string; promise: Promise<void>; resolver: () => void }>();

  constructor(
    private readonly _results: Map<string, PackageResult>,
    private readonly _logger: ReturnType<typeof consola.withTag>,
    private readonly _serverClientsMap?: Map<string, string[]>,
  ) {}

  /**
   * 빌드를 등록하고 resolver 함수를 반환합니다.
   *
   * @param key - 빌드를 식별하는 고유 키 (예: "core-common:build")
   * @param title - Listr에 표시할 제목 (예: "core-common (node)")
   * @returns 워커가 빌드 완료 시 호출할 resolver 함수
   */
  registerBuild(key: string, title: string): () => void {
    let resolver!: () => void;
    const promise = new Promise<void>((resolve) => {
      resolver = resolve;
    });

    this._pendingBuilds.set(key, { title, promise, resolver });

    // Listr가 실행 중이 아니면 다음 tick에 배치 실행
    if (!this._isRunning) {
      void Promise.resolve().then(() => void this._runBatch());
    }

    return resolver;
  }

  /**
   * pending에 있는 빌드들을 모아서 하나의 Listr로 실행합니다.
   * 실행 중에 들어온 새 빌드는 다음 배치로 넘어갑니다.
   */
  private async _runBatch(): Promise<void> {
    if (this._isRunning || this._pendingBuilds.size === 0) {
      return;
    }

    this._isRunning = true;

    // 현재 pending을 스냅샷으로 가져옴
    const batchBuilds = new Map(this._pendingBuilds);
    this._pendingBuilds.clear();

    // Listr 태스크 생성
    const tasks = Array.from(batchBuilds.entries()).map(([, { title, promise }]) => ({
      title,
      task: () => promise,
    }));

    const listr = new Listr(tasks);

    try {
      await listr.run();
      printErrorsAndServers(this._results, this._serverClientsMap);
    } catch (err) {
      this._logger.error("listr 실행 중 오류 발생", { error: String(err) });
    }

    this._isRunning = false;

    // 실행 중 새로 들어온 pending이 있으면 다음 배치 실행
    if (this._pendingBuilds.size > 0) {
      void this._runBatch();
    }
  }
}

//#endregion

//#region Utilities

/**
 * 패키지 설정에서 targets 필터링 (scripts 타겟 제외)
 * @param packages 패키지 설정 맵
 * @param targets 필터링할 패키지 이름 목록. 빈 배열이면 scripts를 제외한 모든 패키지 반환
 * @returns 필터링된 패키지 설정 맵
 * @internal 테스트용으로 export
 */
export function filterPackagesByTargets(
  packages: Record<string, SdPackageConfig | undefined>,
  targets: string[],
): Record<string, SdPackageConfig> {
  const result: Record<string, SdPackageConfig> = {};

  for (const [name, config] of Object.entries(packages)) {
    if (config == null) continue;

    // scripts 타겟은 watch 대상에서 제외
    if (config.target === "scripts") continue;

    // targets가 비어있으면 모든 패키지 포함
    if (targets.length === 0) {
      result[name] = config;
      continue;
    }

    // targets에 포함된 패키지만 필터링
    if (targets.includes(name)) {
      result[name] = config;
    }
  }

  return result;
}

/**
 * 오류와 서버 URL만 출력한다.
 * 성공한 빌드는 listr의 체크마크로 이미 표시되므로 별도 출력하지 않음.
 * @param results 패키지별 빌드 결과 상태
 * @param serverClientsMap 서버별 연결된 클라이언트 목록
 */
function printErrorsAndServers(
  results: Map<string, PackageResult>,
  serverClientsMap?: Map<string, string[]>,
): void {
  // 에러 출력
  for (const result of results.values()) {
    if (result.status === "error") {
      const typeLabel = result.type === "dts" ? "dts" : result.target;
      const errorLines: string[] = [`${result.name} (${typeLabel})`];
      if (result.message != null && result.message !== "") {
        for (const line of result.message.split("\n")) {
          errorLines.push(`  → ${line}`);
        }
      }
      consola.error(errorLines.join("\n"));
    }
  }

  // 서버 정보 수집
  const servers = [...results.values()].filter(
    (r) => r.status === "server" && r.port != null
  );

  // 서버 정보 출력 (있으면 앞에 빈 줄 추가)
  if (servers.length > 0) {
    process.stdout.write("\n");
    for (const server of servers) {
      if (server.target === "server") {
        // 서버에 연결된 클라이언트가 있으면 클라이언트 URL만 출력
        const clients = serverClientsMap?.get(server.name) ?? [];
        if (clients.length > 0) {
          for (const clientName of clients) {
            consola.info(`[server] http://localhost:${server.port}/${clientName}/`);
          }
        } else {
          // 연결된 클라이언트가 없으면 서버 루트 URL 출력
          consola.info(`[server] http://localhost:${server.port}/`);
        }
      } else {
        // standalone client는 이름 포함해서 출력
        consola.info(`[server] http://localhost:${server.port}/${server.name}/`);
      }
    }
  }
}

//#endregion

//#region Main

/**
 * 패키지를 watch 모드로 빌드한다.
 *
 * - `sd.config.ts`를 로드하여 패키지별 빌드 타겟 정보 확인 (필수)
 * - `node`/`browser`/`neutral` 타겟: esbuild watch 모드로 빌드
 * - `client` 타겟: Vite dev server 시작
 * - `server` 타겟: Server Build Worker + Server Runtime Worker
 * - 파일 변경 시 자동 리빌드
 * - SIGINT/SIGTERM 시그널로 종료
 *
 * @param options - watch 실행 옵션
 * @returns 종료 시그널 수신 시 resolve
 */
export async function runWatch(options: WatchOptions): Promise<void> {
  const { targets } = options;
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:watch");

  logger.debug("watch 시작", { targets });

  // sd.config.ts 로드 (watch는 패키지 빌드 정보가 필요하므로 필수)
  let sdConfig: SdConfig;
  try {
    sdConfig = await loadSdConfig({ cwd, dev: true, opt: options.options });
    logger.debug("sd.config.ts 로드 완료");
  } catch (err) {
    logger.error("sd.config.ts 로드 실패", err);
    process.stderr.write(`✖ sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
    return;
  }

  // targets 필터링
  const packages = filterPackagesByTargets(sdConfig.packages, targets);

  if (Object.keys(packages).length === 0) {
    process.stdout.write("✔ watch할 패키지가 없습니다.\n");
    return;
  }

  // 패키지 분류
  const serverPackages: Array<{ name: string; config: SdServerPackageConfig }> = [];
  const clientPackages: Array<{ name: string; config: SdClientPackageConfig }> = [];
  const buildPackages: Array<{ name: string; config: SdPackageConfig }> = [];

  for (const [name, config] of Object.entries(packages)) {
    if (config.target === "server") {
      serverPackages.push({ name, config });
    } else if (config.target === "client") {
      clientPackages.push({ name, config });
    } else {
      buildPackages.push({ name, config });
    }
  }

  // 서버와 연결된 클라이언트 찾기 (서버가 watch 대상인 경우만)
  const serverNames = new Set(serverPackages.map(({ name }) => name));
  const serverClientsMap = new Map<string, string[]>();
  for (const { name, config } of clientPackages) {
    if (typeof config.server === "string" && serverNames.has(config.server)) {
      const clients = serverClientsMap.get(config.server) ?? [];
      clients.push(name);
      serverClientsMap.set(config.server, clients);
    }
  }

  // Worker 경로
  const esbuildWorkerPath = path.resolve(import.meta.dirname, "../workers/watch.worker.ts");
  const dtsWorkerPath = path.resolve(import.meta.dirname, "../workers/dts.worker.ts");
  const serverBuildWorkerPath = path.resolve(import.meta.dirname, "../workers/server-build.worker.ts");
  const serverRuntimeWorkerPath = path.resolve(import.meta.dirname, "../workers/server-runtime.worker.ts");

  // 일반 Esbuild Worker 생성 (server, client 제외)
  const esbuildWorkers: EsbuildWorkerInfo[] = buildPackages.map(({ name, config }) => ({
    name,
    config,
    worker: Worker.create<typeof WatchWorkerModule>(esbuildWorkerPath),
    isInitialBuild: true,
    buildResolver: undefined,
  }));

  // 클라이언트가 단독 실행인 경우:
  // - server가 숫자인 경우
  // - server가 문자열이지만 해당 서버가 watch 대상이 아닌 경우
  const standaloneClientWorkers: EsbuildWorkerInfo[] = clientPackages
    .filter(({ config }) =>
      typeof config.server === "number" ||
      (typeof config.server === "string" && !serverNames.has(config.server))
    )
    .map(({ name, config }) => ({
      name,
      config,
      worker: Worker.create<typeof WatchWorkerModule>(esbuildWorkerPath),
      isInitialBuild: true,
      buildResolver: undefined,
    }));

  // 서버에 연결된 클라이언트의 Vite Worker (서버가 watch 대상인 경우만)
  const viteClientWorkers: EsbuildWorkerInfo[] = clientPackages
    .filter(({ config }) => typeof config.server === "string" && serverNames.has(config.server))
    .map(({ name, config }) => ({
      name,
      config,
      worker: Worker.create<typeof WatchWorkerModule>(esbuildWorkerPath),
      isInitialBuild: true,
      buildResolver: undefined,
    }));

  // DTS Worker 생성 (client/scripts/server 타겟 제외)
  const isBuildTarget = (target: string): target is BuildTarget =>
    target === "node" || target === "browser" || target === "neutral";

  const dtsWorkers: DtsWorkerInfo[] = buildPackages
    .filter(({ config }) => isBuildTarget(config.target))
    .map(({ name, config }) => {
      const env: TypecheckEnv = config.target as BuildTarget;
      return {
        name,
        config,
        env,
        worker: Worker.create<typeof DtsWorkerModule>(dtsWorkerPath),
        isInitialBuild: true,
        buildResolver: undefined,
      };
    });

  // 결과 상태 관리
  const results = new Map<string, PackageResult>();

  // RebuildListrManager 생성
  const rebuildManager = new RebuildListrManager(results, logger, serverClientsMap);

  // 종료 Promise 생성
  let resolveTerminate!: () => void;
  const terminatePromise = new Promise<void>((resolve) => {
    resolveTerminate = resolve;
  });

  // 종료 시그널 핸들러 등록
  const signalHandler = () => {
    process.off("SIGINT", signalHandler);
    process.off("SIGTERM", signalHandler);
    resolveTerminate();
  };
  process.on("SIGINT", signalHandler);
  process.on("SIGTERM", signalHandler);

  // 초기 빌드 Promise 미리 생성 - listr가 시작되기 전에 resolver를 워커에 연결해야 함
  const esbuildBuildPromises = new Map<string, Promise<void>>();
  for (const workerInfo of esbuildWorkers) {
    esbuildBuildPromises.set(
      workerInfo.name,
      new Promise<void>((resolve) => {
        workerInfo.buildResolver = resolve;
      }),
    );
  }

  // standalone client workers
  for (const workerInfo of standaloneClientWorkers) {
    esbuildBuildPromises.set(
      workerInfo.name,
      new Promise<void>((resolve) => {
        workerInfo.buildResolver = resolve;
      }),
    );
  }

  // vite client workers (서버 연결 클라이언트)
  const viteClientBuildPromises = new Map<string, Promise<void>>();
  const viteClientReadyPromises = new Map<string, { promise: Promise<void>; resolver: () => void }>();
  for (const workerInfo of viteClientWorkers) {
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

  const dtsBuildPromises = new Map<string, Promise<void>>();
  for (const workerInfo of dtsWorkers) {
    dtsBuildPromises.set(
      workerInfo.name,
      new Promise<void>((resolve) => {
        workerInfo.buildResolver = resolve;
      }),
    );
  }

  // Server Build Worker 및 Promise 생성
  const serverBuildWorkers = new Map<
    string,
    {
      worker: WorkerProxy<typeof ServerBuildWorkerModule>;
      buildPromise: Promise<void>;
      buildResolver: () => void;
      mainJsPath?: string;
    }
  >();
  for (const { name } of serverPackages) {
    let resolver!: () => void;
    const promise = new Promise<void>((resolve) => {
      resolver = resolve;
    });
    serverBuildWorkers.set(name, {
      worker: Worker.create<typeof ServerBuildWorkerModule>(serverBuildWorkerPath),
      buildPromise: promise,
      buildResolver: resolver,
    });
  }

  // clientPorts 캐시 (서버 재시작 시 재사용)
  const clientPorts: Record<string, number> = {};

  // Server Runtime Worker (서버당 하나, 재시작 시 교체)
  const serverRuntimeWorkers = new Map<string, WorkerProxy<typeof ServerRuntimeWorkerModule>>();

  // Server Runtime Promise (초기 서버 시작 완료 대기용)
  const serverRuntimePromises = new Map<string, { promise: Promise<void>; resolver: () => void }>();
  for (const { name } of serverPackages) {
    let resolver!: () => void;
    const promise = new Promise<void>((resolve) => {
      resolver = resolve;
    });
    serverRuntimePromises.set(name, { promise, resolver });
  }

  // 공통 Worker 이벤트 핸들러 등록
  type BaseWorkerInfo = {
    name: string;
    config: SdPackageConfig;
    worker: { on: (event: string, handler: (data: unknown) => void) => void };
    isInitialBuild: boolean;
    buildResolver: (() => void) | undefined;
  };

  function registerWorkerEventHandlers<T extends BaseWorkerInfo>(
    workerInfo: T,
    opts: {
      resultKey: string;
      listrTitle: string;
      resultType: "build" | "dts";
    },
  ): (result: PackageResult) => void {
    const completeTask = (result: PackageResult): void => {
      results.set(opts.resultKey, result);
      workerInfo.buildResolver?.();
      workerInfo.buildResolver = undefined;
      workerInfo.isInitialBuild = false;
    };

    // 빌드 시작 (리빌드 시)
    workerInfo.worker.on("buildStart", () => {
      if (!workerInfo.isInitialBuild) {
        workerInfo.buildResolver = rebuildManager.registerBuild(opts.resultKey, opts.listrTitle);
      }
    });

    // 빌드 완료
    workerInfo.worker.on("build", (data) => {
      const event = data as BuildEventData;
      completeTask({
        name: workerInfo.name,
        target: workerInfo.config.target,
        type: opts.resultType,
        status: event.success ? "success" : "error",
        message: event.errors?.join("\n"),
      });
    });

    // 에러
    workerInfo.worker.on("error", (data) => {
      const event = data as ErrorEventData;
      completeTask({
        name: workerInfo.name,
        target: workerInfo.config.target,
        type: opts.resultType,
        status: "error",
        message: event.message,
      });
    });

    return completeTask;
  }

  // Esbuild 이벤트 핸들러 등록 및 completeTask 함수 저장
  const esbuildCompleteTasks = new Map<string, (result: PackageResult) => void>();
  for (const workerInfo of esbuildWorkers) {
    const completeTask = registerWorkerEventHandlers(workerInfo, {
      resultKey: `${workerInfo.name}:build`,
      listrTitle: `${workerInfo.name} (${workerInfo.config.target})`,
      resultType: "build",
    });
    esbuildCompleteTasks.set(workerInfo.name, completeTask);
  }

  // Standalone client 이벤트 핸들러 등록
  for (const workerInfo of standaloneClientWorkers) {
    const completeTask = registerWorkerEventHandlers(workerInfo, {
      resultKey: `${workerInfo.name}:build`,
      listrTitle: `${workerInfo.name} (${workerInfo.config.target})`,
      resultType: "build",
    });
    esbuildCompleteTasks.set(workerInfo.name, completeTask);

    // serverReady (Vite dev server)
    workerInfo.worker.on("serverReady", (data) => {
      const event = data as ServerReadyEventData;
      completeTask({
        name: workerInfo.name,
        target: workerInfo.config.target,
        type: "server",
        status: "server",
        port: event.port,
      });
    });
  }

  // Vite client (서버 연결) 이벤트 핸들러 등록
  for (const workerInfo of viteClientWorkers) {
    const completeTask = registerWorkerEventHandlers(workerInfo, {
      resultKey: `${workerInfo.name}:build`,
      listrTitle: `${workerInfo.name} (${workerInfo.config.target})`,
      resultType: "build",
    });
    esbuildCompleteTasks.set(workerInfo.name, completeTask);

    // serverReady - Vite 포트를 clientPorts에 저장 (URL은 서버를 통해 출력)
    workerInfo.worker.on("serverReady", (data) => {
      const event = data as ServerReadyEventData;
      clientPorts[workerInfo.name] = event.port;
      // Vite 서버 준비 완료 알림 (서버가 프록시 설정을 위해 대기 중)
      viteClientReadyPromises.get(workerInfo.name)?.resolver();
      // listr 완료를 위해 completeTask 호출 (Vite는 build 이벤트를 발생시키지 않음)
      completeTask({
        name: workerInfo.name,
        target: workerInfo.config.target,
        type: "build",
        status: "success",
      });
    });
  }

  // DTS 이벤트 핸들러 등록 및 completeTask 함수 저장
  const dtsCompleteTasks = new Map<string, (result: PackageResult) => void>();
  for (const workerInfo of dtsWorkers) {
    const completeTask = registerWorkerEventHandlers(workerInfo, {
      resultKey: `${workerInfo.name}:dts`,
      listrTitle: `${workerInfo.name} (dts)`,
      resultType: "dts",
    });
    dtsCompleteTasks.set(workerInfo.name, completeTask);
  }

  // Server Build Worker 이벤트 핸들러 등록
  for (const { name } of serverPackages) {
    const serverBuild = serverBuildWorkers.get(name)!;
    let isFirstBuild = true;

    serverBuild.worker.on("buildStart", () => {
      if (!isFirstBuild) {
        // 리빌드 시 Server Runtime Worker 재시작 필요
        // buildResolver를 새로 생성
        let resolver!: () => void;
        const promise = new Promise<void>((resolve) => {
          resolver = resolve;
        });
        serverBuildWorkers.set(name, {
          ...serverBuild,
          buildPromise: promise,
          buildResolver: resolver,
        });
      }
    });

    serverBuild.worker.on("build", async (data) => {
      const event = data as ServerBuildEventData;

      if (event.success) {
        // mainJsPath 저장
        const updatedBuild = serverBuildWorkers.get(name)!;
        updatedBuild.mainJsPath = event.mainJsPath;

        // 기존 Server Runtime Worker 종료
        const existingRuntime = serverRuntimeWorkers.get(name);
        if (existingRuntime != null) {
          await existingRuntime.terminate();
        }

        // 새 Server Runtime Worker 생성 및 시작
        const runtimeWorker = Worker.create<typeof ServerRuntimeWorkerModule>(serverRuntimeWorkerPath);
        serverRuntimeWorkers.set(name, runtimeWorker);

        // 이 서버에 연결된 클라이언트들의 Vite 서버가 준비될 때까지 대기
        const connectedClients = serverClientsMap.get(name) ?? [];
        const clientReadyPromises = connectedClients
          .map((clientName) => viteClientReadyPromises.get(clientName)?.promise)
          .filter((p): p is Promise<void> => p != null);
        if (clientReadyPromises.length > 0) {
          await Promise.all(clientReadyPromises);
        }

        // 이 서버에 연결된 클라이언트 포트 수집
        const serverClientPorts: Record<string, number> = {};
        for (const clientName of connectedClients) {
          if (clientName in clientPorts) {
            serverClientPorts[clientName] = clientPorts[clientName];
          }
        }

        // Server Runtime 이벤트 핸들러
        runtimeWorker.on("serverReady", (readyData) => {
          const readyEvent = readyData as ServerReadyEventData;
          results.set(`${name}:server`, {
            name,
            target: "server",
            type: "server",
            status: "server",
            port: readyEvent.port,
          });

          if (isFirstBuild) {
            isFirstBuild = false;
            serverRuntimePromises.get(name)?.resolver();
          }
          updatedBuild.buildResolver();
        });

        runtimeWorker.on("error", (errorData) => {
          const errorEvent = errorData as ErrorEventData;
          results.set(`${name}:server`, {
            name,
            target: "server",
            type: "server",
            status: "error",
            message: errorEvent.message,
          });

          if (isFirstBuild) {
            isFirstBuild = false;
            serverRuntimePromises.get(name)?.resolver();
          }
          updatedBuild.buildResolver();
        });

        // Server Runtime 시작
        void runtimeWorker.start({
          mainJsPath: event.mainJsPath,
          clientPorts: serverClientPorts,
        });
      } else {
        results.set(`${name}:build`, {
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
      }
    });

    serverBuild.worker.on("error", (data) => {
      const event = data as ErrorEventData;
      results.set(`${name}:build`, {
        name,
        target: "server",
        type: "build",
        status: "error",
        message: event.message,
      });
      serverBuild.buildResolver();
    });
  }

  // 초기 빌드 listr (esbuild + dts + standalone client + vite client + server 빌드)
  const initialListr = new Listr(
    [
      // Esbuild 태스크
      ...esbuildWorkers.map((workerInfo) => ({
        title: `${workerInfo.name} (${workerInfo.config.target})`,
        task: () => esbuildBuildPromises.get(workerInfo.name) ?? Promise.resolve(),
      })),
      // Standalone client 태스크
      ...standaloneClientWorkers.map((workerInfo) => ({
        title: `${workerInfo.name} (client)`,
        task: () => esbuildBuildPromises.get(workerInfo.name) ?? Promise.resolve(),
      })),
      // Vite client 태스크 (서버 연결)
      ...viteClientWorkers.map((workerInfo) => ({
        title: `${workerInfo.name} (client)`,
        task: () => viteClientBuildPromises.get(workerInfo.name) ?? Promise.resolve(),
      })),
      // DTS 태스크
      ...dtsWorkers.map((workerInfo) => ({
        title: `${workerInfo.name} (dts)`,
        task: () => dtsBuildPromises.get(workerInfo.name) ?? Promise.resolve(),
      })),
      // Server 빌드 태스크 (빌드 + 런타임 시작)
      ...serverPackages.map(({ name }) => ({
        title: `${name} (server)`,
        task: () => serverRuntimePromises.get(name)?.promise ?? Promise.resolve(),
      })),
    ],
    { concurrent: true },
  );

  // Esbuild 워커 시작 (await 없이 - 백그라운드에서 계속 실행)
  for (const workerInfo of esbuildWorkers) {
    const pkgDir = path.join(cwd, "packages", workerInfo.name);
    const completeTask = esbuildCompleteTasks.get(workerInfo.name)!;
    workerInfo.worker
      .startWatch({
        name: workerInfo.name,
        config: workerInfo.config,
        cwd,
        pkgDir,
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

  // Standalone client 워커 시작
  for (const workerInfo of standaloneClientWorkers) {
    const pkgDir = path.join(cwd, "packages", workerInfo.name);
    const completeTask = esbuildCompleteTasks.get(workerInfo.name)!;
    workerInfo.worker
      .startWatch({
        name: workerInfo.name,
        config: workerInfo.config,
        cwd,
        pkgDir,
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
  for (const workerInfo of viteClientWorkers) {
    const pkgDir = path.join(cwd, "packages", workerInfo.name);
    const completeTask = esbuildCompleteTasks.get(workerInfo.name)!;
    // Vite가 자동으로 포트를 할당하도록 설정
    const viteConfig: SdClientPackageConfig = {
      ...workerInfo.config as SdClientPackageConfig,
      server: 0, // Vite가 자동으로 포트 할당
    };
    workerInfo.worker
      .startWatch({
        name: workerInfo.name,
        config: viteConfig,
        cwd,
        pkgDir,
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
  for (const { name } of serverPackages) {
    const pkgDir = path.join(cwd, "packages", name);
    const serverBuild = serverBuildWorkers.get(name)!;
    serverBuild.worker
      .startWatch({
        name,
        cwd,
        pkgDir,
      })
      .catch((err: unknown) => {
        results.set(`${name}:build`, {
          name,
          target: "server",
          type: "build",
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        });
        serverBuild.buildResolver();
      });
  }

  // DTS 워커 시작 (await 없이 - 백그라운드에서 계속 실행)
  for (const workerInfo of dtsWorkers) {
    const pkgDir = path.join(cwd, "packages", workerInfo.name);
    const completeTask = dtsCompleteTasks.get(workerInfo.name)!;
    workerInfo.worker
      .startDtsWatch({
        name: workerInfo.name,
        cwd,
        pkgDir,
        env: workerInfo.env,
      })
      .catch((err: unknown) => {
        completeTask({
          name: workerInfo.name,
          target: workerInfo.config.target,
          type: "dts",
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      });
  }

  // listr 실행 (초기 빌드 완료까지 대기)
  await initialListr.run();

  // Capacitor 초기화 (client 타겟 중 capacitor 설정이 있는 패키지)
  const capacitorPackages: Array<[string, SdClientPackageConfig]> = [];
  for (const [name, config] of Object.entries(packages)) {
    if (config.target === "client" && config.capacitor != null) {
      capacitorPackages.push([name, config]);
    }
  }

  if (capacitorPackages.length > 0) {
    const capacitorListr = new Listr(
      capacitorPackages.map(([name, config]) => ({
        title: `${name} (capacitor)`,
        task: async () => {
          const pkgDir = path.join(cwd, "packages", name);
          try {
            const cap = await Capacitor.create(pkgDir, config.capacitor!);
            await cap.initialize();
            results.set(`${name}:capacitor`, {
              name,
              target: "client",
              type: "capacitor",
              status: "success",
            });
          } catch (err) {
            results.set(`${name}:capacitor`, {
              name,
              target: "client",
              type: "capacitor",
              status: "error",
              message: err instanceof Error ? err.message : String(err),
            });
            throw err;
          }
        },
      })),
      { concurrent: false, exitOnError: false },
    );

    try {
      await capacitorListr.run();
    } catch {
      // 에러는 results에 이미 기록됨
    }
  }

  // 초기 빌드 결과 출력
  printErrorsAndServers(results, serverClientsMap);

  // 종료 시그널까지 대기
  await terminatePromise;

  // Worker 종료 (모든 워커)
  process.stdout.write("⏳ 종료 중...\n");
  await Promise.all([
    ...esbuildWorkers.map(({ worker }) => worker.terminate()),
    ...standaloneClientWorkers.map(({ worker }) => worker.terminate()),
    ...viteClientWorkers.map(({ worker }) => worker.terminate()),
    ...dtsWorkers.map(({ worker }) => worker.terminate()),
    ...[...serverBuildWorkers.values()].map(({ worker }) => worker.terminate()),
    ...[...serverRuntimeWorkers.values()].map((worker) => worker.terminate()),
  ]);
  process.stdout.write("✔ 완료\n");
}

//#endregion
