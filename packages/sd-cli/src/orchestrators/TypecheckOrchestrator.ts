import ts from "typescript";
import { err as errNs } from "@simplysm/core-common";
import { pathx } from "@simplysm/core-node";
import { createLogger } from "@simplysm/core-common";
import { deserializeDiagnostic } from "../typecheck/typecheck-serialization";
import { createTypecheckEngine } from "../engines/engine-factory";
import { typecheckNonPackageFiles } from "../typecheck/typecheck-non-package";
import { runWithConcurrency, getMaxConcurrency } from "../utils/concurrency";
import { discoverWorkspacePackages, mergeTestsPackagesIntoConfig } from "../utils/package-utils";
import { loadAndValidateConfig } from "../utils/orchestrator-utils";
import { formatDiagnosticsOutput } from "../utils/diagnostic-utils";
import type { OrchestratorLifecycle } from "./types";
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
  /** lint 결과 (TypecheckOptions.lint가 true일 때 존재) */
  lint?: {
    success: boolean;
    errorCount: number;
    warningCount: number;
    formattedOutput: string;
  };
  /** 건너뛴 scripts 패키지 경로 (별도 lint용) */
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

//#region TypecheckOrchestrator

/**
 * 타입체크를 조율하는 Orchestrator
 *
 * BuildOrchestrator/WatchOrchestrator/DevOrchestrator와 동일한 initialize() → start() → shutdown() 생명주기를 따른다.
 * sd.config.ts 기반으로 패키지를 분류하고, BuildEngine을 사용하여 타입체크를 실행한다.
 */
export class TypecheckOrchestrator implements OrchestratorLifecycle<TypecheckResult> {
  private readonly _cwd: string;
  private readonly _options: TypecheckOptions;
  private readonly _logger = createLogger("sd:cli:typecheck");

  // initialize()에서 설정되는 내부 상태
  private readonly _typecheckTasks: Array<{ name: string; dir: string; config: any; env: TypecheckEnv }> =
    [];
  private readonly _scriptsPackagePaths: string[] = [];
  private _includeNonPackage = false;

  constructor(options: TypecheckOptions) {
    this._cwd = process.cwd();
    this._options = options;
  }

  /**
   * Initialize Orchestrator
   * - Load sd.config.ts
   * - Discover workspace packages and merge tests
   * - Classify packages into typecheck tasks
   * - Collect scripts package paths
   */
  async initialize(): Promise<void> {
    const { targets } = this._options;
    const phaseLabel = this._options.lint === true ? "타입체크/린트" : "타입체크";

    this._logger.debug(`${phaseLabel} 시작`, { targets, lint: this._options.lint });

    // sd.config.ts 로드 (targets=[] — check.ts에서 이미 검증 완료)
    const sdConfig = await loadAndValidateConfig({
      cwd: this._cwd, dev: false, options: this._options.options, targets: [],
    });
    this._logger.debug("sd.config.ts 로드 완료");

    // 워크스페이스 패키지 탐색 및 tests/를 설정에 병합
    const workspacePackages = discoverWorkspacePackages(this._cwd);
    const { merged, pathMap } = mergeTestsPackagesIntoConfig(
      sdConfig.packages,
      workspacePackages,
    );

    // 경로 기반 대상에서 패키지명 결정
    const targetNames = extractTargetPackageNames(targets);

    // 타입체크할 패키지 수집 (scripts 제외), env별로 확장
    for (const [name, config] of Object.entries(merged)) {
      if (config == null) continue;
      if (config.target === "scripts") {
        if (targets.length === 0 || targetNames.has(name)) {
          const relPath = pathMap.get(name) ?? `packages/${name}`;
          this._scriptsPackagePaths.push(relPath);
        }
        continue;
      }
      if (targets.length > 0 && !targetNames.has(name)) continue;

      const relPath = pathMap.get(name) ?? `packages/${name}`;
      const envs = toTypecheckEnvs(config.target);
      for (const env of envs) {
        this._typecheckTasks.push({
          name,
          dir: pathx.posixResolve(this._cwd, relPath),
          config,
          env,
        });
      }
    }

    // 비패키지 타입체크: 대상이 지정되지 않은 경우에만 (= 전체 검사)
    this._includeNonPackage = targets.length === 0;
  }

  /**
   * 타입체크 실행
   * - 엔진 생성 및 동시성 제어된 실행
   * - 비패키지 타입체크
   * - 결과 집계 및 포맷 출력 생성
   *
   * @returns 타입체크 결과
   */
  async start(): Promise<TypecheckResult> {
    const phaseLabel = this._options.lint === true ? "타입체크/린트" : "타입체크";

    if (this._typecheckTasks.length === 0 && !this._includeNonPackage) {
      this._logger.info(`${phaseLabel} 대상 없음`);
      return {
        success: true,
        errorCount: 0,
        warningCount: 0,
        formattedOutput: `✔ ${phaseLabel} 대상 없음.\n`,
        scriptsPackagePaths:
          this._scriptsPackagePaths.length > 0 ? this._scriptsPackagePaths : undefined,
      };
    }

    const fileCache = new Map<string, string>();
    const packageResults = await this._executePackageTypechecks(fileCache, phaseLabel);
    const nonPkgResults = this._executeNonPackageTypecheck(fileCache);
    return this._aggregateTypecheckResults(packageResults, nonPkgResults, phaseLabel);
  }

  /**
   * 패키지 타입체크 실행
   * - 엔진 생성 및 동시성 제어된 실행
   * - 결과 역직렬화 및 집계
   */
  private async _executePackageTypechecks(
    fileCache: Map<string, string>,
    phaseLabel: string,
  ): Promise<{
    allDiagnostics: ts.Diagnostic[];
    totalErrorCount: number;
    totalWarningCount: number;
    lintErrorCount: number;
    lintWarningCount: number;
    lintSuccess: boolean;
    lintOutputs: string[];
  }> {
    const allDiagnostics: ts.Diagnostic[] = [];
    let totalErrorCount = 0;
    let totalWarningCount = 0;
    let lintErrorCount = 0;
    let lintWarningCount = 0;
    let lintSuccess = true;
    const lintOutputs: string[] = [];

    if (this._typecheckTasks.length === 0) {
      return { allDiagnostics, totalErrorCount, totalWarningCount, lintErrorCount, lintWarningCount, lintSuccess, lintOutputs };
    }

    const tasks = this._typecheckTasks.map((task) => async (): Promise<EngineResult> => {
      const label = `${task.name}:${task.env}`;
      const engine = createTypecheckEngine(
        { name: task.name, dir: task.dir, config: task.config },
        { cwd: this._cwd },
      );
      try {
        this._logger.debug(`[${label}] 타입체크 시작됨`);
        const result = await engine.run({
          js: false,
          dts: false,
          env: task.env,
          includeTests: true,
          ...(this._options.lint === true ? { lint: true } : {}),
        });
        this._logger.debug(
          `[${label}] 타입체크 ${result.build.success ? "완료" : "실패"}`,
        );
        return result;
      } catch (err) {
        const message = errNs.message(err);
        const stack = err instanceof Error ? err.stack : undefined;
        this._logger.error(`[${label}] 엔진 작업 실패: ${message}`);
        if (stack != null) {
          this._logger.debug(`[${label}] 스택 트레이스:\n${stack}`);
        }
        return {
          build: {
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
    this._logger.start(
      `${phaseLabel} 실행 중... (${tasks.length}개 작업, 동시성: ${concurrency})`,
    );
    const results = await runWithConcurrency(tasks, concurrency);
    this._logger.success(`${phaseLabel} 실행 완료`);

    // 엔진 결과 집계 (모든 task는 catch로 인해 항상 fulfilled)
    for (const settled of results) {
      if (settled.status !== "fulfilled") continue;
      const engineResult = settled.value;
      const buildDiags = engineResult.build.diagnostics.map((d) =>
        deserializeDiagnostic(d, fileCache),
      );
      allDiagnostics.push(...buildDiags);
      totalErrorCount += buildDiags.filter((d) => d.category === ts.DiagnosticCategory.Error).length;
      totalWarningCount += buildDiags.filter((d) => d.category === ts.DiagnosticCategory.Warning).length;
      if (!engineResult.build.success && buildDiags.length === 0) {
        for (const errMsg of engineResult.build.errors) {
          allDiagnostics.push({
            category: 1,
            code: 0,
            messageText: errMsg,
            file: undefined,
            start: undefined,
            length: undefined,
          });
        }
        totalErrorCount += engineResult.build.errors.length || 1;
      }

      if (engineResult.lint != null) {
        lintErrorCount += engineResult.lint.errorCount;
        lintWarningCount += engineResult.lint.warningCount;
        if (!engineResult.lint.success) lintSuccess = false;
        if (engineResult.lint.formattedOutput !== "") {
          lintOutputs.push(engineResult.lint.formattedOutput);
        }
      }
    }

    return { allDiagnostics, totalErrorCount, totalWarningCount, lintErrorCount, lintWarningCount, lintSuccess, lintOutputs };
  }

  /**
   * 비패키지 타입체크 실행 (sd.config.ts에 없는 루트 파일들)
   */
  private _executeNonPackageTypecheck(fileCache: Map<string, string>): {
    diagnostics: ts.Diagnostic[];
    errorCount: number;
    warningCount: number;
  } {
    if (!this._includeNonPackage) {
      return { diagnostics: [], errorCount: 0, warningCount: 0 };
    }

    this._logger.debug("비패키지 타입체크 실행 중");
    const nonPkgResult = typecheckNonPackageFiles(this._cwd);
    const diagnostics = nonPkgResult.diagnostics.map((d) =>
      deserializeDiagnostic(d, fileCache),
    );
    return {
      diagnostics,
      errorCount: nonPkgResult.errorCount,
      warningCount: nonPkgResult.warningCount,
    };
  }

  /**
   * 타입체크 결과 집계 및 포맷 출력 생성
   */
  private _aggregateTypecheckResults(
    packageResults: {
      allDiagnostics: ts.Diagnostic[];
      totalErrorCount: number;
      totalWarningCount: number;
      lintErrorCount: number;
      lintWarningCount: number;
      lintSuccess: boolean;
      lintOutputs: string[];
    },
    nonPkgResults: {
      diagnostics: ts.Diagnostic[];
      errorCount: number;
      warningCount: number;
    },
    phaseLabel: string,
  ): TypecheckResult {
    const allDiagnostics = [...packageResults.allDiagnostics, ...nonPkgResults.diagnostics];
    const totalErrorCount = packageResults.totalErrorCount + nonPkgResults.errorCount;
    const totalWarningCount = packageResults.totalWarningCount + nonPkgResults.warningCount;

    // 요약 로그
    const resultMeta: Record<string, number> = {
      errorCount: totalErrorCount,
      warningCount: totalWarningCount,
    };
    if (this._options.lint === true) {
      resultMeta["lintErrorCount"] = packageResults.lintErrorCount;
      resultMeta["lintWarningCount"] = packageResults.lintWarningCount;
    }
    if (totalErrorCount > 0) {
      this._logger.error(`${phaseLabel} 에러 발생`, resultMeta);
    } else {
      this._logger.info(`${phaseLabel} 완료`, resultMeta);
    }

    // 진단 출력 포매팅
    const formattedOutput = formatDiagnosticsOutput(allDiagnostics, this._cwd);

    // lint가 요청된 경우 lint 결과 생성
    const lintResult =
      this._options.lint === true
        ? {
            success: packageResults.lintSuccess,
            errorCount: packageResults.lintErrorCount,
            warningCount: packageResults.lintWarningCount,
            formattedOutput: packageResults.lintOutputs.join("\n"),
          }
        : undefined;

    return {
      success: totalErrorCount === 0,
      errorCount: totalErrorCount,
      warningCount: totalWarningCount,
      formattedOutput,
      lint: lintResult,
      scriptsPackagePaths:
        this._scriptsPackagePaths.length > 0 ? this._scriptsPackagePaths : undefined,
    };
  }

  /**
   * Orchestrator 종료 (현재 정리할 리소스 없음)
   */
  async shutdown(): Promise<void> {
    // 타입체크는 일회성 작업이므로 종료 시 정리할 리소스가 없음
    // 엔진은 각 작업 내에서 stop()으로 정리됨
    await Promise.resolve();
  }
}

//#endregion

//#region Convenience Function

/**
 * TypecheckOrchestrator의 전체 생명주기를 래핑한 편의 함수.
 * initialize() → start() → shutdown() 순서로 호출한다.
 *
 * @param options - 타입체크 실행 옵션
 * @returns 타입체크 결과
 */
export async function executeTypecheck(options: TypecheckOptions): Promise<TypecheckResult> {
  const orchestrator = new TypecheckOrchestrator(options);
  await orchestrator.initialize();
  try {
    return await orchestrator.start();
  } finally {
    await orchestrator.shutdown();
  }
}

//#endregion
