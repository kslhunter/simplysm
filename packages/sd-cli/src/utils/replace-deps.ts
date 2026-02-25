import fs from "fs";
import path from "path";
import { glob } from "glob";
import { consola } from "consola";
import { fsCopy, fsMkdir, fsRm, FsWatcher, pathIsChildPath } from "@simplysm/core-node";

/**
 * Match glob patterns from replaceDeps config with target package list
 * and return { targetName, sourcePath } pairs
 *
 * @param replaceDeps - replaceDeps config from sd.config.ts (key: glob pattern, value: source path)
 * @param targetNames - List of package names found in node_modules (e.g., ["@simplysm/solid", ...])
 * @returns Array of matched { targetName, sourcePath }
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

      // If capture group exists, substitute * in source path with captured value
      const sourcePath = hasWildcard ? sourceTemplate.replace(/\*/g, match[1]) : sourceTemplate;

      results.push({ targetName, sourcePath });
    }
  }

  return results;
}

/**
 * Parse pnpm-workspace.yaml content and return array of workspace packages globs
 * Simple line parsing without separate YAML library
 *
 * @param content - Content of pnpm-workspace.yaml file
 * @returns Array of glob patterns (e.g., ["packages/*", "tools/*"])
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

    // List items in packages section
    if (inPackages && trimmed.startsWith("- ")) {
      const value = trimmed
        .slice(2)
        .trim()
        .replace(/^["']|["']$/g, "");
      globs.push(value);
      continue;
    }

    // End when other section starts
    if (inPackages && trimmed !== "" && !trimmed.startsWith("#")) {
      break;
    }
  }

  return globs;
}

/**
 * Names to exclude during copy
 */
const EXCLUDED_NAMES = new Set(["node_modules", "package.json", ".cache", "tests"]);

/**
 * Filter function for replaceDeps copy
 * Excludes node_modules, package.json, .cache, tests
 *
 * @param itemPath - Absolute path of item to copy
 * @returns true if copy target, false if excluded
 */
function replaceDepsCopyFilter(itemPath: string): boolean {
  const basename = path.basename(itemPath);
  return !EXCLUDED_NAMES.has(basename);
}

/**
 * replaceDeps 복사 교체 항목
 */
export interface ReplaceDepEntry {
  targetName: string;
  sourcePath: string;
  targetPath: string;
  resolvedSourcePath: string;
  actualTargetPath: string;
}

/**
 * watchReplaceDeps 반환 타입
 */
export interface WatchReplaceDepResult {
  entries: ReplaceDepEntry[];
  dispose: () => void;
}

/**
 * 프로젝트 루트와 workspace 패키지 경로 목록을 수집한다.
 *
 * pnpm-workspace.yaml을 파싱하여 workspace 패키지들의 절대 경로를 수집한다.
 * 파일이 없거나 파싱 실패 시 루트 경로만 반환한다.
 *
 * @param projectRoot - 프로젝트 루트 경로
 * @returns [루트, ...workspace 패키지 경로] 배열
 */
async function collectSearchRoots(projectRoot: string): Promise<string[]> {
  const searchRoots = [projectRoot];

  const workspaceYamlPath = path.join(projectRoot, "pnpm-workspace.yaml");
  try {
    const yamlContent = await fs.promises.readFile(workspaceYamlPath, "utf-8");
    const workspaceGlobs = parseWorkspaceGlobs(yamlContent);

    for (const pattern of workspaceGlobs) {
      const dirs = await glob(pattern, { cwd: projectRoot, absolute: true });
      searchRoots.push(...dirs);
    }
  } catch {
    // pnpm-workspace.yaml가 없으면 루트만 처리
  }

  return searchRoots;
}

/**
 * replaceDeps 설정에서 모든 교체 대상 항목을 해석한다.
 *
 * 1. pnpm-workspace.yaml 파싱 → workspace 패키지 경로 목록
 * 2. [루트, ...workspace 패키지]의 node_modules에서 매칭되는 패키지 찾기
 * 3. 패턴 매칭 + 소스 경로 존재 확인 + symlink 해석
 *
 * @param projectRoot - 프로젝트 루트 경로
 * @param replaceDeps - sd.config.ts의 replaceDeps 설정
 * @param logger - consola 로거
 * @returns 해석된 교체 대상 항목 배열
 */
async function resolveAllReplaceDepEntries(
  projectRoot: string,
  replaceDeps: Record<string, string>,
  logger: ReturnType<typeof consola.withTag>,
): Promise<ReplaceDepEntry[]> {
  const entries: ReplaceDepEntry[] = [];

  const searchRoots = await collectSearchRoots(projectRoot);

  for (const searchRoot of searchRoots) {
    const nodeModulesDir = path.join(searchRoot, "node_modules");

    try {
      await fs.promises.access(nodeModulesDir);
    } catch {
      continue; // node_modules 없으면 스킵
    }

    // replaceDeps의 각 glob 패턴으로 node_modules 내 디렉토리 탐색
    const targetNames: string[] = [];
    for (const pattern of Object.keys(replaceDeps)) {
      const matches = await glob(pattern, { cwd: nodeModulesDir });
      targetNames.push(...matches);
    }

    if (targetNames.length === 0) continue;

    // 패턴 매칭 및 경로 해석
    const matchedEntries = resolveReplaceDepEntries(replaceDeps, targetNames);

    for (const { targetName, sourcePath } of matchedEntries) {
      const targetPath = path.join(nodeModulesDir, targetName);
      const resolvedSourcePath = path.resolve(projectRoot, sourcePath);

      // 소스 경로 존재 확인
      try {
        await fs.promises.access(resolvedSourcePath);
      } catch {
        logger.warn(`소스 경로가 존재하지 않아 스킵합니다: ${resolvedSourcePath}`);
        continue;
      }

      // targetPath가 symlink면 realpath로 해석하여 실제 .pnpm 스토어 경로 얻기
      let actualTargetPath = targetPath;
      try {
        const stat = await fs.promises.lstat(targetPath);
        if (stat.isSymbolicLink()) {
          actualTargetPath = await fs.promises.realpath(targetPath);
        }
      } catch {
        // targetPath가 존재하지 않으면 그대로 사용
      }

      entries.push({
        targetName,
        sourcePath,
        targetPath,
        resolvedSourcePath,
        actualTargetPath,
      });
    }
  }

  return entries;
}

/**
 * replaceDeps 설정에 따라 node_modules 내 패키지를 소스 디렉토리로 복사 교체한다.
 *
 * 1. pnpm-workspace.yaml 파싱 → workspace 패키지 경로 목록
 * 2. [루트, ...workspace 패키지]의 node_modules에서 매칭되는 패키지 찾기
 * 3. 기존 symlink/디렉토리 제거 → 소스 경로를 복사 (node_modules, package.json, .cache, tests 제외)
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

  logger.start("Setting up replace-deps");

  const entries = await resolveAllReplaceDepEntries(projectRoot, replaceDeps, logger);

  for (const { targetName, resolvedSourcePath, actualTargetPath } of entries) {
    try {
      // 소스 파일을 actualTargetPath에 덮어쓰기 복사 (기존 디렉토리 유지, symlink 보존)
      await fsCopy(resolvedSourcePath, actualTargetPath, replaceDepsCopyFilter);

      setupCount += 1;
    } catch (err) {
      logger.error(`복사 교체 실패 (${targetName}): ${err instanceof Error ? err.message : err}`);
    }
  }

  logger.success(`Replaced ${setupCount} dependencies`);
}

/**
 * replaceDeps 설정에 따라 소스 디렉토리를 watch하여 변경 시 대상 경로로 복사한다.
 *
 * 1. pnpm-workspace.yaml 파싱 → workspace 패키지 경로 목록
 * 2. [루트, ...workspace 패키지]의 node_modules에서 매칭되는 패키지 찾기
 * 3. 소스 디렉토리를 FsWatcher로 watch (300ms delay)
 * 4. 변경 시 대상 경로로 복사 (node_modules, package.json, .cache, tests 제외)
 *
 * @param projectRoot - 프로젝트 루트 경로
 * @param replaceDeps - sd.config.ts의 replaceDeps 설정
 * @returns entries와 dispose 함수
 */
export async function watchReplaceDeps(
  projectRoot: string,
  replaceDeps: Record<string, string>,
): Promise<WatchReplaceDepResult> {
  const logger = consola.withTag("sd:cli:replace-deps:watch");

  const entries = await resolveAllReplaceDepEntries(projectRoot, replaceDeps, logger);

  // 소스 디렉토리 watch 설정
  const watchers: FsWatcher[] = [];
  const watchedSources = new Set<string>();

  logger.start(`Watching ${entries.length} replace-deps target(s)`);

  for (const entry of entries) {
    if (watchedSources.has(entry.resolvedSourcePath)) continue;
    watchedSources.add(entry.resolvedSourcePath);

    const excludedPaths = [...EXCLUDED_NAMES].map((name) =>
      path.join(entry.resolvedSourcePath, name),
    );

    const watcher = await FsWatcher.watch([entry.resolvedSourcePath], { followSymlinks: false });
    watcher.onChange({ delay: 300 }, async (changeInfos) => {
      for (const { path: changedPath } of changeInfos) {
        // 제외 항목 필터링: basename 일치 또는 제외 디렉토리 하위 경로
        if (
          EXCLUDED_NAMES.has(path.basename(changedPath)) ||
          excludedPaths.some((ep) => pathIsChildPath(changedPath, ep))
        ) {
          continue;
        }

        // 이 소스 경로를 사용하는 모든 entry에 대해 복사
        for (const e of entries) {
          if (e.resolvedSourcePath !== entry.resolvedSourcePath) continue;

          // 소스 경로 기준 상대 경로 계산
          const relativePath = path.relative(e.resolvedSourcePath, changedPath);
          const destPath = path.join(e.actualTargetPath, relativePath);

          try {
            // 소스가 존재하는지 확인
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
                await fsMkdir(destPath);
              } else {
                await fsMkdir(path.dirname(destPath));
                await fsCopy(changedPath, destPath, replaceDepsCopyFilter);
              }
            } else {
              // 소스가 삭제됨 → 대상도 삭제
              await fsRm(destPath);
            }
          } catch (err) {
            logger.error(
              `복사 실패 (${e.targetName}/${relativePath}): ${err instanceof Error ? err.message : err}`,
            );
          }
        }
      }
    });

    watchers.push(watcher);
  }

  logger.success(`Replace-deps watch ready`);

  return {
    entries,
    dispose: () => {
      for (const watcher of watchers) {
        void watcher.close();
      }
    },
  };
}
