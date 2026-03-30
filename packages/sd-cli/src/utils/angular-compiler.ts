import path from "path";
import { createHash } from "crypto";
import ts from "typescript";
import { consola } from "consola";
import { NgtscProgram, OptimizeFor } from "./angular-build";
import { collectHmrCandidates } from "./hmr-candidates.js";

const logger = consola.withTag("sd:cli:angular-compiler");

// NgCompiler 타입은 NgtscProgram.compiler에서 추론한다 (exports 제한으로 직접 import 불가할 수 있음)
type NgCompiler = NgtscProgram["compiler"];

const HMR_MODIFIED_FILE_LIMIT = 32;

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
  enableHmr?: boolean;
}

export class AngularSourceFileCache extends Map<string, ts.SourceFile> {
  readonly modifiedFiles = new Set<string>();

  invalidate(files: Iterable<string>): void {
    for (const file of files) {
      const normalized = file.replace(/\\/g, "/");
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
    templateUpdates?: Map<string, string>;
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

    // enableHmr 옵션을 Angular 내부 _enableHmr로 전파
    if (options.enableHmr === true) {
      compilerOptions = { ...compilerOptions, _enableHmr: true } as ts.CompilerOptions;
    }

    // 2.5. HMR: stale source file 수집 (initialize 전에 이전 program에서 보존)
    const useHmr =
      options.enableHmr === true &&
      sourceFileCache != null &&
      sourceFileCache.modifiedFiles.size > 0 &&
      sourceFileCache.modifiedFiles.size <= HMR_MODIFIED_FILE_LIMIT;

    let staleSourceFiles: Map<string, ts.SourceFile> | undefined;
    if (useHmr && this._builderProgram != null) {
      staleSourceFiles = new Map();
      for (const modifiedFile of sourceFileCache.modifiedFiles) {
        const sourceFile = this._builderProgram.getSourceFile(modifiedFile);
        if (sourceFile != null) {
          staleSourceFiles.set(modifiedFile, sourceFile);
        }
      }
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
      // stylesheet with externalStylesheets (client mode)
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

    // 9. BuilderProgram 생성
    const builderProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
      tsProgram,
      host,
      this._builderProgram,
    );

    // 10. AOT 분석
    logger.debug("AOT analyzeAsync 시작");
    await angularProgram.compiler.analyzeAsync();
    logger.debug("AOT analyzeAsync 완료");

    // 10.5. HMR: 후보 수집 + templateUpdates 생성
    let templateUpdates: Map<string, string> | undefined;
    if (useHmr && staleSourceFiles != null) {
      const angularCompiler = angularProgram.compiler;
      const componentNodes = collectHmrCandidates(
        sourceFileCache.modifiedFiles,
        angularCompiler,
        staleSourceFiles,
      );

      for (const node of componentNodes) {
        if (!ts.isClassDeclaration(node)) {
          continue;
        }
        const sf = node.getSourceFile();
        let relativePath = path.relative(host.getCurrentDirectory(), sf.fileName);
        relativePath = relativePath.replace(/\\/g, "/");

        const updateId = encodeURIComponent(
          `${host.getCanonicalFileName(relativePath)}@${node.name?.text}`,
        );
        const updateText = angularCompiler.emitHmrUpdateModule(node);

        // emitHmrUpdateModule이 null을 반환하면 전체 templateUpdates 무효화
        if (updateText === null) {
          templateUpdates = undefined;
          break;
        }

        templateUpdates ??= new Map();
        templateUpdates.set(updateId, updateText);
      }
    }

    // 11. findAffectedFiles + 12. 리소스 의존성 기반 diagnosticCache 무효화
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
    return { affectedFiles, templateUpdates };
  }

  private _findAffectedFiles(
    builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram,
    angularCompiler: NgCompiler,
    sourceFileCache?: AngularSourceFileCache,
  ): Set<ts.SourceFile> {
    const affectedFiles = new Set<ts.SourceFile>();

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
              affectedFiles.add(originalSourceFile);
            }
            return true;
          }
          return false;
        },
      );
      if (!result) {
        break;
      }
      if ("fileName" in result.affected) {
        // ts.SourceFile — single file change
        affectedFiles.add(result.affected);
      } else {
        // ts.Program — global scope change, treat all source files as affected
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
        normalizedModifiedFiles.add(f.replace(/\\/g, "/"));
      }

      for (const sourceFile of builderProgram.getSourceFiles()) {
        if (angularCompiler.ignoreForEmit.has(sourceFile)) {
          continue;
        }
        const resourceDependencies = angularCompiler.getResourceDependencies(sourceFile);
        for (const resourceDep of resourceDependencies) {
          if (normalizedModifiedFiles.has(resourceDep.replace(/\\/g, "/"))) {
            this._diagnosticCache.delete(sourceFile);
            affectedFiles.add(sourceFile);
            break;
          }
        }
      }
    }

    return affectedFiles;
  }

  async update(
    modifiedFiles: Iterable<string>,
  ): Promise<{
    affectedFiles: ReadonlySet<ts.SourceFile>;
    templateUpdates?: Map<string, string>;
  }> {
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

    const compilerOptions = this._builderProgram.getCompilerOptions();

    // 1. noEmit=true이면 즉시 return
    if (compilerOptions.noEmit) {
      return;
    }

    const angularCompiler = this._ngtscProgram.compiler;
    const builderProgram = this._builderProgram;
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
    const emittedSourceFiles = new Set<ts.SourceFile>();
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
      emittedSourceFiles.add(sourceFile);
      emitResults.push({ filename, contents, sourceFileName: sourceFile.fileName });
    };

    // 5. emitNextAffectedFile 루프
    while (
      builderProgram.emitNextAffectedFile(
        writeFileCallback,
        undefined,
        emitDeclarationOnly,
        transformers,
      )
    ) {
      /* empty */
    }

    // 6. 2차 루프: TypeScript가 affected로 판단하지 않았지만 Angular이 처리해야 할 파일
    for (const sourceFile of builderProgram.getSourceFiles()) {
      if (emittedSourceFiles.has(sourceFile) || angularCompiler.ignoreForEmit.has(sourceFile)) {
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
      builderProgram.emit(
        sourceFile,
        writeFileCallback,
        undefined,
        emitDeclarationOnly,
        transformers,
      );
    }

    // 7. sourceFilter 적용 후 yield
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

    // 2. Syntactic
    yield* builderProgram.getGlobalDiagnostics();

    // 3. 파일별 루프
    for (const sourceFile of builderProgram.getSourceFiles()) {
      if (angularCompiler.ignoreForDiagnostics.has(sourceFile)) {
        continue;
      }

      yield* builderProgram.getSyntacticDiagnostics(sourceFile);
      yield* builderProgram.getSemanticDiagnostics(sourceFile);

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
