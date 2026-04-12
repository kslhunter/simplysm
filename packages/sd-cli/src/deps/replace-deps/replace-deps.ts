import fs from "fs";
import path from "path";
import { consola } from "consola";
import { fsx, pathx, FsWatcher } from "@simplysm/core-node";
import { exec } from "child_process";
import { promisify } from "util";
import type { ReplaceDepEntry } from "./replace-deps-resolve";
import { resolveAllReplaceDepEntries } from "./replace-deps-resolve";

/**
 * 복사 시 제외할 이름 목록
 */
const EXCLUDED_NAMES = new Set(["node_modules", "package.json", ".cache", "tests"]);

/**
 * replaceDeps 복사용 필터 함수
 * node_modules, package.json, .cache, tests를 제외한다.
 *
 * @param itemPath - 복사할 항목의 절대 경로
 * @returns 복사 대상이면 true, 제외 대상이면 false
 */
function replaceDepsCopyFilter(itemPath: string): boolean {
  const basename = path.basename(itemPath);
  return !EXCLUDED_NAMES.has(basename);
}

/**
 * watchReplaceDeps의 반환 타입
 */
export interface WatchReplaceDepResult {
  entries: ReplaceDepEntry[];
  dispose: () => void;
}

/**
 * replaceDeps 설정에 따라 node_modules의 패키지를 소스 디렉토리로 교체한다.
 *
 * 1. pnpm-workspace.yaml 파싱 → 워크스페이스 패키지 경로
 * 2. [루트, ...워크스페이스 패키지] node_modules에서 매칭 패키지 탐색
 * 3. 기존 symlink/디렉토리 제거 → 소스 경로 복사 (node_modules, package.json, .cache, tests 제외)
 *
 * @param projectRoot - 프로젝트 루트 경로
 * @param replaceDeps - sd.config.ts의 replaceDeps 설정
 */
export async function setupReplaceDeps(
  projectRoot: string,
  replaceDeps: Record<string, string>,
): Promise<void> {
  const logger = consola.withTag("sd:cli:replace-deps");
  let setupCount = 0;

  logger.start("replace-deps 설정 중...");

  const entries = await resolveAllReplaceDepEntries(projectRoot, replaceDeps, logger);

  for (const { targetName, resolvedSourcePath, actualTargetPath } of entries) {
    try {
      // 소스 파일을 actualTargetPath에 덮어쓰기 복사 (기존 디렉토리 유지, symlink 보존)
      await fsx.copy(resolvedSourcePath, actualTargetPath, replaceDepsCopyFilter);

      setupCount += 1;
    } catch (err) {
      logger.error(`[${targetName}] 복사 실패: ${err instanceof Error ? err.message : err}`);
    }
  }

  logger.success(`replace-deps 설정 완료 (${setupCount}개 의존성 교체)`);

  // 교체된 패키지의 postinstall 스크립트 실행
  for (const { targetName, resolvedSourcePath, actualTargetPath } of entries) {
    const sourcePkgJsonPath = pathx.posix(path.join(resolvedSourcePath, "package.json"));
    try {
      const pkgJson = JSON.parse(await fs.promises.readFile(sourcePkgJsonPath, "utf-8"));
      const postinstall = pkgJson.scripts?.postinstall as string | undefined;
      if (postinstall == null) continue;

      logger.warn(`[${targetName}] postinstall 스크립트 실행: ${postinstall}`);
      logger.start(`[${targetName}] postinstall 실행 중...`);
      await promisify(exec)(postinstall, { cwd: actualTargetPath });
      logger.success(`[${targetName}] postinstall 실행 완료`);
    } catch (err) {
      logger.error(
        `[${targetName}] postinstall 실패: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}

/**
 * replaceDeps 설정에 따라 소스 디렉토리를 감시하고 변경사항을 대상 경로에 복사한다.
 *
 * 1. pnpm-workspace.yaml 파싱 → 워크스페이스 패키지 경로
 * 2. [루트, ...워크스페이스 패키지] node_modules에서 매칭 패키지 탐색
 * 3. FsWatcher로 소스 디렉토리 감시 (300ms 딜레이)
 * 4. 변경사항을 대상 경로에 복사 (node_modules, package.json, .cache, tests 제외)
 *
 * @param projectRoot - 프로젝트 루트 경로
 * @param replaceDeps - sd.config.ts의 replaceDeps 설정
 * @param options - 옵션. onChanged: 파일 복사 완료 후 호출되는 콜백
 * @returns entries 및 dispose 함수
 */
export async function watchReplaceDeps(
  projectRoot: string,
  replaceDeps: Record<string, string>,
  options?: { onChanged?: () => void },
): Promise<WatchReplaceDepResult> {
  const logger = consola.withTag("sd:cli:replace-deps:watch");

  const entries = await resolveAllReplaceDepEntries(projectRoot, replaceDeps, logger);

  // 소스 디렉토리 감시자 설정
  const watchers: FsWatcher[] = [];
  const watchedSources = new Set<string>();

  logger.start(`replace-deps 워치 시작 중... (${entries.length}개 대상)`);

  for (const entry of entries) {
    if (watchedSources.has(entry.resolvedSourcePath)) continue;
    watchedSources.add(entry.resolvedSourcePath);

    const excludedPaths = [...EXCLUDED_NAMES].map((name) =>
      pathx.posix(path.join(entry.resolvedSourcePath, name)),
    );

    const watcher = await FsWatcher.watch([entry.resolvedSourcePath], {
      followSymlinks: false,
      ignored: [...EXCLUDED_NAMES].map((name) => `**/${name}`),
    });
    watcher.onChange({ delay: 300 }, async (changeInfos) => {
      for (const { path: changedPath } of changeInfos) {
        // 제외 항목 필터: basename 매칭 또는 제외 디렉토리 내 경로
        if (
          EXCLUDED_NAMES.has(path.basename(changedPath)) ||
          excludedPaths.some((ep) => pathx.isChildPath(changedPath, ep))
        ) {
          continue;
        }

        // 이 소스 경로를 사용하는 모든 항목에 대해 복사
        for (const e of entries) {
          if (e.resolvedSourcePath !== entry.resolvedSourcePath) continue;

          // 소스로부터의 상대 경로 계산
          const relativePath = pathx.posix(path.relative(e.resolvedSourcePath, changedPath));
          const destPath = pathx.posix(path.join(e.actualTargetPath, relativePath));

          try {
            // 소스 존재 여부 확인
            let sourceExists = false;
            try {
              await fs.promises.access(changedPath);
              sourceExists = true;
            } catch {
              // 소스가 삭제됨
            }

            if (sourceExists) {
              // 소스가 디렉토리인지 파일인지 확인
              const stat = await fs.promises.stat(changedPath);
              if (stat.isDirectory()) {
                await fsx.mkdir(destPath);
              } else {
                await fsx.mkdir(pathx.posix(path.dirname(destPath)));
                await fsx.copy(changedPath, destPath, replaceDepsCopyFilter);
              }
            } else {
              // 소스가 삭제됨 → 대상도 삭제
              await fsx.rm(destPath);
            }
          } catch (err) {
            logger.error(
              `[${e.targetName}] 복사 실패 (${relativePath}): ${err instanceof Error ? err.message : err}`,
            );
          }
        }
      }
      options?.onChanged?.();
    });

    watchers.push(watcher);
  }

  logger.success("replace-deps 워치 준비 완료");

  return {
    entries,
    dispose: () => {
      for (const watcher of watchers) {
        void watcher.close();
      }
    },
  };
}
