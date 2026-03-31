import { createJiti } from "jiti";
import { SdError } from "@simplysm/core-common";
import { fsx, pathx } from "@simplysm/core-node";
import { consola } from "consola";
import type { SdConfig, SdConfigParams } from "../sd-config.types";

const logger = consola.withTag("sd:cli:sd-config");

/**
 * Load sd.config.ts
 * @returns SdConfig object
 * @throws if sd.config.ts is missing or format is incorrect
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
