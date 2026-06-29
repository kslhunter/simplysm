import path from "path";
import type { ConsolaInstance } from "consola";
import type { SdPublishConfig } from "../../sd-config.types";
import { publishNpm } from "./npm-publisher";
import { publishToStorage } from "./storage-publisher";
import { publishToLocal } from "./local-publisher";
import { computePublishLevels } from "./version-upgrade";
import { replaceEnvVariables } from "./env-utils";
import { wait, err as errNs } from "@simplysm/core-common";

export interface DeploymentPackage {
  name: string;
  path: string;
  config: SdPublishConfig;
}

/**
 * 개별 패키지 배포
 */
async function publishPackage(
  pkgPath: string,
  publishConfig: SdPublishConfig,
  version: string,
  projectPath: string,
  logger: ConsolaInstance,
  dryRun: boolean,
): Promise<void> {
  const pkgName = path.basename(pkgPath);

  if (publishConfig.type === "npm") {
    await publishNpm(pkgPath, pkgName, version, logger, dryRun);
  } else if (publishConfig.type === "local-directory") {
    const targetPath = replaceEnvVariables(publishConfig.path, version, projectPath);
    await publishToLocal(pkgPath, pkgName, targetPath, logger, dryRun);
  } else {
    await publishToStorage(pkgPath, pkgName, publishConfig, logger, dryRun);
  }
}

/**
 * 의존성 레벨별 순차 배포 (레벨 내 병렬, 재시도 포함)
 */
export async function runDeployment(
  publishPackages: DeploymentPackage[],
  version: string,
  projectPath: string,
  logger: ConsolaInstance,
  dryRun: boolean,
): Promise<void> {
  const levels = await computePublishLevels(publishPackages);
  const publishedPackages: string[] = [];
  let publishFailed = false;

  // 레벨별 순차 실행
  for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
    if (publishFailed) break;

    const levelPkgs = levels[levelIdx];
    logger.start(`Level ${levelIdx + 1}/${levels.length}`);

    // 레벨 내 병렬 실행 (Promise.allSettled)
    const publishPromises = levelPkgs.map(async (pkg) => {
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await publishPackage(pkg.path, pkg.config, version, projectPath, logger, dryRun);
          if (dryRun) {
            logger.info(`[DRY-RUN] ${pkg.name}`);
          } else {
            logger.debug(pkg.name);
          }
          publishedPackages.push(pkg.name);
          return { status: "success" as const, name: pkg.name };
        } catch (err) {
          if (attempt < maxRetries) {
            const delay = attempt * 5_000;
            if (dryRun) {
              logger.info(`[DRY-RUN] ${pkg.name} (retry ${attempt + 1}/${maxRetries})`);
            } else {
              logger.debug(`${pkg.name} (retry ${attempt + 1}/${maxRetries})`);
            }
            await wait.time(delay);
          } else {
            throw err;
          }
        }
      }
      // TypeScript 타입 체커를 위한 폴백 (실제로 도달 불가)
      return { status: "error" as const, name: pkg.name, error: new Error("알 수 없는 에러") };
    });

    const results = await Promise.allSettled(publishPromises);

    // 레벨 내 실패 확인
    const rejectedResults = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    if (rejectedResults.length > 0) {
      publishFailed = true;
      for (const r of rejectedResults) {
        logger.error(errNs.message(r.reason));
        logger.debug(`배포 실패 스택:\n${errNs.stack(r.reason)}`);
      }
      logger.error(`Level ${levelIdx + 1}/${levels.length}`);
    } else {
      logger.success(`Level ${levelIdx + 1}/${levels.length}`);
    }
  }

  // 실패한 패키지 확인
  const allPkgNames = publishPackages.map((p) => p.name);
  const publishedSet = new Set(publishedPackages);
  const failedPkgNames = allPkgNames.filter((n) => !publishedSet.has(n));

  if (failedPkgNames.length > 0) {
    if (publishedPackages.length > 0) {
      logger.error(
        "배포 중 에러 발생.\n" +
          "이미 배포된 패키지:\n" +
          publishedPackages.map((n) => `  - ${n}`).join("\n") +
          "\n\n수동 복구가 필요할 수 있습니다.\n" +
          "npm 패키지는 72시간 이내에 `npm unpublish <pkg>@<version>`으로 삭제할 수 있습니다.",
      );
    }

    for (const name of failedPkgNames) {
      logger.error(`[${name}] 배포 실패`);
    }
    process.exitCode = 1;
  }
}
