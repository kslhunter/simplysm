// packages/cli/src/commands/watch.ts
import {
  WatchOrchestrator,
  type WatchOrchestratorOptions,
} from "../orchestrators/WatchOrchestrator";

/**
 * Watch 명령 옵션 (하위 호환성)
 */
export interface WatchOptions {
  targets: string[];
  options: string[];
}

/**
 * Library 패키지를 watch 모드로 빌드한다.
 *
 * - `sd.config.ts`를 로드하여 패키지별 빌드 타겟 정보 확인 (필수)
 * - `node`/`browser`/`neutral` 타겟: esbuild watch 모드로 빌드 + .d.ts 생성
 * - 파일 변경 시 자동 리빌드
 * - SIGINT/SIGTERM 시그널로 종료
 *
 * @param options - watch 실행 옵션
 * @returns 종료 시그널 수신 시 resolve
 */
export async function runWatch(options: WatchOptions): Promise<void> {
  const orchestratorOptions: WatchOrchestratorOptions = {
    targets: options.targets,
    options: options.options,
  };

  const orchestrator = new WatchOrchestrator(orchestratorOptions);

  try {
    await orchestrator.initialize();
    await orchestrator.start();
    await orchestrator.awaitTermination();
  } finally {
    await orchestrator.shutdown();
  }
}
