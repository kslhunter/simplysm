import { DevOrchestrator, type DevOrchestratorOptions } from "../orchestrators/DevOrchestrator";

/**
 * Run Client and Server packages in development mode.
 *
 * - Load `sd.config.ts` to check build target info per package (required)
 * - `client` target: Start Vite dev server
 * - `server` target: Server Build Worker + Server Runtime Worker
 * - Support Server-Client proxy connections
 * - Support Capacitor initialization
 * - Terminate with SIGINT/SIGTERM signals
 *
 * @param options - dev execution options
 * @returns resolves on termination signal
 */
export async function runDev(options: DevOrchestratorOptions): Promise<void> {
  const orchestrator = new DevOrchestrator(options);

  try {
    await orchestrator.initialize();
    await orchestrator.start();
    await orchestrator.awaitTermination();
  } finally {
    await orchestrator.shutdown();
  }
}
