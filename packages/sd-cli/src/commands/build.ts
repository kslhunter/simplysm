import {
  BuildOrchestrator,
  type BuildOrchestratorOptions,
} from "../orchestrators/BuildOrchestrator";

/**
 * 프로덕션 빌드를 실행한다.
 *
 * - `sd.config.ts`를 로드하여 패키지별 빌드 타겟 정보 확인 (필수)
 * - lint 실행
 * - dist 폴더 정리 (clean build)
 * - `node`/`browser`/`neutral` 타겟: esbuild JS 빌드 + dts 생성 (타입체크 포함)
 * - `client` 타겟: Vite production 빌드 + typecheck (dts 불필요)
 * - 하나라도 실패하면 `process.exitCode = 1` 설정
 *
 * @param options - build 실행 옵션
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
