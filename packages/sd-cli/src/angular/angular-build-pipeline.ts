import path from "path";
import fs from "fs";
import ts from "typescript";
import { pathx } from "@simplysm/core-node";
import { consola } from "consola";
import { AngularCompiler, type AngularSourceFileCache } from "./angular-compiler.js";
import type { EmitResult } from "./angular-compiler.js";
import {
  trackDeps,
  formatScssError,
  type SideEffectScssOptions,
} from "./ngtsc-build-core.js";
import { createClientTransformStylesheet } from "./client-transform-stylesheet.js";
import { isWorkspaceDiagnostic } from "../utils/diagnostic-utils.js";
import { compileScssString, compileScssFile } from "./scss-compiler.js";
import { createOutputPathRewriter, rewriteScssImports } from "../utils/output-path-rewriter.js";

const logger = consola.withTag("sd:cli:build-pipeline");

//#region Types

export interface PipelineDiagnosticMessage {
  file?: string;
  line?: number;
  message: string;
}

export interface PipelineDiagnosticResult {
  errors: PipelineDiagnosticMessage[];
  warnings: PipelineDiagnosticMessage[];
}

export interface PipelineResult {
  affectedFiles: ReadonlySet<ts.SourceFile>;
  diagnostics: PipelineDiagnosticResult;
  scssErrors: string[];
}

export interface WriteEmitResultsOptions {
  /** 출력 대상 패키지 디렉토리 */
  pkgDir: string;
  /** emit 결과 필터 (src/ 하위만 등) */
  sourceFilter?: (fileName: string) => boolean;
  /** side-effect SCSS 옵션 */
  scss?: SideEffectScssOptions;
}

export interface AngularBuildPipelineOptions {
  /** Pipeline 모드. SCSS 콜백 동작을 결정한다. */
  mode: "client" | "library";
  /** 패키지 디렉토리 */
  pkgDir: string;
  /** workspace 루트 */
  cwd: string;
  /** 소스 파일 목록 */
  rootNames: string[];
  /** TypeScript 컴파일러 옵션 */
  compilerOptions: ts.CompilerOptions;
  /** Angular 컴파일러 옵션 */
  angularCompilerOptions?: Record<string, unknown>;

  // AngularCompiler 전달 옵션
  sourceFileCache?: AngularSourceFileCache;
  externalStylesheets?: Map<string, string>;
  compilerOptionsTransformer?: (opts: ts.CompilerOptions) => ts.CompilerOptions;

  // client 모드 전용
  postcssPlugins?: unknown[];
  scssCacheDir?: string;
}

//#endregion

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

//#region writeEmitResults

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

export class AngularBuildPipeline {
  private _compiler: AngularCompiler | undefined;
  private readonly _scssDependencies = new Map<string, Set<string>>();
  private readonly _scssErrors: string[] = [];
  private readonly _emittedFilesBySource = new Map<string, string>();
  private _latestEmitResults: EmitResult[] = [];
  private _lastDiagnostics: PipelineDiagnosticResult = { errors: [], warnings: [] };

  constructor(private readonly _options: AngularBuildPipelineOptions) {}

  async initialize(): Promise<PipelineResult> {
    // 1. scssErrors 리셋 (in-place, 콜백 클로저 유지)
    this._scssErrors.length = 0;

    // 2. SCSS 콜백 + AngularCompiler 생성 (최초 1회)
    if (this._compiler == null) {
      const loadPaths = [
        path.join(this._options.pkgDir, "scss"),
        path.join(this._options.cwd, "node_modules"),
      ];

      const transformStylesheet =
        this._options.mode === "client"
          ? createClientTransformStylesheet({
              loadPaths,
              postcssPlugins: this._options.postcssPlugins,
              scssErrors: this._scssErrors,
              scssDependencies: this._scssDependencies,
              cacheDir: this._options.scssCacheDir,
            })
          : createLibraryTransformStylesheet(
              loadPaths,
              this._scssErrors,
              this._scssDependencies,
            );

      this._compiler = new AngularCompiler({
        rootNames: this._options.rootNames,
        compilerOptions: this._options.compilerOptions,
        angularCompilerOptions: this._options.angularCompilerOptions,
        sourceFileCache: this._options.sourceFileCache,
        transformStylesheet,
        externalStylesheets: this._options.externalStylesheets,
        compilerOptionsTransformer: this._options.compilerOptionsTransformer,
      });
    }

    // 3. 초기화
    logger.debug("Pipeline initialize 시작");
    const initResult = await this._compiler.initialize();

    // 4. emit 결과 수집
    this._emittedFilesBySource.clear();
    this._latestEmitResults = [];
    for (const result of this._compiler.emitAffectedFiles()) {
      const normalizedSource = pathx.posix(result.sourceFileName);
      this._emittedFilesBySource.set(normalizedSource, result.contents);
      this._latestEmitResults.push(result);
    }
    logger.debug(`Pipeline emit 완료: ${this._latestEmitResults.length}개 파일`);

    // 5. 진단 수집
    this._lastDiagnostics = this._collectDiagnostics();

    const pipelineResult: PipelineResult = {
      affectedFiles: initResult.affectedFiles,
      diagnostics: this._lastDiagnostics,
      scssErrors: [...this._scssErrors],
    };

    logger.debug(`Pipeline initialize 완료 (errors: ${this._lastDiagnostics.errors.length})`);
    return pipelineResult;
  }

  async update(modifiedFiles: Iterable<string>): Promise<PipelineResult> {
    if (this._compiler == null) {
      throw new Error("initialize()를 먼저 호출해야 합니다");
    }

    // scssErrors 리셋
    this._scssErrors.length = 0;

    // compiler.update() — 내부적으로 sourceFileCache 무효화 + 재초기화
    const updateResult = await this._compiler.update(modifiedFiles);

    // emit 재수집 (기존 Map은 클리어하지 않음 — 추가/갱신만)
    this._latestEmitResults = [];
    for (const result of this._compiler.emitAffectedFiles()) {
      const normalizedSource = pathx.posix(result.sourceFileName);
      this._emittedFilesBySource.set(normalizedSource, result.contents);
      this._latestEmitResults.push(result);
    }

    // 진단 재수집
    this._lastDiagnostics = this._collectDiagnostics();

    return {
      affectedFiles: updateResult.affectedFiles,
      diagnostics: this._lastDiagnostics,
      scssErrors: [...this._scssErrors],
    };
  }

  getEmittedFile(sourcePath: string): string | undefined {
    const normalized = pathx.posix(sourcePath);
    return this._emittedFilesBySource.get(normalized);
  }

  getEmittedFiles(): ReadonlyMap<string, string> {
    return this._emittedFilesBySource;
  }

  /** 직전 initialize()/update()에서 실제로 emit된 소스 파일 경로 목록을 반환한다. */
  getLatestEmittedSourcePaths(): string[] {
    return this._latestEmitResults.map((r) => pathx.posix(r.sourceFileName));
  }

  writeEmitResults(options?: WriteEmitResultsOptions): void {
    const pkgDir = options?.pkgDir ?? this._options.pkgDir;
    const filteredResults =
      options?.sourceFilter != null
        ? this._latestEmitResults.filter((r) => options.sourceFilter!(r.sourceFileName))
        : this._latestEmitResults;

    writeEmitResults(filteredResults, pkgDir, options?.scss);
  }

  findAffectedByScss(scssPath: string): string[] {
    const normalizedPath = pathx.posix(scssPath);
    const affected: string[] = [];
    for (const [ownerFile, deps] of this._scssDependencies) {
      if (deps.has(normalizedPath)) {
        affected.push(ownerFile);
      }
    }
    return affected;
  }

  getDiagnostics(): PipelineDiagnosticResult {
    return this._lastDiagnostics;
  }

  getScssErrors(): readonly string[] {
    return this._scssErrors;
  }

  collectRawDiagnostics(): ts.Diagnostic[] {
    if (this._compiler == null) {
      throw new Error("initialize()를 먼저 호출해야 합니다");
    }
    return [...this._compiler.collectDiagnostics()].filter(
      (d) => isWorkspaceDiagnostic(d, this._options.cwd),
    );
  }

  getTsProgram(): ts.Program {
    if (this._compiler == null) {
      throw new Error("initialize()를 먼저 호출해야 합니다");
    }
    return this._compiler.getTsProgram();
  }

  /**
   * 내부 SCSS 의존성 맵을 반환한다.
   * 호출자가 side-effect SCSS 의존성을 같은 맵에 기록하여
   * findAffectedByScss()에서 통합 역방향 탐색이 가능하게 한다.
   */
  getScssDependencies(): Map<string, Set<string>> {
    return this._scssDependencies;
  }

  clearScssDependencies(): void {
    this._scssDependencies.clear();
  }

  updateRootNames(rootNames: string[]): void {
    this._options.rootNames = rootNames;
    this._compiler?.updateRootNames(rootNames);
  }

  private _collectDiagnostics(): PipelineDiagnosticResult {
    if (this._compiler == null) {
      return { errors: [], warnings: [] };
    }

    const errors: PipelineDiagnosticMessage[] = [];
    const warnings: PipelineDiagnosticMessage[] = [];

    try {
      for (const diagnostic of this._compiler.collectDiagnostics()) {
        if (!isWorkspaceDiagnostic(diagnostic, this._options.cwd)) continue;

        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        const formatted: PipelineDiagnosticMessage = { message };

        if (diagnostic.file != null) {
          formatted.file = diagnostic.file.fileName;
          if (diagnostic.start != null) {
            const pos = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            formatted.line = pos.line + 1;
          }
        }

        if (diagnostic.category === ts.DiagnosticCategory.Error) {
          errors.push(formatted);
        } else if (diagnostic.category === ts.DiagnosticCategory.Warning) {
          warnings.push(formatted);
        }
      }
    } catch {
      // TypeScript 5.9 + NgtscProgram: getSemanticDiagnostics 내부에서
      // referencedFiles 인덱스 불일치로 크래시할 수 있음.
      // 수집된 진단 결과까지만 반환한다.
      logger.warn("진단 수집 중 TypeScript 내부 에러 발생 — 부분 진단 결과 반환");
    }

    return { errors, warnings };
  }
}
