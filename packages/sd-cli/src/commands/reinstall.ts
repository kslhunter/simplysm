import path from "path";
import YAML from "yaml";
import { createLogger } from "@simplysm/core-common";
import { fsx } from "@simplysm/core-node";
import { shellSpawn } from "../utils/shell-spawn";
import { collectSearchRoots } from "../deps/replace-deps/replace-deps-resolve";

const logger = createLogger("sd:cli:reinstall");

/**
 * node_modules·lock·dist·.cache 를 모두 삭제하고 빌드 허용 상태를 재산정하며 재설치한다.
 *
 * pnpm 은 lock·node_modules(.pnpm)·.modules.yaml 중 하나라도 남으면 그 상태로 복원하므로,
 * optional peer 잔재 등을 확실히 제거하려면 lock 과 모든 node_modules 를 함께 지워야 한다.
 *
 * allowBuilds 를 비운 뒤 `pnpm install --config.strict-dep-builds=false` 로 설치하면 미승인
 * 빌드는 에러가 아닌 경고로 보류된 채 install 이 정상 종료된다. 이어서 `pnpm approve-builds
 * --all` 로 보류된 빌드를 승인·실행하고 allowBuilds 에 true 로 기록한다. (strict-dep-builds 는
 * 빌드 보류만 경고로 낮추므로, 의존성 설치 자체의 실패는 그대로 throw 된다.)
 */
export async function runReinstall(): Promise<void> {
  const cwd = process.cwd();

  // 1. 삭제 대상: 루트 + 워크스페이스 패키지의 node_modules/dist/.cache + 루트 lock
  const roots = await collectSearchRoots(cwd);
  const deleteTargets = [
    path.join(cwd, "pnpm-lock.yaml"),
    ...roots.flatMap((root) => [
      path.join(root, "node_modules"),
      path.join(root, "dist"),
      path.join(root, ".cache"),
    ]),
  ];

  logger.start(`정리 중... (${deleteTargets.length}개 경로)`);
  await deleteTargets.parallelAsync((target) => fsx.rm(target)); // 없으면 자동 무시
  logger.debug("정리 완료");

  // 2. allowBuilds 초기화 (현재 의존성 기준으로 다시 승인되도록)
  const workspaceYamlPath = path.join(cwd, "pnpm-workspace.yaml");
  if (await fsx.exists(workspaceYamlPath)) {
    const doc = YAML.parseDocument(await fsx.read(workspaceYamlPath));
    if (doc.has("allowBuilds")) {
      doc.delete("allowBuilds");
      await fsx.write(workspaceYamlPath, doc.toString());
      logger.debug("allowBuilds 초기화");
    }
  }

  // 3. 재설치 — strict-dep-builds=false 로 미승인 빌드 보류를 에러가 아닌 경고로 낮춰
  //    install 을 정상 종료시킨다. (빌드 보류 외의 install 실패는 그대로 throw 된다.)
  logger.start("pnpm install 중...");
  await shellSpawn("pnpm", ["install", "--config.strict-dep-builds=false"], {
    cwd,
    stdio: "inherit",
  });

  // 4. 보류된 빌드 일괄 승인 → 빌드 실행 + allowBuilds 에 true 로 기록 (빌드 실패 시 throw)
  logger.start("빌드 승인 및 실행 중...");
  await shellSpawn("pnpm", ["approve-builds", "--all"], { cwd, stdio: "inherit" });

  logger.success("reinstall 완료");
}
