import { createWorker } from "@simplysm/core-node";
import { executeLint, type LintOptions, type LintResult } from "../lint/lint-core";

//#region Worker

/**
 * lint 워커.
 * check 명령어와 BuildOrchestrator에서 별도 스레드로 lint를 실행하는 워커
 */
async function lint(options: LintOptions): Promise<LintResult> {
  return executeLint(options);
}

export default createWorker({ lint });

//#endregion
