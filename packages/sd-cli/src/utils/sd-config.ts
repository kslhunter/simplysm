import path from "path";
import { createJiti } from "jiti";
import { SdError } from "@simplysm/core-common";
import { fsExists } from "@simplysm/core-node";
import type { SdConfig } from "../sd-config.types";

/**
 * sd.config.ts 로드
 * @returns SdConfig 객체
 * @throws sd.config.ts가 없거나 형식이 잘못된 경우
 */
export async function loadSdConfig(params: { cwd: string; dev: boolean; opt: string[] }): Promise<SdConfig> {
  const sdConfigPath = path.resolve(params.cwd, "sd.config.ts");

  if (!(await fsExists(sdConfigPath))) {
    throw new SdError(`sd.config.ts 파일을 찾을 수 없습니다: ${sdConfigPath}`);
  }

  const jiti = createJiti(import.meta.url);
  const sdConfigModule = await jiti.import(sdConfigPath);

  if (
    sdConfigModule == null ||
    typeof sdConfigModule !== "object" ||
    !("default" in sdConfigModule) ||
    typeof sdConfigModule.default !== "function"
  ) {
    throw new SdError(`sd.config.ts는 함수를 default export해야 합니다: ${sdConfigPath}`);
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
    throw new SdError(`sd.config.ts의 반환값이 올바른 형식이 아닙니다: ${sdConfigPath}`);
  }
  return config as SdConfig;
}
