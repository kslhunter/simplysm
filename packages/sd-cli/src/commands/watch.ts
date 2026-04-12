import {
  WatchOrchestrator,
  type WatchOrchestratorOptions,
} from "../orchestrators/WatchOrchestrator";

/**
 * WatchOrchestrator를 통해 모든 패키지를 watch 모드로 빌드한다.
 *
 * - `sd.config.ts`를 로드하여 패키지별 빌드 대상 정보를 확인한다
 * - `node`/`browser`/`neutral` target: esbuild watch 모드 빌드 + .d.ts 생성
 * - `scripts` target (watch 설정 있을 때): 파일 변경 시 hook 실행
 * - 파일 변경 시 자동 재빌드
 * - SIGINT/SIGTERM 시그널로 종료
 *
 * @param options - watch 실행 옵션 (targets, options)
 * @returns 종료 시그널 수신 시 resolve
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
