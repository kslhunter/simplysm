import {
  DevWatchOrchestrator,
  type DevWatchOrchestratorOptions,
} from "../orchestrators/DevWatchOrchestrator";

/**
 * Build all packages in watch mode.
 *
 * - Load `sd.config.ts` to check build target info per package (required)
 * - `node`/`browser`/`neutral` target: build in esbuild watch mode + generate .d.ts
 * - `server` target: build in esbuild watch mode (no runtime)
 * - `scripts` target with watch config: run hook on file changes
 * - Auto rebuild on file changes
 * - Terminate with SIGINT/SIGTERM signals
 *
 * @param options - watch execution options (targets, options)
 * @returns resolves on termination signal
 */
export async function runWatch(options: Omit<DevWatchOrchestratorOptions, "mode">): Promise<void> {
  const orchestrator = new DevWatchOrchestrator({ mode: "watch", ...options });

  try {
    await orchestrator.initialize();
    await orchestrator.start();
    await orchestrator.awaitTermination();
  } finally {
    await orchestrator.shutdown();
  }
}
