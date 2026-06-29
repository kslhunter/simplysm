import type { ConsolaInstance } from "consola";
import { Worker, type WorkerProxy } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import type * as ServerRuntimeWorkerModule from "../workers/server-runtime.worker";
import type { ResultCollector } from "../runtime/ResultCollector";

/**
 * 서버 런타임 워커의 생명주기를 관리하는 클래스
 *
 * 서버별 Worker를 생성/종료하고, serverReady/error 이벤트를 처리한다.
 */
export class ServerRuntimeManager {
  private readonly _logger: ConsolaInstance;
  private readonly _workers = new Map<string, WorkerProxy<typeof ServerRuntimeWorkerModule>>();

  constructor(logger: ConsolaInstance) {
    this._logger = logger;
  }

  async startRuntime(params: {
    serverName: string;
    mainJsPath: string;
    env?: Record<string, string>;
    clientPorts?: Record<string, number>;
    resultCollector: ResultCollector;
    onServerReady: () => void;
  }): Promise<void> {
    this._logger.debug(`[${params.serverName}] 서버 런타임 시작: ${params.mainJsPath}`);

    // 기존 런타임 종료
    const existingRuntime = this._workers.get(params.serverName);
    if (existingRuntime != null) {
      this._logger.info(`[${params.serverName}] 서버 재시작 중...`);
      await existingRuntime.terminate();
    }

    // 새 런타임 워커 생성 및 시작
    const runtimeWorkerPath = import.meta.resolve("../workers/server-runtime.worker");
    const runtimeWorker = Worker.create<typeof ServerRuntimeWorkerModule>(runtimeWorkerPath);
    this._workers.set(params.serverName, runtimeWorker);

    // 런타임 이벤트 핸들러
    runtimeWorker.on("serverReady", (readyData) => {
      params.resultCollector.add({
        name: params.serverName,
        target: "server",
        type: "server",
        status: "running",
        port: readyData.port,
      });
      params.onServerReady();
    });

    runtimeWorker.on("error", (errorData) => {
      if (errorData.stack != null) {
        this._logger.debug(`[${params.serverName}] 서버 런타임 에러 스택:\n${errorData.stack}`);
      }
      params.resultCollector.add({
        name: params.serverName,
        target: "server",
        type: "server",
        status: "error",
        message: errorData.message,
      });
    });

    runtimeWorker
      .start({ mainJsPath: params.mainJsPath, clientPorts: params.clientPorts, env: params.env })
      .catch((err: unknown) => {
        this._logger.error(`[${params.serverName}] 서버 런타임 워커 비정상 종료:`, errNs.message(err));
        this._logger.debug(`[${params.serverName}] 서버 런타임 워커 비정상 종료 스택:\n${errNs.stack(err)}`);
        params.resultCollector.add({
          name: params.serverName,
          target: "server",
          type: "server",
          status: "error",
          message: errNs.message(err),
        });
      });
  }

  async shutdownAll(): Promise<void> {
    await Promise.all([...this._workers.values()].map((w) => w.terminate()));
    this._workers.clear();
  }
}
