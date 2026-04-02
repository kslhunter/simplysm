import { consola } from "consola";
import type { BuildResult } from "../infra/ResultCollector";
import type { SdPackageConfig } from "../sd-config.types";
import type { RebuildManager } from "./rebuild-manager";
import { formatBuildMessages } from "./output-utils";

const workerEventsLogger = consola.withTag("sd:cli:worker-events");

/** 워커 빌드 완료 이벤트 데이터 */
export interface BuildEventData {
  success: boolean;
  errors?: string[];
  warnings?: string[];
}

/** 워커 에러 이벤트 데이터 */
export interface ErrorEventData {
  message: string;
}

/** 워커 서버 준비 완료 이벤트 데이터 */
export interface ServerReadyEventData {
  port: number;
}

/** Server 빌드 완료 이벤트 데이터 */
export interface ServerBuildEventData {
  success: boolean;
  mainJsPath: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * 기본 Worker 정보 타입
 */
export interface BaseWorkerInfo<TEvents extends Record<string, unknown> = Record<string, unknown>> {
  name: string;
  config: SdPackageConfig;
  worker: {
    on<K extends keyof TEvents>(event: K, handler: (data: TEvents[K]) => void): void;
    send<K extends keyof TEvents>(event: K, data: TEvents[K]): void;
  };
  isInitialBuild: boolean;
  buildResolver: (() => void) | undefined;
}

/**
 * 워커 이벤트 핸들러 옵션
 */
export interface WorkerEventHandlerOptions {
  resultKey: string;
  listrTitle: string;
  resultType: "build";
}

/**
 * 공통 Worker 이벤트 핸들러를 등록한다 (buildStart, build, error만 — serverReady 미포함)
 *
 * @param workerInfo 워커 정보
 * @param opts 핸들러 옵션
 * @param results 결과 맵
 * @param rebuildManager 재빌드 매니저
 * @returns completeTask 함수 (결과 저장 및 빌드 완료 신호)
 */
export function registerWorkerEventHandlers(
  workerInfo: {
    name: string;
    config: { target: string };
    worker: {
      on(event: string, handler: (data: any) => void): void;
    };
    isInitialBuild: boolean;
    buildResolver: (() => void) | undefined;
  },
  opts: WorkerEventHandlerOptions,
  results: Map<string, BuildResult>,
  rebuildManager: RebuildManager,
): (result: BuildResult) => void {
  workerEventsLogger.debug(`[${workerInfo.name}] 이벤트 핸들러 등록 (${opts.resultType})`);
  const completeTask = (result: BuildResult): void => {
    results.set(opts.resultKey, result);
    workerInfo.buildResolver?.();
    workerInfo.buildResolver = undefined;
    workerInfo.isInitialBuild = false;
  };

  // 빌드 시작 (재빌드 시)
  workerInfo.worker.on("buildStart", () => {
    if (!workerInfo.isInitialBuild) {
      workerInfo.buildResolver = rebuildManager.registerBuild(opts.resultKey, opts.listrTitle);
    }
  });

  // 빌드 완료
  workerInfo.worker.on("build", (data) => {
    workerEventsLogger.debug(`[${workerInfo.name}] build: success=${String(data.success)}`);

    // 경고 출력
    if (data.warnings != null && data.warnings.length > 0) {
      workerEventsLogger.warn(
        formatBuildMessages(workerInfo.name, workerInfo.config.target, data.warnings),
      );
    }

    completeTask({
      name: workerInfo.name,
      target: workerInfo.config.target,
      type: opts.resultType,
      status: data.success === true ? "success" : "error",
      message: data.errors?.join("\n"),
    });
  });

  // 에러
  workerInfo.worker.on("error", (data) => {
    workerEventsLogger.debug(`[${workerInfo.name}] error: ${data.message}`);
    completeTask({
      name: workerInfo.name,
      target: workerInfo.config.target,
      type: opts.resultType,
      status: "error",
      message: data.message,
    });
  });

  return completeTask;
}
