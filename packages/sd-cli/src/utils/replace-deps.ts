import fs from "fs";
import path from "path";
import { glob } from "glob";
import { consola } from "consola";
import { fsx, pathx, FsWatcher } from "@simplysm/core-node";
import { exec } from "child_process";
import { promisify } from "util";

/**
 * replaceDeps 설정의 glob 패턴을 대상 패키지 목록과 매칭하여
 * { targetName, sourcePath } 쌍을 반환한다.
 *
 * @param replaceDeps - sd.config.ts의 replaceDeps 설정 (키: glob 패턴, 값: 소스 경로)
 * @param targetNames - node_modules에서 찾은 패키지명 목록 (예: ["@simplysm/solid", ...])
 * @returns 매칭된 { targetName, sourcePath } 배열
 */
export function resolveReplaceDepEntries(
  replaceDeps: Record<string, string>,
  targetNames: string[],
): Array<{ targetName: string; sourcePath: string }> {
  const results: Array<{ targetName: string; sourcePath: string }> = [];

  for (const [pattern, sourceTemplate] of Object.entries(replaceDeps)) {
    // glob 패턴을 정규식으로 변환: * → (.*), . → \., / → [\\/]
    const regexpText = pattern.replace(/[\\/.+*]/g, (ch) => {
      if (ch === "*") return "(.*)";
      if (ch === ".") return "\\.";
      if (ch === "/" || ch === "\\") return "[\\\\/]";
      if (ch === "+") return "\\+";
      return ch;
    });
    const regex = new RegExp(`^${regexpText}$`);
    const hasWildcard = pattern.includes("*");

    for (const targetName of targetNames) {
      const match = regex.exec(targetName);
      if (match == null) continue;

      // 캡처 그룹이 있으면 소스 경로의 *를 캡처된 값으로 치환
      const sourcePath = hasWildcard ? sourceTemplate.replace(/\*/g, match[1]) : sourceTemplate;

      results.push({ targetName, sourcePath });
    }
  }

  return results;
}

/**
 * pnpm-workspace.yaml 내용을 파싱하여 워크스페이스 패키지 glob 배열을 반환한다.
 * 별도 YAML 라이브러리 없이 간단한 줄 파싱으로 처리한다.
 *
 * @param content - pnpm-workspace.yaml 파일 내용
 * @returns glob 패턴 배열 (예: ["packages/*", "tools/*"])
 */
export function parseWorkspaceGlobs(content: string): string[] {
  const lines = content.split("\n");
  const globs: string[] = [];
  let inPackages = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "packages:") {
      inPackages = true;
      continue;
    }

    // packages 섹션의 목록 항목
    if (inPackages && trimmed.startsWith("- ")) {
      const value = trimmed
        .slice(2)
        .trim()
        .replace(/^["']|["']$/g, "");
      globs.push(value);
      continue;
    }

    // 다른 섹션이 시작되면 종료
    if (inPackages && trimmed !== "" && !trimmed.startsWith("#")) {
      break;
    }
  }

  return globs;
}

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
 * replaceDeps 복사/교체 항목
 */
export interface ReplaceDepEntry {
  targetName: string;
  sourcePath: string;
  targetPath: string;
  resolvedSourcePath: string;
  actualTargetPath: string;
}

/**
 * watchReplaceDeps의 반환 타입
 */
export interface WatchReplaceDepResult {
  entries: ReplaceDepEntry[];
  dispose: () => void;
}

/**
 * 프로젝트 루트 및 워크스페이스 패키지 경로를 수집한다.
 *
 * pnpm-workspace.yaml을 파싱하여 워크스페이스 패키지의 절대 경로를 수집한다.
 * 파일이 없거나 파싱 실패 시 루트 경로만 반환한다.
 *
 * @param projectRoot - 프로젝트 루트 경로
 * @returns [루트, ...워크스페이스 패키지 경로] 배열
 */
async function collectSearchRoots(projectRoot: string): Promise<string[]> {
  const searchRoots = [projectRoot];

  const workspaceYamlPath = pathx.posix(path.join(projectRoot, "pnpm-workspace.yaml"));
  try {
    const yamlContent = await fs.promises.readFile(workspaceYamlPath, "utf-8");
    const workspaceGlobs = parseWorkspaceGlobs(yamlContent);

    for (const pattern of workspaceGlobs) {
      const dirs = await glob(pattern, { cwd: projectRoot, absolute: true });
      searchRoots.push(...dirs);
    }
  } catch {
    // pnpm-workspace.yaml이 존재하지 않으면 루트만 처리
  }

  return searchRoots;
}

/**
 * replaceDeps 설정에서 모든 교체 대상 항목을 해결한다.
 *
 * 1. pnpm-workspace.yaml 파싱 → 워크스페이스 패키지 경로
 * 2. [루트, ...워크스페이스 패키지] node_modules에서 매칭 패키지 탐색
 * 3. 패턴 매칭 + 소스 경로 존재 확인 + symlink 해결
 *
 * @param projectRoot - 프로젝트 루트 경로
 * @param replaceDeps - sd.config.ts의 replaceDeps 설정
 * @param logger - consola 로거
 * @returns 해결된 교체 대상 항목 배열
 */
async function resolveAllReplaceDepEntries(
  projectRoot: string,
  replaceDeps: Record<string, string>,
  logger: ReturnType<typeof consola.withTag>,
): Promise<ReplaceDepEntry[]> {
  const entries: ReplaceDepEntry[] = [];
  const searchedDirs = new Set<string>();

  // 초기 탐색 대상: 프로젝트 루트 + workspace 패키지들의 node_modules
  const searchRoots = await collectSearchRoots(projectRoot);
  const pendingDirs: string[] = searchRoots.map((root) =>
    pathx.posix(path.join(root, "node_modules")),
  );

  // 교체된 패키지의 node_modules도 재귀적으로 탐색 (간접 의존성 교체)
  while (pendingDirs.length > 0) {
    const nodeModulesDir = pendingDirs.pop()!;

    if (searchedDirs.has(nodeModulesDir)) continue;
    searchedDirs.add(nodeModulesDir);

    try {
      await fs.promises.access(nodeModulesDir);
    } catch {
      logger.debug(`[replace-deps] 접근 불가: ${nodeModulesDir}`);
      continue;
    }

    // replaceDeps의 각 glob 패턴으로 node_modules 디렉토리 탐색
    const targetNames: string[] = [];
    for (const pattern of Object.keys(replaceDeps)) {
      const matches = await glob(pattern, { cwd: nodeModulesDir });
      targetNames.push(...matches);
    }

    logger.debug(`[replace-deps] 탐색: ${nodeModulesDir} → ${targetNames.length}개 매칭 (${targetNames.join(", ")})`);

    if (targetNames.length === 0) continue;

    // 패턴 매칭 및 경로 해결
    const matchedEntries = resolveReplaceDepEntries(replaceDeps, targetNames);

    for (const { targetName, sourcePath } of matchedEntries) {
      const targetPath = pathx.posix(path.join(nodeModulesDir, targetName));
      const resolvedSourcePath = pathx.posixResolve(projectRoot, sourcePath);

      // 소스 경로 존재 확인
      try {
        await fs.promises.access(resolvedSourcePath);
      } catch {
        logger.warn(`소스 경로가 존재하지 않아 건너뜀: ${resolvedSourcePath}`);
        continue;
      }

      // targetPath가 symlink이면 실제 .pnpm 저장소 경로로 해결
      let actualTargetPath = targetPath;
      try {
        const stat = await fs.promises.lstat(targetPath);
        if (stat.isSymbolicLink()) {
          actualTargetPath = pathx.posix(await fs.promises.realpath(targetPath));
        }
      } catch {
        // targetPath가 존재하지 않으면 그대로 사용
      }

      // 동일 actualTargetPath가 이미 등록된 경우 건너뜀 (pnpm 중복 방지)
      if (entries.some((e) => e.actualTargetPath === actualTargetPath)) continue;

      entries.push({
        targetName,
        sourcePath,
        targetPath,
        resolvedSourcePath,
        actualTargetPath,
      });

      // 교체된 패키지의 node_modules를 탐색 대기열에 추가
      const depth = targetName.split(/[/\\]/).length;
      const entryNodeModulesDir = pathx.posix(
        path.resolve(actualTargetPath, ...Array(depth).fill("..")),
      );
      pendingDirs.push(entryNodeModulesDir);
    }
  }

  return entries;
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
 * @returns entries 및 dispose 함수
 */
export async function watchReplaceDeps(
  projectRoot: string,
  replaceDeps: Record<string, string>,
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
