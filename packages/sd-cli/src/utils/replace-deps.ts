import fs from "fs";
import path from "path";
import { glob } from "glob";
import { consola } from "consola";

/**
 * replaceDeps 설정의 glob 패턴과 대상 패키지 목록을 매칭하여
 * { targetName, sourcePath } 쌍을 반환한다.
 *
 * @param replaceDeps - sd.config.ts의 replaceDeps 설정 (키: glob 패턴, 값: 소스 경로)
 * @param targetNames - node_modules에서 찾은 패키지 이름 목록 (예: ["@simplysm/solid", ...])
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

      // 캡처 그룹이 있으면 소스 경로의 *에 치환
      const sourcePath = hasWildcard ? sourceTemplate.replace(/\*/g, match[1]) : sourceTemplate;

      results.push({ targetName, sourcePath });
    }
  }

  return results;
}

/**
 * pnpm-workspace.yaml 내용을 파싱하여 workspace packages glob 배열을 반환한다.
 * 별도 YAML 라이브러리 없이 간단한 라인 파싱으로 처리한다.
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

    // packages 섹션 내의 리스트 항목
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
 * replaceDeps 설정에 따라 node_modules 내 패키지를 소스 디렉토리로 symlink 교체한다.
 *
 * 1. pnpm-workspace.yaml 파싱 → workspace 패키지 경로 목록
 * 2. [루트, ...workspace 패키지]의 node_modules에서 매칭되는 패키지 찾기
 * 3. 기존 symlink/디렉토리 제거 → 소스 경로로 symlink 생성
 *
 * @param projectRoot - 프로젝트 루트 경로
 * @param replaceDeps - sd.config.ts의 replaceDeps 설정
 */
export async function setupReplaceDeps(projectRoot: string, replaceDeps: Record<string, string>): Promise<void> {
  const logger = consola.withTag("sd:cli:replace-deps");

  // 1. Workspace 패키지 경로 목록 수집
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

  // 2. 각 searchRoot의 node_modules에서 매칭되는 패키지 찾기
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
    const entries = resolveReplaceDepEntries(replaceDeps, targetNames);

    // 3. Symlink 교체
    for (const { targetName, sourcePath } of entries) {
      const targetPath = path.join(nodeModulesDir, targetName);
      const resolvedSourcePath = path.resolve(projectRoot, sourcePath);

      // 소스 경로 존재 확인
      try {
        await fs.promises.access(resolvedSourcePath);
      } catch {
        logger.warn(`소스 경로가 존재하지 않아 스킵합니다: ${resolvedSourcePath}`);
        continue;
      }

      try {
        // 기존 symlink/디렉토리 제거
        await fs.promises.rm(targetPath, { recursive: true, force: true });

        // 상대 경로로 symlink 생성
        const relativePath = path.relative(path.dirname(targetPath), resolvedSourcePath);
        await fs.promises.symlink(relativePath, targetPath, "dir");

        logger.info(`${targetName} → ${sourcePath}`);
      } catch (err) {
        logger.error(`symlink 교체 실패 (${targetName}): ${err instanceof Error ? err.message : err}`);
      }
    }
  }
}
