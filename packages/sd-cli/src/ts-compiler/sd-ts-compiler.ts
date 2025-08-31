import ts from "typescript";
import path from "path";
import { FsUtils, PathUtils, SdLogger, TNormPath } from "@simplysm/sd-core-node";
import { StringUtils } from "@simplysm/sd-core-common";
import { NgtscProgram, OptimizeFor } from "@angular/compiler-cli";
import { AngularCompilerHost } from "@angular/build/src/tools/angular/angular-host";
import { replaceBootstrap } from "@angular/build/src/tools/angular/transformers/jit-bootstrap-transformer";
import { SdCliPerformanceTimer } from "../utils/sd-cli-performance-time";
import { SdCliConvertMessageUtils } from "../utils/sd-cli-convert-message.utils";
import { ISdTsCompilerResult, SdTsCompilerOptions } from "../types/ts-compiler.types";
import { createWorkerTransformer } from "@angular/build/src/tools/angular/transformers/web-worker-transformer";
import { SdDependencyCache } from "./sd-dependency-cache";
import { SdDependencyAnalyzer } from "./sd-dependency-analyzer";
import { FlatESLint } from "eslint/use-at-your-own-risk";
import { SdStyleBundler } from "./sd-style-bundler";

export class SdTsCompiler {
  #logger = SdLogger.get(["simplysm", "sd-cli", "SdTsCompiler"]);

  #isForAngular: boolean;

  #styleBundler: SdStyleBundler | undefined;

  #ngProgram: NgtscProgram | undefined;
  #program: ts.Program | undefined;

  // 빌드정보 캐싱
  #cache = {
    dep: new SdDependencyCache(),
    type: new WeakMap<ts.Node, ts.Type | undefined>(),
    prop: new WeakMap<ts.Type, Map<string, ts.Symbol | undefined>>(),
    declFiles: new WeakMap<ts.Symbol, TNormPath[]>(),
    ngOrg: new Map<TNormPath, ts.SourceFile>(),
  };
  #sourceFileCacheMap = new Map<TNormPath, ts.SourceFile>();
  #emittedFilesCacheMap = new Map<
    TNormPath,
    {
      outAbsPath?: TNormPath;
      text: string;
    }[]
  >();

  #perf!: SdCliPerformanceTimer;

  constructor(private readonly _opt: SdTsCompilerOptions) {
    this.#debug("초기화 중...");

    const tsconfigPath = path.resolve(this._opt.pkgPath, "tsconfig.json");
    const tsconfig = FsUtils.readJson(tsconfigPath);
    this.#isForAngular = Boolean(tsconfig.angularCompilerOptions);

    if (!this._opt.isNoEmit) {
      this.#styleBundler = new SdStyleBundler(
        this._opt.pkgPath,
        this._opt.isDevMode,
        this._opt.watchScopePathSet,
      );
    }
  }

  #parseTsConfig() {
    const tsconfigPath = path.resolve(this._opt.pkgPath, "tsconfig.json");
    const tsconfig = FsUtils.readJson(tsconfigPath);
    const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this._opt.pkgPath, {
      ...tsconfig.angularCompilerOptions,
      ...this._opt.additionalOptions,
      ...(this._opt.isEmitOnly
        ? {
            // typescript
            noEmitOnError: false,
            strict: false,
            noImplicitAny: false,
            noImplicitThis: false,
            strictNullChecks: false,
            strictFunctionTypes: false,
            strictBindCallApply: false,
            strictPropertyInitialization: false,
            useUnknownInCatchVariables: false,
            exactOptionalPropertyTypes: false,
            noUncheckedIndexedAccess: false,
            noUnusedLocals: false,
            noUnusedParameters: false,
            skipLibCheck: true,
            checkJs: false,
            alwaysStrict: false,

            // angular
            strictTemplates: false,
            strictInjectionParameters: false,
            strictInputAccessModifiers: false,
            strictStandalone: false,
          }
        : {}),
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

  #createCompilerHost(compilerOptions: ts.CompilerOptions, modifiedFileSet: Set<TNormPath>) {
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

      if (this.#sourceFileCacheMap.has(fileNPath)) {
        return this.#sourceFileCacheMap.get(fileNPath);
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
        this.#sourceFileCacheMap.delete(fileNPath);
        return undefined;
      }

      this.#sourceFileCacheMap.set(fileNPath, sf);

      return sf;
    };

    if (this.#isForAngular) {
      (compilerHost as AngularCompilerHost).readResource = (fileName: string) => {
        return compilerHost.readFile(fileName) ?? "";
      };

      if (!this._opt.isNoEmit) {
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

          const styleBundleResult = await this.#styleBundler!.bundleAsync(
            data,
            PathUtils.norm(context.containingFile),
            context.resourceFile != null ? PathUtils.norm(context.resourceFile) : undefined,
          );

          if (!styleBundleResult.cached && !StringUtils.isNullOrEmpty(styleBundleResult.contents)) {
            const relPath = path.relative(
              path.resolve(this._opt.pkgPath, "src"),
              context.containingFile,
            );
            const outAbsPath = PathUtils.norm(
              compilerOptions.outDir!,
              relPath.replace(/\.ts$/, ".css"),
            );
            const cache = this.#emittedFilesCacheMap.getOrCreate(
              PathUtils.norm(context.containingFile),
              [],
            );
            cache.remove((item) => item.outAbsPath === outAbsPath);
            cache.push({ outAbsPath, text: styleBundleResult.contents });
          }

          return StringUtils.isNullOrEmpty(styleBundleResult.contents)
            ? null
            : { content: "" /*styleBundleResult.contents*/ };
        };
      }

      (compilerHost as AngularCompilerHost).getModifiedResourceFiles = () => {
        return new Set(Array.from(modifiedFileSet).map((item) => PathUtils.posix(item)));
      };
    }

    return compilerHost;
  }

  async compileAsync(modifiedFileSet: Set<TNormPath>): Promise<ISdTsCompilerResult> {
    this.#perf = new SdCliPerformanceTimer("esbuild compile");

    const prepareResult = await this.#prepareAsync(modifiedFileSet);

    const [globalStyleSheet, buildResult, lintResults] = await Promise.all([
      this._opt.isNoEmit ? undefined : this.#buildGlobalStyleAsync(),
      this.#build(prepareResult),
      this._opt.isEmitOnly ? [] : this.#lintAsync(prepareResult),
    ]);

    const affectedFileSet = new Set([
      ...prepareResult.affectedFileSet,
      ...prepareResult.styleAffectedFileSet,
    ]);

    this.#debug(`빌드 완료됨`, this.#perf.toString());
    this.#debug(`영향 받은 파일: ${affectedFileSet.size}개`);
    this.#debug(`감시 중인 파일: ${prepareResult.watchFileSet.size}개`);

    return {
      messages: [
        ...SdCliConvertMessageUtils.convertToBuildMessagesFromTsDiag(buildResult.diagnostics),
        ...SdCliConvertMessageUtils.convertToBuildMessagesFromEslint(lintResults),
      ],
      affectedFileSet: affectedFileSet,
      watchFileSet: prepareResult.watchFileSet,
      stylesheetBundlingResultMap: this.#styleBundler?.getResultCache() ?? new Map(),
      emittedFilesCacheMap: this.#emittedFilesCacheMap,
      emitFileSet: new Set([...buildResult.emitFileSet, globalStyleSheet].filterExists()),
    };
  }

  async #prepareAsync(modifiedFileSet: Set<TNormPath>): Promise<IPrepareResult> {
    // const worker = await this._getOrCreateStyleBundleWorkerAsync();

    const tsconfig = this.#parseTsConfig();

    if (modifiedFileSet.size !== 0) {
      this.#debug(`캐시 무효화 및 초기화 중...`);

      // this._perf.run("캐시 무효화 및 초기화", () => {
      this.#perf.run("캐시 무효화 및 초기화", () => {
        // 소스파일은 변경된 파일들로 무효화
        for (const modifiedFile of modifiedFileSet) {
          this.#sourceFileCacheMap.delete(modifiedFile);
        }

        // 스타일 번들러 무효화 (transformResource 재실행 땜에 필요할듯)
        if (this.#styleBundler) {
          const styleAffectedFileSet = this.#styleBundler.invalidate(modifiedFileSet);
          // 스타일 변경된 파일들로 소스파일 무효화
          for (const styleAffectedFile of styleAffectedFileSet) {
            this.#sourceFileCacheMap.delete(styleAffectedFile);
          }
        }

        // angular origin 파일 매핑은 변경된 파일들로 무효화
        for (const modifiedFile of modifiedFileSet) {
          this.#cache.ngOrg.delete(modifiedFile);
        }

        // 기존 의존성에 의해 영향받는 파일들 계산
        const affectedFileMap = this.#cache.dep.getAffectedFileMap(modifiedFileSet);
        const affectedFileSet = new Set(
          Array.from(affectedFileMap.values()).mapMany((item) => Array.from(item)),
        );

        // 의존성 캐시에서 영향받은 파일 관련 항목 무효화 (Affected더라도 SF는 동일하므로, modifiedFileSet만 넣어도될듯?)
        // 250715: sourceFile 타입체크를 다시 해야해서 affected로 넣는게 맞는듯.
        this.#cache.dep.invalidates(affectedFileSet);

        // 결과물이 바뀌어야 하는 캐시 모두 무효화 (modified만 다시쓰면될듯..)
        for (const modifiedFile of modifiedFileSet) {
          this.#emittedFilesCacheMap.delete(modifiedFile);
        }
      });
    }

    this.#debug(`ts.Program 생성 중...`);

    const compilerHost = this.#perf.run("ts.CompilerHost 생성", () => {
      return this.#createCompilerHost(tsconfig.options, modifiedFileSet);
    });

    this.#perf.run("ts.Program 생성", () => {
      if (this.#isForAngular) {
        this.#ngProgram = new NgtscProgram(
          tsconfig.fileNames,
          tsconfig.options,
          compilerHost,
          this.#ngProgram,
        );
        this.#program = this.#ngProgram.getTsProgram();
      } else {
        this.#program = ts.createProgram(
          tsconfig.fileNames,
          tsconfig.options,
          compilerHost,
          this.#program,
        );
      }
    });
    this.#debug(`ts.Program 생성`);

    if (this.#ngProgram) {
      await this.#perf.run("Angular 템플릿 분석", async () => {
        await this.#ngProgram!.compiler.analyzeAsync();
      });
    }

    if (!this._opt.isEmitOnly) {
      this.#debug(`새 의존성 분석 중...`);

      this.#perf.run("새 의존성 분석", () => {
        // SdTsDependencyAnalyzer를 통해 의존성 분석 및 SdDepCache 업데이트
        SdDependencyAnalyzer.analyze(
          this.#program!,
          compilerHost,
          this._opt.watchScopePathSet,
          this.#cache,
        );
      });

      this.#debug(`새 의존성 분석(Angular) 중...`);

      // Angular 리소스 의존성 추가
      if (this.#ngProgram) {
        this.#perf.run("새 의존성 분석(Angular)", () => {
          SdDependencyAnalyzer.analyzeAngularResources(
            this.#ngProgram!,
            this._opt.watchScopePathSet,
            this.#cache.dep,
          );
        });
      }
    }

    const allFiles = this.#program!.getSourceFiles().map((item) => PathUtils.norm(item.fileName));
    const watchFileSet = new Set(
      allFiles.filter((item) => this._opt.watchScopePathSet.inScope(item)),
    );

    let affectedFileSet: Set<TNormPath>;
    if (modifiedFileSet.size === 0) {
      affectedFileSet = new Set(allFiles);
    } else {
      const affectedFileMap = this.#cache.dep.getAffectedFileMap(modifiedFileSet);
      this.#debug("영향받은 파일:", affectedFileMap);
      affectedFileSet = new Set(
        Array.from(affectedFileMap.values()).mapMany((item) => Array.from(item)),
      );
    }

    return {
      tsconfig,
      compilerHost,
      affectedFileSet,
      styleAffectedFileSet: this.#styleBundler?.getAffectedFileSet(affectedFileSet) ?? new Set(),
      watchFileSet,
    };
  }

  async #lintAsync(prepareResult: IPrepareResult) {
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
            project: null,
            programs: [this.#program],
          },
        },
      },
    });
    return await linter.lintFiles(lintFilePaths);
  }

  async #buildGlobalStyleAsync() {
    //-- global style
    if (
      this._opt.globalStyleFilePath != null &&
      FsUtils.exists(this._opt.globalStyleFilePath) &&
      !this.#emittedFilesCacheMap.has(this._opt.globalStyleFilePath)
    ) {
      this.#debug(`전역 스타일 번들링 중...`);

      await this.#perf.run("전역 스타일 번들링", async () => {
        const data = await FsUtils.readFileAsync(this._opt.globalStyleFilePath!);
        const stylesheetBundlingResult = await this.#styleBundler!.bundleAsync(
          data,
          this._opt.globalStyleFilePath!,
          this._opt.globalStyleFilePath,
        );
        const emitFileInfos = this.#emittedFilesCacheMap.getOrCreate(
          this._opt.globalStyleFilePath!,
          [],
        );
        emitFileInfos.push({
          outAbsPath: PathUtils.norm(
            this._opt.pkgPath,
            path
              .relative(path.resolve(this._opt.pkgPath, "src"), this._opt.globalStyleFilePath!)
              .replace(/\.scss$/, ".css"),
          ),
          text: stylesheetBundlingResult.contents ?? "",
        });
      });

      return this._opt.globalStyleFilePath;
    }

    return undefined;
  }

  #build(prepareResult: IPrepareResult) {
    const emitFileSet = new Set<TNormPath>();
    const diagnostics: ts.Diagnostic[] = [];

    if (!this._opt.isEmitOnly) {
      this.#debug(`프로그램 진단 수집 중...`);

      this.#perf.run("프로그램 진단 수집", () => {
        diagnostics.push(
          ...this.#program!.getConfigFileParsingDiagnostics(),
          ...this.#program!.getOptionsDiagnostics(),
          ...this.#program!.getGlobalDiagnostics(),
        );

        if (this.#ngProgram) {
          diagnostics.push(...this.#ngProgram.compiler.getOptionDiagnostics());
        }
      });

      this.#debug(`개별 파일 진단 수집 중...`);

      for (const affectedFile of prepareResult.affectedFileSet) {
        if (!PathUtils.isChildPath(affectedFile, this._opt.pkgPath)) continue;

        const affectedSourceFile = this.#program!.getSourceFile(affectedFile);
        if (
          !affectedSourceFile ||
          (this.#ngProgram && this.#ngProgram.compiler.ignoreForDiagnostics.has(affectedSourceFile))
        ) {
          continue;
        }

        // this.#debug(`get diagnostics of file ${affectedFile}...`);

        this.#perf.run("개별 파일 진단 수집", () => {
          diagnostics.push(
            ...this.#program!.getSyntacticDiagnostics(affectedSourceFile),
            ...this.#program!.getSemanticDiagnostics(affectedSourceFile),
          );
        });

        if (this.#ngProgram) {
          this.#perf.run("개별 파일 진단 수집(Angular)", () => {
            if (affectedSourceFile.isDeclarationFile) return;

            diagnostics.push(
              ...this.#ngProgram!.compiler.getDiagnosticsForFile(
                affectedSourceFile,
                OptimizeFor.WholeProgram,
              ),
            );
          });
        }
      }
    }

    if (!this._opt.isNoEmit) {
      this.#perf.run("파일 출력 (emit)", () => {
        this.#debug(`파일 출력 준비 중...`);

        let transformers: ts.CustomTransformers = {};

        if (this.#ngProgram) {
          const angularTransfomers = this.#ngProgram.compiler.prepareEmit().transformers;
          (transformers.before ??= []).push(...(angularTransfomers.before ?? []));
          (transformers.after ??= []).push(...(angularTransfomers.after ?? []));
          (transformers.afterDeclarations ??= []).push(
            ...(angularTransfomers.afterDeclarations ?? []),
          );

          (transformers.before ??= []).push(
            replaceBootstrap(() => this.#program!.getTypeChecker()),
          );
          (transformers.before ??= []).push(
            createWorkerTransformer((file, importer) => {
              const fullPath = path.resolve(path.dirname(importer), file);
              const relPath = path.relative(path.resolve(this._opt.pkgPath, "src"), fullPath);
              return relPath.replace(/\.ts$/, "").replaceAll("\\", "/") + ".js";
            }),
          );

          (transformers.before ??= []).push(this.#createExternalizeComponentStylesTransformer());
        }

        this.#debug(`파일 출력 중...`);

        // affected에 새로 추가된 파일은 포함되지 않는 현상이 있어 sourceFileSet으로 바꿈
        // 비교해보니, 딱히 getSourceFiles라서 더 느려지는것 같지는 않음
        // 그래도 affected로 다시 테스트 (조금이라도 더 빠르게)
        for (const affectedFile of [
          ...prepareResult.affectedFileSet /*,
        ...prepareResult.styleAffectedFileSet,*/,
        ]) {
          if (
            this.#emittedFilesCacheMap
              .get(affectedFile)
              ?.some((item) => !item.outAbsPath?.endsWith(".css"))
          )
            continue;

          const sf = this.#program!.getSourceFile(affectedFile);
          if (!sf || sf.isDeclarationFile) continue;
          if (this.#ngProgram?.compiler.ignoreForEmit.has(sf)) continue;
          if (this.#ngProgram?.compiler.incrementalCompilation.safeToSkipEmit(sf)) continue;

          // 번들이 아닌 외부패키지는 보통 emit안해도 됨
          // but esbuild를 통해 bundle로 묶어야 하는놈들은 모든 output이 있어야 함.
          if (!this._opt.isForBundle && !PathUtils.isChildPath(sf.fileName, this._opt.pkgPath)) {
            continue;
          }

          this.#program!.emit(
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
              if (this.#ngProgram) {
                if (this.#ngProgram.compiler.ignoreForEmit.has(sourceFile)) return;
                this.#ngProgram.compiler.incrementalCompilation.recordSuccessfulEmit(sourceFile);
              }

              const emitFileInfoCaches = this.#emittedFilesCacheMap.getOrCreate(
                PathUtils.norm(sourceFile.fileName),
                [],
              );

              if (PathUtils.isChildPath(sourceFile.fileName, this._opt.pkgPath)) {
                const real = this.#convertOutputToReal(
                  fileName,
                  prepareResult.tsconfig.distPath,
                  text,
                );

                emitFileInfoCaches.push({
                  outAbsPath: real.filePath,
                  text: this.#removeOutputDevModeLine(real.text),
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
      });
    }

    return {
      emitFileSet,
      diagnostics,
    };
  }

  #createExternalizeComponentStylesTransformer() {
    const f = ts.factory;

    /*function makeEnsureStyleFunc() {
      // function __sdEnsureStyle(href) { ... }
      const hrefParam = f.createParameterDeclaration(undefined, undefined, "href");

      // const d = document;
      const declD = f.createVariableStatement(
        undefined,
        f.createVariableDeclarationList(
          [f.createVariableDeclaration("d", undefined, undefined, f.createIdentifier("document"))],
          ts.NodeFlags.Const,
        ),
      );

      // let link = d.querySelector(`link[data-sd-style="${href}"]`);
      const tpl = f.createTemplateExpression(f.createTemplateHead('link[data-sd-style="'), [
        f.createTemplateSpan(f.createIdentifier("href"), f.createTemplateTail('"]')),
      ]);
      const declLink = f.createVariableStatement(
        undefined,
        f.createVariableDeclarationList(
          [
            f.createVariableDeclaration(
              "link",
              undefined,
              undefined,
              f.createCallExpression(
                f.createPropertyAccessExpression(f.createIdentifier("d"), "querySelector"),
                undefined,
                [tpl],
              ),
            ),
          ],
          ts.NodeFlags.Let,
        ),
      );

      // if (link) return;
      const ifReturn = f.createIfStatement(
        f.createIdentifier("link"),
        f.createBlock([f.createReturnStatement()], true),
      );

      // link = d.createElement('link');
      const mkLink = f.createExpressionStatement(
        f.createBinaryExpression(
          f.createIdentifier("link"),
          ts.SyntaxKind.EqualsToken,
          f.createCallExpression(
            f.createPropertyAccessExpression(f.createIdentifier("d"), "createElement"),
            undefined,
            [f.createStringLiteral("link")],
          ),
        ),
      );

      // link.rel = 'stylesheet';
      const setRel = f.createExpressionStatement(
        f.createBinaryExpression(
          f.createPropertyAccessExpression(f.createIdentifier("link"), "rel"),
          ts.SyntaxKind.EqualsToken,
          f.createStringLiteral("stylesheet"),
        ),
      );

      // link.setAttribute('data-sd-style', href);
      const setData = f.createExpressionStatement(
        f.createCallExpression(
          f.createPropertyAccessExpression(f.createIdentifier("link"), "setAttribute"),
          undefined,
          [f.createStringLiteral("data-sd-style"), f.createIdentifier("href")],
        ),
      );

      // link.href = href;
      const setHref = f.createExpressionStatement(
        f.createBinaryExpression(
          f.createPropertyAccessExpression(f.createIdentifier("link"), "href"),
          ts.SyntaxKind.EqualsToken,
          f.createIdentifier("href"),
        ),
      );

      // d.head.appendChild(link);
      const append = f.createExpressionStatement(
        f.createCallExpression(
          f.createPropertyAccessExpression(
            f.createPropertyAccessExpression(f.createIdentifier("d"), "head"),
            "appendChild",
          ),
          undefined,
          [f.createIdentifier("link")],
        ),
      );

      const body = f.createBlock(
        [declD, declLink, ifReturn, mkLink, setRel, setData, setHref, append],
        true,
      );

      return f.createFunctionDeclaration(
        undefined,
        undefined,
        f.createIdentifier("__sdEnsureStyle"),
        undefined,
        [hrefParam],
        undefined,
        body,
      );
    }

    function makeEnsureCallInStatic(href: string) {
      return f.createExpressionStatement(
        f.createCallExpression(
          f.createIdentifier("__sdEnsureStyle"),
          undefined,
          [f.createStringLiteral(href)], // 필요하면 devBust 인자도 추가 가능
        ),
      );
    }

    const upsertEnsureStyleHelper = (sf: ts.SourceFile): ts.SourceFile => {
      // 이미 있으면 스킵
      if (
        sf.statements.some((s) => ts.isFunctionDeclaration(s) && s.name?.text === "__sdEnsureStyle")
      ) {
        return sf;
      }

      const fn = makeEnsureStyleFunc();

      const href = path.basename(sf.fileName).replace(/\.ts$/, ".css");
      const call = makeEnsureCallInStatic(href);

      if (this._opt.isForBundle) {
        return f.updateSourceFile(sf, [fn, call, ...sf.statements]);
      } else {
        const importTarget = "./" + path.basename(sf.fileName).replace(/\.ts$/, ".css");
        const importDecl = f.createImportDeclaration(
          undefined,
          undefined,
          f.createStringLiteral(importTarget),
        );

        return f.updateSourceFile(sf, [fn, call, importDecl, ...sf.statements]);
      }
    };*/

    function upsertEnsureStyleHelper(sf: ts.SourceFile): ts.SourceFile {
      // 이미 있으면 스킵
      if (
        sf.statements.some((s) => ts.isFunctionDeclaration(s) && s.name?.text === "__sdEnsureStyle")
      ) {
        return sf;
      }

      const importTarget = "./" + path.basename(sf.fileName).replace(/\.ts$/, ".css");
      const importDecl = f.createImportDeclaration(
        undefined, // decorators
        undefined, // modifiers
        f.createStringLiteral(importTarget),
      );

      return f.updateSourceFile(sf, [importDecl, ...sf.statements]);
    }

    const removeStyleProp = (node: ts.ClassDeclaration) => {
      const allDecorators = ts.getDecorators(node);
      if (!allDecorators || allDecorators.length === 0) return node;

      const decoratorsUpdated = allDecorators.map((dec) => {
        if (!ts.isCallExpression(dec.expression)) return dec;
        const call = dec.expression;
        if (!ts.isIdentifier(call.expression) || call.expression.text !== "Component") return dec;
        if (call.arguments.length !== 1) return dec;
        const arg = call.arguments[0];
        if (!ts.isObjectLiteralExpression(arg)) return dec;

        const filteredProps = arg.properties.filter((p) => {
          if (!ts.isPropertyAssignment(p)) return true;
          const name = p.name;
          const key = ts.isIdentifier(name)
            ? name.text
            : ts.isStringLiteralLike(name)
              ? name.text
              : undefined;
          return !(key === "styles" || key === "styleUrls");
        });

        const newArg = f.updateObjectLiteralExpression(arg, filteredProps);
        const newCall = f.updateCallExpression(call, call.expression, call.typeArguments, [newArg]);
        return f.updateDecorator(dec, newCall);
      });

      const existingModifiers = node.modifiers ?? [];
      const modifiersWithoutOldDecos = existingModifiers.filter((m) => !ts.isDecorator(m));
      const newModifiers: readonly ts.ModifierLike[] = [
        ...decoratorsUpdated,
        ...modifiersWithoutOldDecos,
      ];

      const newNode = f.updateClassDeclaration(
        node,
        newModifiers,
        node.name,
        node.typeParameters,
        node.heritageClauses,
        node.members,
      );

      return f.updateClassDeclaration(
        newNode,
        newNode.modifiers,
        newNode.name,
        newNode.typeParameters,
        newNode.heritageClauses,
        newNode.members,
      );
    };

    return (ctx: ts.TransformationContext) => {
      return (sf: ts.SourceFile) => {
        const has = this.#styleBundler!.getResultCache().get(PathUtils.norm(sf.fileName));
        if (!has) return sf;

        const realSf = upsertEnsureStyleHelper(sf);

        function visitor(node: ts.Node): ts.Node {
          if (ts.isClassDeclaration(node) && Boolean(ts.getDecorators(node)?.length)) {
            return removeStyleProp(node);
          }
          return ts.visitEachChild(node, visitor, ctx);
        }

        return ts.visitNode(realSf, visitor) as ts.SourceFile;
      };
    };
  }

  #convertOutputToReal(filePath: string, distPath: string, text: string) {
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

  #removeOutputDevModeLine(str: string) {
    return str.replace(
      /\(\(\) => \{ \(typeof ngDevMode === "undefined" \|\| ngDevMode\) && i0.ɵsetClassDebugInfo\(.*, \{ className: ".*", filePath: ".*", lineNumber: [0-9]* }\); }\)\(\);/,
      "",
    );
  }

  #debug(...msg: any[]): void {
    this.#logger.debug(`[${path.basename(this._opt.pkgPath)}]`, ...msg);
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
  affectedFileSet: Set<TNormPath>;
  styleAffectedFileSet: Set<TNormPath>;
  watchFileSet: Set<TNormPath>;
}
