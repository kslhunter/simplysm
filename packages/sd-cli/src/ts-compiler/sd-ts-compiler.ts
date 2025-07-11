import ts from "typescript";
import path from "path";
import { FsUtils, PathUtils, SdLogger, TNormPath } from "@simplysm/sd-core-node";
import { StringUtils, Wait } from "@simplysm/sd-core-common";
import { NgtscProgram, OptimizeFor } from "@angular/compiler-cli";
import { AngularCompilerHost } from "@angular/build/src/tools/angular/angular-host";
import { replaceBootstrap } from "@angular/build/src/tools/angular/transformers/jit-bootstrap-transformer";
import { SdCliPerformanceTimer } from "../utils/sd-cli-performance-time";
import { SdCliConvertMessageUtils } from "../utils/sd-cli-convert-message.utils";
import { ISdTsCompilerResult, SdTsCompilerOptions, TStylesheetBundlingResult } from "../types/ts-compiler.types";
import { createWorkerTransformer } from "@angular/build/src/tools/angular/transformers/web-worker-transformer";
import { ISdAffectedFileTreeNode, SdDependencyCache } from "./sd-dependency-cache";
import { SdDependencyAnalyzer } from "./sd-dependency-analyzer";
import { FlatESLint } from "eslint/use-at-your-own-risk";
import { ComponentStylesheetBundler } from "@angular/build/src/tools/esbuild/angular/component-stylesheets";
import { transformSupportedBrowsersToTargets } from "@angular/build/src/tools/esbuild/utils";
import browserslist from "browserslist";

export class SdTsCompiler {
  #logger = SdLogger.get(["simplysm", "sd-cli", "SdTsCompiler"]);

  #isForAngular: boolean;

  #stylesheetBundler: ComponentStylesheetBundler;

  #ngProgram: NgtscProgram | undefined;
  #program: ts.Program | undefined;

  // 빌드정보 캐싱
  #depCache = new SdDependencyCache();
  #sourceFileCacheMap = new Map<TNormPath, ts.SourceFile>();
  #emittedFilesCacheMap = new Map<
    TNormPath,
    {
      outAbsPath?: TNormPath;
      text: string;
    }[]
  >();

  // 빌드결과 캐싱
  #stylesheetBundlingResultMap = new Map<TNormPath, TStylesheetBundlingResult>();

  #perf!: SdCliPerformanceTimer;

  constructor(private readonly _opt: SdTsCompilerOptions) {
    this.#debug("초기화 중...");

    const tsconfigPath = path.resolve(this._opt.pkgPath, "tsconfig.json");
    const tsconfig = FsUtils.readJson(tsconfigPath);
    this.#isForAngular = Boolean(tsconfig.angularCompilerOptions);

    this.#stylesheetBundler = new ComponentStylesheetBundler(
      {
        workspaceRoot: this._opt.pkgPath,
        optimization: !this._opt.isDevMode,
        inlineFonts: true,
        preserveSymlinks: false,
        sourcemap: this._opt.isDevMode ? "inline" : false,
        outputNames: { bundles: "[name]", media: "media/[name]" },
        includePaths: [],
        // sass:
        externalDependencies: [],
        target: transformSupportedBrowsersToTargets(browserslist(["Chrome > 78"])),
        tailwindConfiguration: undefined,
        postcssConfiguration: {
          plugins: [["css-has-pseudo"]],
        },
        // publicPath:
        cacheOptions: {
          enabled: true,
          path: ".cache/angular",
          basePath: ".cache",
        },
      },
      "scss",
      this._opt.isDevMode,
    );
  }

  #parseTsConfig() {
    const tsconfigPath = path.resolve(this._opt.pkgPath, "tsconfig.json");
    const tsconfig = FsUtils.readJson(tsconfigPath);
    const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this._opt.pkgPath, {
      ...tsconfig.angularCompilerOptions,
      ...this._opt.additionalOptions,
    });

    const distPath = PathUtils.norm(parsedTsconfig.options.outDir ?? path.resolve(this._opt.pkgPath, "dist"));

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

        const stylesheetBundlingResult = await this.#bundleStylesheetAsync(
          data,
          PathUtils.norm(context.containingFile),
          context.resourceFile != null ? PathUtils.norm(context.resourceFile) : undefined,
        );

        return StringUtils.isNullOrEmpty(stylesheetBundlingResult.contents)
          ? null
          : { content: stylesheetBundlingResult.contents };
      };

      (compilerHost as AngularCompilerHost).getModifiedResourceFiles = () => {
        return new Set(Array.from(modifiedFileSet).map((item) => PathUtils.posix(item)));
      };
    }

    return compilerHost;
  }

  // private async _getOrCreateStyleBundleWorkerAsync() {
  //   if (this._stylesheetBundlingWorker) {
  //     return this._stylesheetBundlingWorker;
  //   }
  //
  //   this._stylesheetBundlingWorker = new SdWorker<TStyleBundlerWorkerType>(
  //     import.meta.resolve("../workers/style-bundler.worker"),
  //   );
  //
  //   await this._stylesheetBundlingWorker.run(
  //     "prepare",
  //     [this._opt.pkgPath, this._opt.isDevMode],
  //   );
  //
  //   return this._stylesheetBundlingWorker;
  // }

  async #bundleStylesheetAsync(
    data: string,
    containingFile: TNormPath,
    resourceFile: TNormPath | null = null,
  ): Promise<TStylesheetBundlingResult> {
    // containingFile: 포함된 파일 (.ts)
    // resourceFile: 외부 리소스 파일 (styleUrls로 입력하지 않고 styles에 직접 입력한 경우 null)
    // referencedFiles: import한 외부 scss 파일 혹은 woff파일등 외부 파일

    // this.#debug(`bundle stylesheet...(${containingFile}, ${resourceFile})`);

    return await this.#perf.run("스타일 번들링", async () => {
      const fileNPath = PathUtils.norm(resourceFile ?? containingFile);
      if (this.#stylesheetBundlingResultMap.has(fileNPath)) {
        return this.#stylesheetBundlingResultMap.get(fileNPath)!;
      }

      try {
        // const result = await new SdSassEmbeddedBundler(this._opt.isDevMode)
        //   .bundleAsync(data, resourceFile ?? containingFile);
        // const worker = this._stylesheetBundlingWorker!;
        // const result = await worker.run("bundle", [data, containingFile, resourceFile]);

        const result =
          resourceFile != null
            ? await this.#stylesheetBundler.bundleFile(resourceFile)
            : await this.#stylesheetBundler.bundleInline(data, containingFile, "scss");

        for (const referencedFile of result.referencedFiles ?? []) {
          // for (const referencedFile of result.referencedFiles) {
          // 참조하는 파일과 참조된 파일 사이의 의존성 관계 추가
          this.#depCache.addImport(fileNPath, PathUtils.norm(referencedFile), 0);
        }

        this.#stylesheetBundlingResultMap.set(fileNPath, result);

        // this._stylesheetBundlingResultMap.set(fileNPath, {
        //   errors: undefined,
        //   warnings: [],
        //   ...result,
        // });
        //
        // return {
        //   errors: undefined,
        //   warnings: [],
        //   ...result,
        // };
        return result;
      } catch (err) {
        const result = {
          errors: [
            {
              text: `스타일 번들링 실패: ${err.message ?? "알 수 없는 오류"}`,
              location: { file: containingFile },
            },
          ],
          warnings: [],
        };
        this.#stylesheetBundlingResultMap.set(fileNPath, result);
        return result;
      }
    });
  }

  async compileAsync(modifiedFileSet: Set<TNormPath>): Promise<ISdTsCompilerResult> {
    this.#perf = new SdCliPerformanceTimer("esbuild compile");

    const prepareResult = await this.#prepareAsync(modifiedFileSet);

    const [globalStyleSheet, buildResult, lintResults] = await Promise.all([
      this.#buildGlobalStyleAsync(),
      this.#build(prepareResult),
      this.#lintAsync(prepareResult),
    ]);

    this.#debug(`빌드 완료됨`, this.#perf.toString());
    this.#debug(`영향 받은 파일: ${prepareResult.affectedFileSet.size}개`);
    this.#debug(`감시 중인 파일: ${prepareResult.watchFileSet.size}개`);

    return {
      messages: [
        ...SdCliConvertMessageUtils.convertToBuildMessagesFromTsDiag(buildResult.diagnostics),
        ...SdCliConvertMessageUtils.convertToBuildMessagesFromEslint(lintResults),
      ],
      affectedFileSet: prepareResult.affectedFileSet,
      watchFileSet: prepareResult.watchFileSet,
      stylesheetBundlingResultMap: this.#stylesheetBundlingResultMap,
      emittedFilesCacheMap: this.#emittedFilesCacheMap,
      emitFileSet: new Set([...buildResult.emitFileSet, globalStyleSheet].filterExists()),
    };
  }

  async #prepareAsync(modifiedFileSet: Set<TNormPath>): Promise<IPrepareResult> {
    // const worker = await this._getOrCreateStyleBundleWorkerAsync();

    const tsconfig = this.#parseTsConfig();

    if (modifiedFileSet.size !== 0) {
      this.#debug(`캐시 무효화 및 초기화 중...`);
      await Wait.time(300);

      // this._perf.run("캐시 무효화 및 초기화", () => {
      this.#perf.run("캐시 무효화 및 초기화", () => {
        // 기존 의존성에 의해 영향받는 파일들 계산
        const affectedFileSet = this.#depCache.getAffectedFileSet(modifiedFileSet);

        const getTreeText = (node: ISdAffectedFileTreeNode, indent = "") => {
          let result = indent + node.fileNPath + "\n";
          for (const child of node.children) {
            result += getTreeText(child, indent + "  ");
          }

          return result;
        };

        const affectedFileTree = this.#depCache.getAffectedFileTree(modifiedFileSet);
        this.#debug(`영향받은 기존파일: ${affectedFileTree.map((item) => getTreeText(item)).join("\n")}`.trim());

        // 스타일 번들러에서 영향받은 파일 관련 항목 무효화
        this.#stylesheetBundler.invalidate(
          new Set([...modifiedFileSet, ...Array.from(affectedFileSet).filter((item) => item.endsWith(".scss"))]),
        );
        // await worker.run("invalidate", [affectedFileSet]);

        // 소스파일은 변경된 파일들로 무효화
        for (const modifiedFile of modifiedFileSet) {
          this.#sourceFileCacheMap.delete(modifiedFile);
        }

        // 의존성 캐시에서 영향받은 파일 관련 항목 무효화 (Affected더라도 SF는 동일하므로, modifiedFileSet만 넣어도될듯?)
        this.#depCache.invalidates(modifiedFileSet);

        // 내부 캐시에서 영향받은 파일 관련 항목 무효화
        for (const affectedFile of affectedFileSet) {
          this.#emittedFilesCacheMap.delete(affectedFile);
          this.#stylesheetBundlingResultMap.delete(affectedFile);
        }
      });
    }

    this.#debug(`ts.Program 생성 중...`);
    await Wait.time(300);

    const compilerHost = this.#perf.run("ts.CompilerHost 생성", () => {
      return this.#createCompilerHost(tsconfig.options, modifiedFileSet);
    });

    this.#perf.run("ts.Program 생성", () => {
      if (this.#isForAngular) {
        this.#ngProgram = new NgtscProgram(tsconfig.fileNames, tsconfig.options, compilerHost, this.#ngProgram);
        this.#program = this.#ngProgram.getTsProgram();
      } else {
        this.#program = ts.createProgram(tsconfig.fileNames, tsconfig.options, compilerHost, this.#program);
      }
    });
    this.#debug(`ts.Program 생성`);
    await Wait.time(300);

    if (this.#ngProgram) {
      await this.#perf.run("Angular 템플릿 분석", async () => {
        await this.#ngProgram!.compiler.analyzeAsync();
      });
    }

    this.#debug(`새 의존성 분석 중...`);

    this.#perf.run("새 의존성 분석", () => {
      // SdTsDependencyAnalyzer를 통해 의존성 분석 및 SdDepCache 업데이트
      SdDependencyAnalyzer.analyze(this.#program!, compilerHost, this._opt.watchScopePathSet, this.#depCache);

      // Angular 리소스 의존성 추가
      if (this.#ngProgram) {
        SdDependencyAnalyzer.analyzeAngularResources(this.#ngProgram, this._opt.watchScopePathSet, this.#depCache);
      }
    });

    const affectedFileSet =
      modifiedFileSet.size === 0 ? this.#depCache.getFiles() : this.#depCache.getAffectedFileSet(modifiedFileSet);
    const watchFileSet = this.#depCache.getFiles();

    return {
      tsconfig,
      compilerHost,
      affectedFileSet,
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
        const stylesheetBundlingResult = await this.#bundleStylesheetAsync(
          data,
          this._opt.globalStyleFilePath!,
          this._opt.globalStyleFilePath,
        );
        const emitFileInfos = this.#emittedFilesCacheMap.getOrCreate(this._opt.globalStyleFilePath!, []);
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
            ...this.#ngProgram!.compiler.getDiagnosticsForFile(affectedSourceFile, OptimizeFor.WholeProgram),
          );
        });
      }
    }

    this.#perf.run("파일 출력 (emit)", () => {
      this.#debug(`파일 출력 준비 중...`);

      let transformers: ts.CustomTransformers = {};

      if (this.#ngProgram) {
        const angularTransfomers = this.#ngProgram.compiler.prepareEmit().transformers;
        (transformers.before ??= []).push(...(angularTransfomers.before ?? []));
        (transformers.after ??= []).push(...(angularTransfomers.after ?? []));
        (transformers.afterDeclarations ??= []).push(...(angularTransfomers.afterDeclarations ?? []));

        (transformers.before ??= []).push(replaceBootstrap(() => this.#program!.getTypeChecker()));
        (transformers.before ??= []).push(
          createWorkerTransformer((file, importer) => {
            const fullPath = path.resolve(path.dirname(importer), file);
            const relPath = path.relative(path.resolve(this._opt.pkgPath, "src"), fullPath);
            return relPath.replace(/\.ts$/, "").replaceAll("\\", "/") + ".js";
          }),
        );
      }

      this.#debug(`파일 출력 중...`);

      // affected에 새로 추가된 파일은 포함되지 않는 현상이 있어 sourceFileSet으로 바꿈
      // 비교해보니, 딱히 getSourceFiles라서 더 느려지는것 같지는 않음
      // 그래도 affected로 다시 테스트 (조금이라도 더 빠르게)
      for (const affectedFile of prepareResult.affectedFileSet) {
        if (this.#emittedFilesCacheMap.has(affectedFile)) continue;

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
              prepareResult.compilerHost.writeFile(fileName, text, writeByteOrderMark, onError, sourceFiles, data);
              return;
            }

            const sourceFile = ts.getOriginalNode(sourceFiles[0], ts.isSourceFile);
            if (this.#ngProgram) {
              if (this.#ngProgram.compiler.ignoreForEmit.has(sourceFile)) return;
              this.#ngProgram.compiler.incrementalCompilation.recordSuccessfulEmit(sourceFile);
            }

            const emitFileInfoCaches = this.#emittedFilesCacheMap.getOrCreate(PathUtils.norm(sourceFile.fileName), []);

            if (PathUtils.isChildPath(sourceFile.fileName, this._opt.pkgPath)) {
              const real = this.#convertOutputToReal(fileName, prepareResult.tsconfig.distPath, text);

              emitFileInfoCaches.push({
                outAbsPath: real.filePath,
                text: real.text,
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

    return {
      emitFileSet,
      diagnostics,
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
  watchFileSet: Set<TNormPath>;
}
