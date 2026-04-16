import type { BuildResult, ResultCollector } from "../runtime/ResultCollector";
import type { RebuildManager } from "./rebuild-manager";

/**
 * worker.on()으로 이벤트를 구독할 수 있는 최소 인터페이스
 */
interface EventSubscribable {
  on(event: string, handler: (...args: any[]) => void): void;
}

/**
 * 정규화된 빌드 정보
 */
export interface NormalizedBuildInfo {
  success: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * setupWatchEvents 옵션
 */
export interface SetupWatchEventsOptions {
  name: string;
  target: string;
  resultCollector?: ResultCollector;
  rebuildManager?: RebuildManager;
  /** build 이벤트 데이터를 공통 형태로 변환하는 콜백 */
  normalizeBuild: (data: unknown) => NormalizedBuildInfo;
}

/**
 * BaseEngine과 EsbuildClientEngine의 공통 watch 이벤트 처리를 설정한다.
 *
 * buildStart → RebuildManager.registerBuild() 호출
 * build → ResultCollector.add() + resolver 호출
 * error → ResultCollector.add() + resolver 호출
 *
 * @returns waitForInitialBuild - 첫 build/error 이벤트에서 resolve되는 Promise 반환 함수
 * @returns resolveInitialBuild - 수동으로 초기 빌드를 resolve (startWatch 실패 시 사용)
 */
export function setupWatchEvents(
  worker: EventSubscribable,
  options: SetupWatchEventsOptions,
): {
  waitForInitialBuild: () => Promise<void>;
  resolveInitialBuild: () => void;
} {
  const { name, target, resultCollector, rebuildManager, normalizeBuild } = options;
  const workerKey = `${name}:build`;

  let resolver: (() => void) | undefined;
  let isInitialBuild = true;
  let initialBuildResolve: (() => void) | undefined;

  worker.on("buildStart", () => {
    if (rebuildManager != null) {
      resolver = rebuildManager.registerBuild(workerKey, `${name} (${target})`);
    }
  });

  worker.on("build", (data: unknown) => {
    const info = normalizeBuild(data);

    const buildResult: BuildResult = {
      name,
      target,
      type: "build",
      status: info.success ? "success" : "error",
      message: info.errors?.join("\n"),
      warnings: info.warnings != null && info.warnings.length > 0
        ? info.warnings.join("\n")
        : undefined,
    };
    resultCollector?.add(buildResult);

    resolver?.();
    resolver = undefined;

    if (isInitialBuild) {
      isInitialBuild = false;
      initialBuildResolve?.();
    }
  });

  worker.on("error", (data: unknown) => {
    const event = data as { message: string };

    const buildResult: BuildResult = {
      name,
      target,
      type: "build",
      status: "error",
      message: event.message,
    };
    resultCollector?.add(buildResult);

    resolver?.();
    resolver = undefined;

    if (isInitialBuild) {
      isInitialBuild = false;
      initialBuildResolve?.();
    }
  });

  function resolveInitialBuild(): void {
    if (isInitialBuild) {
      isInitialBuild = false;
      initialBuildResolve?.();
    }
  }

  function waitForInitialBuild(): Promise<void> {
    if (!isInitialBuild) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      initialBuildResolve = resolve;
    });
  }

  return { waitForInitialBuild, resolveInitialBuild };
}
