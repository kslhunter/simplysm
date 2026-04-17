import path from "path";
import { pathx } from "@simplysm/core-node";
import { init, parse } from "es-module-lexer";

await init;

const KNOWN_JS_EXTENSIONS = /\.(js|mjs|cjs|json|css|scss|wasm|node)$/i;

/**
 * es-module-lexer의 import에서 specifier 내용의 시작/끝 위치를 반환한다.
 *
 * static import (d === -1): s..e가 따옴표 없는 specifier 내용
 * dynamic import (d >= 0): s..e가 따옴표를 포함한 문자열 리터럴
 */
function getSpecifierRange(imp: { s: number; e: number; d: number }): [number, number] {
  if (imp.d >= 0) {
    return [imp.s + 1, imp.e - 1];
  }
  return [imp.s, imp.e];
}

/**
 * ESM 출력에서 확장자가 없는 상대 import/export 경로에 .js 확장자를 추가한다.
 *
 * es-module-lexer를 사용하여 import/export specifier 위치를 정확히 파악한다.
 * 주석, 문자열 리터럴 내부의 패턴은 무시된다.
 *
 * 매칭: from "./foo", import("./bar"), from "../baz", export { x } from "./qux"
 * 스킵: bare 지정자("lodash"), 이미 알려진 확장자로 끝나는 경로 (.js, .json, .css 등)
 */
export function addJsExtensionToImports(text: string): string {
  const [imports] = parse(text);
  if (imports.length === 0) return text;

  // 역순으로 치환하여 위치 밀림 방지
  const sorted = [...imports].sort((a, b) => b.s - a.s);
  let result = text;

  for (const imp of sorted) {
    const specifier = imp.n;
    if (specifier == null) continue;
    if (!specifier.startsWith("./") && !specifier.startsWith("../")) continue;
    if (KNOWN_JS_EXTENSIONS.test(specifier)) continue;

    const [start, end] = getSpecifierRange(imp);
    result = result.slice(0, start) + specifier + ".js" + result.slice(end);
  }

  return result;
}

/**
 * emit된 JS 텍스트에서 상대 .scss import를 .css로 변환한다.
 * 변환된 텍스트와 원본 .scss import 경로 목록을 반환한다.
 *
 * es-module-lexer를 사용하여 import specifier 위치를 정확히 파악한다.
 * 상대 import(./ 또는 ../ 시작)만 처리한다.
 */
export function rewriteScssImports(text: string): { text: string; scssImports: string[] } {
  const [imports] = parse(text);
  if (imports.length === 0) return { text, scssImports: [] };

  const scssImports: string[] = [];

  // 역순으로 치환하여 위치 밀림 방지
  const sorted = [...imports].sort((a, b) => b.s - a.s);
  let result = text;

  for (const imp of sorted) {
    const specifier = imp.n;
    if (specifier == null) continue;
    if (!specifier.startsWith("./") && !specifier.startsWith("../")) continue;
    if (!specifier.endsWith(".scss")) continue;

    scssImports.push(specifier);
    const newSpec = specifier.slice(0, -5) + ".css";
    const [start, end] = getSpecifierRange(imp);
    result = result.slice(0, start) + newSpec + result.slice(end);
  }

  // 역순으로 수집되었으므로 원래 순서로 복원
  scssImports.reverse();

  return { text: result, scssImports };
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
