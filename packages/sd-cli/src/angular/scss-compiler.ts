import * as sass from "sass";
import { pathToFileURL } from "url";

//#region Types

export interface ScssCompileResult {
  css: string;
  /** 컴파일에 참여한 의존 파일 목록 (loadedUrls -> 절대 경로) */
  dependencies: string[];
}

//#endregion

//#region Private helpers

function extractDependencies(loadedUrls: URL[]): string[] {
  return loadedUrls
    .filter((url) => url.protocol === "file:")
    .map((url) => url.pathname.replace(/^\/([A-Za-z]:)/, "$1"));
}

//#endregion

//#region Public API

/** 인라인 SCSS 문자열을 CSS로 컴파일한다 */
export function compileScssString(
  source: string,
  containingFile: string,
  loadPaths: string[],
): ScssCompileResult {
  const result = sass.compileString(source, {
    url: pathToFileURL(containingFile),
    loadPaths,
    silenceDeprecations: ["color-functions", "global-builtin", "import", "legacy-js-api"],
  });
  return {
    css: result.css,
    dependencies: extractDependencies(result.loadedUrls),
  };
}

/** 외부 SCSS 파일을 CSS로 컴파일한다 */
export function compileScssFile(
  filePath: string,
  loadPaths: string[],
): ScssCompileResult {
  const result = sass.compile(filePath, {
    loadPaths,
    silenceDeprecations: ["color-functions", "global-builtin", "import", "legacy-js-api"],
  });
  return {
    css: result.css,
    dependencies: extractDependencies(result.loadedUrls),
  };
}

/** 인라인 SCSS 문자열을 비동기로 CSS로 컴파일한다 */
export async function compileScssStringAsync(
  source: string,
  containingFile: string,
  loadPaths: string[],
): Promise<ScssCompileResult> {
  const result = await sass.compileStringAsync(source, {
    url: pathToFileURL(containingFile),
    loadPaths,
    silenceDeprecations: ["color-functions", "global-builtin", "import", "legacy-js-api"],
  });
  return {
    css: result.css,
    dependencies: extractDependencies(result.loadedUrls),
  };
}

/** 외부 SCSS 파일을 비동기로 CSS로 컴파일한다 */
export async function compileScssFileAsync(
  filePath: string,
  loadPaths: string[],
): Promise<ScssCompileResult> {
  const result = await sass.compileAsync(filePath, {
    loadPaths,
    silenceDeprecations: ["color-functions", "global-builtin", "import", "legacy-js-api"],
  });
  return {
    css: result.css,
    dependencies: extractDependencies(result.loadedUrls),
  };
}

//#endregion
