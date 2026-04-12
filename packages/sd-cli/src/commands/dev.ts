import {
  DevOrchestrator,
  type DevOrchestratorOptions,
} from "../orchestrators/DevOrchestrator";

/**
 * DevOrchestrator를 통해 서버 패키지를 개발 모드로 실행한다.
 *
 * @param options - 개발 모드 실행 옵션 (targets, options)
 * @returns 종료 시그널 수신 시 resolve
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
