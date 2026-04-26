import semver from "semver";
import type { consola } from "consola";
import { shellSpawn } from "../../utils/shell-spawn";

/**
 * npm 레지스트리에 패키지를 배포한다
 */
export async function publishNpm(
  pkgPath: string,
  pkgName: string,
  version: string,
  logger: ReturnType<typeof consola.withTag>,
  dryRun: boolean,
): Promise<void> {
  const prereleaseInfo = semver.prerelease(version);
  const args = ["publish", "--access", "public", "--no-git-checks"];

  if (prereleaseInfo != null && typeof prereleaseInfo[0] === "string") {
    args.push("--tag", prereleaseInfo[0]);
  }

  if (dryRun) {
    args.push("--dry-run");
    logger.info(`[DRY-RUN] [${pkgName}] pnpm ${args.join(" ")}`);
  } else {
    logger.debug(`[${pkgName}] pnpm ${args.join(" ")}`);
  }

  await shellSpawn("pnpm", args, { cwd: pkgPath });
}
