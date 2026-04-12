import type { SdConfig } from "../sd-config.types";
import { loadSdConfig } from "./sd-config";
import { validateTargets } from "./package-utils";

/**
 * Orchestrator 공통 초기화: config 로드 + 타겟 검증.
 * BuildOrchestrator.initialize()에서 호출한다.
 */
export async function loadAndValidateConfig(params: {
  cwd: string;
  dev: boolean;
  options: string[];
  targets: string[];
}): Promise<SdConfig> {
  const config = await loadSdConfig({
    cwd: params.cwd,
    dev: params.dev,
    opt: params.options,
  });
  validateTargets(params.targets, config.packages);
  return config;
}
