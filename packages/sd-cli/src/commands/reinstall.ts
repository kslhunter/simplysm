import path from "path";
import { createLogger } from "@simplysm/core-common";
import { fsx } from "@simplysm/core-node";
import { shellSpawn } from "../utils/shell-spawn";
import { collectSearchRoots } from "../deps/replace-deps/replace-deps-resolve";

const logger = createLogger("sd:cli:reinstall");

/**
 * node_modules·lock·dist·.cache 를 모두 삭제하고 Bun install/trust 흐름으로 재설치한다.
 *
 * lock 과 모든 node_modules 를 함께 지워 optional peer 잔재를 제거한 뒤 설치한다.
 * 설치 후 dependency lifecycle script 미승인 항목이 있으면 Bun trust 흐름으로 승인·실행한다.
 */
export async function runReinstall(): Promise<void> {
  const cwd = process.cwd();

  // 1. 삭제 대상: 루트 + 워크스페이스 패키지의 node_modules/dist/.cache + 루트 lock
  const roots = collectSearchRoots(cwd);
  const deleteTargets = [
    path.join(cwd, "bun.lock"),
    ...roots.flatMap((root) => [
      path.join(root, "node_modules"),
      path.join(root, "dist"),
      path.join(root, ".cache"),
    ]),
  ];

  logger.start(`정리 중... (${deleteTargets.length}개 경로)`);
  await deleteTargets.parallelAsync((target) => fsx.rm(target)); // 없으면 자동 무시
  logger.debug("정리 완료");

  logger.start("bun install 중...");
  await shellSpawn("bun", ["install"], {
    cwd,
    stdio: "inherit",
  });
  logger.success("reinstall 완료");
}
