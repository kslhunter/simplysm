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

    for (const targetName of targetNames) {
      const match = regex.exec(targetName);
      if (match == null) continue;

      // 캡처 그룹이 있으면 소스 경로의 *에 치환
      const captured = match[1];
      const sourcePath = captured != null ? sourceTemplate.replace(/\*/g, captured) : sourceTemplate;

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
