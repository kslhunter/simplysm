import { executeLint, type LintOptions } from "../lint/lint-core";

//#region Main

/**
 * ESLint를 실행한다.
 *
 * executeLint()를 호출하고, 결과를 stdout에 출력하며, exitCode를 설정하는 래퍼.
 *
 * @param options - 린트 실행 옵션
 * @returns 완료 시 resolve. 에러가 발견되면 `process.exitCode`를 1로 설정하고 resolve (throw하지 않음)
 */
export async function runLint(options: LintOptions): Promise<void> {
  const result = await executeLint(options);
  if (result.formattedOutput) {
    process.stdout.write(result.formattedOutput);
  }
  if (!result.success) {
    process.exitCode = 1;
  }
}

//#endregion
