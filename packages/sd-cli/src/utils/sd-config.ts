import { createJiti } from "jiti";
import { SdError } from "@simplysm/core-common";
import { fsx, pathx } from "@simplysm/core-node";
import { createLazyLogger } from "../runtime/lazy-logger";
import type { SdConfig, SdConfigParams } from "../sd-config.types";

const logger = createLazyLogger("sd:cli:sd-config");

/**
 * sd.config.ts를 로드한다.
 * @returns SdConfig 객체
 * @throws sd.config.ts가 없거나 형식이 잘못된 경우
 */
export async function loadSdConfig(params: SdConfigParams): Promise<SdConfig> {
  const sdConfigPath = pathx.posixResolve(params.cwd, "sd.config.ts");
  logger.debug(`sd.config.ts 로드 중: ${sdConfigPath}`);

  if (!(await fsx.exists(sdConfigPath))) {
    throw new SdError(`sd.config.ts file not found: ${sdConfigPath}`);
  }

  const jiti = createJiti(import.meta.url);
  const sdConfigModule = await jiti.import(sdConfigPath);

  if (
    sdConfigModule == null ||
    typeof sdConfigModule !== "object" ||
    !("default" in sdConfigModule) ||
    typeof sdConfigModule.default !== "function"
  ) {
    throw new SdError(`sd.config.ts must export a function as default: ${sdConfigPath}`);
  }

  const config = await sdConfigModule.default(params);

  if (
    config == null ||
    typeof config !== "object" ||
    !("packages" in config) ||
    config.packages == null ||
    typeof config.packages !== "object" ||
    Array.isArray(config.packages)
  ) {
    throw new SdError(`sd.config.ts return value is not in the correct format: ${sdConfigPath}`);
  }
  logger.debug(`sd.config.ts 로드 완료 (${Object.keys(config.packages).length}개 패키지)`);
  return config as SdConfig;
}
