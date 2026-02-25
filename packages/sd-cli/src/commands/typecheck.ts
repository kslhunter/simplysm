import ts from "typescript";
import path from "path";
import os from "os";
import { pathPosix, pathFilterByTargets, Worker, type WorkerProxy } from "@simplysm/core-node";
import { errorMessage } from "@simplysm/core-common";
import { consola } from "consola";
import type { SdConfig } from "../sd-config.types";
import { parseRootTsconfig, type TypecheckEnv } from "../utils/tsconfig";
import { loadSdConfig } from "../utils/sd-config";
import { deserializeDiagnostic } from "../utils/typecheck-serialization";
import type { DtsBuildInfo, DtsBuildResult } from "../workers/dts.worker";
import type * as DtsWorkerModule from "../workers/dts.worker";

//#region Types

/**
 * TypeScript typecheck options
 */
export interface TypecheckOptions {
  /** Path filter for typecheck (e.g., `packages/core-common`). Empty array targets all files defined in tsconfig.json */
  targets: string[];
  /** Additional options to pass to sd.config.ts */
  options: string[];
}

/**
 * TypeScript typecheck execution result
 */
export interface TypecheckResult {
  success: boolean;
  errorCount: number;
  warningCount: number;
  formattedOutput: string;
}

// Package information (for classifying files under packages/*)
interface PackageInfo {
  name: string;
  dir: string;
  envs: TypecheckEnv[]; // neutral is ["node", "browser"], others are single environment
}

// Typecheck task information (internal use)
interface TypecheckTask {
  /** Task display name (e.g., "package: core-common [node]") */
  displayName: string;
  /** Information to pass to dts.worker */
  buildInfo: DtsBuildInfo;
}

//#endregion

//#region Utilities

/** Regular expression for path classification */
const PATH_PATTERNS = {
  /** packages/{pkg}/... */
  PACKAGE: /^packages\/([^/]+)\//,
} as const;

/**
 * Convert package target to typecheck environment list.
 * - node/browser: that environment only
 * - neutral: both node + browser
 * - client: treated as browser
 * @param target package build target
 * @returns list of typecheck environments
 */
function toTypecheckEnvs(target: string | undefined): TypecheckEnv[] {
  if (target === "node") return ["node"];
  if (target === "browser" || target === "client") return ["browser"];
  // neutral or unspecified: both
  return ["node", "browser"];
}

/**
 * Extract package information from file paths.
 * Excludes packages with scripts target.
 * @internal exported for testing
 */
export function extractPackages(
  fileNames: string[],
  cwd: string,
  config: SdConfig,
): Map<string, PackageInfo> {
  const packages = new Map<string, PackageInfo>();

  for (const fileName of fileNames) {
    const relativePath = pathPosix(path.relative(cwd, fileName));

    // packages/{pkg}/...
    const packageMatch = relativePath.match(PATH_PATTERNS.PACKAGE);
    if (packageMatch) {
      const pkgName = packageMatch[1];
      // Exclude packages with scripts target
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
 * Check if there are files not under packages/ in the tsconfig file list.
 */
function hasNonPackageFiles(fileNames: string[], cwd: string): boolean {
  return fileNames.some((f) => {
    const relativePath = pathPosix(path.relative(cwd, f));
    if (!relativePath.startsWith("packages/")) return true;
    // Also treat files directly under package root (config files) as non-package
    return relativePath.split("/").length === 3;
  });
}

/**
 * Create typecheck task list from package information.
 * Neutral packages are split into node/browser environments and checked separately.
 * @param packages package information map
 * @param cwd current working directory
 * @param includeNonPackage add "other" task if non-package files exist
 * @returns array of typecheck task information
 */
function createTypecheckTasks(
  packages: Map<string, PackageInfo>,
  cwd: string,
  includeNonPackage: boolean,
): TypecheckTask[] {
  const tasks: TypecheckTask[] = [];

  // packages/* - create separate task per env
  for (const info of packages.values()) {
    for (const env of info.envs) {
      const envSuffix = info.envs.length > 1 ? ` [${env}]` : "";
      tasks.push({
        displayName: `package: ${info.name}${envSuffix}`,
        buildInfo: {
          name: info.name,
          cwd,
          pkgDir: info.dir,
          env,
          emit: false, // Only typecheck (no dts generation)
        },
      });
    }
  }

  // non-package files (tests/, root *.ts, etc.)
  if (includeNonPackage) {
    tasks.push({
      displayName: "other",
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
 * Execute TypeScript typecheck and return results.
 *
 * - Load `tsconfig.json` to apply compiler options
 * - Load `sd.config.ts` to check package target info per package (use defaults if missing)
 * - Perform actual parallel typecheck using Worker threads
 * - Use incremental compilation (`.cache/typecheck-{env}.tsbuildinfo`)
 * - Show progress using consola logging
 * - Return results only, no stdout output or exitCode setting
 *
 * @param options - typecheck execution options
 * @returns typecheck result (success status, error/warning counts, formatted output string)
 */
export async function executeTypecheck(options: TypecheckOptions): Promise<TypecheckResult> {
  const { targets } = options;
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:typecheck");

  logger.debug("start typecheck", { targets });

  const formatHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: () => cwd,
    getNewLine: () => ts.sys.newLine,
  };

  // Load and parse tsconfig.json
  let parsedConfig: ts.ParsedCommandLine;
  try {
    parsedConfig = parseRootTsconfig(cwd);
  } catch (err) {
    logger.error(errorMessage(err));
    return { success: false, errorCount: 1, warningCount: 0, formattedOutput: "" };
  }

  // Load sd.config.ts
  let sdConfig: SdConfig;
  try {
    sdConfig = await loadSdConfig({ cwd, dev: false, opt: options.options });
    logger.debug("sd.config.ts loaded");
  } catch (err) {
    // Use defaults if sd.config.ts is missing or load fails
    sdConfig = { packages: {} };
    logger.debug("sd.config.ts load failed, using defaults", err);
  }

  // Filter fileNames if targets specified
  const fileNames = pathFilterByTargets(parsedConfig.fileNames, targets, cwd);

  if (fileNames.length === 0) {
    logger.info("no files to typecheck");
    return {
      success: true,
      errorCount: 0,
      warningCount: 0,
      formattedOutput: "✔ No files to typecheck.\n",
    };
  }

  // Extract package information
  const packages = extractPackages(fileNames, cwd, sdConfig);
  logger.debug("package extraction complete", {
    packageCount: packages.size,
    packages: [...packages.keys()],
  });

  // Create typecheck tasks
  const nonPackage = hasNonPackageFiles(fileNames, cwd);
  const tasks = createTypecheckTasks(packages, cwd, nonPackage);

  if (tasks.length === 0) {
    return {
      success: true,
      errorCount: 0,
      warningCount: 0,
      formattedOutput: "✔ No typecheck targets.\n",
    };
  }

  // Concurrency setting: use 7/8 of CPU cores (standard default for parallel build tools, reserves for OS/other processes, minimum 1, at most task count)
  const maxConcurrency = Math.max(Math.floor((os.cpus().length * 7) / 8), 1);
  const concurrency = Math.min(maxConcurrency, tasks.length);
  logger.debug("concurrency configuration", { concurrency, maxConcurrency, taskCount: tasks.length });

  // Create Worker pool
  const workerPath = import.meta.resolve("../workers/dts.worker");
  const workers: WorkerProxy<typeof DtsWorkerModule>[] = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(Worker.create<typeof DtsWorkerModule>(workerPath));
  }

  const allResults: { displayName: string; result: DtsBuildResult }[] = [];

  try {
    let taskIndex = 0;

    async function runNextTask(worker: WorkerProxy<typeof DtsWorkerModule>): Promise<void> {
      while (taskIndex < tasks.length) {
        const currentIndex = taskIndex++;
        const task = tasks[currentIndex];

        logger.debug(`[${task.displayName}] 타입체크 시작`);
        try {
          const result = await worker.build(task.buildInfo);
          allResults.push({ displayName: task.displayName, result });
          if (result.success) {
            logger.debug(`[${task.displayName}] 타입체크 완료`);
          } else {
            logger.debug(`[${task.displayName}] 타입체크 실패`, { errorCount: result.errorCount });
          }
        } catch (err) {
          logger.error(`Worker 오류: ${task.displayName}`, {
            error: errorMessage(err),
          });
          allResults.push({
            displayName: task.displayName,
            result: {
              success: false,
              errors: [errorMessage(err)],
              diagnostics: [],
              errorCount: 1,
              warningCount: 0,
            },
          });
        }
      }
    }

    logger.start(`타입체크 실행 중... (${tasks.length}개 대상, 동시성: ${concurrency})`);
    await Promise.all(workers.map((worker) => runNextTask(worker)));
    logger.success("타입체크 실행 완료");
  } finally {
    await Promise.all(workers.map((w) => w.terminate()));
  }

  // 결과 집계
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

  let formattedOutput = "";
  if (allDiagnostics.length > 0) {
    const uniqueDiagnostics = ts.sortAndDeduplicateDiagnostics(allDiagnostics);
    formattedOutput = ts.formatDiagnosticsWithColorAndContext(uniqueDiagnostics, formatHost);
  }

  return {
    success: totalErrorCount === 0,
    errorCount: totalErrorCount,
    warningCount: totalWarningCount,
    formattedOutput,
  };
}

/**
 * TypeScript 타입체크를 실행한다.
 *
 * `executeTypecheck()`를 호출하고 결과를 stdout에 출력하며, 에러 발생 시 `process.exitCode`를 설정한다.
 *
 * @param options - 타입체크 실행 옵션
 * @returns 완료 시 resolve. 에러 발견 시 `process.exitCode`를 1로 설정하고 resolve (throw하지 않음)
 */
export async function runTypecheck(options: TypecheckOptions): Promise<void> {
  const result = await executeTypecheck(options);
  if (result.formattedOutput) {
    process.stdout.write(result.formattedOutput);
  }
  if (!result.success) {
    process.exitCode = 1;
  }
}

//#endregion
