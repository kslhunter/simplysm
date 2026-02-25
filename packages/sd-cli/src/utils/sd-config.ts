import path from "path";
import { createJiti } from "jiti";
import { SdError } from "@simplysm/core-common";
import { fsExists } from "@simplysm/core-node";
import type { SdConfig, SdConfigParams } from "../sd-config.types";

/**
 * Load sd.config.ts
 * @returns SdConfig object
 * @throws if sd.config.ts is missing or format is incorrect
 */
export async function loadSdConfig(params: SdConfigParams): Promise<SdConfig> {
  const sdConfigPath = path.resolve(params.cwd, "sd.config.ts");

  if (!(await fsExists(sdConfigPath))) {
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
  return config as SdConfig;
}
