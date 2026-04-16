import path from "path";
import fs from "fs";
import { err as errNs } from "@simplysm/core-common";
import { consola } from "consola";

const logger = consola.withTag("sd:cli:ngtsc-build");
import { compileScssFile, compileScssString } from "./scss-compiler";
import { createOutputPathRewriter, rewriteScssImports } from "../utils/output-path-rewriter";

export function trackDeps(
  depsMap: Map<string, Set<string>>,
  containingFile: string,
  dependencies: string[],
): void {
  let deps = depsMap.get(containingFile);
  if (deps == null) {
    deps = new Set<string>();
    depsMap.set(containingFile, deps);
  }
  for (const dep of dependencies) {
    deps.add(dep);
  }
}

export function formatScssError(err: unknown, containingFile: string): string {
  const message = errNs.message(err);
  return `SCSS error in ${containingFile}: ${message}`;
}

export interface SideEffectScssEntry {
  scssAbsPath: string;
  cssAbsPath: string;
  sourceFileName: string;
}

export interface SideEffectScssOptions {
  loadPaths: string[];
  scssErrors: string[];
  scssDependencies: Map<string, Set<string>>;
  registry?: Map<string, SideEffectScssEntry>;
}

//#region Library SCSS transform

/**
 * Library용 transformStylesheet 콜백 팩토리.
 * AngularCompiler의 transformStylesheet 옵션에 주입된다.
 *
 * - 외부 .scss 파일: compileScssFile로 CSS 반환 + 의존성 기록
 * - 외부 비-SCSS 파일 (.css 등): null 반환 (readResource가 처리)
 * - 인라인 스타일: compileScssString으로 CSS 반환 + 의존성 기록
 * - 에러 시: scssErrors에 추가, SCSS error comment 반환
 */
export function createLibraryTransformStylesheet(
  loadPaths: string[],
  scssErrors: string[],
  scssDependencies: Map<string, Set<string>>,
): (data: string, containingFile: string, stylesheetFile?: string) => Promise<string | null> {
  return (
    data: string,
    containingFile: string,
    stylesheetFile?: string,
  ): Promise<string | null> => {
    try {
      if (stylesheetFile != null && stylesheetFile.endsWith(".scss")) {
        const result = compileScssFile(stylesheetFile, loadPaths);
        trackDeps(scssDependencies, containingFile, result.dependencies);
        return Promise.resolve(result.css);
      }

      if (stylesheetFile != null) {
        // .css 등 비-SCSS 파일 → null 반환 (readResource가 처리)
        return Promise.resolve(null);
      }

      // 인라인 스타일 — SCSS로 컴파일
      const result = compileScssString(data, containingFile, loadPaths);
      trackDeps(scssDependencies, containingFile, result.dependencies);
      return Promise.resolve(result.css);
    } catch (err) {
      scssErrors.push(formatScssError(err, containingFile));
      return Promise.resolve("/* SCSS compilation error */");
    }
  };
}

//#endregion

//#region Side-effect SCSS

/**
 * 레지스트리의 모든 side-effect SCSS 항목을 CSS로 컴파일한다.
 * compileGlobalScss와 동일한 패턴 — 항상 모든 항목을 재컴파일한다.
 * 에러 발생 시 scssErrors에 추가하고 기존 CSS 파일을 보존한다.
 */
export function compileSideEffectScss(
  registry: ReadonlyMap<string, SideEffectScssEntry>,
  loadPaths: string[],
  scssErrors: string[],
  scssDependencies: Map<string, Set<string>>,
): void {
  logger.debug(`side-effect SCSS 컴파일 시작 (${registry.size}개)`);
  for (const entry of registry.values()) {
    try {
      const result = compileScssFile(entry.scssAbsPath, loadPaths);
      fs.mkdirSync(path.dirname(entry.cssAbsPath), { recursive: true });
      fs.writeFileSync(entry.cssAbsPath, result.css, "utf-8");
      trackDeps(scssDependencies, entry.sourceFileName, result.dependencies);
    } catch (err) {
      scssErrors.push(formatScssError(err, entry.scssAbsPath));
    }
  }
  logger.debug("side-effect SCSS 컴파일 완료");
}

//#endregion

//#region Global SCSS

export function compileGlobalScss(
  pkgDir: string,
  loadPaths: string[],
): string[] {
  const stylesPath = path.join(pkgDir, "scss", "styles.scss");
  if (!fs.existsSync(stylesPath)) return [];
  logger.debug("global SCSS 컴파일 시작");

  const errors: string[] = [];
  try {
    const result = compileScssFile(stylesPath, loadPaths);
    const distDir = path.join(pkgDir, "dist");
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, "styles.css"), result.css, "utf-8");
  } catch (err) {
    errors.push(`Global SCSS error: ${errNs.message(err)}`);
  }
  logger.debug("global SCSS 컴파일 완료");
  return errors;
}

//#endregion

//#region writeEmitResults

export interface WriteEmitResultsOptions {
  /** 출력 대상 패키지 디렉토리 */
  pkgDir: string;
  /** emit 결과 필터 (src/ 하위만 등) */
  sourceFilter?: (fileName: string) => boolean;
  /** side-effect SCSS 옵션 */
  scss?: SideEffectScssOptions;
}

/**
 * emitAffectedFiles 결과를 output-path-rewriting 적용 후 파일로 쓴다.
 * scss 옵션이 제공되면 .js 파일 내 .scss side-effect import를 처리한다:
 * 1. import 경로를 .scss → .css로 변환
 * 2. 참조된 SCSS 파일을 CSS로 컴파일하여 dist에 출력
 */
export function writeEmitResults(
  emitResults: Iterable<{ filename: string; contents: string; sourceFileName?: string }>,
  pkgDir: string,
  scss?: SideEffectScssOptions,
): void {
  logger.debug("emit 결과 파일 쓰기 시작");
  const rewritePath = createOutputPathRewriter(pkgDir);
  for (const { filename, contents, sourceFileName } of emitResults) {
    const rewrite = rewritePath(filename, contents);
    if (rewrite == null) continue;
    let [newPath, newContent] = rewrite;

    // .js 파일 내 side-effect SCSS import 처리
    if (scss != null && newPath.endsWith(".js")) {
      const { text, scssImports } = rewriteScssImports(newContent);
      newContent = text;

      // 새 항목 등록 전에 이 소스 파일의 기존 레지스트리 항목 제거
      if (scss.registry != null && sourceFileName != null) {
        for (const [key, entry] of scss.registry) {
          if (entry.sourceFileName === sourceFileName) {
            scss.registry.delete(key);
          }
        }
      }

      if (scssImports.length > 0 && sourceFileName != null) {
        const sourceDir = path.dirname(sourceFileName);
        const outputDir = path.dirname(newPath);

        for (const scssImport of scssImports) {
          const scssAbsPath = path.resolve(sourceDir, scssImport);
          const cssFileName = scssImport.replace(/\.scss$/, ".css");
          const cssAbsPath = path.resolve(outputDir, cssFileName);

          // 레지스트리가 제공된 경우 등록 (scssAbsPath를 키로 사용하여 중복 방지)
          if (scss.registry != null) {
            scss.registry.set(scssAbsPath, { scssAbsPath, cssAbsPath, sourceFileName });
          }

          try {
            const result = compileScssFile(scssAbsPath, scss.loadPaths);
            fs.mkdirSync(path.dirname(cssAbsPath), { recursive: true });
            fs.writeFileSync(cssAbsPath, result.css, "utf-8");
            trackDeps(scss.scssDependencies, sourceFileName, result.dependencies);
          } catch (err) {
            scss.scssErrors.push(formatScssError(err, scssAbsPath));
          }
        }
      }
    }

    fs.mkdirSync(path.dirname(newPath), { recursive: true });
    fs.writeFileSync(newPath, newContent, "utf-8");
  }
  logger.debug("emit 결과 파일 쓰기 완료");
}

//#endregion

