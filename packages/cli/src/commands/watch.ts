import path from "path";
import { Listr } from "listr2";
import { Worker, type WorkerProxy } from "@simplysm/core-node";
import type { BuildTarget, SdConfig, SdPackageConfig } from "../sd-config.types";
import { consola } from "consola";
import { loadSdConfig } from "../utils/sd-config";
import type { TypecheckEnv } from "../utils/tsconfig";
import type * as WatchWorkerModule from "../workers/watch.worker";
import type * as DtsWorkerModule from "../workers/dts.worker";

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
  type: "build" | "dts" | "server";
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
      printErrorsAndServers(this._results);
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
 */
function printErrorsAndServers(results: Map<string, PackageResult>): void {
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
      consola.info(`[server] http://localhost:${server.port}/${server.name}/`);
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

  // Worker 경로
  const esbuildWorkerPath = path.resolve(import.meta.dirname, "../workers/watch.worker.ts");
  const dtsWorkerPath = path.resolve(import.meta.dirname, "../workers/dts.worker.ts");

  // Esbuild Worker 생성 (JS 빌드용)
  const esbuildWorkers: EsbuildWorkerInfo[] = Object.entries(packages).map(([name, config]) => ({
    name,
    config,
    worker: Worker.create<typeof WatchWorkerModule>(esbuildWorkerPath),
    isInitialBuild: true,
    buildResolver: undefined,
  }));

  // DTS Worker 생성 (client/scripts 타겟 제외)
  // filter로 client/scripts를 제외했지만 TypeScript가 타입을 좁히지 못하므로 타입 가드 사용
  const isBuildTarget = (target: string): target is BuildTarget =>
    target === "node" || target === "browser" || target === "neutral";

  const dtsWorkers: DtsWorkerInfo[] = Object.entries(packages)
    .filter(([, config]) => isBuildTarget(config.target))
    .map(([name, config]) => {
      // 타겟별 TypecheckEnv 결정 (filter로 node/browser/neutral만 남음)
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
  const rebuildManager = new RebuildListrManager(results, logger);

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

  const dtsBuildPromises = new Map<string, Promise<void>>();
  for (const workerInfo of dtsWorkers) {
    dtsBuildPromises.set(
      workerInfo.name,
      new Promise<void>((resolve) => {
        workerInfo.buildResolver = resolve;
      }),
    );
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

    // serverReady는 esbuild 전용 (client 타겟)
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

  // 초기 빌드 listr (esbuild + dts 태스크 모두 포함)
  const initialListr = new Listr(
    [
      // Esbuild 태스크
      ...esbuildWorkers.map((workerInfo) => ({
        title: `${workerInfo.name} (${workerInfo.config.target})`,
        task: () => esbuildBuildPromises.get(workerInfo.name) ?? Promise.resolve(),
      })),
      // DTS 태스크
      ...dtsWorkers.map((workerInfo) => ({
        title: `${workerInfo.name} (dts)`,
        task: () => dtsBuildPromises.get(workerInfo.name) ?? Promise.resolve(),
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

  // 초기 빌드 결과 출력
  printErrorsAndServers(results);

  // 종료 시그널까지 대기
  await terminatePromise;

  // Worker 종료 (esbuild + dts 모두)
  process.stdout.write("⏳ 종료 중...\n");
  await Promise.all([
    ...esbuildWorkers.map(({ worker }) => worker.terminate()),
    ...dtsWorkers.map(({ worker }) => worker.terminate()),
  ]);
  process.stdout.write("✔ 완료\n");
}

//#endregion
