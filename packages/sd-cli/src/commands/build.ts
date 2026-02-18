import {
  BuildOrchestrator,
  type BuildOrchestratorOptions,
} from "../orchestrators/BuildOrchestrator";

/**
 * Build 명령 옵션 (하위 호환성)
 */
export interface BuildOptions {
  /** 빌드할 패키지 필터 (빈 배열이면 모든 패키지) */
  targets: string[];
  /** sd.config.ts에 전달할 추가 옵션 */
  options: string[];
}

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
export async function runBuild(options: BuildOptions): Promise<void> {
  const orchestratorOptions: BuildOrchestratorOptions = {
    targets: options.targets,
    options: options.options,
  };

  const orchestrator = new BuildOrchestrator(orchestratorOptions);

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
