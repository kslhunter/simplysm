import { cpx } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import { executeTypecheck, type TypecheckResult } from "./typecheck";
import { executeLint, type LintResult } from "./lint";
import { consola } from "consola";
import { validateTargets, discoverWorkspacePackages } from "../utils/package-utils";
import { runLintInWorker } from "../utils/lint-utils";

//#region Types

export type CheckType = "typecheck" | "lint" | "test";

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

//#region Utilities

async function spawnVitest(targets: string[]): Promise<CheckResult> {
  const logger = consola.withTag("sd:cli:test");
  try {
    const args = ["vitest", ...targets, "--run"];
    logger.debug("vitest 실행", { args });
    logger.start("테스트 실행 중...");
    const result = await cpx.spawn("pnpm", args, {
      cwd: process.cwd(),
      reject: false,
      stdio: "inherit",
    });
    const code = result.exitCode;

    logger.success("테스트 실행 완료");
    logger.info("테스트 완료", { errorCount: code === 0 ? 0 : 1, warningCount: 0 });

    return {
      name: "TEST",
      success: code === 0,
      errorCount: code === 0 ? 0 : 1,
      warningCount: 0,
      formattedOutput: "",
    };
  } catch (err) {
    logger.fail("테스트 실행 실패");
    return {
      name: "TEST",
      success: false,
      errorCount: 1,
      warningCount: 0,
      formattedOutput: errNs.message(err),
    };
  }
}

function formatSection(result: CheckResult): string {
  const header = `\n${"=".repeat(6)} ${result.name} ${"=".repeat(6)}`;
  const icon = result.success ? "✔" : "✖";

  let summary: string;
  if (result.name === "TEST") {
    const testCount = result.errorCount > 0 ? `${result.errorCount}개 실패` : "";
    summary = result.success ? `${icon} 통과` : `${icon} ${testCount}`;
  } else {
    summary = `${icon} ${result.errorCount}개 에러, ${result.warningCount}개 경고`;
  }

  const detail = !result.success && result.formattedOutput ? `\n${result.formattedOutput}` : "";

  return `${header}\n${summary}${detail}`;
}

//#endregion

//#region Main

export async function runCheck(options: CheckOptions): Promise<void> {
  const { targets, types } = options;
  const logger = consola.withTag("sd:cli:check");

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
  const needsTest = types.includes("test");
  logger.debug("체크 구성", { needsTypecheck, needsLint, needsTest });

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

        // Lint 결과: lint가 포함된 경우에만
        if (needsLint && r.lint != null) {
          let lintResult = r.lint;

          // scripts 패키지가 있으면 별도 runLintInWorker 호출 후 결과 병합
          if (r.scriptsPackagePaths != null && r.scriptsPackagePaths.length > 0) {
            const scriptsLintResult: LintResult = await runLintInWorker({
              targets: r.scriptsPackagePaths,
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

          results.push({
            name: "LINT",
            success: lintResult.success,
            errorCount: lintResult.errorCount,
            warningCount: lintResult.warningCount,
            formattedOutput: lintResult.formattedOutput,
          });
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

  // 테스트 (서브프로세스)
  if (needsTest) {
    tasks.push(spawnVitest(normalizedTargets));
  }

  const results = await Promise.allSettled(tasks);
  logger.success("체크 실행 완료");

  // 결과 수집 (executeTypecheck 배열 평탄화)
  const checkResults: CheckResult[] = results.flatMap((r) => {
    if (r.status === "fulfilled") {
      const value = r.value;
      return Array.isArray(value) ? value : [value];
    }
    return [{
      name: "UNKNOWN",
      success: false,
      errorCount: 1,
      warningCount: 0,
      formattedOutput: errNs.message(r.reason),
    }];
  });

  // 섹션별 출력 (순서 보장: typecheck → lint → test)
  const order = ["TYPECHECK", "LINT", "TEST"];
  checkResults.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));

  for (const result of checkResults) {
    process.stdout.write(formatSection(result));
  }

  // 요약
  const failed = checkResults.filter((r) => !r.success);
  const totalErrors = checkResults.reduce((sum, r) => sum + r.errorCount, 0);
  const totalWarnings = checkResults.reduce((sum, r) => sum + r.warningCount, 0);

  process.stdout.write(`\n\n${"=".repeat(6)} 요약 ${"=".repeat(6)}\n`);

  if (failed.length === 0) {
    process.stdout.write(`✔ 전체 통과\n`);
  } else {
    const failedNames = failed.map((r) => r.name.toLowerCase()).join(", ");
    process.stdout.write(`✖ ${failed.length}/${checkResults.length}개 실패 (${failedNames})\n`);
  }
  process.stdout.write(`합계: ${totalErrors}개 에러, ${totalWarnings}개 경고\n`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

//#endregion
