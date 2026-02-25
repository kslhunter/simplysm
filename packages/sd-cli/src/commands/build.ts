import {
  BuildOrchestrator,
  type BuildOrchestratorOptions,
} from "../orchestrators/BuildOrchestrator";

/**
 * Run production build.
 *
 * - Load `sd.config.ts` to check build target info per package (required)
 * - Run lint
 * - Clean dist folder (clean build)
 * - `node`/`browser`/`neutral` target: esbuild JS build + dts generation (with type check)
 * - `client` target: Vite production build + typecheck (dts not needed)
 * - Set `process.exitCode = 1` if any step fails
 *
 * @param options - build execution options
 * @returns resolves on completion
 */
export async function runBuild(options: BuildOrchestratorOptions): Promise<void> {
  const orchestrator = new BuildOrchestrator(options);

  try {
    await orchestrator.initialize();
    const hasError = await orchestrator.start();
    if (hasError) {
      process.exitCode = 1;
    }
  } catch {
    process.exitCode = 1;
  } finally {
    await orchestrator.shutdown();
  }
}
