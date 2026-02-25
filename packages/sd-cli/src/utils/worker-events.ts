import { consola } from "consola";
import type { BuildResult } from "../infra/ResultCollector";
import type { SdPackageConfig } from "../sd-config.types";
import type { RebuildManager } from "./rebuild-manager";
import { formatBuildMessages } from "./output-utils";

const workerEventsLogger = consola.withTag("sd:cli:worker-events");

/** Worker build completion event data */
export interface BuildEventData {
  success: boolean;
  errors?: string[];
  warnings?: string[];
}

/** Worker error event data */
export interface ErrorEventData {
  message: string;
}

/** Worker server ready event data */
export interface ServerReadyEventData {
  port: number;
}

/** Server Build completion event data */
export interface ServerBuildEventData {
  success: boolean;
  mainJsPath: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * Base Worker info type
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
 * Worker event handler options
 */
export interface WorkerEventHandlerOptions {
  resultKey: string;
  listrTitle: string;
  resultType: "build" | "dts";
}

/**
 * Register common Worker event handlers (buildStart, build, error only - serverReady not included)
 *
 * @param workerInfo Worker info
 * @param opts Handler options
 * @param results Result map
 * @param rebuildManager Rebuild manager
 * @returns completeTask function (saves result and signals build completion)
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

  // Build start (on rebuild)
  workerInfo.worker.on("buildStart", () => {
    if (!workerInfo.isInitialBuild) {
      workerInfo.buildResolver = rebuildManager.registerBuild(opts.resultKey, opts.listrTitle);
    }
  });

  // Build completion
  workerInfo.worker.on("build", (_data) => {
    const data = _data as BuildEventData;
    workerEventsLogger.debug(`[${workerInfo.name}] build: success=${String(data.success)}`);

    // Print warnings
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

  // Error
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
