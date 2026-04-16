import path from "path";
import { consola } from "consola";
import { cpx, fsx } from "@simplysm/core-node";
import "@simplysm/core-common";
import type { SdConfig, SdPublishConfig } from "../../sd-config.types";
import { loadSdConfig } from "../../utils/sd-config";
import { validateTargets } from "../../utils/package-utils";
import { runBuild } from "../build";
import { parseWorkspaceGlobs } from "../../deps/replace-deps/replace-deps-resolve";
import fs from "fs";
import { ensureSshAuth } from "./storage-publisher";
import { type PackageJson, upgradeVersion } from "./version-upgrade";
import { waitWithCountdown } from "./env-utils";
import { ensureCleanWorkingTree, commitTagAndPush } from "./git-phase";
import { runDeployment } from "./deployment-phase";
import { runPostPublish } from "./post-publish-phase";

//#region Types

/**
 * 배포 명령어 옵션
 */
export interface PublishOptions {
  /** 배포 대상 패키지 필터 (빈 배열이면 publish 설정이 있는 모든 패키지 배포) */
  targets: string[];
  /** 빌드 없이 배포 (위험) */
  noBuild: boolean;
  /** 실제 배포 없이 시뮬레이션 */
  dryRun: boolean;
  /** sd.config.ts에 전달할 추가 옵션 */
  options: string[];
}

//#endregion

//#region Main

/**
 * 배포 명령어를 실행한다.
 *
 * **배포 순서 (안전 우선):**
 * 1. 사전 검증 (npm 인증, Git 상태)
 * 2. 버전 업그레이드 (package.json + 템플릿)
 * 3. 빌드
 * 4. Git commit/tag/push (변경된 파일만 명시적으로 스테이징)
 * 5. 패키지 배포 (npm/로컬 디렉토리/스토리지)
 * 6. postPublish (실패해도 계속 진행)
 */
export async function runPublish(options: PublishOptions): Promise<void> {
  const { targets, noBuild, dryRun } = options;
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:publish");

  if (dryRun) {
    logger.info("[DRY-RUN] 시뮬레이션 모드 - 실제 배포 없음");
  }

  logger.debug("배포 시작", { targets, noBuild, dryRun });

  // sd.config.ts 로드
  let sdConfig: SdConfig;
  try {
    sdConfig = await loadSdConfig({ cwd, dev: false, opt: options.options });
    logger.debug("sd.config.ts 로드 완료");
  } catch (err) {
    logger.error(`sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
    return;
  }

  // 대상 유효성 검사
  validateTargets(targets, sdConfig.packages);

  // package.json 로드
  const projPkgPath = path.resolve(cwd, "package.json");
  const projPkg = await fsx.readJson<PackageJson>(projPkgPath);

  // pnpm-workspace.yaml에서 워크스페이스 패키지 경로 수집
  const workspaceYamlPath = path.resolve(cwd, "pnpm-workspace.yaml");
  const workspaceGlobs: string[] = [];
  if (await fsx.exists(workspaceYamlPath)) {
    const yamlContent = await fsx.read(workspaceYamlPath);
    workspaceGlobs.push(...parseWorkspaceGlobs(yamlContent));
  }

  const allPkgPaths = (
    await Promise.all(workspaceGlobs.map((item) => fsx.glob(path.resolve(cwd, item))))
  )
    .flat()
    .filter((item) => fs.existsSync(path.join(item, "package.json")));

  // publish 설정이 있는 패키지 필터링
  const publishPackages: Array<{
    name: string;
    path: string;
    config: SdPublishConfig;
  }> = [];

  for (const [name, config] of Object.entries(sdConfig.packages)) {
    if (config == null) continue;
    const pkgConfig = config;
    if (pkgConfig.publish == null) continue;

    // targets가 지정되면 해당 패키지만 포함
    if (targets.length > 0 && !targets.includes(name)) continue;

    const pkgPath = allPkgPaths.find((p) => path.basename(p) === name);
    if (pkgPath == null) {
      logger.warn(`패키지를 찾을 수 없음: ${name}`);
      continue;
    }

    publishPackages.push({
      name,
      path: pkgPath,
      config: pkgConfig.publish,
    });
  }

  if (publishPackages.length === 0) {
    logger.info("배포할 패키지가 없습니다.");
    return;
  }

  logger.debug(
    "배포 대상 패키지",
    publishPackages.map((p) => p.name),
  );

  // Git 사용 가능 여부 확인
  const hasGit = await fsx.exists(path.resolve(cwd, ".git"));

  //#region Phase 1: Pre-validation

  // npm 인증 검증 (npm publish 설정이 있는 경우)
  if (publishPackages.some((p) => p.config.type === "npm")) {
    logger.debug("npm 인증 검증 중...");
    try {
      const { stdout: whoami } = await cpx.spawn("npm", ["whoami"]);
      if (whoami.trim() === "") {
        throw new Error("npm 로그인 정보를 찾을 수 없습니다.");
      }
      logger.debug(`npm 로그인 확인됨: ${whoami.trim()}`);
    } catch {
      logger.error(
        "npm 인증 실패. 로그인 상태를 확인해주세요.\n" +
          "  npm whoami              # 현재 로그인 확인\n" +
          "  npm login               # 로그인\n" +
          "  npm config set //registry.npmjs.org/:_authToken <token>  # 토큰 직접 설정",
      );
      process.exitCode = 1;
      return;
    }
  }

  // SSH 키 인증 검증 (비밀번호 없는 SFTP publish 설정이 있는 경우)
  try {
    await ensureSshAuth(publishPackages, logger);
  } catch (err) {
    logger.error(`SSH 인증 설정 실패: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
    return;
  }

  // 커밋되지 않은 변경사항 확인 및 자동 커밋 시도 (noBuild가 아닌 경우)
  if (!noBuild) {
    try {
      await ensureCleanWorkingTree(hasGit, logger);
    } catch (err) {
      logger.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
      return;
    }
  }

  //#endregion

  //#region Phase 2 & 3: Build or noBuild warning

  let version = projPkg.version;

  if (noBuild) {
    // noBuild 경고
    logger.warn("빌드 없이 배포하는 것은 매우 위험합니다.");
    await waitWithCountdown("중단하려면 'CTRL+C'를 누르세요.", 5);
  } else {
    // 버전 업그레이드
    logger.debug("버전 업그레이드 중...");
    const upgradeResult = await upgradeVersion(cwd, allPkgPaths, dryRun);
    version = upgradeResult.version;
    const _changedFiles = upgradeResult.changedFiles;
    if (dryRun) {
      logger.info(`[DRY-RUN] 버전 업그레이드: ${projPkg.version} → ${version} (파일 미수정)`);
    } else {
      logger.info(`버전 업그레이드: ${projPkg.version} → ${version}`);
    }

    // 빌드 실행
    if (dryRun) {
      logger.info("[DRY-RUN] 빌드 시작 (검증만)...");
    } else {
      logger.debug("빌드 시작...");
    }

    try {
      await runBuild({
        targets: publishPackages.map((p) => p.name),
        options: options.options,
      });

      // 빌드 실패 확인
      if (process.exitCode === 1) {
        throw new Error("빌드 실패");
      }
    } catch {
      if (dryRun) {
        logger.error("[DRY-RUN] 빌드 실패");
      } else {
        logger.error(
          "빌드 실패. 수동 복구가 필요할 수 있습니다:\n" +
            "  버전 변경을 되돌리려면:\n" +
            "    git checkout -- package.json packages/*/package.json packages/sd-cli/templates/",
        );
      }
      process.exitCode = 1;
      return;
    }

    //#region Phase 3: Git commit/tag/push

    try {
      await commitTagAndPush(hasGit, version, _changedFiles, logger, dryRun);
    } catch (err) {
      logger.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
      return;
    }

    //#endregion
  }

  //#endregion

  //#region Phase 4: Deployment

  await runDeployment(publishPackages, version, cwd, logger, dryRun);
  if (process.exitCode === 1) return;

  //#endregion

  //#region Phase 5: postPublish

  if (sdConfig.postPublish != null && sdConfig.postPublish.length > 0) {
    await runPostPublish(sdConfig.postPublish, version, cwd, logger, dryRun);
  }

  //#endregion

  if (dryRun) {
    logger.info(`[DRY-RUN] 시뮬레이션 완료. 실제 배포 버전: v${version}`);
  } else {
    logger.info(`모든 배포 완료. (v${version})`);
  }
}

//#endregion
