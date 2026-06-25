import fs from "fs";
import path from "path";
import { glob } from "glob";
import type { ConsolaInstance } from "consola";
import { fsx, pathx } from "@simplysm/core-node";

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
    const yamlContent = await fsx.read(workspaceYamlPath);
    const workspaceGlobs = parseWorkspaceGlobs(yamlContent);

    for (const pattern of workspaceGlobs) {
      const dirs = await fsx.glob(pattern, { cwd: projectRoot });
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
export async function resolveAllReplaceDepEntries(
  projectRoot: string,
  replaceDeps: Record<string, string>,
  logger: ConsolaInstance,
): Promise<ReplaceDepEntry[]> {
  const entries: ReplaceDepEntry[] = [];
  const seenTargetPaths = new Set<string>();
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

    if (!(await fsx.exists(nodeModulesDir))) {
      logger.debug(`[replace-deps] 접근 불가: ${nodeModulesDir}`);
      continue;
    }

    // replaceDeps의 각 glob 패턴으로 node_modules 디렉토리 탐색 (병렬)
    const globResults = await Promise.all(
      Object.keys(replaceDeps).map((pattern) =>
        glob(pattern, { cwd: nodeModulesDir }),
      ),
    );
    const targetNames = globResults.flatMap((matches) =>
      matches.map((m) => pathx.posix(m)),
    );

    logger.debug(`[replace-deps] 탐색: ${nodeModulesDir} → ${targetNames.length}개 매칭 (${targetNames.join(", ")})`);

    if (targetNames.length === 0) continue;

    // 패턴 매칭 및 경로 해결
    const matchedEntries = resolveReplaceDepEntries(replaceDeps, targetNames);

    for (const { targetName, sourcePath } of matchedEntries) {
      const targetPath = pathx.posix(path.join(nodeModulesDir, targetName));
      const resolvedSourcePath = pathx.posixResolve(projectRoot, sourcePath);

      // 소스 경로 존재 확인
      if (!(await fsx.exists(resolvedSourcePath))) {
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
      if (seenTargetPaths.has(actualTargetPath)) continue;
      seenTargetPaths.add(actualTargetPath);

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
