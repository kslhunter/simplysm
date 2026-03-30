import ts from "typescript";
import path from "path";
import { err as errNs } from "@simplysm/core-common";
import { consola } from "consola";
import type { SdConfig } from "../sd-config.types";
import { loadSdConfig } from "../utils/sd-config";
import { deserializeDiagnostic } from "../utils/typecheck-serialization";
import { createBuildEngine } from "../engines/index";
import { typecheckNonPackageFiles } from "../utils/typecheck-non-package";
import { runWithConcurrency, getMaxConcurrency } from "../utils/concurrency";
import { discoverWorkspacePackages, mergeTestsPackagesIntoConfig } from "../utils/package-utils";
import type { EngineResult } from "../engines/types";
import type { TypecheckEnv } from "../utils/tsconfig";
import { toTypecheckEnvs } from "../utils/tsconfig";

//#region Types

/**
 * TypeScript 타입체크 옵션
 */
export interface TypecheckOptions {
  /** 타입체크 대상 경로 필터 (예: `packages/core-common`, `tests/orm`). 빈 배열이면 전체 대상. */
  targets: string[];
  /** sd.config.ts에 전달할 추가 옵션 */
  options: string[];
  /** true이면 엔진에 lint: true를 전달하고 lint 결과를 수집한다 */
  lint?: boolean;
}

/**
 * TypeScript 타입체크 실행 결과
 */
export interface TypecheckResult {
  success: boolean;
  errorCount: number;
  warningCount: number;
  formattedOutput: string;
  /** Lint result (present when TypecheckOptions.lint is true) */
  lint?: {
    success: boolean;
    errorCount: number;
    warningCount: number;
    formattedOutput: string;
  };
  /** Paths of scripts packages that were skipped (for separate lint) */
  scriptsPackagePaths?: string[];
}

//#endregion

//#region Utilities

const TARGET_PATH_PATTERN = /^(?:packages|tests)\/([^/]+)/;

/**
 * 대상 경로에서 패키지명을 추출한다.
 * "packages/core-common" → "core-common"
 * "tests/orm" → "orm"
 */
function extractTargetPackageNames(targets: string[]): Set<string> {
  const names = new Set<string>();
  for (const target of targets) {
    const match = target.match(TARGET_PATH_PATTERN);
    if (match) names.add(match[1]);
  }
  return names;
}

//#endregion

//#region Main

/**
 * BuildEngine을 사용하여 TypeScript 타입체크를 실행한다.
 *
 * sd.config.ts의 각 패키지에 대해:
 * - 라이브러리/서버 패키지 → BuildEngine.run({js:false, dts:false})
 * - 스크립트/클라이언트 패키지 → 제외
 * 비패키지 파일 → typecheckNonPackageFiles 유틸리티
 *
 * @param options - 타입체크 실행 옵션
 * @returns 타입체크 결과 (성공 여부, 에러/경고 수, 포매팅된 출력 문자열)
 */
export async function executeTypecheck(options: TypecheckOptions): Promise<TypecheckResult> {
  const { targets } = options;
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:typecheck");

  const phaseLabel = options.lint === true ? "타입체크/린트" : "타입체크";

  logger.debug(`${phaseLabel} 시작`, { targets, lint: options.lint });

  const formatHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: () => cwd,
    getNewLine: () => ts.sys.newLine,
  };

  // sd.config.ts 로드
  let sdConfig: SdConfig;
  try {
    sdConfig = await loadSdConfig({ cwd, dev: false, options: options.options });
    logger.debug("sd.config.ts 로드 완료");
  } catch {
    sdConfig = { packages: {} };
    logger.debug("sd.config.ts 로드 실패, 기본값 사용");
  }

  // 워크스페이스 패키지 탐색 및 tests/를 설정에 병합
  const workspacePackages = discoverWorkspacePackages(cwd);
  const { merged, pathMap } = mergeTestsPackagesIntoConfig(sdConfig.packages, workspacePackages);

  // 경로 기반 대상에서 패키지명 결정
  const targetNames = extractTargetPackageNames(targets);

  // scripts 패키지 경로 수집 (별도 lint용)
  const scriptsPackagePaths: string[] = [];

  // 타���체크할 패키지 수집 (scripts 제외), env별로 확장
  const typecheckTasks: Array<{ name: string; dir: string; config: any; env: TypecheckEnv }> = [];
  for (const [name, config] of Object.entries(merged)) {
    if (config == null) continue;
    if (config.target === "scripts") {
      if (targets.length === 0 || targetNames.has(name)) {
        const relPath = pathMap.get(name) ?? `packages/${name}`;
        scriptsPackagePaths.push(relPath);
      }
      continue;
    }
    if (targets.length > 0 && !targetNames.has(name)) continue;

    const relPath = pathMap.get(name) ?? `packages/${name}`;
    // 클라이언트 패키지의 경우 browser 타겟을 사용하여 createBuildEngine이 ViteEngine 대신 NgtscEngine으로 라우팅되도록 함
    const typecheckConfig = config.target === "client" ? { target: "browser" as const } : config;
    const envs = toTypecheckEnvs(config.target);
    for (const env of envs) {
      typecheckTasks.push({
        name,
        dir: path.join(cwd, relPath),
        config: typecheckConfig,
        env,
      });
    }
  }

  // 비패키지 타입체크: 대상이 지정되지 않은 경우에만 (= 전체 검사)
  const includeNonPackage = targets.length === 0;

  if (typecheckTasks.length === 0 && !includeNonPackage) {
    logger.info(`${phaseLabel} 대상 없음`);
    return {
      success: true,
      errorCount: 0,
      warningCount: 0,
      formattedOutput: `✔ ${phaseLabel} 대상 없음.\n`,
      scriptsPackagePaths: scriptsPackagePaths.length > 0 ? scriptsPackagePaths : undefined,
    };
  }

  // 동시성 제한이 있는 BuildEngine 작업 생성
  const allDiagnostics: ts.Diagnostic[] = [];
  let totalErrorCount = 0;
  let totalWarningCount = 0;
  const fileCache = new Map<string, string>();

  // Lint 결과 집계
  let lintErrorCount = 0;
  let lintWarningCount = 0;
  let lintSuccess = true;
  const lintOutputs: string[] = [];

  if (typecheckTasks.length > 0) {
    const tasks = typecheckTasks.map((task) => async (): Promise<EngineResult> => {
      const label = `${task.name}:${task.env}`;
      const engine = createBuildEngine(
        { name: task.name, dir: task.dir, config: task.config },
        { cwd },
      );
      try {
        logger.debug(`[${label}] 타입체크 시작됨`);
        const result = await engine.run({
          js: false,
          dts: false,
          env: task.env,
          ...(options.lint === true ? { lint: true } : {}),
        });
        logger.debug(`[${label}] 타입체크 ${result.dts.success ? "완료" : "실패"}`);
        return result;
      } catch (err) {
        const message = errNs.message(err);
        const stack = err instanceof Error ? err.stack : undefined;
        logger.error(`[${label}] 엔진 작업 실패: ${message}`);
        if (stack != null) {
          logger.debug(`[${label}] 스택 트레이스:\n${stack}`);
        }
        return {
          success: false,
          js: { success: true, errors: [], warnings: [] },
          dts: {
            success: false,
            errors: [`[${label}] ${message}`],
            warnings: [],
            diagnostics: [],
          },
        };
      } finally {
        await engine.stop();
      }
    });

    const concurrency = getMaxConcurrency();
    logger.start(`${phaseLabel} 실행 중... (${tasks.length}개 작업, 동시성: ${concurrency})`);
    const results = await runWithConcurrency(tasks, concurrency);
    logger.success(`${phaseLabel} 실행 완료`);

    // 엔진 결과 집계 (모든 task는 catch로 인해 항상 fulfilled)
    for (const settled of results) {
      if (settled.status !== "fulfilled") continue;
      const engineResult = settled.value;
      const dtsDiags = engineResult.dts.diagnostics.map((d) => deserializeDiagnostic(d, fileCache));
      allDiagnostics.push(...dtsDiags);
      // 역직렬화된 진단 정보에서 에러/경고 수 집계
      // 숫자 카테고리 값 사용 (ts.DiagnosticCategory: Error=1, Warning=0)
      totalErrorCount += dtsDiags.filter((d) => d.category === 1).length;
      totalWarningCount += dtsDiags.filter((d) => d.category === 0).length;
      if (!engineResult.dts.success && dtsDiags.length === 0) {
        for (const errMsg of engineResult.dts.errors) {
          allDiagnostics.push({
            category: 1,
            code: 0,
            messageText: errMsg,
            file: undefined,
            start: undefined,
            length: undefined,
          });
        }
        totalErrorCount += engineResult.dts.errors.length || 1;
      }

      // Lint 결과 수집
      if (engineResult.lint != null) {
        lintErrorCount += engineResult.lint.errorCount;
        lintWarningCount += engineResult.lint.warningCount;
        if (!engineResult.lint.success) lintSuccess = false;
        if (engineResult.lint.formattedOutput !== "") {
          lintOutputs.push(engineResult.lint.formattedOutput);
        }
      }
    }
  }

  // 비패키지 타입체크
  if (includeNonPackage) {
    logger.debug("비패키지 타입체크 실행 중");
    const nonPkgResult = typecheckNonPackageFiles(cwd);
    totalErrorCount += nonPkgResult.errorCount;
    totalWarningCount += nonPkgResult.warningCount;
    const nonPkgDiags = nonPkgResult.diagnostics.map((d) => deserializeDiagnostic(d, fileCache));
    allDiagnostics.push(...nonPkgDiags);
  }

  // 요약 로그
  const resultMeta: Record<string, number> = { errorCount: totalErrorCount, warningCount: totalWarningCount };
  if (options.lint === true) {
    resultMeta["lintErrorCount"] = lintErrorCount;
    resultMeta["lintWarningCount"] = lintWarningCount;
  }
  if (totalErrorCount > 0) {
    logger.error(`${phaseLabel} 에러 발생`, resultMeta);
  } else {
    logger.info(`${phaseLabel} 완료`, resultMeta);
  }

  // 진단 출력 포매팅
  let formattedOutput = "";
  if (allDiagnostics.length > 0) {
    const uniqueDiagnostics = ts.sortAndDeduplicateDiagnostics(allDiagnostics);
    formattedOutput = ts.formatDiagnosticsWithColorAndContext(uniqueDiagnostics, formatHost);
  }

  // Build lint result if lint was requested
  const lintResult = options.lint === true
    ? {
        success: lintSuccess,
        errorCount: lintErrorCount,
        warningCount: lintWarningCount,
        formattedOutput: lintOutputs.join("\n"),
      }
    : undefined;

  return {
    success: totalErrorCount === 0,
    errorCount: totalErrorCount,
    warningCount: totalWarningCount,
    formattedOutput,
    lint: lintResult,
    scriptsPackagePaths: scriptsPackagePaths.length > 0 ? scriptsPackagePaths : undefined,
  };
}

//#endregion
