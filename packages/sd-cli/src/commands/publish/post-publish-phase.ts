import type { ConsolaInstance } from "consola";
import type { SdPostPublishScriptConfig } from "../../sd-config.types";
import { cpx } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import { replaceEnvVariables } from "./env-utils";

/**
 * postPublish 스크립트를 순차 실행한다.
 * 개별 스크립트 실패 시 경고만 출력하고 계속 진행한다.
 */
export async function runPostPublish(
  scripts: SdPostPublishScriptConfig[],
  version: string,
  projectPath: string,
  logger: ConsolaInstance,
  dryRun: boolean,
): Promise<void> {
  if (scripts.length === 0) return;

  if (dryRun) {
    logger.info("[DRY-RUN] postPublish 스크립트 시뮬레이션 중...");
  } else {
    logger.debug("postPublish 스크립트 실행 중...");
  }

  for (const script of scripts) {
    try {
      const cmd = replaceEnvVariables(script.cmd, version, projectPath);
      const args = script.args.map((arg) => replaceEnvVariables(arg, version, projectPath));

      if (dryRun) {
        logger.info(`[DRY-RUN] 실행 예정: ${cmd} ${args.join(" ")}`);
      } else {
        logger.debug(`실행 중: ${cmd} ${args.join(" ")}`);
        await cpx.spawn(cmd, args, { cwd: projectPath });
      }
    } catch (err) {
      // postPublish 실패 시 경고만 출력 (배포 롤백 불가)
      logger.warn(
        `postPublish 스크립트 실패 (계속 진행): ${errNs.message(err)}`,
      );
      logger.debug(`postPublish 스크립트 실패 스택:\n${errNs.stack(err)}`);
    }
  }
}
