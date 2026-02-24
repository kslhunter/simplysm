import { DevOrchestrator, type DevOrchestratorOptions } from "../orchestrators/DevOrchestrator";

/**
 * Client 및 Server 패키지를 개발 모드로 실행한다.
 *
 * - `sd.config.ts`를 로드하여 패키지별 빌드 타겟 정보 확인 (필수)
 * - `client` 타겟: Vite dev server 시작
 * - `server` 타겟: Server Build Worker + Server Runtime Worker
 * - Server-Client 프록시 연결 지원
 * - Capacitor 초기화 지원
 * - SIGINT/SIGTERM 시그널로 종료
 *
 * @param options - dev 실행 옵션
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
