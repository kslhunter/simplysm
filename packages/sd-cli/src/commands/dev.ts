import {
  DevWatchOrchestrator,
  type DevWatchOrchestratorOptions,
} from "../orchestrators/DevWatchOrchestrator";

/**
 * Run Server packages in development mode.
 *
 * - Load `sd.config.ts` to check build target info per package (required)
 * - `server` target: Server Build Worker + Server Runtime Worker
 * - `client` target: recognized but skipped (BuildEngine not yet implemented)
 * - Library packages excluded from dev mode
 * - Terminate with SIGINT/SIGTERM signals
 *
 * @param options - dev execution options (targets, options)
 * @returns resolves on termination signal
 */
export async function runDev(options: Omit<DevWatchOrchestratorOptions, "mode">): Promise<void> {
  const orchestrator = new DevWatchOrchestrator({ mode: "dev", ...options });

  try {
    await orchestrator.initialize();
    await orchestrator.start();
    await orchestrator.awaitTermination();
  } finally {
    await orchestrator.shutdown();
  }
}
