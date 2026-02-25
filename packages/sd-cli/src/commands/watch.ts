// packages/cli/src/commands/watch.ts
import {
  WatchOrchestrator,
  type WatchOrchestratorOptions,
} from "../orchestrators/WatchOrchestrator";

/**
 * Build library packages in watch mode.
 *
 * - Load `sd.config.ts` to check build target info per package (required)
 * - `node`/`browser`/`neutral` target: build in esbuild watch mode + generate .d.ts
 * - Auto rebuild on file changes
 * - Terminate with SIGINT/SIGTERM signals
 *
 * @param options - watch execution options
 * @returns resolves on termination signal
 */
export async function runWatch(options: WatchOrchestratorOptions): Promise<void> {
  const orchestrator = new WatchOrchestrator(options);

  try {
    await orchestrator.initialize();
    await orchestrator.start();
    await orchestrator.awaitTermination();
  } finally {
    await orchestrator.shutdown();
  }
}
