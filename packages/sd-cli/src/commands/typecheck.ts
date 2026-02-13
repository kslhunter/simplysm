import ts from "typescript";
import path from "path";
import os from "os";
import { Listr } from "listr2";
import { pathPosix, pathFilterByTargets, Worker, type WorkerProxy } from "@simplysm/core-node";
import "@simplysm/core-common";
import { consola, LogLevels } from "consola";
import type { SdConfig } from "../sd-config.types";
import { parseRootTsconfig, type TypecheckEnv } from "../utils/tsconfig";
import { loadSdConfig } from "../utils/sd-config";
import { deserializeDiagnostic } from "../utils/typecheck-serialization";
import type { DtsBuildInfo, DtsBuildResult } from "../workers/dts.worker";
import type * as DtsWorkerModule from "../workers/dts.worker";

//#region Types

/**
 * TypeScript 타입체크 옵션
 */
export interface TypecheckOptions {
  /** 타입체크할 경로 필터 (예: `packages/core-common`). 빈 배열이면 tsconfig.json에 정의된 모든 파일 대상 */
  targets: string[];
  /** sd.config.ts에 전달할 추가 옵션 */
  options: string[];
}

// 패키지 정보 (packages/* 하위 파일 분류용)
interface PackageInfo {
  name: string;
  dir: string;
  envs: TypecheckEnv[]; // neutral은 ["node", "browser"], 나머지는 단일 환경
}

// 타입체크 작업 정보 (내부 사용)
interface TypecheckTask {
  /** 작업 표시 이름 (예: "패키지: core-common [node]") */
  displayName: string;
  /** dts.worker에 전달할 정보 */
  buildInfo: DtsBuildInfo;
}

//#endregion

//#region Utilities

/** 경로 분류용 정규표현식 */
const PATH_PATTERNS = {
  /** packages/{pkg}/... */
  PACKAGE: /^packages\/([^/]+)\//,
} as const;

/**
 * 패키지 타겟을 타입체크 환경 목록으로 변환합니다.
 * - node/browser: 해당 환경만
 * - neutral: node + browser 둘 다
 * - client: browser로 처리
 * @param target 패키지 빌드 타겟
 * @returns 타입체크 환경 목록
 */
function toTypecheckEnvs(target: string | undefined): TypecheckEnv[] {
  if (target === "node") return ["node"];
  if (target === "browser" || target === "client") return ["browser"];
  // neutral 또는 미지정은 둘 다
  return ["node", "browser"];
}

/**
 * 파일 경로에서 패키지 정보를 추출합니다.
 * scripts 타겟 패키지는 제외합니다.
 * @internal 테스트용으로 export
 */
export function extractPackages(fileNames: string[], cwd: string, config: SdConfig): Map<string, PackageInfo> {
  const packages = new Map<string, PackageInfo>();

  for (const fileName of fileNames) {
    const relativePath = pathPosix(path.relative(cwd, fileName));

    // packages/{pkg}/...
    const packageMatch = relativePath.match(PATH_PATTERNS.PACKAGE);
    if (packageMatch) {
      const pkgName = packageMatch[1];
      // scripts 타겟 패키지는 제외
      if (config.packages[pkgName]?.target === "scripts") continue;

      if (!packages.has(pkgName)) {
        packages.set(pkgName, {
          name: pkgName,
          dir: path.resolve(cwd, "packages", pkgName),
          envs: toTypecheckEnvs(config.packages[pkgName]?.target),
        });
      }
    }
  }

  return packages;
}

/**
 * tsconfig 파일 목록에서 packages/ 하위가 아닌 파일이 있는지 확인합니다.
 */
function hasNonPackageFiles(fileNames: string[], cwd: string): boolean {
  return fileNames.some((f) => {
    const relativePath = pathPosix(path.relative(cwd, f));
    return !relativePath.startsWith("packages/");
  });
}

/**
 * 패키지 정보로부터 타입체크 작업 목록을 생성합니다.
 * neutral 패키지는 node/browser 두 환경으로 분리하여 각각 체크합니다.
 * @param packages 패키지 정보 맵
 * @param cwd 현재 작업 디렉토리
 * @param includeNonPackage non-package 파일이 있으면 "기타" 작업 추가
 * @returns 타입체크 작업 정보 배열
 */
function createTypecheckTasks(
  packages: Map<string, PackageInfo>,
  cwd: string,
  includeNonPackage: boolean,
): TypecheckTask[] {
  const tasks: TypecheckTask[] = [];

  // packages/* - 각 env마다 별도 task 생성
  for (const info of packages.values()) {
    for (const env of info.envs) {
      const envSuffix = info.envs.length > 1 ? ` [${env}]` : "";
      tasks.push({
        displayName: `패키지: ${info.name}${envSuffix}`,
        buildInfo: {
          name: info.name,
          cwd,
          pkgDir: info.dir,
          env,
          emit: false, // 타입체크만 수행 (dts 생성 안 함)
        },
      });
    }
  }

  // non-package 파일 (tests/, 루트 *.ts 등)
  if (includeNonPackage) {
    tasks.push({
      displayName: "기타",
      buildInfo: {
        name: "root",
        cwd,
        emit: false,
      },
    });
  }

  return tasks;
}

//#endregion

//#region Main

/**
 * TypeScript 타입체크를 실행한다.
 *
 * - `tsconfig.json`을 로드하여 컴파일러 옵션 적용
 * - `sd.config.ts`를 로드하여 패키지별 타겟 정보 확인 (없으면 기본값 사용)
 * - Worker threads를 사용하여 실제 병렬 타입체크 수행
 * - incremental 컴파일 사용 (`.cache/typecheck-{env}.tsbuildinfo`)
 * - listr2를 사용하여 진행 상황 표시
 * - 에러 발생 시 `process.exitCode = 1` 설정
 *
 * @param options - 타입체크 실행 옵션
 * @returns 완료 시 resolve. 에러 발견 시 `process.exitCode`를 1로 설정하고 resolve (throw하지 않음)
 */
export async function runTypecheck(options: TypecheckOptions): Promise<void> {
  const { targets } = options;
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:typecheck");

  logger.debug("타입체크 시작", { targets });

  const formatHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: () => cwd,
    getNewLine: () => ts.sys.newLine,
  };

  // tsconfig.json 로드 및 파싱
  let parsedConfig: ts.ParsedCommandLine;
  try {
    parsedConfig = parseRootTsconfig(cwd);
  } catch (err) {
    consola.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
    return;
  }

  // sd.config.ts 로드
  let sdConfig: SdConfig;
  try {
    sdConfig = await loadSdConfig({ cwd, dev: false, opt: options.options });
    logger.debug("sd.config.ts 로드 완료");
  } catch (err) {
    // sd.config.ts가 없거나 로드 실패 시 기본값 사용
    sdConfig = { packages: {} };
    logger.debug("sd.config.ts 로드 실패, 기본값 사용", err);
  }

  // targets가 지정되면 fileNames 필터링
  const fileNames = pathFilterByTargets(parsedConfig.fileNames, targets, cwd);

  if (fileNames.length === 0) {
    process.stdout.write("✔ 타입체크할 파일이 없습니다.\n");
    logger.info("타입체크할 파일 없음");
    return;
  }

  // 패키지 정보 추출
  const packages = extractPackages(fileNames, cwd, sdConfig);
  logger.debug("패키지 추출 완료", {
    packageCount: packages.size,
    packages: [...packages.keys()],
  });

  // 타입체크 작업 생성
  const nonPackage = hasNonPackageFiles(fileNames, cwd);
  const tasks = createTypecheckTasks(packages, cwd, nonPackage);

  if (tasks.length === 0) {
    process.stdout.write("✔ 타입체크할 대상이 없습니다.\n");
    return;
  }

  // 동시성 설정: CPU 코어의 7/8만 사용 (일반적인 병렬 빌드 도구의 기본값, OS/다른 프로세스 여유분 확보, 최소 1, 작업 수 이하)
  const maxConcurrency = Math.max(Math.floor((os.cpus().length * 7) / 8), 1);
  const concurrency = Math.min(maxConcurrency, tasks.length);
  logger.debug("동시성 설정", { concurrency, maxConcurrency, taskCount: tasks.length });

  // Worker 풀 생성 (작업 수만큼만 생성)
  const workerPath = import.meta.resolve("../workers/dts.worker");
  const workers: WorkerProxy<typeof DtsWorkerModule>[] = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(Worker.create<typeof DtsWorkerModule>(workerPath));
  }

  // 결과 수집용
  const allResults: { displayName: string; result: DtsBuildResult }[] = [];

  // listr2-Worker 연동 패턴:
  // 1. listr2의 각 task는 Promise를 반환하고, 해당 Promise가 resolve되면 task가 완료됨
  // 2. taskResolvers 맵에 task별 resolve 함수를 저장
  // 3. Worker가 작업 완료 시 해당 task의 resolver를 호출하여 listr2 UI 업데이트
  // 4. Worker 풀은 독립적으로 작업 큐에서 task를 가져와 실행
  const taskResolvers = new Map<string, () => void>();

  try {
    // 작업 큐
    let taskIndex = 0;

    // Worker에서 작업 실행
    async function runNextTask(worker: WorkerProxy<typeof DtsWorkerModule>): Promise<void> {
      while (taskIndex < tasks.length) {
        const currentIndex = taskIndex++;
        const task = tasks[currentIndex];

        try {
          const result = await worker.buildDts(task.buildInfo);

          allResults.push({ displayName: task.displayName, result });
        } catch (err) {
          // Worker 오류 로깅 및 결과로 변환
          logger.error(`Worker 오류: ${task.displayName}`, {
            error: err instanceof Error ? err.message : String(err),
          });
          allResults.push({
            displayName: task.displayName,
            result: {
              success: false,
              errors: [err instanceof Error ? err.message : String(err)],
              diagnostics: [],
              errorCount: 1,
              warningCount: 0,
            },
          });
        } finally {
          // 성공/실패 모두 task 완료 처리
          taskResolvers.get(task.displayName)?.();
        }
      }
    }

    // listr2로 진행 상황 표시
    const listr = new Listr(
      tasks.map((task) => ({
        title: task.displayName,
        task: () =>
          new Promise<void>((resolve) => {
            taskResolvers.set(task.displayName, resolve);
          }),
      })),
      {
        concurrent: concurrency,
        exitOnError: false,
        renderer: consola.level >= LogLevels.debug ? "verbose" : "default",
      },
    );

    // 병렬로 모든 worker 실행
    const workerPromises = workers.map((worker) => runNextTask(worker));

    // listr와 worker 동시 실행
    await Promise.all([listr.run(), ...workerPromises]);
  } finally {
    // 미해결 resolver 정리 (타임아웃/비정상 종료 대비)
    for (const resolver of taskResolvers.values()) {
      resolver();
    }
    // Worker 종료 (성공/실패 모두)
    await Promise.all(workers.map((w) => w.terminate()));
  }

  // 결과 출력
  const allDiagnostics: ts.Diagnostic[] = [];
  let totalErrorCount = 0;
  let totalWarningCount = 0;
  const fileCache = new Map<string, string>(); // 파일 내용 캐시 (동일 파일 중복 읽기 방지)
  for (const { result } of allResults) {
    totalErrorCount += result.errorCount;
    totalWarningCount += result.warningCount;
    for (const serialized of result.diagnostics) {
      allDiagnostics.push(deserializeDiagnostic(serialized, fileCache));
    }
  }

  if (totalErrorCount > 0) {
    logger.error("타입체크 에러 발생", {
      errorCount: totalErrorCount,
      warningCount: totalWarningCount,
    });
  } else if (totalWarningCount > 0) {
    logger.info("타입체크 완료 (경고 있음)", {
      errorCount: totalErrorCount,
      warningCount: totalWarningCount,
    });
  } else {
    logger.info("타입체크 완료", { errorCount: totalErrorCount, warningCount: totalWarningCount });
  }

  if (allDiagnostics.length > 0) {
    const uniqueDiagnostics = ts.sortAndDeduplicateDiagnostics(allDiagnostics);
    const message = ts.formatDiagnosticsWithColorAndContext(uniqueDiagnostics, formatHost);
    process.stdout.write(message);
  }

  if (totalErrorCount > 0) {
    process.exitCode = 1;
  }
}

//#endregion
