import { Worker } from "@simplysm/core-node";
import type { LintOptions, LintResult } from "../commands/lint";
import type * as LintWorkerModule from "../workers/lint.worker";

/**
 * lint Worker를 생성하고 실행한 뒤 terminate하는 공통 유틸.
 * BuildOrchestrator.start()와 check.ts에서 호출한다.
 */
export async function runLintInWorker(options: LintOptions): Promise<LintResult> {
  const workerPath = import.meta.resolve("../workers/lint.worker");
  const worker = Worker.create<typeof LintWorkerModule>(workerPath);
  try {
    return await worker.lint(options);
  } finally {
    await worker.terminate();
  }
}
