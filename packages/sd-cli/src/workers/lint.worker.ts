import { createWorker } from "@simplysm/core-node";
import { executeLint, type LintOptions, type LintResult } from "../commands/lint";

//#region Worker

/**
 * Lint worker.
 * check 명령과 BuildOrchestrator에서 lint를 별도 스레드로 실행하기 위한 워커.
 */
async function lint(options: LintOptions): Promise<LintResult> {
  return await executeLint(options);
}

export default createWorker({ lint });

//#endregion
