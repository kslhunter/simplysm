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
    await Promise.all(
      names
        .map((name) => path.resolve(sourcePath, name))
        .filter((child) => filter == null || filter(child))
        .map((child) => copyWithUnlink(
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
  for (const { targetName, resolvedSourcePath, actualTargetPath } of copiedEntries) {
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

  // 소스 디렉토리 감시자 설정
  const watchers: FsWatcher[] = [];
  const watchedSources = new Set<string>();

  logger.start(`replace-deps 워치 시작 중... (${entries.length}개 대상)`);

  for (const entry of entries) {
    if (watchedSources.has(entry.resolvedSourcePath)) continue;
    watchedSources.add(entry.resolvedSourcePath);

    try {
      // 소스 패키지의 files 필드를 읽어 감시 대상 경로 구성
      const files = await loadFilesField(entry.resolvedSourcePath);
      if (files == null) {
        logger.warn(`[${entry.targetName}] package.json에 files 필드가 없어 감시 건너뜀`);
        continue;
      }

      // files 항목 경로 + npm 기본 파일 경로
      const watchPaths = files.map((f) =>
        pathx.posix(path.join(entry.resolvedSourcePath, f)),
      );

      // 소스 루트에서 npm 기본 파일 패턴에 매칭되는 파일 추가
      try {
        const rootEntries = await fs.promises.readdir(entry.resolvedSourcePath);
        for (const name of rootEntries) {
          if (NPM_DEFAULT_FILE_PATTERN.test(name)) {
            watchPaths.push(pathx.posix(path.join(entry.resolvedSourcePath, name)));
          }
        }
      } catch {
        // readdir 실패 시 npm 기본 파일 감시 생략
      }

      // 이 소스 경로에 해당하는 entries만 사전 필터링하여 캡처
      const sourceEntries = entries.filter(
        (e) => e.resolvedSourcePath === entry.resolvedSourcePath,
      );

      const watcher = await FsWatcher.watch(watchPaths, {
        followSymlinks: false,
      });
      watcher.onChange({ delay: 300 }, async (changeInfos) => {
        let hasActualCopy = false;

        for (const { path: changedPath } of changeInfos) {
          // 사전 필터링된 항목만 순회
          for (const e of sourceEntries) {
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
                  // 파일 내용이 동일하면 복사 건너뜀 (불필요한 리빌드 방지)
                  if (await isFileContentSame(changedPath, destPath)) continue;
                  await fsx.mkdir(pathx.posix(path.dirname(destPath)));
                  await fsx.copy(changedPath, destPath);
                  hasActualCopy = true;
                }
              } else {
                // 소스가 삭제됨 → 대상도 삭제
                await fsx.rm(destPath);
                hasActualCopy = true;
              }
            } catch (err) {
              logger.error(
                `[${e.targetName}] 복사 실패 (${relativePath}): ${err instanceof Error ? err.message : err}`,
              );
            }
          }
        }

        if (hasActualCopy) {
          options?.onChanged?.();
        }
      });

      watchers.push(watcher);
    } catch (err) {
      logger.error(
        `[${entry.targetName}] 감시 설정 실패: ${err instanceof Error ? err.message : err}`,
      );
    }
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
