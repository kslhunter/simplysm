import path from "path";
import fs from "fs";
import ts from "typescript";
import { err as errNs } from "@simplysm/core-common";
import { consola } from "consola";

const logger = consola.withTag("sd:cli:ngtsc-build");
import type { BuildOutput } from "../engines/types";
import type { SerializedDiagnostic } from "./typecheck-serialization";
import { serializeDiagnostic } from "./typecheck-serialization";
import type { LintWithProgramResult } from "./lint-with-program";
import {
  parseTsconfig,
  getPackageSourceFiles,
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
  /** Typecheck environment. When set, adjusts compilerOptions via getCompilerOptionsForEnv(). */
  env?: TypecheckEnv;
  /** replaceDeps configuration from sd.config.ts */
  replaceDeps?: Record<string, string>;
}

export interface NgtscBuildResult {
  js: { success: boolean; errors?: string[]; warnings?: string[] };
  dts: { success: boolean; errors?: string[]; diagnostics: SerializedDiagnostic[] };
  lint?: LintWithProgramResult;
}

/** runNgtscBuild 내부 반환 타입. program은 워커 내에서 lint 용도로만 사용된다. */
export interface NgtscBuildInternalResult extends NgtscBuildResult {
  program?: ts.Program;
}

export interface NgtscCombinedBuildEvent {
  js: { success: boolean; errors?: string[]; warnings?: string[] };
  dts: { success: boolean; errors?: string[] };
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
    // both false — typecheck only
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
  const rewritePath = createOutputPathRewriter(pkgDir);
  for (const { filename, contents, sourceFileName } of emitResults) {
    const rewrite = rewritePath(filename, contents);
    if (rewrite == null) continue;
    let [newPath, newContent] = rewrite;

    // Process side-effect SCSS imports in .js files
    if (scss != null && newPath.endsWith(".js")) {
      const { text, scssImports } = rewriteScssImports(newContent);
      newContent = text;

      // Clear stale registry entries for this source file before registering new ones
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

          // Register in registry if provided (keyed by scssAbsPath for uniqueness)
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
}

//#region Side-effect SCSS

/**
 * Compile all side-effect SCSS entries in the registry to CSS.
 * Follows the same pattern as compileGlobalScss — always recompiles all entries.
 * On error, adds to scssErrors and preserves existing CSS file.
 */
export function compileSideEffectScss(
  registry: ReadonlyMap<string, SideEffectScssEntry>,
  loadPaths: string[],
  scssErrors: string[],
  scssDependencies: Map<string, Set<string>>,
): void {
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
}

//#endregion

//#region Global SCSS

export function compileGlobalScss(
  pkgDir: string,
  loadPaths: string[],
): string[] {
  const stylesPath = path.join(pkgDir, "scss", "styles.scss");
  if (!fs.existsSync(stylesPath)) return [];

  const errors: string[] = [];
  try {
    const result = compileScssFile(stylesPath, loadPaths);
    const distDir = path.join(pkgDir, "dist");
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, "styles.css"), result.css, "utf-8");
  } catch (err) {
    errors.push(`Global SCSS error: ${errNs.message(err)}`);
  }
  return errors;
}

//#endregion

/**
 * Run a full Angular library build using AngularCompiler.
 * (parse, initialize, diagnostics, emit, global SCSS)
 */
export async function runNgtscBuild(info: NgtscBuildInfo): Promise<NgtscBuildInternalResult> {
  try {
    logger.debug(`[${info.name}] ngtsc 빌드 시작 (env: ${info.env ?? "none"}, js: ${info.output.js}, dts: ${info.output.dts})`);

    const parsedConfig = parseTsconfig(info.pkgDir);
    const sourceFiles = getPackageSourceFiles(info.pkgDir, parsedConfig);
    logger.debug(`[${info.name}] rootNames: ${sourceFiles.length}개 파일`);

    const baseOptions =
      info.env != null
        ? getCompilerOptionsForEnv(parsedConfig.options, info.env, info.pkgDir)
        : parsedConfig.options;
    const compilerOptions = buildCompilerOptions(baseOptions, info.pkgDir, info.output);
    const pkgSrcDir = path.join(info.pkgDir, "src");
    const normalizedSrcDir = pkgSrcDir.replace(/\\/g, "/");

    // Read angularCompilerOptions from root tsconfig
    const rootTsconfigPath = path.join(info.cwd, "tsconfig.json");
    const rootRawConfig = ts.readConfigFile(rootTsconfigPath, ts.sys.readFile);
    const angularOptions = rootRawConfig.config?.angularCompilerOptions ?? {};

    // SCSS closure variables
    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();
    const loadPaths = buildScssLoadPaths(info);

    // Create AngularCompiler
    logger.debug(`[${info.name}] AngularCompiler 생성 중...`);
    const compiler = new AngularCompiler({
      rootNames: sourceFiles,
      compilerOptions,
      angularCompilerOptions: angularOptions,
      transformStylesheet: createLibraryTransformStylesheet(loadPaths, scssErrors, scssDependencies),
    });

    // Initialize (creates program, AOT analysis, finds affected files)
    logger.debug(`[${info.name}] AngularCompiler 초기화 중...`);
    await compiler.initialize();
    logger.debug(`[${info.name}] AngularCompiler 초기화 완료`);

    // Collect diagnostics — workspace scope (no package-level filtering)
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

    // Emit via AngularCompiler + output-path-rewriting
    const emitResults = compiler.emitAffectedFiles({
      sourceFilter: (fileName: string) =>
        fileName.replace(/\\/g, "/").startsWith(normalizedSrcDir + "/"),
    });
    writeEmitResults(emitResults, info.pkgDir, {
      loadPaths,
      scssErrors,
      scssDependencies,
    });

    // Global SCSS compilation
    const globalScssErrors = compileGlobalScss(info.pkgDir, loadPaths);

    const allErrors = [...errors, ...scssErrors, ...globalScssErrors];
    logger.debug(`[${info.name}] ngtsc 빌드 완료 (성공: ${errorCount === 0 && scssErrors.length === 0 && globalScssErrors.length === 0})`);

    const buildSuccess = errorCount === 0 && scssErrors.length === 0 && globalScssErrors.length === 0;

    return {
      js: {
        success: buildSuccess,
        errors: allErrors.length > 0 ? allErrors : undefined,
        warnings: undefined,
      },
      dts: {
        success: buildSuccess,
        errors: allErrors.length > 0 ? allErrors : undefined,
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
      js: { success: false, errors: [message] },
      dts: { success: false, errors: [message], diagnostics: [] },
    };
  }
}

