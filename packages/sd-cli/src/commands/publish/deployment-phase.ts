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
  otp: string | undefined,
): Promise<void> {
  const pkgName = path.basename(pkgPath);

  if (publishConfig.type === "npm") {
    await publishNpm(pkgPath, pkgName, version, logger, dryRun, otp);
  } else if (publishConfig.type === "local-directory") {
    const targetPath = replaceEnvVariables(publishConfig.path, version, projectPath);
    await publishToLocal(pkgPath, pkgName, targetPath, logger, dryRun);
  } else {
    await publishToStorage(pkgPath, pkgName, publishConfig, logger, dryRun);
  }
}

/** 개별 패키지 배포 결과. `error` 가 있으면 실패다. */
interface PublishResult {
  name: string;
  error?: unknown;
}

/**
 * 패키지 하나를 배포한다 (백오프 재시도 포함)
 *
 * npm 배포는 재시도하지 않는다. 실패 사유가 대개 인증, 권한, 버전 충돌이라 다시 걸어도 같은 결과이고,
 * 재시도할 때마다 npm 인증 UI 가 다시 떠서 사용자를 붙잡는다. 네트워크가 관건인 나머지 배포만 재시도한다.
 */
async function publishWithRetry(
  pkg: DeploymentPackage,
  version: string,
  projectPath: string,
  logger: ConsolaInstance,
  dryRun: boolean,
  otp: string | undefined,
): Promise<PublishResult> {
  const maxRetries = pkg.config.type === "npm" ? 1 : 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await publishPackage(pkg.path, pkg.config, version, projectPath, logger, dryRun, otp);
      if (dryRun) {
        logger.info(`[DRY-RUN] ${pkg.name}`);
      } else {
        logger.debug(pkg.name);
      }
      return { name: pkg.name };
    } catch (err) {
      if (attempt === maxRetries) {
        return { name: pkg.name, error: err };
      }
      const delay = attempt * 5_000;
      logger.warn(`${pkg.name} 배포 실패. ${delay / 1000}초 후 재시도 (${attempt + 1}/${maxRetries})`);
      await wait.time(delay);
    }
  }
  // TypeScript 타입 체커를 위한 폴백 (실제로 도달 불가)
  return { name: pkg.name, error: new Error("알 수 없는 에러") };
}

/**
 * 한 레벨의 패키지를 배포한다.
 *
 * npm 배포는 순차로 돈다. npm 이 2FA 인증을 직접 처리하며 터미널을 점유하므로(브라우저 안내,
 * OTP 프롬프트), 동시에 띄우면 서로 입력을 뺏는다. 나머지 배포는 그대로 병렬로 돈다.
 */
async function publishLevel(
  pkgs: DeploymentPackage[],
  version: string,
  projectPath: string,
  logger: ConsolaInstance,
  dryRun: boolean,
  otp: string | undefined,
): Promise<PublishResult[]> {
  const run = async (pkg: DeploymentPackage): Promise<PublishResult> =>
    publishWithRetry(pkg, version, projectPath, logger, dryRun, otp);

  const [npmResults, otherResults] = await Promise.all([
    (async () => {
      const results: PublishResult[] = [];
      for (const pkg of pkgs.filter((p) => p.config.type === "npm")) {
        results.push(await run(pkg));
      }
      return results;
    })(),
    Promise.all(pkgs.filter((p) => p.config.type !== "npm").map(run)),
  ]);

  return [...npmResults, ...otherResults];
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
  otp: string | undefined,
): Promise<void> {
  const levels = await computePublishLevels(publishPackages);
  const publishedPackages: string[] = [];

  // 레벨별 순차 실행
  for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
    const levelPkgs = levels[levelIdx];
    logger.start(`Level ${levelIdx + 1}/${levels.length}`);

    const results = await publishLevel(levelPkgs, version, projectPath, logger, dryRun, otp);

    publishedPackages.push(...results.filter((r) => r.error == null).map((r) => r.name));
    const failures = results.filter((r) => r.error != null);

    if (failures.length > 0) {
      for (const f of failures) {
        logger.error(errNs.message(f.error));
        logger.debug(`배포 실패 스택:\n${errNs.stack(f.error)}`);
      }
      logger.error(`Level ${levelIdx + 1}/${levels.length}`);
      break;
    }

    logger.success(`Level ${levelIdx + 1}/${levels.length}`);
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
