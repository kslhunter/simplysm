import path from "path";
import { pathx } from "@simplysm/core-node";

/**
 * ESM 출력에서 확장자가 없는 상대 import/export 경로에 .js 확장자를 추가한다.
 *
 * 매칭: from "./foo", import("./bar"), from "../baz"
 * 스킵: bare 지정자("lodash"), 이미 알려진 확장자로 끝나는 경로 (.js, .json, .css 등)
 */
export function addJsExtensionToImports(text: string): string {
  return text.replace(
    /((?:from|import)\s*(?:\(\s*)?["'])(\.\.?\/[^"']*?)(["'](?:\s*\))?)/g,
    (_match, prefix: string, importPath: string, suffix: string) => {
      if (/\.(js|mjs|cjs|json|css|scss|wasm|node)$/i.test(importPath)) return _match;
      return `${prefix}${importPath}.js${suffix}`;
    },
  );
}

/**
 * emit된 JS 텍스트에서 상대 .scss import를 .css로 변환한다.
 * 변환된 텍스트와 원본 .scss import 경로 목록을 반환한다.
 *
 * 매칭: import "./foo.scss", import("./bar.scss"), from "../baz.scss"
 * 상대 import(./ 또는 ../ 시작)만 처리한다.
 */
export function rewriteScssImports(text: string): { text: string; scssImports: string[] } {
  const scssImports: string[] = [];
  const rewritten = text.replace(
    /((?:from|import)\s*(?:\(\s*)?["'])(\.\.?\/[^"']*?)(\.scss)(["'](?:\s*\))?)/g,
    (_match, prefix: string, importBase: string, _ext: string, suffix: string) => {
      scssImports.push(`${importBase}.scss`);
      return `${prefix}${importBase}.css${suffix}`;
    },
  );
  return { text: rewritten, scssImports };
}

/**
 * .d.ts.map 파일의 sources 경로를 새 위치에 맞게 조정한다.
 */
export function adjustMapSources(content: string, originalDir: string, newDir: string): string {
  if (originalDir === newDir) return content;
  try {
    const map = JSON.parse(content) as { sources?: string[] };
    if (Array.isArray(map.sources)) {
      map.sources = map.sources.map((source) => {
        const absoluteSource = path.resolve(originalDir, source);
        return pathx.posix(path.relative(newDir, absoluteSource));
      });
    }
    return JSON.stringify(map);
  } catch {
    return content;
  }
}

/**
 * NgtscProgram 출력 파일(.js, .d.ts, .d.ts.map)용 경로 재작성 함수를 생성한다.
 *
 * TypeScript/NgtscProgram은 path alias(@simplysm/*)로 참조되는 다른 패키지 소스를
 * rootDir 계산에 포함하므로 출력이 dist/{pkgName}/src/... 중첩 구조로 생성된다.
 * 반환된 함수는 이 패키지의 출력만 평면 구조(dist/...)로 재작성하고
 * 다른 패키지의 출력은 무시한다.
 *
 * @returns (fileName, content) => [newPath, newContent] | null (null이면 쓰기 스킵)
 */
export function createOutputPathRewriter(
  pkgDir: string,
): (fileName: string, content: string) => [string, string] | null {
  const pkgName = path.basename(pkgDir);
  const distDir = pathx.posixResolve(pkgDir, "dist");
  const distPrefix = distDir + "/";
  // 이 패키지의 중첩 구조 접두사: dist/{pkgName}/src/
  const ownNestedPrefix = pathx.posixResolve(distDir, pkgName, "src") + "/";

  return (fileName, content) => {
    fileName = pathx.posixResolve(fileName);

    if (!fileName.startsWith(distPrefix)) return null;

    if (fileName.startsWith(ownNestedPrefix)) {
      // 중첩 경로를 평면으로 재작성: dist/{pkgName}/src/... → dist/...
      const flatPath = pathx.posixResolve(distDir, fileName.slice(ownNestedPrefix.length));
      if (fileName.endsWith(".d.ts.map") || fileName.endsWith(".js.map")) {
        content = adjustMapSources(content, path.dirname(fileName), path.dirname(flatPath));
      }
      return [flatPath, content];
    }

    // 다른 패키지의 중첩 출력 (dist/{otherPkg}/src/...) → 무시
    const relFromDist = fileName.slice(distPrefix.length);
    const segments = relFromDist.split("/");
    if (segments.length >= 3 && segments[1] === "src") {
      return null;
    }

    // 이미 평면 구조 (src/ 하위가 아닌 경로) → 그대로 출력
    return [fileName, content];
  };
}
