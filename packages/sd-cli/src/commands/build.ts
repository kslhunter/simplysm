import {
  BuildOrchestrator,
  type BuildOrchestratorOptions,
} from "../orchestrators/BuildOrchestrator";

/**
 * BuildOrchestrator를 통해 프로덕션 빌드를 실행한다.
 *
 * @param options - 빌드 실행 옵션
 * @returns 완료 시 resolve
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
