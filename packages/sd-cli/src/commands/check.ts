import { err as errNs, createLogger } from "@simplysm/core-common";
import { executeTypecheck, type TypecheckResult } from "../orchestrators/TypecheckOrchestrator";
import { executeLint, type LintResult } from "../lint/lint-core";
import { validateTargets, discoverWorkspacePackages } from "../utils/package-utils";
import { runLintInWorker } from "../lint/lint-utils";

//#region Types

export type CheckType = "typecheck" | "lint";

export interface CheckOptions {
  targets: string[];
  types: CheckType[];
  fix: boolean;
}

interface CheckResult {
  name: string;
  success: boolean;
  errorCount: number;
  warningCount: number;
  formattedOutput: string;
}

//#endregion

//#region Main

export async function runCheck(options: CheckOptions): Promise<void> {
  const { targets, types } = options;
  const logger = createLogger("sd:cli:check");

  logger.debug("체크 시작", { targets, types });

  const workspacePackages = discoverWorkspacePackages(process.cwd());
  validateTargets(targets, Object.fromEntries(workspacePackages));

  // 대상을 워크스페이스 경로로 변환 (빈 배열 = 전체)
  const normalizedTargets = targets.length > 0
    ? targets.map((t) => workspacePackages.get(t)!)
    : [];

  logger.debug("워크스페이스 패키지 검증 완료", { normalizedTargets });

  const needsTypecheck = types.includes("typecheck");
  const needsLint = types.includes("lint");
  logger.debug("체크 구성", { needsTypecheck, needsLint });

  logger.start(`체크 실행 중... (${types.join(", ")})`);

  const tasks: Array<Promise<CheckResult | CheckResult[]>> = [];

  // 타입체크가 필요하면 executeTypecheck으로 통합 호출 (lint 포함 가능)
  if (needsTypecheck) {
    tasks.push(
      executeTypecheck({
        targets: normalizedTargets,
        options: [],
        lint: needsLint,
      }).then(async (r: TypecheckResult): Promise<CheckResult[]> => {
        const results: CheckResult[] = [];

        results.push({
          name: "TYPECHECK",
          success: r.success,
          errorCount: r.errorCount,
          warningCount: r.warningCount,
          formattedOutput: r.formattedOutput,
        });

        // Lint 결과: 엔진 lint 결과가 없더라도 scripts 패키지 lint는 별도 실행한다.
        if (needsLint) {
          let lintResult: LintResult = r.lint ?? {
            success: true,
            errorCount: 0,
            warningCount: 0,
            formattedOutput: "",
          };

          // scripts 패키지가 있으면 별도 runLintInWorker 호출 후 결과 병합
          const scriptsPackagePaths = r.scriptsPackagePaths ?? [];
          const hasScriptsPackages = scriptsPackagePaths.length > 0;
          if (hasScriptsPackages) {
            const scriptsLintResult: LintResult = await runLintInWorker({
              targets: scriptsPackagePaths,
              fix: options.fix,
              timing: false,
            });
            lintResult = {
              success: lintResult.success && scriptsLintResult.success,
              errorCount: lintResult.errorCount + scriptsLintResult.errorCount,
              warningCount: lintResult.warningCount + scriptsLintResult.warningCount,
              formattedOutput: [lintResult.formattedOutput, scriptsLintResult.formattedOutput]
                .filter((s) => s !== "")
                .join("\n"),
            };
          }

          if (r.lint != null || hasScriptsPackages) {
            results.push({
              name: "LINT",
              success: lintResult.success,
              errorCount: lintResult.errorCount,
              warningCount: lintResult.warningCount,
              formattedOutput: lintResult.formattedOutput,
            });
          }
        }

        return results;
      }),
    );
  } else if (needsLint) {
    // lint-only: executeLint() 직접 호출 (executeTypecheck 경로 우회)
    tasks.push(
      executeLint({
        targets: normalizedTargets,
        fix: options.fix,
        timing: false,
      }).then((r: LintResult): CheckResult => ({
        name: "LINT",
        success: r.success,
        errorCount: r.errorCount,
        warningCount: r.warningCount,
        formattedOutput: r.formattedOutput,
      })),
    );
  }

  const results = await Promise.allSettled(tasks);
  logger.success("체크 실행 완료");

  // 결과 수집 (executeTypecheck 배열 평탄화)
  const checkResults: CheckResult[] = results.flatMap((r) => {
    if (r.status === "fulfilled") {
      const value = r.value;
      return Array.isArray(value) ? value : [value];
    }
    logger.debug(`체크 작업 예외 스택:\n${errNs.stack(r.reason)}`);
    return [{
      name: "UNKNOWN",
      success: false,
      errorCount: 1,
      warningCount: 0,
      formattedOutput: errNs.message(r.reason),
    }];
  });

  // 섹션별 출력 (순서 보장: typecheck → lint)
  const order = ["TYPECHECK", "LINT"];
  checkResults.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));

  for (const result of checkResults) {
    const header = `${result.name}: ${result.errorCount}개 에러, ${result.warningCount}개 경고`;
    if (result.success) {
      logger.success(header);
    } else {
      logger.error(header);
      if (result.formattedOutput !== "") {
        logger.error(result.formattedOutput);
      }
    }
  }

  // 요약
  const failed = checkResults.filter((r) => !r.success);
  const totalErrors = checkResults.reduce((sum, r) => sum + r.errorCount, 0);
  const totalWarnings = checkResults.reduce((sum, r) => sum + r.warningCount, 0);

  if (failed.length === 0) {
    logger.success(`전체 통과 — 합계: ${totalErrors}개 에러, ${totalWarnings}개 경고`);
  } else {
    const failedNames = failed.map((r) => r.name.toLowerCase()).join(", ");
    logger.error(
      `${failed.length}/${checkResults.length}개 실패 (${failedNames}) — 합계: ${totalErrors}개 에러, ${totalWarnings}개 경고`,
    );
    process.exitCode = 1;
  }
}

//#endregion
