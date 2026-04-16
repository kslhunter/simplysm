import path from "path";
import { createHash } from "crypto";
import ts from "typescript";
import { consola } from "consola";
import { pathx } from "@simplysm/core-node";
import type { ISdTsCompilerOptions, ISdTsCompilerEmitOptions } from "./sd-ts-compiler-options";
import type { ISdTsCompilerResult } from "./sd-ts-compiler-result";
import type { EmitResult } from "../angular/angular-compiler";
import {
  parseTsconfig,
  getPackageSourceFiles,
  getPackageFiles,
  getCompilerOptionsForEnv,
} from "../utils/tsconfig";
import { createOutputPathRewriter, addJsExtensionToImports } from "../utils/output-path-rewriter";
import { serializeDiagnostic, type SerializedDiagnostic } from "../typecheck/typecheck-serialization";
import { isWorkspaceDiagnostic, formatDiagnosticError } from "../utils/diagnostic-utils";
import { NgtscProgram, OptimizeFor } from "../angular/angular-build";
import {
  AngularSourceFileCache,
  augmentHostWithCaching,
} from "../angular/angular-compiler";
import {
  createLibraryTransformStylesheet,
  compileGlobalScss,
  compileSideEffectScss as compileSideEffectScssEntries,
  type SideEffectScssEntry,
} from "../angular/ngtsc-build-core";
import { LintWithProgramRunner, type LintWithProgramResult } from "../lint/lint-with-program";

const logger = consola.withTag("sd:cli:SdTsCompiler");

type NgCompiler = NgtscProgram["compiler"];

function hasTemplateExtension(file: string): boolean {
  const ext = path.extname(file).toLowerCase();
  return ext === ".htm" || ext === ".html" || ext === ".svg";
}

function ensureSourceFileVersions(program: ts.Program): void {
  const baseGetSourceFiles = program.getSourceFiles;
  program.getSourceFiles = function (...parameters: Parameters<typeof baseGetSourceFiles>) {
    const files = baseGetSourceFiles.apply(this, parameters);
    for (const file of files) {
      if ((file as unknown as { version?: string }).version == null) {
        (file as unknown as { version: string }).version = createHash("sha256")
          .update(file.text)
          .digest("hex");
      }
    }
    return files;
  };
}

export class SdTsCompiler {
  private readonly _options: ISdTsCompilerOptions;

  // ── 파생 상태 (첫 compileAsync에서 결정) ──
  private _isForAngular?: boolean;
  private _sourceFileCache?: AngularSourceFileCache;

  // ── 컴파일 상태 (compileAsync마다 갱신) ──
  private _ngtscProgram?: NgtscProgram;
  private _builderProgram?: ts.EmitAndSemanticDiagnosticsBuilderProgram;

  // ── 영속 상태 (compileAsync 간 재사용) ──
  private _packageJsonCache?: ts.PackageJsonInfoCache;
  private readonly _diagnosticCache = new WeakMap<ts.SourceFile, ts.Diagnostic[]>();

  // ── affected files (compileAsync에서 갱신, emit/diagnostics에서 사용) ──
  private _affectedSourceFiles = new Set<ts.SourceFile>();

  // ── SCSS 상태 (compileAsync마다 리셋)
  private readonly _scssErrors: string[] = [];
  private readonly _scssDependencies = new Map<string, Set<string>>();

  // ── Side-effect SCSS (compileAsync 간 유지) ──
  private readonly _sideEffectScssRegistry = new Map<string, SideEffectScssEntry>();

  // ── Lint (lazy init, 인스턴스 재사용) ──
  private _lintRunner?: LintWithProgramRunner;

  constructor(options: ISdTsCompilerOptions) {
    this._options = options;
  }

  private _getScssLoadPaths(): string[] {
    const { pkgDir, cwd } = this._options;
    return [path.join(pkgDir, "scss"), path.join(cwd, "node_modules")];
  }

  /** Side-effect SCSS 레지스트리 참조 (emit 코드에서 항목 등록용) */
  get sideEffectScssRegistry(): Map<string, SideEffectScssEntry> {
    return this._sideEffectScssRegistry;
  }

  /** Side-effect SCSS 레지스트리의 모든 항목을 CSS로 컴파일 */
  compileSideEffectScss(): void {
    const loadPaths = this._getScssLoadPaths();
    compileSideEffectScssEntries(
      this._sideEffectScssRegistry,
      loadPaths,
      this._scssErrors,
      this._scssDependencies,
    );
  }

  /** SCSS 의존성 역방향 탐색: scssPath에 의존하는 파일 목록 반환 */
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

  async compileAsync(
    modifiedFiles?: ReadonlySet<string>,
    emitOptions?: ISdTsCompilerEmitOptions,
  ): Promise<ISdTsCompilerResult> {
    const { pkgDir } = this._options;
    const pkgName = path.basename(pkgDir);

    // 1. 증분: sourceFileCache 무효화 + packageJsonCache 클리어
    if (modifiedFiles != null && modifiedFiles.size > 0) {
      if (this._sourceFileCache != null) {
        this._sourceFileCache.invalidate(modifiedFiles);
      }

      // node_modules 변경 시 packageJsonCache 클리어 (stale 모듈 해석 방지)
      if (this._packageJsonCache != null) {
        for (const file of modifiedFiles) {
          if (file.includes("node_modules")) {
            this._packageJsonCache.clear();
            break;
          }
        }
      }
    }

    // 2. tsconfig 파싱 (매 호출)
    const parsed = parseTsconfig(pkgDir);
    const isForAngular = parsed.raw?.angularCompilerOptions != null;
    this._isForAngular = isForAngular;
    const angularCompilerOptions = isForAngular
      ? (parsed.raw.angularCompilerOptions as Record<string, unknown>)
      : undefined;

    logger.debug(`[${pkgName}] isForAngular: ${isForAngular}`);

    // 3. rootNames 필터링
    const rootNames = this._filterRootNames(parsed);

    logger.debug(`[${pkgName}] rootNames: ${rootNames.length}개`);

    // 4. compilerOptions 구성
    const compilerOptions = this._buildCompilerOptions(
      parsed.options,
      isForAngular,
      angularCompilerOptions,
    );

    // 5. SCSS 상태 리셋
    this._scssErrors.length = 0;
    this._scssDependencies.clear();

    // 6. transformStylesheet 결정: isForAngular + 미제공 시 라이브러리 콜백 자동 생성
    let effectiveTransformStylesheet = this._options.transformStylesheet;
    if (isForAngular && effectiveTransformStylesheet == null) {
      const loadPaths = this._getScssLoadPaths();
      effectiveTransformStylesheet = createLibraryTransformStylesheet(
        loadPaths,
        this._scssErrors,
        this._scssDependencies,
      );
    }

    // 7. compiler host 생성
    const host = this._createHost(compilerOptions, isForAngular, effectiveTransformStylesheet);

    // 8. program 생성
    let program: ts.Program;
    let builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram;

    if (isForAngular) {
      // Angular: sourceFileCache 확보
      if (this._sourceFileCache == null) {
        this._sourceFileCache = this._options.sourceFileCache ?? new AngularSourceFileCache();
      }
      augmentHostWithCaching(host, this._sourceFileCache);

      // NgtscProgram 생성
      logger.debug(`[${pkgName}] NgtscProgram 생성 중...`);
      const angularProgram = new NgtscProgram(
        rootNames,
        compilerOptions,
        host,
        this._ngtscProgram,
      );

      const tsProgram = angularProgram.getTsProgram();
      ensureSourceFileVersions(tsProgram);

      builderProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
        tsProgram,
        host,
        this._builderProgram,
      );
      program = tsProgram;

      // 7. Angular analyzeAsync
      logger.debug(`[${pkgName}] AOT analyzeAsync 시작`);
      await angularProgram.compiler.analyzeAsync();
      logger.debug(`[${pkgName}] AOT analyzeAsync 완료`);

      this._ngtscProgram = angularProgram;
    } else {
      // Non-Angular: BuilderProgram 직접 생성
      builderProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
        rootNames,
        compilerOptions,
        host,
        this._builderProgram,
      );
      program = builderProgram.getProgram();
    }

    // 8. affected files 추적
    let affectedFiles: ReadonlySet<string> | undefined;
    if (isForAngular) {
      const result = this._findAffectedFilesForAngular(
        builderProgram,
        this._ngtscProgram!.compiler,
        this._sourceFileCache,
      );
      this._affectedSourceFiles = result.affectedSourceFiles;
      affectedFiles = result.affectedPaths;
    } else {
      affectedFiles = this._findAffectedFilesForTsc(builderProgram);
    }

    logger.debug(`[${pkgName}] affected files: ${affectedFiles != null ? `${affectedFiles.size}개` : "전체 (global change)"}`);

    // 9. emit 처리
    let emitResults: EmitResult[] | undefined;
    if (isForAngular) {
      emitResults = this._emitAngular(
        this._ngtscProgram!,
        builderProgram,
        this._affectedSourceFiles,
        emitOptions,
      );
    } else {
      this._emitTsc(builderProgram);
    }

    // 10. 진단 수집
    let rawDiagnostics: ts.Diagnostic[];
    if (isForAngular) {
      rawDiagnostics = this._collectDiagnosticsForAngular(
        this._ngtscProgram!,
        builderProgram,
        this._affectedSourceFiles,
      );
    } else {
      rawDiagnostics = this._collectDiagnosticsForTsc(builderProgram);
    }
    const diagResult = this._finalizeDiagnostics(rawDiagnostics);

    // 11. 글로벌 SCSS + lint 병렬 실행
    const [, lintResult] = await Promise.all([
      // globalScss
      this._options.globalScss === true
        ? Promise.resolve().then(() => {
            const loadPaths = this._getScssLoadPaths();
            const globalScssErrors = compileGlobalScss(pkgDir, loadPaths);
            this._scssErrors.push(...globalScssErrors);
          })
        : Promise.resolve(),
      // lint
      this._options.lint === true
        ? this._runLint(program, affectedFiles)
        : Promise.resolve(undefined),
    ]);

    // 12. 상태 저장
    this._builderProgram = builderProgram;

    logger.debug(`[${pkgName}] compileAsync 완료`);

    return {
      program,
      builderProgram,
      isForAngular,
      affectedFiles,
      diagnostics: diagResult.diagnostics,
      errorCount: diagResult.errorCount,
      warningCount: diagResult.warningCount,
      errors: diagResult.errors,
      ngtscProgram: this._ngtscProgram,
      emitResults,
      lint: lintResult,
      scssErrors: [...this._scssErrors],
      scssDependencies: new Map(this._scssDependencies),
    };
  }

  private async _runLint(
    program: ts.Program,
    affectedFiles?: ReadonlySet<string>,
  ): Promise<LintWithProgramResult> {
    const { cwd, pkgDir } = this._options;
    const pkgName = path.basename(pkgDir);

    if (this._lintRunner == null) {
      this._lintRunner = new LintWithProgramRunner({
        cwd,
        pkgName,
      });
    }

    logger.debug(`[${pkgName}] lint 시작`);
    const result = await this._lintRunner.lint({
      program,
      affectedFiles,
    });
    logger.debug(`[${pkgName}] lint 완료 (에러: ${result.errorCount}, 경고: ${result.warningCount})`);

    return result;
  }

  private _filterRootNames(parsed: ts.ParsedCommandLine): string[] {
    const { pkgDir, includeTests } = this._options;

    if (includeTests === true) {
      return getPackageFiles(pkgDir, parsed);
    }
    return getPackageSourceFiles(pkgDir, parsed);
  }

  private _buildCompilerOptions(
    baseOptions: ts.CompilerOptions,
    isForAngular: boolean,
    angularCompilerOptions?: Record<string, unknown>,
  ): ts.CompilerOptions {
    const { pkgDir, output, env, compilerOptionsTransformer } = this._options;
    const needsEmit = output.js || output.dts;

    // env 조정
    let options = env != null
      ? getCompilerOptionsForEnv(baseOptions, env, pkgDir)
      : { ...baseOptions };

    // output 플래그
    options.sourceMap = !isForAngular && output.js;
    options.incremental = true;
    options.outDir = path.join(pkgDir, "dist");

    if (output.js && output.dts) {
      options.noEmit = false;
      options.emitDeclarationOnly = false;
      options.declaration = true;
      options.declarationMap = true;
      options.declarationDir = path.join(pkgDir, "dist");
    } else if (output.js) {
      options.noEmit = false;
      options.emitDeclarationOnly = false;
      options.declaration = false;
      options.declarationMap = false;
    } else if (output.dts) {
      options.noEmit = false;
      options.emitDeclarationOnly = true;
      options.declaration = true;
      options.declarationMap = true;
      options.declarationDir = path.join(pkgDir, "dist");
    } else {
      options.noEmit = true;
      options.emitDeclarationOnly = false;
      options.declaration = false;
      options.declarationMap = false;
    }

    // Angular compilerOptions 병합
    if (angularCompilerOptions != null) {
      options = { ...options, ...(angularCompilerOptions as ts.CompilerOptions) };
    }

    // tsBuildInfoFile
    const envSuffix = env != null ? `-${env}` : "";
    const prefix = isForAngular ? "ngtsc-" : "";
    options.tsBuildInfoFile = path.join(
      pkgDir,
      ".cache",
      needsEmit
        ? `${prefix}build${output.dts ? "" : "-no-dts"}${envSuffix}.tsbuildinfo`
        : `${prefix}typecheck${envSuffix}.tsbuildinfo`,
    );

    // compilerOptionsTransformer 적용
    if (compilerOptionsTransformer != null) {
      options = compilerOptionsTransformer(options);
    }

    return options;
  }

  private _createHost(
    compilerOptions: ts.CompilerOptions,
    isForAngular: boolean,
    effectiveTransformStylesheet?: ISdTsCompilerOptions["transformStylesheet"],
  ): ts.CompilerHost {
    const host = ts.createIncrementalCompilerHost(compilerOptions);
    const { pkgDir, output } = this._options;
    const needsEmit = output.js || output.dts;

    // Non-Angular emit용 writeFile 훅
    if (!isForAngular && needsEmit) {
      const rewritePath = createOutputPathRewriter(pkgDir);
      const originalWriteFile = host.writeFile;
      host.writeFile = (fileName, content, writeByteOrderMark, onError, sourceFiles, data) => {
        const result = rewritePath(fileName, content);
        if (result != null) {
          let [newPath, newContent] = result;
          if (newPath.endsWith(".js")) {
            newContent = addJsExtensionToImports(newContent);
          }
          originalWriteFile(newPath, newContent, writeByteOrderMark, onError, sourceFiles, data);
        }
      };
    }

    // Angular host 확장
    if (isForAngular) {
      this._extendHostForAngular(host, effectiveTransformStylesheet);
    }

    // moduleResolutionCache
    const moduleResolutionCache = ts.createModuleResolutionCache(
      host.getCurrentDirectory(),
      host.getCanonicalFileName.bind(host),
      compilerOptions,
      this._packageJsonCache,
    );
    host.getModuleResolutionCache = () => moduleResolutionCache;

    if (this._packageJsonCache == null) {
      this._packageJsonCache = moduleResolutionCache.getPackageJsonInfoCache();
    }

    return host;
  }

  private _collectDiagnosticsForTsc(
    builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram,
  ): ts.Diagnostic[] {
    return [
      ...builderProgram.getConfigFileParsingDiagnostics(),
      ...builderProgram.getSyntacticDiagnostics(),
      ...builderProgram.getOptionsDiagnostics(),
      ...builderProgram.getGlobalDiagnostics(),
      ...builderProgram.getSemanticDiagnostics(),
      ...(!this._options.output.dts ? builderProgram.getProgram().getDeclarationDiagnostics() : []),
    ];
  }

  private _collectDiagnosticsForAngular(
    ngtscProgram: NgtscProgram,
    builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram,
    affectedSourceFiles: Set<ts.SourceFile>,
  ): ts.Diagnostic[] {
    const angularCompiler = ngtscProgram.compiler;
    const diagnostics: ts.Diagnostic[] = [];
    const optimization =
      affectedSourceFiles.size === 1 ? OptimizeFor.SingleFile : OptimizeFor.WholeProgram;

    // 1. Option 진단
    diagnostics.push(...builderProgram.getConfigFileParsingDiagnostics());
    diagnostics.push(...angularCompiler.getOptionDiagnostics());
    diagnostics.push(...builderProgram.getOptionsDiagnostics());

    // 2. Global
    diagnostics.push(...builderProgram.getGlobalDiagnostics());

    // 3. 파일별 루프
    for (const sourceFile of builderProgram.getSourceFiles()) {
      if (angularCompiler.ignoreForDiagnostics.has(sourceFile)) {
        continue;
      }

      diagnostics.push(...builderProgram.getSyntacticDiagnostics(sourceFile));

      // TypeScript 5.9 + NgtscProgram: getSemanticDiagnostics 크래시 방어
      let semanticDiags: readonly ts.Diagnostic[];
      try {
        semanticDiags = builderProgram.getSemanticDiagnostics(sourceFile);
      } catch {
        logger.debug(`getSemanticDiagnostics 크래시 (무시): ${sourceFile.fileName}`);
        semanticDiags = [];
      }
      diagnostics.push(...semanticDiags);

      // Declaration files는 Angular 진단 없음
      if (sourceFile.isDeclarationFile) {
        continue;
      }

      // Angular 템플릿 진단 (diagnosticCache 활용)
      if (affectedSourceFiles.has(sourceFile)) {
        const angularDiagnostics = angularCompiler.getDiagnosticsForFile(
          sourceFile,
          optimization,
        );
        this._diagnosticCache.set(sourceFile, angularDiagnostics);
        diagnostics.push(...angularDiagnostics);
      } else {
        const cached = this._diagnosticCache.get(sourceFile);
        if (cached) {
          diagnostics.push(...cached);
        }
      }
    }

    return diagnostics;
  }

  private _finalizeDiagnostics(rawDiagnostics: ts.Diagnostic[]): {
    diagnostics: SerializedDiagnostic[];
    errorCount: number;
    warningCount: number;
    errors?: string[];
  } {
    const filtered = rawDiagnostics.filter((d) => isWorkspaceDiagnostic(d, this._options.cwd));
    const serialized = filtered.map(serializeDiagnostic);
    const errorCount = filtered.filter((d) => d.category === ts.DiagnosticCategory.Error).length;
    const warningCount = filtered.filter(
      (d) => d.category === ts.DiagnosticCategory.Warning,
    ).length;
    const errors = filtered
      .filter((d) => d.category === ts.DiagnosticCategory.Error)
      .map((d) => formatDiagnosticError(d, this._options.cwd));
    return {
      diagnostics: serialized,
      errorCount,
      warningCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private _emitTsc(
    builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram,
  ): void {
    builderProgram.emit();
  }

  private _emitAngular(
    ngtscProgram: NgtscProgram,
    builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram,
    affectedSourceFiles: Set<ts.SourceFile>,
    emitOptions?: ISdTsCompilerEmitOptions,
  ): EmitResult[] | undefined {
    const compilerOptions = builderProgram.getCompilerOptions();

    // noEmit이면 emit 건너뜀
    if (compilerOptions.noEmit) {
      return undefined;
    }

    const angularCompiler = ngtscProgram.compiler;
    const tsProgram = ngtscProgram.getTsProgram();

    // prepareEmit() → Angular transformers 획득
    const transformers = angularCompiler.prepareEmit().transformers;
    transformers.before ??= [];
    transformers.after ??= [];

    // additionalTransformers 병합
    if (emitOptions?.additionalTransformers != null) {
      if (emitOptions.additionalTransformers.before != null) {
        transformers.before.push(...emitOptions.additionalTransformers.before);
      }
      if (emitOptions.additionalTransformers.after != null) {
        transformers.after.push(...emitOptions.additionalTransformers.after);
      }
    }

    // emit 결과를 수집
    const emitResults: EmitResult[] = [];
    const emitDeclarationOnly = !!compilerOptions.emitDeclarationOnly;

    const writeFileCallback: ts.WriteFileCallback = (
      filename,
      contents,
      _writeByteOrderMark,
      _onError,
      sourceFiles,
    ) => {
      if (sourceFiles == null || sourceFiles.length === 0) {
        return;
      }
      const sourceFile = ts.getOriginalNode(sourceFiles[0], ts.isSourceFile);
      if (angularCompiler.ignoreForEmit.has(sourceFile)) {
        return;
      }
      angularCompiler.incrementalCompilation.recordSuccessfulEmit(sourceFile);
      emitResults.push({ filename, contents, sourceFileName: sourceFile.fileName });
    };

    // per-file emit
    for (const sourceFile of tsProgram.getSourceFiles()) {
      if (angularCompiler.ignoreForEmit.has(sourceFile)) {
        continue;
      }
      if (sourceFile.isDeclarationFile) {
        continue;
      }
      if (
        angularCompiler.incrementalCompilation.safeToSkipEmit(sourceFile) &&
        !affectedSourceFiles.has(sourceFile)
      ) {
        continue;
      }
      tsProgram.emit(
        sourceFile,
        writeFileCallback,
        undefined,
        emitDeclarationOnly,
        transformers,
      );
    }

    // .tsbuildinfo 영속화 (try-catch: TS 5.9 + NgtscProgram 크래시 방어)
    try {
      builderProgram.emit(undefined, () => {});
    } catch {
      logger.debug("builderProgram.emit 크래시 (무시) — tsbuildinfo 영속화 생략");
    }

    // sourceFilter 적용
    logger.debug(`emitAffectedFiles 완료 (${emitResults.length}개 파일)`);
    if (emitOptions?.sourceFilter != null) {
      return emitResults.filter((r) => emitOptions.sourceFilter!(r.sourceFileName));
    }
    return emitResults;
  }

  private _findAffectedFilesForTsc(
    builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram,
  ): ReadonlySet<string> | undefined {
    const affectedFiles = new Set<string>();
    while (true) {
      const result = builderProgram.getSemanticDiagnosticsOfNextAffectedFile();
      if (result == null) break;
      if ("fileName" in result.affected) {
        affectedFiles.add(pathx.posix(result.affected.fileName));
      } else {
        // ts.Program 반환 — 전역 변경, 전체 리빌드로 처리
        return undefined;
      }
    }
    return affectedFiles;
  }

  private _findAffectedFilesForAngular(
    builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram,
    angularCompiler: NgCompiler,
    sourceFileCache?: AngularSourceFileCache,
  ): { affectedSourceFiles: Set<ts.SourceFile>; affectedPaths: ReadonlySet<string> | undefined } {
    logger.debug("Angular affected 파일 탐색 시작");
    const affectedSourceFiles = new Set<ts.SourceFile>();
    let isGlobalChange = false;

    while (true) {
      let result: ReturnType<typeof builderProgram.getSemanticDiagnosticsOfNextAffectedFile>;
      try {
        result = builderProgram.getSemanticDiagnosticsOfNextAffectedFile(
          undefined,
          (sourceFile) => {
            if (
              angularCompiler.ignoreForDiagnostics.has(sourceFile) &&
              sourceFile.fileName.endsWith(".ngtypecheck.ts")
            ) {
              const originalFilename = sourceFile.fileName.slice(0, -15) + ".ts";
              const originalSourceFile = builderProgram.getSourceFile(originalFilename);
              if (originalSourceFile) {
                affectedSourceFiles.add(originalSourceFile);
              }
              return true;
            }
            return false;
          },
        );
      } catch {
        logger.debug("getSemanticDiagnosticsOfNextAffectedFile 크래시 (무시) — 모든 소스를 affected로 처리");
        for (const sourceFile of builderProgram.getSourceFiles()) {
          if (!angularCompiler.ignoreForDiagnostics.has(sourceFile)) {
            affectedSourceFiles.add(sourceFile);
          }
        }
        break;
      }
      if (!result) break;
      if ("fileName" in result.affected) {
        affectedSourceFiles.add(result.affected);
      } else {
        isGlobalChange = true;
        for (const sourceFile of builderProgram.getSourceFiles()) {
          if (!angularCompiler.ignoreForDiagnostics.has(sourceFile)) {
            affectedSourceFiles.add(sourceFile);
          }
        }
      }
    }

    // 리소스 의존성 기반 diagnosticCache 무효화
    if (sourceFileCache != null && sourceFileCache.modifiedFiles.size > 0) {
      const normalizedModifiedFiles = new Set<string>();
      for (const f of sourceFileCache.modifiedFiles) {
        normalizedModifiedFiles.add(pathx.posix(f));
      }

      for (const sourceFile of builderProgram.getSourceFiles()) {
        if (angularCompiler.ignoreForEmit.has(sourceFile)) {
          continue;
        }
        const resourceDependencies = angularCompiler.getResourceDependencies(sourceFile);
        for (const resourceDep of resourceDependencies) {
          if (normalizedModifiedFiles.has(pathx.posix(resourceDep))) {
            this._diagnosticCache.delete(sourceFile);
            affectedSourceFiles.add(sourceFile);
            break;
          }
        }
      }
    }

    // affectedPaths 변환
    let affectedPaths: ReadonlySet<string> | undefined;
    if (isGlobalChange) {
      affectedPaths = undefined;
    } else {
      const paths = new Set<string>();
      for (const sf of affectedSourceFiles) {
        paths.add(pathx.posix(sf.fileName));
      }
      affectedPaths = paths;
    }

    logger.debug(`Angular affected 파일 탐색 완료 (${affectedSourceFiles.size}개)`);
    return { affectedSourceFiles, affectedPaths };
  }

  private _extendHostForAngular(
    host: ts.CompilerHost,
    effectiveTransformStylesheet?: ISdTsCompilerOptions["transformStylesheet"],
  ): void {
    const hostAny = host as ts.CompilerHost & Record<string, unknown>;
    const { externalStylesheets, sourceFileCache } = this._options;
    const transformStylesheet = effectiveTransformStylesheet;

    // readResource
    hostAny["readResource"] = (fileName: string) => {
      return host.readFile(fileName) ?? "";
    };

    // transformResource
    if (transformStylesheet != null) {
      hostAny["transformResource"] = async (
        data: string,
        context: { type: string; containingFile: string; resourceFile: string | null },
      ) => {
        if (context.type !== "style") {
          return null;
        }
        if (data.trim().length === 0) {
          return { content: "" };
        }
        const result = await transformStylesheet(
          data,
          context.containingFile,
          context.resourceFile ?? undefined,
        );
        return typeof result === "string" ? { content: result } : null;
      };
    }

    // getModifiedResourceFiles
    const cache = this._sourceFileCache ?? sourceFileCache;
    if (cache != null) {
      hostAny["getModifiedResourceFiles"] = () => cache.modifiedFiles;
    }

    // resourceNameToFileName
    hostAny["resourceNameToFileName"] = (
      resourceName: string,
      containingFile: string,
    ): string | null => {
      const resolvedPath = path.join(path.dirname(containingFile), resourceName);
      if (!host.fileExists(resolvedPath)) {
        return null;
      }
      if (externalStylesheets == null || hasTemplateExtension(resolvedPath)) {
        return resolvedPath;
      }
      let externalId = externalStylesheets.get(resolvedPath);
      if (externalId == null) {
        externalId = createHash("sha256").update(resolvedPath).digest("hex");
        externalStylesheets.set(resolvedPath, externalId);
      }
      return externalId + ".css";
    };
  }
}
