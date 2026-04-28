import type { consola } from "consola";
import { cpx } from "@simplysm/core-node";

/**
 * 미커밋 변경사항을 감지하고 Claude CLI로 자동 커밋을 시도한다.
 * @throws 자동 커밋 실패 시 Error
 */
export async function ensureCleanWorkingTree(
  hasGit: boolean,
  logger: ReturnType<typeof consola.withTag>,
): Promise<void> {
  if (!hasGit) return;

  logger.debug("git 커밋 상태 확인 중...");

  const { stdout: diff } = await cpx.spawn("git", ["diff", "--name-only"]);
  const { stdout: stagedDiff } = await cpx.spawn("git", ["diff", "--cached", "--name-only"]);

  if (diff.trim() === "" && stagedDiff.trim() === "") return;

  logger.info("커밋되지 않은 변경사항 감지. claude로 자동 커밋 시도 중...");
  try {
    await cpx.spawn(
      "claude",
      [
        "-p",
        "/sd-commit",
        "--dangerously-skip-permissions",
        "--model",
        "claude-haiku-4-5",
        "--no-session-persistence",
        "--strict-mcp-config",
      ],
      {
        stdio: "inherit",
        env: {
          // eslint-disable-next-line no-restricted-properties -- 자식 프로세스에 env 전달
          ...process.env,
          CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
          CLAUDE_CODE_SKIP_PROMPT_HISTORY: "1"
        },
      },
    );
  } catch (e) {
    throw new Error(
      "자동 커밋에 실패했습니다. 수동으로 커밋 후 다시 시도해주세요.\n" +
      (e instanceof Error ? e.message : String(e)),
    );
  }
}

/**
 * 버전 변경 파일을 git add/commit/tag/push 한다.
 * @throws git 작업 실패 시 복구 가이드 포함 Error
 */
export async function commitTagAndPush(
  hasGit: boolean,
  version: string,
  changedFiles: string[],
  logger: ReturnType<typeof consola.withTag>,
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
      `Git 작업 실패: ${err instanceof Error ? err.message : err}\n` +
      "수동 복구가 필요할 수 있습니다:\n" +
      `  git revert HEAD  # 버전 커밋 되돌리기\n` +
      `  git tag -d v${version}  # 태그 삭제`,
    );
  }
}
