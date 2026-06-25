import { createHash } from "crypto";
import fsp from "fs/promises";
import path from "path";
import postcss from "postcss";
import { compileScssFileAsync, compileScssStringAsync } from "./scss-compiler.js";
import { err as errNs } from "@simplysm/core-common";

export interface ClientTransformStylesheetOptions {
  loadPaths: string[];
  postcssPlugins?: unknown[];
  scssErrors: string[];
  scssDependencies: Map<string, Set<string>>;
  /** SCSS 캐시 디렉토리 (미지정 시 캐시 비활성화) */
  cacheDir?: string;
}

interface ScssCacheEntry {
  fileHash: string;
  deps: Array<{ path: string; hash: string }>;
  css: string;
}

function computeHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function cachePathFor(cacheDir: string, scssFilePath: string): string {
  const pathHash = computeHash(scssFilePath).slice(0, 16);
  return path.join(cacheDir, `${pathHash}.json`);
}

async function loadCacheEntry(cachePath: string): Promise<ScssCacheEntry | undefined> {
  try {
    const raw = await fsp.readFile(cachePath, "utf-8");
    return JSON.parse(raw) as ScssCacheEntry;
  } catch {
    return undefined;
  }
}

async function readFileHash(filePath: string): Promise<string | undefined> {
  try {
    const content = await fsp.readFile(filePath, "utf-8");
    return computeHash(content);
  } catch {
    return undefined;
  }
}

/**
 * client 빌드용 transformStylesheet 콜백 팩토리.
 * sass.compileAsync + PostCSS로 SCSS를 비동기 CSS 변환한다.
 *
 * - .scss 외부 파일: sass.compileAsync → PostCSS
 * - 인라인 SCSS (stylesheetFile 없음): sass.compileStringAsync → PostCSS
 * - .css 외부 파일: null 반환 (readResource가 원본 CSS 처리)
 */
export function createClientTransformStylesheet(
  options: ClientTransformStylesheetOptions,
): (data: string, containingFile: string, stylesheetFile?: string) => Promise<string | null> {
  const { loadPaths, postcssPlugins, scssErrors, scssDependencies, cacheDir } = options;

  const postCssProcessor =
    postcssPlugins != null && postcssPlugins.length > 0
      ? postcss(postcssPlugins as postcss.AcceptedPlugin[])
      : undefined;

  return async (
    data: string,
    containingFile: string,
    stylesheetFile?: string,
  ): Promise<string | null> => {
    // 외부 스타일시트 파일
    if (stylesheetFile != null) {
      if (stylesheetFile.endsWith(".scss")) {
        try {
          if (cacheDir != null) {
            const content = await fsp.readFile(stylesheetFile, "utf-8");
            const fileHash = computeHash(content);
            const cachePath = cachePathFor(cacheDir, stylesheetFile);
            const cached = await loadCacheEntry(cachePath);

            if (cached != null && cached.fileHash === fileHash) {
              let allDepsMatch = true;
              for (const dep of cached.deps) {
                const currentHash = await readFileHash(dep.path);
                if (currentHash !== dep.hash) {
                  allDepsMatch = false;
                  break;
                }
              }

              if (allDepsMatch) {
                if (cached.deps.length > 0) {
                  scssDependencies.set(stylesheetFile, new Set(cached.deps.map((d) => d.path)));
                }
                let css = cached.css;
                if (postCssProcessor != null) {
                  css = (await postCssProcessor.process(css, { from: stylesheetFile })).css;
                }
                return css;
              }
            }

            // 캐시 미스: compileScssStringAsync로 이중 읽기 회피 (D5)
            const result = await compileScssStringAsync(content, stylesheetFile, loadPaths);

            if (result.dependencies.length > 0) {
              scssDependencies.set(stylesheetFile, new Set(result.dependencies));
            }

            const depHashes: Array<{ path: string; hash: string }> = [];
            let allDepsHashed = true;
            for (const depPath of result.dependencies) {
              const depHash = await readFileHash(depPath);
              if (depHash != null) {
                depHashes.push({ path: depPath, hash: depHash });
              } else {
                allDepsHashed = false;
                break;
              }
            }

            if (allDepsHashed) {
              const entry: ScssCacheEntry = { fileHash, deps: depHashes, css: result.css };
              try {
                await fsp.mkdir(cacheDir, { recursive: true });
                await fsp.writeFile(cachePath, JSON.stringify(entry));
              } catch {
                // cache write failure — non-fatal
              }
            }

            let css = result.css;
            if (postCssProcessor != null) {
              css = (await postCssProcessor.process(css, { from: stylesheetFile })).css;
            }
            return css;
          }

          // cacheDir 없음: 기존 동작
          const result = await compileScssFileAsync(stylesheetFile, loadPaths);

          if (result.dependencies.length > 0) {
            scssDependencies.set(stylesheetFile, new Set(result.dependencies));
          }

          let css = result.css;
          if (postCssProcessor != null) {
            css = (await postCssProcessor.process(css, { from: stylesheetFile })).css;
          }
          return css;
        } catch (err) {
          scssErrors.push(`SCSS error in ${stylesheetFile}: ${errNs.message(err)}`);
          return "/* SCSS compilation error */";
        }
      }
      // .css → externalStylesheets의 SHA256 ID 매핑으로 처리
      return null;
    }

    // 인라인 SCSS
    try {
      const result = await compileScssStringAsync(data, containingFile, loadPaths);

      // 의존성 수집
      if (result.dependencies.length > 0) {
        scssDependencies.set(containingFile, new Set(result.dependencies));
      }

      let css = result.css;
      if (postCssProcessor != null) {
        css = (await postCssProcessor.process(css, { from: containingFile })).css;
      }
      return css;
    } catch (err) {
      scssErrors.push(`SCSS error in ${containingFile}: ${errNs.message(err)}`);
      return "/* SCSS compilation error */";
    }
  };
}
