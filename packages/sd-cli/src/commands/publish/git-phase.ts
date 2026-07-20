import type { ConsolaInstance } from "consola";
import { cpx } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";

/**
 * 워킹트리에 미커밋 변경사항이 있으면 throw 한다.
 * 배포는 깨끗한 워킹트리에서만 진행한다 — 커밋은 사용자가 직접 수행해야 한다.
 * @throws 미커밋(unstaged, staged) 변경사항이 있을 때 Error
 */
export async function ensureCleanWorkingTree(
  hasGit: boolean,
  logger: ConsolaInstance,
): Promise<void> {
  if (!hasGit) return;

  logger.debug("git 커밋 상태 확인 중...");

  const { stdout: diff } = await cpx.spawn("git", ["diff", "--name-only"]);
  const { stdout: stagedDiff } = await cpx.spawn("git", ["diff", "--cached", "--name-only"]);

  if (diff.trim() === "" && stagedDiff.trim() === "") return;

  throw new Error("커밋되지 않은 변경사항이 있습니다. 변경사항을 커밋한 후 다시 시도해주세요.");
}

/**
 * 버전 변경 파일을 git add/commit/tag/push 한다.
 * @throws git 작업 실패 시 복구 가이드 포함 Error
 */
export async function commitTagAndPush(
  hasGit: boolean,
  version: string,
  changedFiles: string[],
  logger: ConsolaInstance,
  dryRun: boolean,
): Promise<void> {
  if (!hasGit) return;

  if (dryRun) {
    logger.info("[DRY-RUN] Git commit/tag/push 시뮬레이션 중...");
    logger.info(`[DRY-RUN] git add (${changedFiles.length}개 파일)`);
    logger.info(`[DRY-RUN] git commit -m "v${version}"`);
    logger.info(`[DRY-RUN] git tag -a v${version} -m "v${version}"`);
    logger.info("[DRY-RUN] 리모트에 push 예정 (건너뜀)");
    logger.info("[DRY-RUN] 태그를 리모트에 push 예정 (건너뜀)");
    logger.info("[DRY-RUN] Git 작업 시뮬레이션 완료");
    return;
  }

  logger.debug("Git commit/tag/push...");
  try {
    await cpx.spawn("git", ["add", ...changedFiles]);
    await cpx.spawn("git", ["commit", "-m", `v${version}`]);
    await cpx.spawn("git", ["tag", "-a", `v${version}`, "-m", `v${version}`]);
    await cpx.spawn("git", ["push"]);
    await cpx.spawn("git", ["push", "--tags"]);
    logger.debug("Git 작업 완료");
  } catch (err) {
    throw new Error(
      `Git 작업 실패: ${errNs.message(err)}\n` +
        "수동 복구가 필요할 수 있습니다:\n" +
        `  git revert HEAD  # 버전 커밋 되돌리기\n` +
        `  git tag -d v${version}  # 태그 삭제`,
    );
  }
}
