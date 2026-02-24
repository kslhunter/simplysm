import { consola } from "consola";
import type { BuildResult } from "../infra/ResultCollector";
import type { SdPackageConfig } from "../sd-config.types";
import type { RebuildManager } from "./rebuild-manager";
import { formatBuildMessages } from "./output-utils";

const workerEventsLogger = consola.withTag("sd:cli:worker-events");

/** Worker 빌드 완료 이벤트 데이터 */
export interface BuildEventData {
  success: boolean;
  errors?: string[];
  warnings?: string[];
}

/** Worker 에러 이벤트 데이터 */
export interface ErrorEventData {
  message: string;
}

/** Worker 서버 준비 이벤트 데이터 */
export interface ServerReadyEventData {
  port: number;
}

/** Server Build 완료 이벤트 데이터 */
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
 * Worker 이벤트 핸들러 옵션
 */
export interface WorkerEventHandlerOptions {
  resultKey: string;
  listrTitle: string;
  resultType: "build" | "dts";
}

/**
 * 공통 Worker 이벤트 핸들러 등록 (buildStart, build, error만 - serverReady는 포함하지 않음)
 *
 * @param workerInfo Worker 정보
 * @param opts 핸들러 옵션
 * @param results 결과 맵
 * @param rebuildManager 리빌드 매니저
 * @returns completeTask 함수 (결과를 저장하고 빌드 완료를 알림)
 */
export function registerWorkerEventHandlers<
  TEvents extends Record<string, unknown>,
  T extends BaseWorkerInfo<TEvents>,
>(
  workerInfo: T,
  opts: WorkerEventHandlerOptions,
  results: Map<string, BuildResult>,
  rebuildManager: RebuildManager,
): (result: BuildResult) => void {
  const completeTask = (result: BuildResult): void => {
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
  workerInfo.worker.on("build", (_data) => {
    const data = _data as BuildEventData;
    workerEventsLogger.debug(`[${workerInfo.name}] build: success=${String(data.success)}`);

    // warnings 출력
    if (data.warnings != null && data.warnings.length > 0) {
      workerEventsLogger.warn(
        formatBuildMessages(workerInfo.name, workerInfo.config.target, data.warnings),
      );
    }

    completeTask({
      name: workerInfo.name,
      target: workerInfo.config.target,
      type: opts.resultType,
      status: data.success ? "success" : "error",
      message: data.errors?.join("\n"),
    });
  });

  // 에러
  workerInfo.worker.on("error", (_data) => {
    const data = _data as ErrorEventData;
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
