import type { PackageResult } from "./package-utils";
import type { SdPackageConfig } from "../sd-config.types";
import type { RebuildListrManager } from "./listr-manager";

/** Worker 빌드 완료 이벤트 데이터 */
export interface BuildEventData {
  success: boolean;
  errors?: string[];
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
}

/**
 * 기본 Worker 정보 타입
 */
export interface BaseWorkerInfo {
  name: string;
  config: SdPackageConfig;
  worker: { on: (event: string, handler: (data: unknown) => void) => void };
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
export function registerWorkerEventHandlers<T extends BaseWorkerInfo>(
  workerInfo: T,
  opts: WorkerEventHandlerOptions,
  results: Map<string, PackageResult>,
  rebuildManager: RebuildListrManager,
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
