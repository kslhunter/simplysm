import path from "path";
import { Listr } from "listr2";
import { Worker, type WorkerProxy } from "@simplysm/core-node";
import type { BuildTarget, SdConfig, SdPackageConfig } from "../sd-config.types";
import { consola } from "consola";
import { loadSdConfig } from "../utils/sd-config";
import type { TypecheckEnv } from "../utils/tsconfig";
import type * as WatchWorkerModule from "../workers/watch.worker";
import type * as DtsWorkerModule from "../workers/dts.worker";
import { filterPackagesByTargets, type PackageResult } from "../utils/package-utils";
import { printErrors } from "../utils/output-utils";
import { RebuildListrManager } from "../utils/listr-manager";
import { registerWorkerEventHandlers } from "../utils/worker-events";

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

//#endregion

//#region Main

/**
 * Library 패키지를 watch 모드로 빌드한다.
 *
 * - `sd.config.ts`를 로드하여 패키지별 빌드 타겟 정보 확인 (필수)
 * - `node`/`browser`/`neutral` 타겟: esbuild watch 모드로 빌드 + .d.ts 생성
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
  const allPackages = filterPackagesByTargets(sdConfig.packages, targets);

  // library 패키지만 필터링 (node, browser, neutral)
  const isLibraryTarget = (target: string): target is BuildTarget =>
    target === "node" || target === "browser" || target === "neutral";

  const packages: Record<string, SdPackageConfig> = {};
  for (const [name, config] of Object.entries(allPackages)) {
    if (isLibraryTarget(config.target)) {
      packages[name] = config;
    }
  }

  if (Object.keys(packages).length === 0) {
    process.stdout.write("⚠ watch할 library 패키지가 없습니다.\n");
    return;
  }

  // 빌드 패키지 목록
  const buildPackages: Array<{ name: string; config: SdPackageConfig }> = [];
  for (const [name, config] of Object.entries(packages)) {
    buildPackages.push({ name, config });
  }

  // Worker 경로
  const esbuildWorkerPath = path.resolve(import.meta.dirname, "../workers/watch.worker.ts");
  const dtsWorkerPath = path.resolve(import.meta.dirname, "../workers/dts.worker.ts");

  // Esbuild Worker 생성
  const esbuildWorkers: EsbuildWorkerInfo[] = buildPackages.map(({ name, config }) => ({
    name,
    config,
    worker: Worker.create<typeof WatchWorkerModule>(esbuildWorkerPath),
    isInitialBuild: true,
    buildResolver: undefined,
  }));

  // DTS Worker 생성
  const dtsWorkers: DtsWorkerInfo[] = buildPackages.map(({ name, config }) => {
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
  const rebuildManager = new RebuildListrManager(logger);

  // 배치 완료 시 에러 출력
  rebuildManager.on("batchComplete", () => {
    printErrors(results);
  });

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

  // Esbuild 이벤트 핸들러 등록 및 completeTask 함수 저장
  const esbuildCompleteTasks = new Map<string, (result: PackageResult) => void>();
  for (const workerInfo of esbuildWorkers) {
    const completeTask = registerWorkerEventHandlers(
      workerInfo,
      {
        resultKey: `${workerInfo.name}:build`,
        listrTitle: `${workerInfo.name} (${workerInfo.config.target})`,
        resultType: "build",
      },
      results,
      rebuildManager,
    );
    esbuildCompleteTasks.set(workerInfo.name, completeTask);
  }

  // DTS 이벤트 핸들러 등록 및 completeTask 함수 저장
  const dtsCompleteTasks = new Map<string, (result: PackageResult) => void>();
  for (const workerInfo of dtsWorkers) {
    const completeTask = registerWorkerEventHandlers(
      workerInfo,
      {
        resultKey: `${workerInfo.name}:dts`,
        listrTitle: `${workerInfo.name} (dts)`,
        resultType: "dts",
      },
      results,
      rebuildManager,
    );
    dtsCompleteTasks.set(workerInfo.name, completeTask);
  }

  // 초기 빌드 listr (esbuild + dts)
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
  printErrors(results);

  // 종료 시그널까지 대기
  await terminatePromise;

  // Worker 종료 (모든 워커)
  process.stdout.write("⏳ 종료 중...\n");
  await Promise.all([
    ...esbuildWorkers.map(({ worker }) => worker.terminate()),
    ...dtsWorkers.map(({ worker }) => worker.terminate()),
  ]);
  process.stdout.write("✔ 완료\n");
}

//#endregion
