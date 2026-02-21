import { createWorker } from "@simplysm/core-node";
import { runLint, type LintOptions } from "../commands/lint";

//#region Worker

/**
 * Lint worker.
 * BuildOrchestrator에서 lint를 별도 스레드로 실행하기 위한 워커.
 */
async function lint(options: LintOptions): Promise<boolean> {
  await runLint(options);
  return process.exitCode === 1;
}

export default createWorker({ lint });

//#endregion
