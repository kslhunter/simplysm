import type { SdConfig } from "../sd-config.types";
import { loadSdConfig } from "./sd-config";
import { validateTargets } from "./package-utils";

/**
 * Orchestrator 공통 초기화: config 로드 + 타겟 검증.
 * BuildOrchestrator.initialize()와 DevWatchOrchestrator.initialize()에서 호출한다.
 *
 * @param params.packagesForValidation 검증 대상 패키지를 오버라이드. DevWatchOrchestrator는
 *   tests/ 패키지를 merge한 결과에 대해 검증해야 하므로 이 파라미터를 사용한다.
 */
export async function loadAndValidateConfig(params: {
  cwd: string;
  dev: boolean;
  options: string[];
  targets: string[];
  packagesForValidation?: Record<string, unknown>;
}): Promise<SdConfig> {
  const config = await loadSdConfig({
    cwd: params.cwd,
    dev: params.dev,
    options: params.options,
  });
  validateTargets(params.targets, params.packagesForValidation ?? config.packages);
  return config;
}
