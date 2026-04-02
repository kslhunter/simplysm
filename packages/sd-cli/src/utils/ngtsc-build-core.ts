import path from "path";
import fs from "fs";
import ts from "typescript";
import { err as errNs } from "@simplysm/core-common";
import { pathx } from "@simplysm/core-node";
import { consola } from "consola";

const logger = consola.withTag("sd:cli:ngtsc-build");
import type { BuildOutput } from "../engines/types";
import type { SerializedDiagnostic } from "./typecheck-serialization";
import { serializeDiagnostic } from "./typecheck-serialization";
import type { LintWithProgramResult } from "./lint-with-program";
import {
  parseTsconfig,
  getPackageSourceFiles,
  getPackageFiles,
  getCompilerOptionsForEnv,
  type TypecheckEnv,
} from "./tsconfig";
import { AngularCompiler } from "./angular-compiler";
import { createOutputPathRewriter, rewriteScssImports } from "./output-path-rewriter";
import { compileScssString, compileScssFile } from "./scss-compiler";
import { isWorkspaceDiagnostic, formatDiagnosticError } from "./diagnostic-utils";

//#region Types

export interface NgtscBuildInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  output: BuildOutput;
  /** 타입체크 환경. 설정 시 getCompilerOptionsForEnv()로 compilerOptions를 조정한다. */
  env?: TypecheckEnv;
  /** sd.config.ts의 replaceDeps 설정 */
  replaceDeps?: Record<string, string>;
}

export interface NgtscBuildResult {
  build: { success: boolean; errors?: string[]; warnings?: string[]; diagnostics: SerializedDiagnostic[] };
  lint?: LintWithProgramResult;
}

/** runNgtscBuild 내부 반환 타입. program은 워커 내에서 lint 용도로만 사용한다. */
export interface NgtscBuildInternalResult extends NgtscBuildResult {
  program?: ts.Program;
}

export interface NgtscCombinedBuildEvent {
  build: { success: boolean; errors?: string[]; warnings?: string[] };
  lint?: LintWithProgramResult;
}

//#endregion

//#region CompilerOptions helpers

export function buildCompilerOptions(
  baseOptions: ts.CompilerOptions,
  pkgDir: string,
  output: BuildOutput,
): ts.CompilerOptions {
  const options: ts.CompilerOptions = {
    ...baseOptions,
    sourceMap: false,
    outDir: path.join(pkgDir, "dist"),
  };

  if (output.js && output.dts) {
    options.noEmit = false;
    options.declaration = true;
    options.declarationMap = true;
    options.emitDeclarationOnly = false;
    options.declarationDir = path.join(pkgDir, "dist");
  } else if (output.js && !output.dts) {
    options.noEmit = false;
    options.declaration = false;
    options.declarationMap = false;
    options.emitDeclarationOnly = false;
  } else if (!output.js && output.dts) {
    options.noEmit = false;
    options.declaration = true;
    options.declarationMap = true;
    options.emitDeclarationOnly = true;
    options.declarationDir = path.join(pkgDir, "dist");
  } else {
    // 둘 다 false — 타입체크만 수행
    options.noEmit = true;
    options.declaration = false;
    options.declarationMap = false;
    options.emitDeclarationOnly = false;
  }

  return options;
}

//#endregion

//#region SCSS loadPaths helper

export function buildScssLoadPaths(info: NgtscBuildInfo): string[] {
  return [
    path.join(info.pkgDir, "scss"),
    path.join(info.cwd, "node_modules"),
  ];
}

//#endregion

function trackDeps(
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

function formatScssError(err: unknown, containingFile: string): string {
  const message = errNs.message(err);
  return `SCSS error in ${containingFile}: ${message}`;
}

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

/**
 * AngularCompiler를 사용한 전체 Angular 라이브러리 빌드를 수행한다.
 * (파싱, 초기화, 진단, emit, global SCSS)
 */
export async function runNgtscBuild(info: NgtscBuildInfo): Promise<NgtscBuildInternalResult> {
  try {
    logger.debug(`[${info.name}] ngtsc 빌드 시작 (env: ${info.env ?? "none"}, js: ${info.output.js}, dts: ${info.output.dts})`);

    const parsedConfig = parseTsconfig(info.pkgDir);
    const sourceFiles = info.output.includeTests === true
      ? getPackageFiles(info.pkgDir, parsedConfig)
      : getPackageSourceFiles(info.pkgDir, parsedConfig);
    logger.debug(`[${info.name}] rootNames: ${sourceFiles.length}개 파일`);

    const baseOptions =
      info.env != null
        ? getCompilerOptionsForEnv(parsedConfig.options, info.env, info.pkgDir)
        : parsedConfig.options;
    const compilerOptions = buildCompilerOptions(baseOptions, info.pkgDir, info.output);
    const pkgSrcDir = path.join(info.pkgDir, "src");
    const normalizedSrcDir = pathx.posix(pkgSrcDir);

    const angularOptions = (parsedConfig.raw?.angularCompilerOptions ?? {}) as Record<string, unknown>;

    // SCSS closure variables
    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();
    const loadPaths = buildScssLoadPaths(info);

    // AngularCompiler 생성
    logger.debug(`[${info.name}] AngularCompiler 생성 중...`);
    const compiler = new AngularCompiler({
      rootNames: sourceFiles,
      compilerOptions,
      angularCompilerOptions: angularOptions,
      transformStylesheet: createLibraryTransformStylesheet(loadPaths, scssErrors, scssDependencies),
    });

    // 초기화 (프로그램 생성, AOT 분석, affected 파일 탐색)
    logger.debug(`[${info.name}] AngularCompiler 초기화 중...`);
    await compiler.initialize();
    logger.debug(`[${info.name}] AngularCompiler 초기화 완료`);

    // 진단 수집 — workspace 스코프 (패키지 단위 필터링 없음)
    const allDiagnostics = [...compiler.collectDiagnostics()].filter(
      (d) => isWorkspaceDiagnostic(d, info.cwd),
    );

    const serialized = allDiagnostics.map(serializeDiagnostic);
    const errorCount = allDiagnostics.filter(
      (d) => d.category === ts.DiagnosticCategory.Error,
    ).length;
    logger.debug(`[${info.name}] 진단 수집 완료 (에러: ${errorCount}, 전체: ${allDiagnostics.length})`);

    const errors = allDiagnostics
      .filter((d) => d.category === ts.DiagnosticCategory.Error)
      .map(formatDiagnosticError);

    // AngularCompiler를 통한 emit + output-path-rewriting
    const emitResults = compiler.emitAffectedFiles({
      sourceFilter: (fileName: string) =>
        pathx.posix(fileName).startsWith(normalizedSrcDir + "/"),
    });
    writeEmitResults(emitResults, info.pkgDir, {
      loadPaths,
      scssErrors,
      scssDependencies,
    });

    // Global SCSS 컴파일
    const globalScssErrors = compileGlobalScss(info.pkgDir, loadPaths);

    const allErrors = [...errors, ...scssErrors, ...globalScssErrors];
    logger.debug(`[${info.name}] ngtsc 빌드 완료 (성공: ${errorCount === 0 && scssErrors.length === 0 && globalScssErrors.length === 0})`);

    const buildSuccess = errorCount === 0 && scssErrors.length === 0 && globalScssErrors.length === 0;

    return {
      build: {
        success: buildSuccess,
        errors: allErrors.length > 0 ? allErrors : undefined,
        warnings: undefined,
        diagnostics: serialized,
      },
      program: compiler.getTsProgram(),
    };
  } catch (err) {
    const message = errNs.message(err);
    const stack = err instanceof Error ? err.stack : undefined;
    logger.debug(`[${info.name}] ngtsc 빌드 예외 발생: ${message}`);
    if (stack != null) {
      logger.debug(`[${info.name}] 스택 트레이스:\n${stack}`);
    }
    return {
      build: { success: false, errors: [message], diagnostics: [] },
    };
  }
}

