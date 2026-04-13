import path from "path";
import { createHash } from "crypto";
import ts from "typescript";
import { consola } from "consola";
import { pathx } from "@simplysm/core-node";
import { NgtscProgram, OptimizeFor } from "./angular-build";

const logger = consola.withTag("sd:cli:angular-compiler");

// NgCompiler 타입은 NgtscProgram.compiler에서 추론한다 (exports 제한으로 직접 import 불가할 수 있음)
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
      if ((file as unknown as { version?: string }).version === undefined) {
        (file as unknown as { version: string }).version = createHash("sha256").update(file.text).digest("hex");
      }
    }
    return files;
  };
}

export interface EmitResult {
  filename: string;
  contents: string;
  /** emit의 원본 소스 파일 경로 */
  sourceFileName: string;
}

export interface EmitOptions {
  /** emit 대상 소스 디렉토리 필터 (지정 시 해당 디렉토리의 파일만 emit) */
  sourceFilter?: (fileName: string) => boolean;
  /** Angular transformers 외 추가 transformers */
  additionalTransformers?: {
    before?: ts.TransformerFactory<ts.SourceFile>[];
    after?: ts.TransformerFactory<ts.SourceFile>[];
  };
}

export interface AngularCompilerOptions {
  rootNames: string[];
  compilerOptions: ts.CompilerOptions;
  angularCompilerOptions?: Record<string, unknown>;
  sourceFileCache?: AngularSourceFileCache;
  transformStylesheet?: (
    data: string,
    containingFile: string,
    stylesheetFile?: string,
  ) => Promise<string | null>;
  compilerOptionsTransformer?: (options: ts.CompilerOptions) => ts.CompilerOptions;
  externalStylesheets?: Map<string, string>;
}

export class AngularSourceFileCache extends Map<string, ts.SourceFile> {
  readonly modifiedFiles = new Set<string>();

  invalidate(files: Iterable<string>): void {
    for (const file of files) {
      const normalized = pathx.posix(file);
      this.delete(normalized);
      this.modifiedFiles.add(normalized);
    }
  }
}

export function augmentHostWithCaching(
  host: ts.CompilerHost,
  cache: AngularSourceFileCache,
): void {
  const baseGetSourceFile = host.getSourceFile;
  host.getSourceFile = function (
    fileName: string,
    languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions,
    onError?: (message: string) => void,
    shouldCreateNewSourceFile?: boolean,
    ...rest: unknown[]
  ): ts.SourceFile | undefined {
    if (!shouldCreateNewSourceFile && cache.has(fileName)) {
      return cache.get(fileName);
    }
    const file = (baseGetSourceFile as Function).call(
      host,
      fileName,
      languageVersionOrOptions,
      onError,
      true,
      ...rest,
    ) as ts.SourceFile | undefined;
    if (file) {
      cache.set(fileName, file);
    }
    return file;
  };
}

export class AngularCompiler {
  // ── 설정 (불변) ──
  private readonly _options: AngularCompilerOptions;

  // ── 컴파일 상태 (initialize마다 재생성) ──
  private _ngtscProgram?: NgtscProgram;
  private _builderProgram?: ts.EmitAndSemanticDiagnosticsBuilderProgram;
  private _host?: ts.CompilerHost;
  private _affectedFiles = new Set<ts.SourceFile>();

  // ── 영속 상태 (initialize 간 재사용) ──
  private readonly _diagnosticCache = new WeakMap<ts.SourceFile, ts.Diagnostic[]>();
  private _packageJsonCache?: ts.PackageJsonInfoCache;

  constructor(options: AngularCompilerOptions) {
    this._options = options;
  }

  updateRootNames(rootNames: string[]): void {
    this._options.rootNames = rootNames;
  }

  get ngtscProgram(): NgtscProgram | undefined {
    return this._ngtscProgram;
  }

  get compiler(): NgCompiler {
    if (this._ngtscProgram == null) {
      throw new Error("initialize()를 먼저 호출해야 합니다");
    }
    return this._ngtscProgram.compiler;
  }

  getTsProgram(): ts.Program {
    if (this._ngtscProgram == null) {
      throw new Error("initialize()를 먼저 호출해야 합니다");
    }
    return this._ngtscProgram.getTsProgram();
  }

  async initialize(): Promise<{
    affectedFiles: ReadonlySet<ts.SourceFile>;
  }> {
    const options = this._options;
    const sourceFileCache = options.sourceFileCache;

    // 1. packageJsonCache 관리
    if (sourceFileCache != null && this._packageJsonCache != null) {
      let shouldClear = false;
      for (const modifiedFile of sourceFileCache.modifiedFiles) {
        if (modifiedFile.includes("node_modules")) {
          shouldClear = true;
          break;
        }
      }
      if (shouldClear) {
        this._packageJsonCache.clear();
      }
    }

    // 2. compilerOptionsTransformer 적용
    let compilerOptions = options.compilerOptions;
    if (options.compilerOptionsTransformer != null) {
      compilerOptions = options.compilerOptionsTransformer(compilerOptions);
    }

    // angularCompilerOptions 병합
    const mergedOptions: ts.CompilerOptions = options.angularCompilerOptions != null
      ? { ...compilerOptions, ...(options.angularCompilerOptions as ts.CompilerOptions) }
      : compilerOptions;

    // 3. ts.createIncrementalCompilerHost 생성
    const host = ts.createIncrementalCompilerHost(mergedOptions);

    // 4. Angular 호스트 확장 설정
    const hostAny = host as ts.CompilerHost & Record<string, unknown>;

    hostAny["readResource"] = (fileName: string) => {
      return host.readFile(fileName) ?? "";
    };

    if (options.transformStylesheet != null) {
      const transformStylesheet = options.transformStylesheet;
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

    if (sourceFileCache != null) {
      hostAny["getModifiedResourceFiles"] = () => sourceFileCache.modifiedFiles;
    }

    hostAny["resourceNameToFileName"] = (
      resourceName: string,
      containingFile: string,
    ): string | null => {
      const resolvedPath = path.join(path.dirname(containingFile), resourceName);
      if (!host.fileExists(resolvedPath)) {
        return null;
      }
      if (options.externalStylesheets == null || hasTemplateExtension(resolvedPath)) {
        return resolvedPath;
      }
      // externalStylesheets를 사용한 스타일시트 처리 (클라이언트 모드)
      let externalId = options.externalStylesheets.get(resolvedPath);
      if (externalId === undefined) {
        externalId = createHash("sha256").update(resolvedPath).digest("hex");
        options.externalStylesheets.set(resolvedPath, externalId);
      }
      return externalId + ".css";
    };

    // 5. 모듈 해석 캐시 생성
    const moduleResolutionCache = ts.createModuleResolutionCache(
      host.getCurrentDirectory(),
      host.getCanonicalFileName.bind(host),
      mergedOptions,
      this._packageJsonCache,
    );
    host.getModuleResolutionCache = () => moduleResolutionCache;

    // packageJsonCache를 moduleResolutionCache에서 추출하여 재사용
    if (this._packageJsonCache == null) {
      this._packageJsonCache = moduleResolutionCache.getPackageJsonInfoCache();
    }

    // 6. SourceFileCache 통합
    if (sourceFileCache != null) {
      augmentHostWithCaching(host, sourceFileCache);
    }

    // 7. NgtscProgram 생성
    logger.debug(`NgtscProgram 생성 중... (rootNames: ${options.rootNames.length}개, incremental: ${this._ngtscProgram != null})`);
    const angularProgram = new NgtscProgram(
      options.rootNames,
      mergedOptions,
      host,
      this._ngtscProgram,
    );

    // 8. ensureSourceFileVersions
    const tsProgram = angularProgram.getTsProgram();
    ensureSourceFileVersions(tsProgram);
    const programFiles = tsProgram.getSourceFiles();
    logger.debug(`ts.Program 소스 파일: ${programFiles.length}개`);

    // 9. BuilderProgram 생성 (진단 + affected file 탐지용)
    //    .tsbuildinfo에서 이전 상태를 복원하여 프로세스 재시작 후에도 incremental 진단 유지
    let oldBuilderProgram = this._builderProgram;
    if (oldBuilderProgram == null) {
      oldBuilderProgram = ts.readBuilderProgram(mergedOptions, host) ?? undefined;
    }
    const builderProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
      tsProgram,
      host,
      oldBuilderProgram,
    );

    // 10. AOT 분석
    logger.debug("AOT analyzeAsync 시작");
    await angularProgram.compiler.analyzeAsync();
    logger.debug("AOT analyzeAsync 완료");

    // 11. findAffectedFiles (내부에서 리소스 의존성 기반 diagnosticCache 무효화도 수행)
    const affectedFiles = this._findAffectedFiles(
      builderProgram,
      angularProgram.compiler,
      sourceFileCache,
    );

    // 13. 상태 저장
    this._ngtscProgram = angularProgram;
    this._builderProgram = builderProgram;
    this._host = host;
    this._affectedFiles = affectedFiles;

    logger.debug(`initialize 완료 (affected: ${affectedFiles.size}개)`);
    return { affectedFiles };
  }

  private _findAffectedFiles(
    builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram,
    angularCompiler: NgCompiler,
    sourceFileCache?: AngularSourceFileCache,
  ): Set<ts.SourceFile> {
    logger.debug("affected 파일 탐색 시작");
    const affectedFiles = new Set<ts.SourceFile>();

    while (true) {
      // TypeScript 5.9 + NgtscProgram: getSemanticDiagnosticsOfNextAffectedFile가
      // referencedFiles 인덱스 불일치로 크래시할 수 있음 (fixture 등 비표준 rootNames 포함 시)
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
                affectedFiles.add(originalSourceFile);
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
            affectedFiles.add(sourceFile);
          }
        }
        break;
      }
      if (!result) {
        break;
      }
      if ("fileName" in result.affected) {
        // ts.SourceFile — 단일 파일 변경
        affectedFiles.add(result.affected);
      } else {
        // ts.Program — 전역 스코프 변경, 모든 소스 파일을 affected로 처리
        for (const sourceFile of builderProgram.getSourceFiles()) {
          if (!angularCompiler.ignoreForDiagnostics.has(sourceFile)) {
            affectedFiles.add(sourceFile);
          }
        }
      }
    }

    // 리소스 의존성 기반 diagnosticCache 무효화
    if (sourceFileCache != null && sourceFileCache.modifiedFiles.size > 0) {
      // modifiedFiles의 경로를 정규화한 Set 생성 (Windows backslash 대응)
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
            affectedFiles.add(sourceFile);
            break;
          }
        }
      }
    }

    logger.debug(`affected 파일 탐색 완료 (${affectedFiles.size}개)`);
    return affectedFiles;
  }

  async update(
    modifiedFiles: Iterable<string>,
  ): Promise<{
    affectedFiles: ReadonlySet<ts.SourceFile>;
  }> {
    logger.debug("증분 업데이트 시작");
    const sourceFileCache = this._options.sourceFileCache;
    if (sourceFileCache == null) {
      throw new Error("sourceFileCache가 없으면 incremental rebuild를 수행할 수 없습니다");
    }
    sourceFileCache.invalidate(modifiedFiles);
    return this.initialize();
  }

  *emitAffectedFiles(options?: EmitOptions): Iterable<EmitResult> {
    if (this._ngtscProgram == null || this._builderProgram == null) {
      throw new Error("initialize()를 먼저 호출해야 합니다");
    }
    logger.debug("emitAffectedFiles 시작");

    const compilerOptions = this._builderProgram.getCompilerOptions();

    // 1. noEmit=true이면 즉시 return
    if (compilerOptions.noEmit) {
      return;
    }

    const angularCompiler = this._ngtscProgram.compiler;
    const tsProgram = this._ngtscProgram.getTsProgram();
    const affectedFiles = this._affectedFiles;

    // 2. prepareEmit() → Angular transformers 획득
    const transformers = angularCompiler.prepareEmit().transformers;
    transformers.before ??= [];
    transformers.after ??= [];

    // 3. additionalTransformers 병합
    if (options?.additionalTransformers != null) {
      if (options.additionalTransformers.before != null) {
        transformers.before.push(...options.additionalTransformers.before);
      }
      if (options.additionalTransformers.after != null) {
        transformers.after.push(...options.additionalTransformers.after);
      }
    }

    // 4. emit 결과를 수집하는 구조
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

    // 5. ts.Program.emit()으로 직접 emit (NgtscProgram.emit 패턴)
    //    EmitAndSemanticDiagnosticsBuilderProgram.emitNextAffectedFile()은 내부적으로
    //    emitKind를 DTS-only로 결정할 수 있어 Angular before transformer가 .js를 생성하지 않고
    //    DtsTransformRegistry에 메타데이터를 등록하지 않는 문제가 있다.
    //    ts.Program.emit()을 직접 호출하면 항상 full emit이 수행된다.
    for (const sourceFile of tsProgram.getSourceFiles()) {
      if (angularCompiler.ignoreForEmit.has(sourceFile)) {
        continue;
      }
      if (sourceFile.isDeclarationFile) {
        continue;
      }
      if (
        angularCompiler.incrementalCompilation.safeToSkipEmit(sourceFile) &&
        !affectedFiles.has(sourceFile)
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

    // 6. .tsbuildinfo 영속화 (프로세스 재시작 후 incremental 진단 유지)
    //    TS 5.9에서 emitBuildInfo()가 제거됨. emit()이 내부적으로 build info를 기록한다.
    //    no-op writeFile로 JS/DTS 재출력 없이 build info만 갱신.
    // TypeScript 5.9 + NgtscProgram: emit가 내부적으로 진단 수집을 트리거하여
    // referencedFiles 인덱스 불일치로 크래시할 수 있음
    // TypeScript 5.9 + NgtscProgram: emit가 내부적으로 진단 수집을 트리거하여
    // referencedFiles 인덱스 불일치로 크래시할 수 있음
    try {
      this._builderProgram.emit(undefined, () => {});
    } catch {
      logger.debug("builderProgram.emit 크래시 (무시) — tsbuildinfo 영속화 생략");
    }

    // 7. sourceFilter 적용 후 yield
    logger.debug(`emitAffectedFiles 완료 (${emitResults.length}개 파일)`);
    for (const result of emitResults) {
      if (options?.sourceFilter != null && !options.sourceFilter(result.sourceFileName)) {
        continue;
      }
      yield result;
    }
  }

  *collectDiagnostics(): Iterable<ts.Diagnostic> {
    if (this._ngtscProgram == null || this._builderProgram == null) {
      throw new Error("initialize()를 먼저 호출해야 합니다");
    }
    logger.debug("진단 수집 시작");

    const angularCompiler = this._ngtscProgram.compiler;
    const builderProgram = this._builderProgram;
    const affectedFiles = this._affectedFiles;
    const diagnosticCache = this._diagnosticCache;
    const optimization =
      affectedFiles.size === 1 ? OptimizeFor.SingleFile : OptimizeFor.WholeProgram;

    // 1. Option 진단
    const configDiags = builderProgram.getConfigFileParsingDiagnostics();
    const ngOptionDiags = angularCompiler.getOptionDiagnostics();
    const tsOptionDiags = builderProgram.getOptionsDiagnostics();
    if (configDiags.length > 0 || ngOptionDiags.length > 0 || tsOptionDiags.length > 0) {
      logger.debug(`옵션 진단: config=${configDiags.length}, ngOption=${ngOptionDiags.length}, tsOption=${tsOptionDiags.length}`);
    }
    yield* configDiags;
    yield* ngOptionDiags;
    yield* tsOptionDiags;

    // 2. Global
    yield* builderProgram.getGlobalDiagnostics();

    // 3. 파일별 루프
    for (const sourceFile of builderProgram.getSourceFiles()) {
      if (angularCompiler.ignoreForDiagnostics.has(sourceFile)) {
        continue;
      }

      yield* builderProgram.getSyntacticDiagnostics(sourceFile);
      // TypeScript 5.9 + NgtscProgram: getSemanticDiagnostics가 내부적으로
      // referencedFiles 인덱스 불일치로 크래시할 수 있음 (fixture 파일 포함 시)
      let semanticDiags: readonly ts.Diagnostic[];
      try {
        semanticDiags = builderProgram.getSemanticDiagnostics(sourceFile);
      } catch {
        logger.debug(`getSemanticDiagnostics 크래시 (무시): ${sourceFile.fileName}`);
        semanticDiags = [];
      }
      yield* semanticDiags;

      // Declaration files는 Angular 진단 없음
      if (sourceFile.isDeclarationFile) {
        continue;
      }

      // Angular 템플릿 진단
      if (affectedFiles.has(sourceFile)) {
        const angularDiagnostics = angularCompiler.getDiagnosticsForFile(
          sourceFile,
          optimization,
        );
        diagnosticCache.set(sourceFile, angularDiagnostics);
        yield* angularDiagnostics;
      } else {
        const cached = diagnosticCache.get(sourceFile);
        if (cached) {
          yield* cached;
        }
      }
    }
  }
}
