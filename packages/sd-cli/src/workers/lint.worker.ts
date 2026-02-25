import { createWorker } from "@simplysm/core-node";
import { executeLint, type LintOptions, type LintResult } from "../commands/lint";

//#region Worker

/**
 * Lint worker.
 * Worker to run lint in separate thread from check command and BuildOrchestrator
 */
async function lint(options: LintOptions): Promise<LintResult> {
  return executeLint(options);
}

export default createWorker({ lint });

//#endregion
