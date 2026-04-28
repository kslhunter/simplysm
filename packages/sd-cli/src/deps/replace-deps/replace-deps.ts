import fs from "fs";
import path from "path";
import { consola } from "consola";
import { fsx, pathx, FsWatcher } from "@simplysm/core-node";
import { exec } from "child_process";
import { promisify } from "util";
import type { ReplaceDepEntry } from "./replace-deps-resolve";
import { resolveAllReplaceDepEntries } from "./replace-deps-resolve";

/**
 * 파일 내용이 동일한지 비교한다.
 * mtime + size가 같으면 동일로 간주하고, 다르면 바이트 비교한다.
 */
async function isFileContentSame(pathA: string, pathB: string): Promise<boolean> {
  try {
    const [statA, statB] = await Promise.all([
      fs.promises.stat(pathA),
      fs.promises.stat(pathB),
    ]);
    if (statA.size !== statB.size) return false;
    if (statA.mtimeMs === statB.mtimeMs) return true;

    const [bufA, bufB] = await Promise.all([
      fs.promises.readFile(pathA),
      fs.promises.readFile(pathB),
    ]);
    return bufA.equals(bufB);
  } catch {
    return false;
  }
}

/**
 * pnpm hard link를 끊으면서 파일/디렉토리를 복사한다.
 * 대상 파일을 먼저 unlink하여 글로벌 store의 hard link를 끊고 새 파일을 생성한다.
 * 다른 프로젝트의 node_modules에 영향을 주지 않기 위함이다.
 */
async function copyWithUnlink(
  sourcePath: string,
  targetPath: string,
  filter?: (absolutePath: string) => boolean,
): Promise<void> {
  let stats: fs.Stats;
  try {
    stats = await fs.promises.lstat(sourcePath);
  } catch {
    return;
  }

  if (stats.isDirectory()) {
    await fsx.mkdir(targetPath);
    const names = await fs.promises.readdir(sourcePath);
    const allowedChildren = names
      .map((name) => path.resolve(sourcePath, name))
      .filter((child) => filter == null || filter(child));
    const allowedBasenames = new Set(allowedChildren.map((c) => path.basename(c)));

    // 고아 엔트리 정리: filter 범위 내이면서 소스에 없는 타겟 엔트리 삭제
    const targetNames = await fs.promises.readdir(targetPath).catch(() => [] as string[]);
    await Promise.all(
      targetNames.map(async (name) => {
        const targetChild = path.join(targetPath, name);
        if (filter != null && !filter(targetChild)) return;
        if (allowedBasenames.has(name)) return;
        await fs.promises.rm(targetChild, { recursive: true, force: true });
      }),
    );

    await Promise.all(
      allowedChildren.map((child) => copyWithUnlink(
        child,
        path.join(targetPath, path.basename(child)),
      )),
    );
  } else {
    if (await isFileContentSame(sourcePath, targetPath)) return;
    await fsx.mkdir(path.dirname(targetPath));
    try {
      await fs.promises.unlink(targetPath);
    } catch {
      // 대상이 없으면 무시
    }
    await fs.promises.copyFile(sourcePath, targetPath);
  }
}

/**
 * 교체된 패키지의 postinstall 스크립트를 actualTargetPath에서 실행한다.
 * scripts.postinstall이 없으면 조용히 종료한다. 실행 실패는 로깅만 하고 throw하지 않는다.
 */
async function runPostinstall(
  entry: ReplaceDepEntry,
  logger: ReturnType<typeof consola.withTag>,
): Promise<void> {
  const sourcePkgJsonPath = pathx.posix(path.join(entry.resolvedSourcePath, "package.json"));
  try {
    const pkgJson = JSON.parse(await fs.promises.readFile(sourcePkgJsonPath, "utf-8"));
    const postinstall = pkgJson.scripts?.postinstall as string | undefined;
    if (postinstall == null) return;

    logger.warn(`[${entry.targetName}] postinstall 스크립트 실행: ${postinstall}`);
    logger.start(`[${entry.targetName}] postinstall 실행 중...`);
    await promisify(exec)(postinstall, { cwd: entry.actualTargetPath });
    logger.success(`[${entry.targetName}] postinstall 실행 완료`);
  } catch (err) {
    logger.error(
      `[${entry.targetName}] postinstall 실패: ${err instanceof Error ? err.message : err}`,
    );
  }
}

/**
 * npm publish 시 files 필드와 무관하게 항상 포함되는 파일 패턴 (대소문자 무시)
 */
export const NPM_DEFAULT_FILE_PATTERN = /^(readme|license|licence|changelog|history)/i;

/**
 * 소스 패키지의 package.json에서 files 필드를 읽어 반환한다.
 * files 필드가 없으면 undefined를 반환한다.
 */
export async function loadFilesField(sourcePath: string): Promise<string[] | undefined> {
  const pkgJsonPath = pathx.posix(path.join(sourcePath, "package.json"));
  const pkgJson = JSON.parse(await fs.promises.readFile(pkgJsonPath, "utf-8"));
  return pkgJson.files as string[] | undefined;
}

/**
 * files 필드 기반 화이트리스트 복사 필터를 생성한다.
 * 소스 루트 기준 상대경로의 첫 번째 세그먼트로 판단한다.
 *  - files에 포함 → 허용
 *  - npm 기본 파일 패턴 매칭 → 허용
 *  - package.json → 제외
 *  - 그 외 → 제외
 */
export function createCopyFilter(
  sourcePath: string,
  allowedNames: Set<string>,
): (itemPath: string) => boolean {
  return (itemPath: string) => {
    const relativePath = path.relative(sourcePath, itemPath);
    const firstSegment = relativePath.split(path.sep)[0];

    if (firstSegment === "package.json") return false;
    if (allowedNames.has(firstSegment)) return true;
    if (NPM_DEFAULT_FILE_PATTERN.test(firstSegment)) return true;

    return false;
  };
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
 * 3. 소스 package.json의 files 필드 + npm 기본 파일만 대상 경로에 복사 (package.json 제외)
 *
 * @param projectRoot - 프로젝트 루트 경로
 * @param replaceDeps - sd.config.ts의 replaceDeps 설정
 */
export async function setupReplaceDeps(
  projectRoot: string,
  replaceDeps: Record<string, string>,
): Promise<void> {
  const logger = consola.withTag("sd:cli:replace-deps");

  logger.start("replace-deps 설정 중...");

  const entries = await resolveAllReplaceDepEntries(projectRoot, replaceDeps, logger);

  const results = await Promise.all(entries.map(async (entry) => {
    try {
      const files = await loadFilesField(entry.resolvedSourcePath);
      if (files == null) {
        logger.warn(`[${entry.targetName}] package.json에 files 필드가 없어 건너뜀`);
        return undefined;
      }

      const filter = createCopyFilter(entry.resolvedSourcePath, new Set(files));
      await copyWithUnlink(entry.resolvedSourcePath, entry.actualTargetPath, filter);
      return entry;
    } catch (err) {
      logger.error(`[${entry.targetName}] 복사 실패: ${err instanceof Error ? err.message : err}`);
      return undefined;
    }
  }));

  const copiedEntries = results.filter((e): e is ReplaceDepEntry => e != null);

  logger.success(`replace-deps 설정 완료 (${copiedEntries.length}개 의존성 교체)`);

  // 교체된 패키지의 postinstall 스크립트 실행
  for (const entry of copiedEntries) {
    await runPostinstall(entry, logger);
  }
}

/**
 * replaceDeps 설정에 따라 소스 디렉토리를 감시하고 변경사항을 대상 경로에 복사한다.
 *
 * 1. pnpm-workspace.yaml 파싱 → 워크스페이스 패키지 경로
 * 2. [루트, ...워크스페이스 패키지] node_modules에서 매칭 패키지 탐색
 * 3. FsWatcher로 files 항목 경로만 감시 (300ms 딜레이)
 * 4. 변경사항을 대상 경로에 복사
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

  logger.start(`replace-deps 워치 시작 중... (${entries.length}개 대상)`);
  for (const entry of entries) {
    logger.debug(
      `[${entry.targetName}] entry: source=${entry.resolvedSourcePath} -> target=${entry.actualTargetPath}`,
    );
  }

  // resolvedSourcePath(posix) → entries 그룹화
  // resolvedSourcePath는 replace-deps-resolve의 pathx.posixResolve 결과로 이미 POSIX이다.
  const sourceMap = new Map<string, ReplaceDepEntry[]>();
  for (const entry of entries) {
    const key = entry.resolvedSourcePath;
    const arr = sourceMap.get(key) ?? [];
    arr.push(entry);
    sourceMap.set(key, arr);
  }
  logger.debug(`source 그룹 수: ${sourceMap.size}`);

  // 각 source의 watchPaths 수집 (files 필드 없는 source는 경고 후 제외). source 단위 병렬.
  const allWatchPaths = new Set<string>();
  await Promise.all(
    [...sourceMap].map(async ([sourcePath, sourceEntries]) => {
      try {
        const files = await loadFilesField(sourcePath);

        if (files == null) {
          logger.warn(
            `[${sourceEntries[0].targetName}] package.json에 files 필드가 없어 감시 건너뜀`,
          );
          sourceMap.delete(sourcePath);
          return;
        }

        for (const f of files) {
          const wp = pathx.posix(path.join(sourcePath, f));
          allWatchPaths.add(wp);
          logger.debug(`[${sourceEntries[0].targetName}] 감시 경로 추가: ${wp}`);
        }

        const rootEntries = await fs.promises
          .readdir(sourcePath)
          .catch(() => [] as string[]);
        for (const name of rootEntries) {
          if (NPM_DEFAULT_FILE_PATTERN.test(name)) {
            const wp = pathx.posix(path.join(sourcePath, name));
            allWatchPaths.add(wp);
            logger.debug(`[${sourceEntries[0].targetName}] 감시 경로 추가(npm 기본): ${wp}`);
          }
        }
      } catch (err) {
        logger.error(
          `[${sourceEntries[0].targetName}] 감시 설정 실패: ${err instanceof Error ? err.message : err}`,
        );
        sourceMap.delete(sourcePath);
      }
    }),
  );

  if (allWatchPaths.size === 0) {
    if (entries.length > 0) {
      logger.warn("감시 대상이 없어 워치가 시작되지 않음");
    } else {
      logger.success("replace-deps 워치 준비 완료");
    }
    return { entries, dispose: () => {} };
  }

  // longest-prefix 매칭을 위해 긴 경로 우선 정렬
  const sortedSources = [...sourceMap.keys()].sort((a, b) => b.length - a.length);

  const findSource = (changedPath: string): string | undefined => {
    for (const src of sortedSources) {
      if (changedPath === src || changedPath.startsWith(src + "/")) return src;
    }
    return undefined;
  };

  logger.debug(`FsWatcher.watch 시작 (총 ${allWatchPaths.size}개 경로)`);
  const watcher = await FsWatcher.watch([...allWatchPaths], {
    followSymlinks: false,
  });
  logger.debug("FsWatcher.watch 준비 완료");

  // entry(actualTargetPath) 단위 postinstall debounce.
  // 짧은 시간 내 여러 파일 변경이 발생하면 마지막 변경 후 1초 뒤에 한 번만 실행한다.
  const POSTINSTALL_DEBOUNCE_MS = 1000;
  const postinstallTimers = new Map<string, NodeJS.Timeout>();
  const postinstallEntryByKey = new Map<string, ReplaceDepEntry>();

  const schedulePostinstall = (entry: ReplaceDepEntry) => {
    const key = entry.actualTargetPath;
    const prev = postinstallTimers.get(key);
    if (prev != null) {
      clearTimeout(prev);
      logger.debug(`[${entry.targetName}] postinstall 재예약 (이전 타이머 취소)`);
    } else {
      logger.debug(`[${entry.targetName}] postinstall 예약 (${POSTINSTALL_DEBOUNCE_MS}ms 후)`);
    }
    postinstallEntryByKey.set(key, entry);
    const timer = setTimeout(() => {
      postinstallTimers.delete(key);
      const target = postinstallEntryByKey.get(key);
      postinstallEntryByKey.delete(key);
      if (target == null) return;
      logger.debug(`[${target.targetName}] postinstall 디바운스 만료, 실행 시작`);
      void runPostinstall(target, logger);
    }, POSTINSTALL_DEBOUNCE_MS);
    postinstallTimers.set(key, timer);
  };

  watcher.onChange({ delay: 300 }, async (changeInfos) => {
    logger.debug(`변경 감지 ${changeInfos.length}건`);
    for (const ci of changeInfos) {
      logger.debug(`  - ${ci.event}: ${ci.path}`);
    }

    const changedEntries = new Set<ReplaceDepEntry>();

    const flags = await Promise.all(
      changeInfos.map(async ({ path: changedPath }) => {
        const src = findSource(changedPath);
        if (src == null) {
          logger.debug(`source 매칭 실패, 무시: ${changedPath}`);
          return false;
        }
        const sourceEntries = sourceMap.get(src)!;
        logger.debug(
          `source 매칭: ${changedPath} -> ${src} (target ${sourceEntries.length}개)`,
        );

        let localActualCopy = false;

        // 동일 source의 복수 target 복사는 순차로 유지한다 (destination 중복 시 race 방지).
        for (const e of sourceEntries) {
          const relativePath = pathx.posix(path.relative(e.resolvedSourcePath, changedPath));
          const destPath = pathx.posix(path.join(e.actualTargetPath, relativePath));

          try {
            let sourceExists = false;
            try {
              await fs.promises.access(changedPath);
              sourceExists = true;
            } catch {
              // 소스가 삭제됨
            }

            if (sourceExists) {
              const stat = await fs.promises.stat(changedPath);
              if (stat.isDirectory()) {
                logger.debug(`[${e.targetName}] mkdir: ${relativePath}`);
                await fsx.mkdir(destPath);
              } else {
                if (await isFileContentSame(changedPath, destPath)) {
                  logger.debug(`[${e.targetName}] 동일 콘텐츠, 스킵: ${relativePath}`);
                  continue;
                }
                await fsx.mkdir(pathx.posix(path.dirname(destPath)));
                await fsx.copy(changedPath, destPath);
                logger.debug(`[${e.targetName}] 복사 완료: ${relativePath}`);
                localActualCopy = true;
                changedEntries.add(e);
              }
            } else {
              await fsx.rm(destPath);
              logger.debug(`[${e.targetName}] 삭제 완료: ${relativePath}`);
              localActualCopy = true;
              changedEntries.add(e);
            }
          } catch (err) {
            logger.error(
              `[${e.targetName}] 복사 실패 (${relativePath}): ${err instanceof Error ? err.message : err}`,
            );
          }
        }

        return localActualCopy;
      }),
    );

    if (flags.some((f) => f)) {
      logger.debug(
        `배치 종료, 변경된 entry ${changedEntries.size}개: ${[...changedEntries].map((e) => e.targetName).join(", ")}`,
      );
      for (const entry of changedEntries) {
        schedulePostinstall(entry);
      }
      options?.onChanged?.();
    } else {
      logger.debug("배치 종료, 실제 변경 없음");
    }
  });

  logger.success("replace-deps 워치 준비 완료");

  return {
    entries,
    dispose: () => {
      for (const timer of postinstallTimers.values()) {
        clearTimeout(timer);
      }
      postinstallTimers.clear();
      postinstallEntryByKey.clear();
      void watcher.close();
    },
  };
}
