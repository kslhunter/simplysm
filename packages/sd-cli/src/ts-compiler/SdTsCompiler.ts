import path from "path";
import { createHash } from "crypto";
import ts from "typescript";
import { consola, type ConsolaInstance } from "consola";
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

  // ── 크래시 디버깅용 컨텍스트 (compileAsync 내 단계/파일 진입 시 갱신) ──
  private _crashContext?: { stage: string; file?: string };

  // ── Logger ──
  // NOTE: 모듈 레벨이 아닌 인스턴스 레벨에서 생성해야 한다.
  // consola.withTag는 호출 시점의 consola.level/reporters를 스냅샷 복사하므로,
  // setupConsola 이전(모듈 import 시점)에 만들면 debug 레벨이 반영되지 않는다.
  private readonly _logger: ConsolaInstance = consola.withTag("sd:cli:SdTsCompiler");

  constructor(options: ISdTsCompilerOptions) {
    this._options = options;
  }

  private _setCrashContext(stage: string, file?: string): void {
    this._crashContext = { stage, file };
  }

  private _formatCrashContext(): string {
    const ctx = this._crashContext;
    if (ctx == null) return "unknown";
    if (ctx.file != null) {
      return `${ctx.stage} [${path.relative(this._options.cwd, ctx.file)}]`;
    }
    return ctx.stage;
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
    const { pkgDir, cwd } = this._options;
    const pkgName = path.basename(pkgDir);
    this._crashContext = undefined;

    // 1. 증분: sourceFileCache 무효화 + packageJsonCache 클리어
    if (modifiedFiles != null && modifiedFiles.size > 0) {
      const sampleFiles = [...modifiedFiles]
        .slice(0, 10)
        .map((f) => path.relative(cwd, f))
        .join(", ");
      this._logger.debug(
        `[${pkgName}] modifiedFiles (${modifiedFiles.size}개)${modifiedFiles.size > 10 ? " [상위 10개]" : ""}: ${sampleFiles}`,
      );

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

    this._logger.debug(`[${pkgName}] isForAngular: ${isForAngular}`);

    // 3. rootNames 필터링
    const rootNames = this._filterRootNames(parsed);

    this._logger.debug(`[${pkgName}] rootNames: ${rootNames.length}개`);

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

    // 8. program 생성 (체커 미진입 구간 — try 밖)
    let program: ts.Program;
    let builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram;
    let angularProgram: NgtscProgram | undefined;

    if (isForAngular) {
      // Angular: sourceFileCache 확보
      if (this._sourceFileCache == null) {
        this._sourceFileCache = this._options.sourceFileCache ?? new AngularSourceFileCache();
      }
      augmentHostWithCaching(host, this._sourceFileCache);

      // NgtscProgram 생성
      this._logger.debug(`[${pkgName}] NgtscProgram 생성 중...`);
      angularProgram = new NgtscProgram(
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

    // 9. 위험 구간 (체커 진입 — TsCompiler 내부 크래시 단일 catch)
    try {
      if (isForAngular) {
        this._setCrashContext("analyzeAsync");
        this._logger.debug(`[${pkgName}] AOT analyzeAsync 시작`);
        await angularProgram!.compiler.analyzeAsync();
        this._logger.debug(`[${pkgName}] AOT analyzeAsync 완료`);
        this._ngtscProgram = angularProgram;
      }

      // 9-1. affected files 추적
      this._setCrashContext("findAffectedFiles");
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

      if (affectedFiles != null) {
        const sample = [...affectedFiles]
          .slice(0, 10)
          .map((f) => path.relative(cwd, f))
          .join(", ");
        this._logger.debug(
          `[${pkgName}] affected files (${affectedFiles.size}개)${affectedFiles.size > 10 ? " [상위 10개]" : ""}: ${sample}`,
        );
      } else {
        this._logger.debug(`[${pkgName}] affected files: 전체 (global change)`);
      }

      // 9-2. emit 처리
      this._setCrashContext("emit");
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

      // 9-3. 진단 수집
      this._setCrashContext("collectDiagnostics");
      const rawDiagnostics = isForAngular
        ? this._collectDiagnosticsForAngular(
            this._ngtscProgram!,
            builderProgram,
            this._affectedSourceFiles,
          )
        : this._collectDiagnosticsForTsc(builderProgram);
      const diagResult = this._finalizeDiagnostics(rawDiagnostics);

      // 9-4. 글로벌 SCSS + lint 병렬 실행
      this._setCrashContext("lintAndGlobalScss");
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

      // 9-5. 상태 저장
      this._builderProgram = builderProgram;
      this._crashContext = undefined;

      this._logger.debug(`[${pkgName}] compileAsync 완료`);

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
    } catch (e) {
      // TsCompiler 내부 크래시 (TS 5.9 overload 버그 등) — 단일 에러 진단으로 degrade
      const contextLabel = this._formatCrashContext();
      const rawMsg = e instanceof Error ? (e.stack ?? e.message) : String(e);
      this._logger.debug(`[${pkgName}] crash @${contextLabel}: ${rawMsg}`);

      // per-file 프로브: affected 파일 각각을 개별 try-catch로 재체크하여 재현 파일 특정
      const probeReport = isForAngular
        ? this._probeCrashPerFileAngular(
            this._ngtscProgram,
            builderProgram,
            this._affectedSourceFiles,
          )
        : this._probeCrashPerFileTsc(builderProgram, this._affectedSourceFiles);

      const parts: string[] = [
        `TsCompiler 내부 크래시 @${contextLabel}`,
        "",
        rawMsg,
      ];
      if (probeReport.length > 0) {
        parts.push("", "크래시 재현 파일 (per-file 프로브):", ...probeReport);
      }
      const message = parts.join("\n");

      const crashDiag: SerializedDiagnostic = {
        category: ts.DiagnosticCategory.Error,
        code: 0,
        messageText: message,
      };
      return {
        program,
        builderProgram,
        isForAngular,
        affectedFiles: undefined,
        diagnostics: [crashDiag],
        errorCount: 1,
        warningCount: 0,
        errors: [message],
        ngtscProgram: this._ngtscProgram,
        emitResults: undefined,
        lint: undefined,
        scssErrors: [...this._scssErrors],
        scssDependencies: new Map(this._scssDependencies),
      };
    }
  }

  /**
   * 크래시 발생 후, affected sourceFile을 개별 try-catch로 재검사하여 원인 파일을 특정한다.
   * Angular: `getDiagnosticsForFile(sf, SingleFile)` + `builderProgram.getSemanticDiagnostics(sf)` 개별 호출.
   * 각 파일별로 크래시 재현 여부를 기록. 프로브 자체 크래시는 흡수한다.
   */
  private _probeCrashPerFileAngular(
    ngtscProgram: NgtscProgram | undefined,
    builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram,
    affectedSourceFiles: ReadonlySet<ts.SourceFile>,
  ): string[] {
    const report: string[] = [];
    const angularCompiler = ngtscProgram?.compiler;
    const { cwd } = this._options;

    for (const sf of affectedSourceFiles) {
      if (angularCompiler?.ignoreForDiagnostics.has(sf) === true) continue;

      const rel = path.relative(cwd, sf.fileName);

      try {
        builderProgram.getSemanticDiagnostics(sf);
      } catch (e) {
        report.push(
          `  - ${rel} [getSemanticDiagnostics]: ${e instanceof Error ? e.message : String(e)}`,
        );
        continue;
      }

      if (angularCompiler != null && !sf.isDeclarationFile) {
        try {
          angularCompiler.getDiagnosticsForFile(sf, OptimizeFor.SingleFile);
        } catch (e) {
          report.push(
            `  - ${rel} [getDiagnosticsForFile]: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    }
    return report;
  }

  private _probeCrashPerFileTsc(
    builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram,
    affectedSourceFiles: ReadonlySet<ts.SourceFile>,
  ): string[] {
    const report: string[] = [];
    const { cwd } = this._options;

    const targets =
      affectedSourceFiles.size > 0
        ? affectedSourceFiles
        : new Set(builderProgram.getSourceFiles());

    for (const sf of targets) {
      try {
        builderProgram.getSemanticDiagnostics(sf);
      } catch (e) {
        const rel = path.relative(cwd, sf.fileName);
        report.push(
          `  - ${rel} [getSemanticDiagnostics]: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    return report;
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

    this._logger.debug(`[${pkgName}] lint 시작`);
    const result = await this._lintRunner.lint({
      program,
      affectedFiles,
    });
    this._logger.debug(`[${pkgName}] lint 완료 (에러: ${result.errorCount}, 경고: ${result.warningCount})`);

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
    const diagnostics: ts.Diagnostic[] = [
      ...builderProgram.getConfigFileParsingDiagnostics(),
      ...builderProgram.getSyntacticDiagnostics(),
      ...builderProgram.getOptionsDiagnostics(),
      ...builderProgram.getGlobalDiagnostics(),
      ...builderProgram.getSemanticDiagnostics(),
    ];
    if (!this._options.output.dts) {
      diagnostics.push(...builderProgram.getProgram().getDeclarationDiagnostics());
    }
    return diagnostics;
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

      this._setCrashContext("collectDiagnostics.getSemanticDiagnostics", sourceFile.fileName);
      diagnostics.push(...builderProgram.getSyntacticDiagnostics(sourceFile));
      diagnostics.push(...builderProgram.getSemanticDiagnostics(sourceFile));

      // Declaration files는 Angular 진단 없음
      if (sourceFile.isDeclarationFile) {
        continue;
      }

      // Angular 템플릿 진단 (diagnosticCache 활용)
      if (affectedSourceFiles.has(sourceFile)) {
        this._setCrashContext("collectDiagnostics.getDiagnosticsForFile", sourceFile.fileName);
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
    this._setCrashContext("emit.prepareEmit");
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
      this._setCrashContext("emit.tsProgram.emit", sourceFile.fileName);
      tsProgram.emit(
        sourceFile,
        writeFileCallback,
        undefined,
        emitDeclarationOnly,
        transformers,
      );
    }

    this._setCrashContext("emit.builderProgram.emit");
    builderProgram.emit(undefined, () => {});

    // sourceFilter 적용
    this._logger.debug(`emitAffectedFiles 완료 (${emitResults.length}개 파일)`);
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
        return undefined;
      }
    }
    return affectedFiles;
  }

  private _findAffectedFilesForAngular(
    builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram,
    angularCompiler: NgCompiler,
    sourceFileCache?: AngularSourceFileCache,
  ): {
    affectedSourceFiles: Set<ts.SourceFile>;
    affectedPaths: ReadonlySet<string> | undefined;
  } {
    this._logger.debug("Angular affected 파일 탐색 시작");
    const affectedSourceFiles = new Set<ts.SourceFile>();
    let isGlobalChange = false;

    while (true) {
      const result = builderProgram.getSemanticDiagnosticsOfNextAffectedFile(
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

    this._logger.debug(`Angular affected 파일 탐색 완료 (${affectedSourceFiles.size}개)`);
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
