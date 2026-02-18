import ts from "typescript";
import path from "path";
import type { TNormPath } from "@simplysm/sd-core-node";
import { FsUtils, PathUtils, SdLogger } from "@simplysm/sd-core-node";
import { StringUtils } from "@simplysm/sd-core-common";
import { NgtscProgram, OptimizeFor } from "@angular/compiler-cli";
import type { AngularCompilerHost } from "@angular/build/src/tools/angular/angular-host";
import { SdCliPerformanceTimer } from "../utils/SdCliPerformanceTimer";
import { SdCliConvertMessageUtils } from "../utils/SdCliConvertMessageUtils";
import { createWorkerTransformer } from "@angular/build/src/tools/angular/transformers/web-worker-transformer";
import { replaceBootstrap } from "@angular/build/src/tools/angular/transformers/jit-bootstrap-transformer";
import { SdDepCache } from "./SdDepCache";
import { SdDepAnalyzer } from "./SdDepAnalyzer";
import { FlatESLint } from "eslint/use-at-your-own-risk";
import { SdStyleBundler } from "./SdStyleBundler";
import type { ISdTsCompilerOptions } from "../types/build/ISdTsCompilerOptions";
import type { ISdTsCompilerResult } from "../types/build/ISdTsCompilerResult";
import { ScopePathSet } from "./ScopePathSet";

export class SdTsCompiler {
  private readonly _logger = SdLogger.get(["simplysm", "sd-cli", "SdTsCompiler"]);

  private readonly _isForAngular: boolean;
  private readonly _scopePathSet: ScopePathSet;

  private readonly _styleBundler: SdStyleBundler | undefined;

  private _moduleResolutionCache: ts.ModuleResolutionCache | undefined;

  private _ngProgram: NgtscProgram | undefined;
  private _program: ts.Program | undefined;

  // 빌드정보 캐싱
  private readonly _cache = {
    dep: new SdDepCache(),
    type: new WeakMap<ts.Node, ts.Type | undefined>(),
    prop: new WeakMap<ts.Type, Map<string, ts.Symbol | undefined>>(),
    declFiles: new WeakMap<ts.Symbol, TNormPath[]>(),
    ngOrg: new Map<TNormPath, ts.SourceFile>(),
  };
  private readonly _sourceFileCacheMap = new Map<TNormPath, ts.SourceFile>();
  private readonly _emittedFilesCacheMap = new Map<
    TNormPath,
    {
      outAbsPath?: TNormPath;
      text: string;
    }[]
  >();

  private _perf!: SdCliPerformanceTimer;

  constructor(
    private readonly _opt: ISdTsCompilerOptions,
    private readonly _forBundle: boolean,
  ) {
    this._debug("초기화 중...");
    const tsconfigPath = path.resolve(this._opt.pkgPath, "tsconfig.json");
    const tsconfig = FsUtils.readJson(tsconfigPath);
    this._isForAngular = Boolean(tsconfig.angularCompilerOptions);

    this._scopePathSet = new ScopePathSet(this._opt.scopePathSet);

    if (!this._opt.watch?.noEmit) {
      this._styleBundler = new SdStyleBundler({
        pkgPath: this._opt.pkgPath,
        scopePathSet: this._scopePathSet,
        dev: !!this._opt.watch?.dev,
      });
    }
  }

  private _parseTsConfig(): ITsConfigInfo {
    const tsconfigPath = path.resolve(this._opt.pkgPath, "tsconfig.json");
    const tsconfig = FsUtils.readJson(tsconfigPath);
    const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this._opt.pkgPath, {
      ...tsconfig.angularCompilerOptions,
      ...(this._forBundle ? { declaration: false } : {}),
      ...(this._opt.watch?.emitOnly
        ? {
            // typescript
            noEmitOnError: false,
            skipLibCheck: true,
            skipDefaultLibCheck: true,

            // angular
            strictTemplates: false,
            strictInjectionParameters: false,
            strictInputAccessModifiers: false,
            strictStandalone: false,
            extendedDiagnostics: false,
          }
        : {}),
      sourceMap: !!this._opt.watch?.dev,
    });

    const distPath = PathUtils.norm(
      parsedTsconfig.options.outDir ?? path.resolve(this._opt.pkgPath, "dist"),
    );

    return {
      fileNames: parsedTsconfig.fileNames,
      options: parsedTsconfig.options,
      distPath: distPath,
    };
  }

  private _createCompilerHost(
    compilerOptions: ts.CompilerOptions,
    modifiedFileSet: Set<TNormPath>,
  ) {
    // 지식: SourceFile은 하나의 파일에만 국한된 정적 정보객체임, 변경된 파일의 SourceFile만 다시 생성하면됨

    const compilerHost = ts.createCompilerHost(compilerOptions);

    const baseGetSourceFile = compilerHost.getSourceFile;
    compilerHost.getSourceFile = (
      fileName: string,
      languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions,
      onError?: ((message: string) => void) | undefined,
      shouldCreateNewSourceFile?: boolean,
      ...args
    ): ts.SourceFile | undefined => {
      const fileNPath = PathUtils.norm(fileName);

      /*if (!shouldCreateNewSourceFile && this.#sourceFileCacheMap.has(fileNPath)) {
        return this.#sourceFileCacheMap.get(fileNPath);
      }*/

      if (this._sourceFileCacheMap.has(fileNPath)) {
        return this._sourceFileCacheMap.get(fileNPath);
      }

      const sf: ts.SourceFile | undefined = baseGetSourceFile.call(
        compilerHost,
        fileName,
        languageVersionOrOptions,
        onError,
        false,
        ...args,
      );

      if (!sf) {
        this._sourceFileCacheMap.delete(fileNPath);
        return undefined;
      }

      this._sourceFileCacheMap.set(fileNPath, sf);

      return sf;
    };

    if (this._isForAngular) {
      (compilerHost as AngularCompilerHost).readResource = (fileName: string) => {
        return compilerHost.readFile(fileName) ?? "";
      };

      if (!this._opt.watch?.noEmit) {
        (compilerHost as AngularCompilerHost).transformResource = async (
          data: string,
          context: {
            type: string;
            containingFile: string;
            resourceFile: string | null;
          },
        ) => {
          if (context.type !== "style") {
            return null;
          }

          const styleBundleResult = await this._styleBundler!.bundleAsync(
            data,
            PathUtils.norm(context.containingFile),
            context.resourceFile != null ? PathUtils.norm(context.resourceFile) : undefined,
          );

          return StringUtils.isNullOrEmpty(styleBundleResult.contents)
            ? null
            : { content: styleBundleResult.contents };
        };
      }

      (compilerHost as AngularCompilerHost).getModifiedResourceFiles = () => {
        return new Set(Array.from(modifiedFileSet).map((item) => PathUtils.posix(item)));
      };
    }

    this._moduleResolutionCache = ts.createModuleResolutionCache(
      compilerHost.getCurrentDirectory(),
      compilerHost.getCanonicalFileName.bind(compilerHost),
      compilerOptions,
      this._moduleResolutionCache?.getPackageJsonInfoCache(),
    );
    compilerHost.getModuleResolutionCache = () => this._moduleResolutionCache;

    return compilerHost;
  }

  async compileAsync(modifiedFileSet: Set<TNormPath>): Promise<ISdTsCompilerResult> {
    this._perf = new SdCliPerformanceTimer("esbuild compile");

    const prepareResult = await this._prepareAsync(modifiedFileSet);

    const [globalStyleSheet, lintResults, buildResult] = await Promise.all([
      this._opt.watch?.noEmit ? Promise.resolve(undefined) : this._buildGlobalStyleAsync(),
      this._opt.watch?.emitOnly ? Promise.resolve([]) : this._lintAsync(prepareResult),
      Promise.resolve(this._build(prepareResult)),
    ]);

    const messages = [
      ...SdCliConvertMessageUtils.convertToBuildMessagesFromTsDiag(buildResult.diagnostics),
      ...SdCliConvertMessageUtils.convertToBuildMessagesFromEslint(lintResults),
    ];
    const affectedFileSet = new Set([
      ...prepareResult.affectedFileSet,
      ...(this._styleBundler?.getAffectedFileSet(modifiedFileSet) ?? []),
    ]);
    const watchFileSet = new Set([
      ...prepareResult.watchFileSet,
      ...(this._styleBundler?.getAllStyleFileSet() ?? []),
    ]);

    this._debug(`빌드 완료됨`, this._perf.toString());
    this._debug(
      `영향 받은 파일: ${affectedFileSet.size}개`,
      ...(modifiedFileSet.size > 0 ? [affectedFileSet] : []),
    );
    this._debug(`감시 중인 파일: ${watchFileSet.size}개`);

    return {
      messages: messages,
      affectedFileSet: affectedFileSet,
      watchFileSet: watchFileSet,
      stylesheetBundlingResultMap: this._styleBundler?.getResultCache() ?? new Map(),
      emittedFilesCacheMap: this._emittedFilesCacheMap,
      emitFileSet: new Set([...buildResult.emitFileSet, globalStyleSheet].filterExists()),
    };
  }

  private async _prepareAsync(modifiedFileSet: Set<TNormPath>): Promise<IPrepareResult> {
    const tsconfig = this._parseTsConfig();

    if (modifiedFileSet.size !== 0 && this._opt.watch) {
      this._debug(`캐시 무효화 및 초기화 중...`);

      // this._perf.run("캐시 무효화 및 초기화", () => {
      this._perf.run("캐시 무효화 및 초기화", () => {
        // 소스파일은 변경된 파일들로 무효화
        for (const modifiedFile of modifiedFileSet) {
          this._sourceFileCacheMap.delete(modifiedFile);
        }

        // 스타일 번들러 무효화 (transformResource 재실행 땜에 필요할듯)
        if (this._styleBundler) {
          const styleAffectedFileSet = this._styleBundler.invalidate(modifiedFileSet);
          // 스타일 변경된 파일들로 무효화
          for (const styleAffectedFile of styleAffectedFileSet) {
            this._sourceFileCacheMap.delete(styleAffectedFile);
            this._emittedFilesCacheMap.delete(styleAffectedFile);
          }
        }

        // angular origin 파일 매핑은 변경된 파일들로 무효화
        for (const modifiedFile of modifiedFileSet) {
          this._cache.ngOrg.delete(modifiedFile);
        }

        // 기존 의존성에 의해 영향받는 파일들 계산
        this._cache.dep.invalidates(modifiedFileSet);

        // 결과물이 바뀌어야 하는 캐시 모두 무효화 (modified만 다시쓰면될듯..)
        for (const modifiedFile of modifiedFileSet) {
          this._emittedFilesCacheMap.delete(modifiedFile);
        }
      });
    }

    this._debug(`ts.Program 생성 중...`);

    const compilerHost = this._perf.run("ts.CompilerHost 생성", () => {
      return this._createCompilerHost(tsconfig.options, modifiedFileSet);
    });

    this._perf.run("ts.Program 생성", () => {
      if (this._isForAngular) {
        this._ngProgram = new NgtscProgram(
          tsconfig.fileNames,
          tsconfig.options,
          compilerHost,
          this._ngProgram,
        );
        this._program = this._ngProgram.getTsProgram();
      } else {
        this._program = ts.createProgram(
          tsconfig.fileNames,
          tsconfig.options,
          compilerHost,
          this._program,
        );
      }
    });

    if (this._ngProgram) {
      this._debug(`Angular 템플릿 분석...`);

      await this._perf.run("Angular 템플릿 분석", async () => {
        await this._ngProgram!.compiler.analyzeAsync();
      });
    }

    if (this._opt.watch && !this._opt.watch.emitOnly) {
      this._debug(`새 의존성 분석 중...`);

      this._perf.run("새 의존성 분석", () => {
        // SdTsDependencyAnalyzer를 통해 의존성 분석 및 SdDepCache 업데이트
        SdDepAnalyzer.analyze(this._program!, compilerHost, this._scopePathSet, this._cache);
      });

      // Angular 리소스 의존성 추가
      if (this._ngProgram) {
        this._debug(`새 의존성 분석(Angular) 중...`);

        this._perf.run("새 의존성 분석(Angular)", () => {
          SdDepAnalyzer.analyzeAngularResources(
            this._ngProgram!,
            this._scopePathSet,
            this._cache.dep,
          );
        });
      }
    }

    const allTsFiles = this._program!.getSourceFiles().mapMany((item) => [
      PathUtils.norm(item.fileName),
      ...(item.fileName.endsWith(".d.ts")
        ? [PathUtils.norm(item.fileName.replace(/\.d\.ts$/, "") + ".js")]
        : []),
    ]);
    const watchFileSet = new Set(allTsFiles.filter((item) => this._scopePathSet.inScope(item)));

    let affectedFileSet: Set<TNormPath>;
    if (modifiedFileSet.size === 0) {
      affectedFileSet = new Set(allTsFiles.filter((item) => this._scopePathSet.inScope(item)));
    } else {
      const affectedFileMap = this._cache.dep.getAffectedFileMap(modifiedFileSet);
      affectedFileSet = new Set(
        Array.from(affectedFileMap.values()).mapMany((item) => Array.from(item)),
      );
    }

    return {
      tsconfig,
      compilerHost,
      watchFileSet,
      affectedFileSet,
      styleAffectedFileSet: this._styleBundler?.getAffectedFileSet(modifiedFileSet) ?? new Set(),
    };
  }

  private async _lintAsync(prepareResult: IPrepareResult) {
    return await this._perf.run("Linting", async () => {
      this._debug(`Linting...`);

      const lintFilePaths = Array.from(prepareResult.affectedFileSet)
        .filter((item) => PathUtils.isChildPath(item, this._opt.pkgPath))
        .filter((item) => (!item.endsWith(".d.ts") && item.endsWith(".ts")) || item.endsWith(".js"))
        .filter((item) => FsUtils.exists(item));

      if (lintFilePaths.length === 0) {
        return [];
      }

      const linter = new FlatESLint({
        cwd: this._opt.pkgPath,
        cache: false,
        overrideConfig: {
          languageOptions: {
            parserOptions: {
              // project: true,
              // tsconfigRootDir: this._opt.pkgPath,
              project: null,
              programs: [this._program],
            },
          },
        },
      });

      // const result = await lintFilePaths.parallelAsync(async (lintFilePath) => {
      //   const sf = this.#sourceFileCacheMap.get(lintFilePath);
      //   if (!sf) return [];
      //   return await linter.lintText(sf.text, { filePath: lintFilePath });
      // });
      const result = await linter.lintFiles(lintFilePaths);
      this._debug(`Linting 완료`);
      // return result.mapMany();
      return result;
    });
  }

  private async _buildGlobalStyleAsync() {
    if (!this._isForAngular) return;

    //-- global style
    const globalStyleFilePath = PathUtils.norm(this._opt.pkgPath, "scss/styles.scss");
    if (this._emittedFilesCacheMap.has(globalStyleFilePath)) return;
    if (!FsUtils.exists(globalStyleFilePath)) return;

    this._debug(`전역 스타일 번들링 중...`);

    await this._perf.run("전역 스타일 번들링", async () => {
      const data = await FsUtils.readFileAsync(globalStyleFilePath);
      const stylesheetBundlingResult = await this._styleBundler!.bundleAsync(
        data,
        globalStyleFilePath,
        globalStyleFilePath,
      );
      const emitFileInfos = this._emittedFilesCacheMap.getOrCreate(globalStyleFilePath, []);
      emitFileInfos.push({
        outAbsPath: PathUtils.norm(
          this._opt.pkgPath,
          path
            .relative(path.resolve(this._opt.pkgPath, "scss"), globalStyleFilePath)
            .replace(/\.scss$/, ".css"),
        ),
        text: stylesheetBundlingResult.contents ?? "",
      });
    });

    return globalStyleFilePath;
  }

  private _build(prepareResult: IPrepareResult) {
    const emitFileSet = new Set<TNormPath>();
    const diagnostics: ts.Diagnostic[] = [];

    if (!this._opt.watch?.emitOnly) {
      this._debug(`프로그램 진단 수집 중...`);

      this._perf.run("프로그램 진단 수집", () => {
        diagnostics.push(
          ...this._program!.getConfigFileParsingDiagnostics(),
          ...this._program!.getOptionsDiagnostics(),
          ...this._program!.getGlobalDiagnostics(),
        );

        if (this._ngProgram) {
          diagnostics.push(...this._ngProgram.compiler.getOptionDiagnostics());
        }
      });

      this._debug(`개별 파일 진단 수집 중...`);

      for (const affectedFile of prepareResult.affectedFileSet) {
        if (!PathUtils.isChildPath(affectedFile, this._opt.pkgPath)) continue;

        const affectedSourceFile = this._program!.getSourceFile(affectedFile);
        if (
          !affectedSourceFile ||
          (this._ngProgram && this._ngProgram.compiler.ignoreForDiagnostics.has(affectedSourceFile))
        ) {
          continue;
        }

        this._perf.run("개별 파일 진단 수집", () => {
          diagnostics.push(
            ...this._program!.getSyntacticDiagnostics(affectedSourceFile),
            ...this._program!.getSemanticDiagnostics(affectedSourceFile),
          );
        });

        if (this._ngProgram) {
          this._perf.run("개별 파일 진단 수집(Angular)", () => {
            if (affectedSourceFile.isDeclarationFile) return;

            diagnostics.push(
              ...this._ngProgram!.compiler.getDiagnosticsForFile(
                affectedSourceFile,
                OptimizeFor.WholeProgram,
              ),
            );
          });
        }
      }
    }

    if (!this._opt.watch?.noEmit) {
      this._perf.run("파일 출력 (emit)", () => {
        this._debug(`파일 출력 준비 중...`);

        let transformers: ts.CustomTransformers = {};

        if (this._ngProgram) {
          const angularTransfomers = this._ngProgram.compiler.prepareEmit().transformers;
          (transformers.before ??= []).push(...(angularTransfomers.before ?? []));
          (transformers.after ??= []).push(...(angularTransfomers.after ?? []));
          (transformers.afterDeclarations ??= []).push(
            ...(angularTransfomers.afterDeclarations ?? []),
          );

          (transformers.before ??= []).push(
            replaceBootstrap(() => this._program!.getTypeChecker()),
          );
          (transformers.before ??= []).push(
            createWorkerTransformer((file, importer) => {
              const fullPath = path.resolve(path.dirname(importer), file);
              const relPath = path.relative(path.resolve(this._opt.pkgPath, "src"), fullPath);
              return relPath.replace(/\.ts$/, "").replace(/\\/, "/") + ".js";
            }),
          );
        }

        this._debug(`파일 출력 중...`);

        // affected에 새로 추가된 파일은 포함되지 않는 현상이 있어 sourceFileSet으로 바꿈
        // 비교해보니, 딱히 getSourceFiles라서 더 느려지는것 같지는 않음
        // 그래도 affected로 다시 테스트 (조금이라도 더 빠르게)
        for (const affectedFile of [
          ...prepareResult.affectedFileSet,
          ...prepareResult.styleAffectedFileSet,
        ]) {
          if (affectedFile.endsWith(".scss")) continue;
          if (
            this._emittedFilesCacheMap
              .get(affectedFile)
              ?.some((item) => !item.outAbsPath?.endsWith(".css"))
          )
            continue;

          const sf = this._program!.getSourceFile(affectedFile);
          if (!sf || sf.isDeclarationFile) continue;
          if (this._ngProgram?.compiler.ignoreForEmit.has(sf)) continue;
          if (this._ngProgram?.compiler.incrementalCompilation.safeToSkipEmit(sf)) continue;

          // 번들이 아닌 외부패키지는 보통 emit안해도 됨
          // but esbuild를 통해 bundle로 묶어야 하는놈들은 모든 output이 있어야 함.
          if (!this._forBundle && !PathUtils.isChildPath(sf.fileName, this._opt.pkgPath)) {
            continue;
          }

          this._program!.emit(
            sf,
            (fileName, text, writeByteOrderMark, onError, sourceFiles, data) => {
              if (!sourceFiles || sourceFiles.length === 0) {
                prepareResult.compilerHost.writeFile(
                  fileName,
                  text,
                  writeByteOrderMark,
                  onError,
                  sourceFiles,
                  data,
                );
                return;
              }

              const sourceFile = ts.getOriginalNode(sourceFiles[0], ts.isSourceFile);
              if (this._ngProgram) {
                if (this._ngProgram.compiler.ignoreForEmit.has(sourceFile)) return;
                this._ngProgram.compiler.incrementalCompilation.recordSuccessfulEmit(sourceFile);
              }

              const emitFileInfoCaches = this._emittedFilesCacheMap.getOrCreate(
                PathUtils.norm(sourceFile.fileName),
                [],
              );

              if (PathUtils.isChildPath(sourceFile.fileName, this._opt.pkgPath)) {
                const real = this._convertOutputToReal(
                  fileName,
                  prepareResult.tsconfig.distPath,
                  text,
                );

                emitFileInfoCaches.push({
                  outAbsPath: real.filePath,
                  text: this._removeOutputDevModeLine(real.text),
                });
              } else {
                emitFileInfoCaches.push({ text });
              }

              emitFileSet.add(PathUtils.norm(sourceFile.fileName));
            },
            undefined,
            undefined,
            transformers,
          );
        }

        this._debug(`파일 출력 완료`);
      });
    }

    return {
      emitFileSet,
      diagnostics,
    };
  }

  private _convertOutputToReal(filePath: string, distPath: string, text: string) {
    let realFilePath = PathUtils.norm(filePath);
    let realText = text;

    const srcRelBasePath = path.resolve(distPath, path.basename(this._opt.pkgPath), "src");

    if (PathUtils.isChildPath(realFilePath, srcRelBasePath)) {
      realFilePath = PathUtils.norm(distPath, path.relative(srcRelBasePath, realFilePath));

      // source map 위치 정확히 찾아가기
      if (filePath.endsWith(".js.map")) {
        const sourceMapContents = JSON.parse(realText);
        sourceMapContents.sources[0] = sourceMapContents.sources[0].slice(6); // remove "../../"
        realText = JSON.stringify(sourceMapContents);
      }
    }

    return { filePath: realFilePath, text: realText };
  }

  private _removeOutputDevModeLine(str: string) {
    return str.replace(
      /\(\(\) => \{ \(typeof ngDevMode === "undefined" \|\| ngDevMode\) && i0.ɵsetClassDebugInfo\(.*, \{ className: ".*", filePath: ".*", lineNumber: [0-9]* }\); }\)\(\);/,
      "",
    );
  }

  private _debug(...msg: any[]): void {
    this._logger.debug(`[${path.basename(this._opt.pkgPath)}]`, ...msg);
  }
}

interface ITsConfigInfo {
  fileNames: string[];
  options: ts.CompilerOptions;
  distPath: string;
}

interface IPrepareResult {
  tsconfig: ITsConfigInfo;
  compilerHost: ts.CompilerHost;
  watchFileSet: Set<TNormPath>;
  affectedFileSet: Set<TNormPath>;
  styleAffectedFileSet: Set<TNormPath>;
}
