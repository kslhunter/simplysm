import ts from "typescript";
import path from "path";
import { FsUtils, PathUtils, SdLogger, TNormPath } from "@simplysm/sd-core-node";
import { StringUtils } from "@simplysm/sd-core-common";
import { NgtscProgram, OptimizeFor } from "@angular/compiler-cli";
import {
  ComponentStylesheetBundler,
} from "@angular/build/src/tools/esbuild/angular/component-stylesheets";
import { AngularCompilerHost } from "@angular/build/src/tools/angular/angular-host";
import { transformSupportedBrowsersToTargets } from "@angular/build/src/tools/esbuild/utils";
import browserslist from "browserslist";
import {
  replaceBootstrap,
} from "@angular/build/src/tools/angular/transformers/jit-bootstrap-transformer";
import { SdCliPerformanceTimer } from "../utils/sd-cli-performance-time";
import { SdCliConvertMessageUtils } from "../utils/sd-cli-convert-message.utils";
import {
  ISdTsCompilerResult,
  IStylesheetBundlingResult,
  SdTsCompilerOptions,
} from "../types/ts-compiler.types";
import { ISdBuildMessage } from "../types/build.types";
import {
  createWorkerTransformer,
} from "@angular/build/src/tools/angular/transformers/web-worker-transformer";
import { ESLint } from "eslint";

export class SdTsCompiler {
  readonly #logger = SdLogger.get(["simplysm", "sd-cli", "SdTsCompiler"]);

  readonly #parsedTsconfig: ts.ParsedCommandLine;
  readonly #isForAngular: boolean;

  // readonly #workerRevDependencyCacheMap = new Map<TNormPath, Set<TNormPath>>();
  readonly #revDependencyCacheMap = new Map<TNormPath, Set<TNormPath>>();
  readonly #resourceDependencyCacheMap = new Map<TNormPath, Set<TNormPath>>();
  readonly #sourceFileCacheMap = new Map<TNormPath, ts.SourceFile>();
  readonly #emittedFilesCacheMap = new Map<
    TNormPath,
    {
      outAbsPath?: TNormPath;
      text: string;
    }[]
  >();

  readonly #stylesheetBundler: ComponentStylesheetBundler | undefined;
  readonly #compilerHost: ts.CompilerHost | AngularCompilerHost;

  #ngProgram: NgtscProgram | undefined;
  #program: ts.Program | undefined;

  #modifiedFileSet = new Set<TNormPath>();
  #affectedFileSet = new Set<TNormPath>();

  readonly #watchFileSet = new Set<TNormPath>();
  readonly #stylesheetBundlingResultMap = new Map<TNormPath, IStylesheetBundlingResult>();

  readonly #pkgPath: TNormPath;
  readonly #distPath: TNormPath;
  readonly #globalStyleFilePath?: TNormPath;
  readonly #watchScopePaths: TNormPath[];

  readonly #isForBundle: boolean;

  // readonly #lintWorker = new SdWorker<TSdLintWorkerType>(import.meta.resolve("../workers/lint-worker"));

  #perf!: SdCliPerformanceTimer;

  // #processWebWorker?: (workerFile: string, containingFile: string) => string;

  constructor(opt: SdTsCompilerOptions) {
    this.#pkgPath = opt.pkgPath;
    this.#globalStyleFilePath = opt.globalStyleFilePath;
    this.#isForBundle = opt.isForBundle;
    this.#watchScopePaths = opt.watchScopePaths;
    // this.#processWebWorker = opt.processWebWorker;

    this.#debug("초기화...");

    //-- isForAngular / parsedTsConfig

    const tsconfigPath = path.resolve(opt.pkgPath, "tsconfig.json");
    const tsconfig = FsUtils.readJson(tsconfigPath);
    this.#isForAngular = Boolean(tsconfig.angularCompilerOptions);
    this.#parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, opt.pkgPath, {
      ...tsconfig.angularCompilerOptions,
      ...opt.additionalOptions,
    });

    this.#distPath = PathUtils.norm(this.#parsedTsconfig.options.outDir ?? path.resolve(
      opt.pkgPath,
      "dist",
    ));

    //-- compilerHost

    this.#compilerHost = ts.createCompilerHost(this.#parsedTsconfig.options);

    const baseGetSourceFile = this.#compilerHost.getSourceFile;
    this.#compilerHost.getSourceFile = (
      fileName: string,
      languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions,
      onError?: ((message: string) => void) | undefined,
      shouldCreateNewSourceFile?: boolean,
      ...args
    ): ts.SourceFile | undefined => {
      if (!shouldCreateNewSourceFile && this.#sourceFileCacheMap.has(PathUtils.norm(fileName))) {
        return this.#sourceFileCacheMap.get(PathUtils.norm(fileName));
      }

      const sf: ts.SourceFile | undefined = baseGetSourceFile.call(
        this.#compilerHost,
        fileName,
        languageVersionOrOptions,
        onError,
        true,
        ...args,
      );

      if (sf) {
        this.#sourceFileCacheMap.set(PathUtils.norm(fileName), sf);
      }
      else {
        this.#sourceFileCacheMap.delete(PathUtils.norm(fileName));
      }

      return sf;
    };

    const baseReadFile = this.#compilerHost.readFile;
    this.#compilerHost.readFile = (fileName) => {
      this.#watchFileSet.add(PathUtils.norm(fileName));
      return baseReadFile.call(this.#compilerHost, fileName);
    };

    if (this.#isForAngular) {
      //-- stylesheetBundler
      this.#stylesheetBundler = new ComponentStylesheetBundler(
        {
          workspaceRoot: opt.pkgPath,
          optimization: !opt.isDevMode,
          inlineFonts: true,
          preserveSymlinks: false,
          sourcemap: opt.isDevMode ? "inline" : false,
          outputNames: { bundles: "[name]", media: "media/[name]" },
          includePaths: [],
          externalDependencies: [],
          target: transformSupportedBrowsersToTargets(browserslist(["Chrome > 78"])),
          postcssConfiguration: {
            plugins: [["css-has-pseudo"]],
          },
          tailwindConfiguration: undefined,
          cacheOptions: {
            enabled: true,
            path: ".cache/angular",
            basePath: ".cache",
          },
        },
        "scss",
        opt.isDevMode,
      );

      //-- compilerHost

      (this.#compilerHost as AngularCompilerHost).readResource = (fileName: string) => {
        return this.#compilerHost.readFile(fileName) ?? "";
      };

      (this.#compilerHost as AngularCompilerHost).transformResource = async (
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

        const contents = await this.#bundleStylesheetAsync(
          data,
          PathUtils.norm(context.containingFile),
          context.resourceFile != null ? PathUtils.norm(context.resourceFile) : undefined,
        );

        return StringUtils.isNullOrEmpty(contents) ? null : { content: contents };
      };

      (this.#compilerHost as AngularCompilerHost).getModifiedResourceFiles = () => {
        return new Set(Array.from(this.#modifiedFileSet).map((item) => PathUtils.posix(item)));
      };
    }
  }

  async #bundleStylesheetAsync(
    data: string,
    containingFile: TNormPath,
    resourceFile: TNormPath | null = null,
  ) {
    // containingFile: 포함된 파일 (.ts)
    // resourceFile: 외부 리소스 파일 (styleUrls로 입력하지 않고 styles에 직접 입력한 경우 null)
    // referencedFiles: import한 외부 scss 파일 혹은 woff파일등 외부 파일

    // this.#debug(`bundle stylesheet...(${containingFile}, ${resourceFile})`);

    return await this.#perf.run("bundle style", async () => {
      const stylesheetResult =
        resourceFile != null
          ? await this.#stylesheetBundler!.bundleFile(resourceFile)
          : await this.#stylesheetBundler!.bundleInline(data, containingFile, "scss");

      if (stylesheetResult.referencedFiles) {
        for (const referencedFile of stylesheetResult.referencedFiles) {
          const depCacheSet = this.#resourceDependencyCacheMap.getOrCreate(
            PathUtils.norm(referencedFile),
            new Set<TNormPath>(),
          );
          depCacheSet.add(resourceFile ?? containingFile);
        }

        this.#watchFileSet.adds(
          ...Array.from(stylesheetResult.referencedFiles.values())
            .map((item) => PathUtils.norm(item)),
        );
      }

      this.#stylesheetBundlingResultMap.set(PathUtils.norm(resourceFile ?? containingFile), {
        outputFiles: stylesheetResult.errors == null ? stylesheetResult.outputFiles : undefined,
        metafile: stylesheetResult.errors == null ? stylesheetResult.metafile : undefined,
        errors: stylesheetResult.errors,
        warnings: stylesheetResult.warnings,
      });

      return stylesheetResult.contents;
    });
  }

  async compileAsync(modifiedFileSet: Set<TNormPath>): Promise<ISdTsCompilerResult> {
    this.#perf = new SdCliPerformanceTimer("esbuild compile");

    this.#modifiedFileSet = new Set(modifiedFileSet);
    this.#affectedFileSet = new Set<TNormPath>();

    /*for (const mod of modifiedFileSet) {
      const workerImporters = this.#workerRevDependencyCacheMap.get(mod);
      if (workerImporters) {
        this.#modifiedFileSet.adds(...workerImporters);
      } else {
        this.#modifiedFileSet.add(mod);
      }
    }*/

    const prepareResult = await this.#prepareAsync();

    const [buildResult, lintResults] = await Promise.all([this.#buildAsync(), this.#lintAsync()]);

    this.#debug(`build completed`, this.#perf.toString());

    return {
      messages: [
        ...prepareResult.messages,
        ...SdCliConvertMessageUtils.convertToBuildMessagesFromTsDiag(buildResult.diagnostics),
        ...SdCliConvertMessageUtils.convertToBuildMessagesFromEslint(lintResults),
      ],
      watchFileSet: this.#watchFileSet,
      affectedFileSet: this.#affectedFileSet,
      stylesheetBundlingResultMap: this.#stylesheetBundlingResultMap,
      emittedFilesCacheMap: this.#emittedFilesCacheMap,
      emitFileSet: buildResult.emitFileSet,
    };
  }

  async #prepareAsync() {
    if (this.#modifiedFileSet.size !== 0) {
      this.#debug(`get affected (old deps & old res deps)...`);

      this.#perf.run("get affected", () => {
        for (const modifiedFile of this.#modifiedFileSet) {
          this.#affectedFileSet.add(modifiedFile);
          this.#affectedFileSet.adds(...(this.#revDependencyCacheMap.get(modifiedFile) ?? []));
          this.#affectedFileSet.adds(...(this.#resourceDependencyCacheMap.get(modifiedFile) ?? []));
        }
      });

      this.#debug(`invalidate & clear cache...`);

      this.#perf.run("invalidate & clear cache", () => {
        this.#stylesheetBundler?.invalidate(this.#affectedFileSet);

        for (const affectedFile of this.#affectedFileSet) {
          this.#emittedFilesCacheMap.delete(affectedFile);
          this.#sourceFileCacheMap.delete(affectedFile);
          this.#stylesheetBundlingResultMap.delete(affectedFile);
          this.#watchFileSet.delete(affectedFile);
        }

        this.#revDependencyCacheMap.clear();
        this.#resourceDependencyCacheMap.clear();
      });
    }

    this.#debug(`create program...`);

    this.#perf.run("create program", () => {
      if (this.#isForAngular) {
        this.#ngProgram = new NgtscProgram(
          this.#parsedTsconfig.fileNames,
          this.#parsedTsconfig.options,
          this.#compilerHost,
          this.#ngProgram,
        );
        this.#program = this.#ngProgram.getTsProgram();
      }
      else {
        this.#program = ts.createProgram(
          this.#parsedTsconfig.fileNames,
          this.#parsedTsconfig.options,
          this.#compilerHost,
          this.#program,
        );
      }
    });

    if (this.#ngProgram) {
      await this.#perf.run("ng analyze", async () => {
        await this.#ngProgram!.compiler.analyzeAsync();
      });
    }

    const getOrgSourceFile = (sf: ts.SourceFile) => {
      if (sf.fileName.endsWith(".ngtypecheck.ts")) {
        const orgFileName = sf.fileName.slice(0, -15) + ".ts";
        return this.#program!.getSourceFile(orgFileName);
      }

      return sf;
    };

    const sourceFileSet = new Set(
      this.#program!.getSourceFiles()
        .map((sf) => getOrgSourceFile(sf))
        .filterExists(),
    );

    this.#debug(`get new deps...`);

    const messages: ISdBuildMessage[] = [];

    this.#perf.run("get new deps", () => {
      const depMap = new Map<
        TNormPath,
        {
          fileName: TNormPath;
          importName: string;
          exportName?: string;
        }[]
      >();
      for (const sf of sourceFileSet) {
        if (!this.#watchScopePaths.some((scopePath) => PathUtils.isChildPath(
          sf.fileName,
          scopePath,
        ))) {
          continue;
        }

        const refs = this.#findDeps(sf);
        messages.push(...refs.filter((item) => "severity" in item));
        depMap.set(
          PathUtils.norm(sf.fileName),
          refs
            .filter((item) => "fileName" in item)
            .filter((item) =>
              this.#watchScopePaths.some((scopePath) => PathUtils.isChildPath(
                item.fileName,
                scopePath,
              )),
            ),
        );
      }

      const allDepMap = new Map<TNormPath, Set<TNormPath>>();
      const getAllDeps = (fileName: TNormPath, prevSet?: Set<TNormPath>) => {
        if (allDepMap.has(fileName)) {
          return allDepMap.get(fileName)!;
        }

        const result = new Set<TNormPath>();

        const deps = depMap.get(fileName) ?? [];
        result.adds(...deps.map((item) => item.fileName));

        for (const dep of deps) {
          const targetDeps = depMap.get(dep.fileName) ?? [];

          if (dep.importName === "*") {
            for (const targetRefItem of targetDeps.filter((item) => item.exportName != null)) {
              if (prevSet?.has(targetRefItem.fileName)) continue;

              result.add(targetRefItem.fileName);
              result.adds(...getAllDeps(
                targetRefItem.fileName,
                new Set<TNormPath>(prevSet).adds(...result),
              ));
            }
          }
          else {
            for (const targetRefItem of targetDeps.filter((item) => item.exportName
              === dep.importName)) {
              if (prevSet?.has(targetRefItem.fileName)) continue;

              result.add(targetRefItem.fileName);
              result.adds(...getAllDeps(
                targetRefItem.fileName,
                new Set<TNormPath>(prevSet).adds(...result),
              ));
            }
          }
        }

        return result;
      };

      for (const sf of sourceFileSet) {
        const deps = getAllDeps(PathUtils.norm(sf.fileName));
        allDepMap.set(PathUtils.norm(sf.fileName), deps);

        for (const dep of getAllDeps(PathUtils.norm(sf.fileName))) {
          const depCache = this.#revDependencyCacheMap.getOrCreate(dep, new Set<TNormPath>());
          depCache.add(PathUtils.norm(sf.fileName));
        }

        if (this.#ngProgram) {
          if (this.#ngProgram.compiler.ignoreForEmit.has(sf)) {
            continue;
          }

          for (const dep of this.#ngProgram.compiler.getResourceDependencies(sf)) {
            const ref = this.#resourceDependencyCacheMap.getOrCreate(
              PathUtils.norm(dep),
              new Set<TNormPath>(),
            );
            ref.add(PathUtils.norm(sf.fileName));
          }
        }
      }
    });

    if (this.#modifiedFileSet.size === 0) {
      this.#debug(`get affected (init)...`);

      this.#perf.run("get affected (init)", () => {
        for (const sf of sourceFileSet) {
          if (!this.#watchScopePaths.some((scopePath) => PathUtils.isChildPath(
            sf.fileName,
            scopePath,
          ))) {
            continue;
          }

          this.#affectedFileSet.add(PathUtils.norm(sf.fileName));
        }
      });
    }

    for (const dep of this.#revDependencyCacheMap.keys()) {
      if (this.#modifiedFileSet.has(dep)) {
        this.#affectedFileSet.adds(
          ...Array.from(this.#revDependencyCacheMap.get(dep)!).mapMany((item) =>
            [
              item,
              // .d.ts면 .js파일도 affected에 추가
              item.endsWith(".d.ts") ? PathUtils.norm(item.replace(/\.d\.ts$/, ".js")) : undefined,
            ].filterExists(),
          ),
        );
      }

      // dep이 emit된적이 없으면 affected에 추가해야함.
      // dep파일이 추가된후 기존 파일에서 import하면 dep파일이 affected에 포함이 안되는 현상 때문
      if (!this.#emittedFilesCacheMap.has(dep)) {
        this.#affectedFileSet.add(dep);
      }
    }

    if (this.#ngProgram) {
      for (const dep of this.#resourceDependencyCacheMap.keys()) {
        if (this.#modifiedFileSet.has(dep)) {
          this.#affectedFileSet.adds(...this.#resourceDependencyCacheMap.get(dep)!);
        }

        // dep이 emit된적이 없으면 affected에 추가해야함.
        // dep파일이 추가된후 기존 파일에서 import하면 dep파일이 affected에 포함이 안되는 현상 때문
        if (!this.#emittedFilesCacheMap.has(dep)) {
          this.#affectedFileSet.add(dep);
        }
      }
    }

    return {
      messages,
    };
  }

  async #lintAsync() {
    const lintFilePaths = Array.from(this.#affectedFileSet)
      .filter((item) => PathUtils.isChildPath(item, this.#pkgPath))
      .filter((item) => (
        (!item.endsWith(".d.ts") && item.endsWith(".ts")) ||
        item.endsWith(".js")
      ))
      .filter((item) => FsUtils.exists(item));

    if (lintFilePaths.length === 0) {
      return [];
    }

    const linter = new ESLint({
      cwd: this.#pkgPath,
      cache: false,
      overrideConfig: {
        languageOptions: {
          parserOptions: {
            // parser: tseslint.parser,
            project: null,
            programs: [this.#program],
          },
        },
      },
    });
    return await linter.lintFiles(lintFilePaths);

    // return await this.#lintWorker.run("lint", [
    //   {
    //     cwd: this.#pkgPath,
    //     fileSet: this.#affectedFileSet,
    //   },
    // ]);
  }

  async #buildAsync() {
    const emitFileSet = new Set<TNormPath>();
    const diagnostics: ts.Diagnostic[] = [];

    this.#debug(`get diagnostics...`);

    this.#perf.run("get program diagnostics", () => {
      diagnostics.push(
        ...this.#program!.getConfigFileParsingDiagnostics(),
        ...this.#program!.getOptionsDiagnostics(),
        ...this.#program!.getGlobalDiagnostics(),
      );

      if (this.#ngProgram) {
        diagnostics.push(...this.#ngProgram.compiler.getOptionDiagnostics());
      }
    });

    this.#debug(`get diagnostics of files...`);

    for (const affectedFile of this.#affectedFileSet) {
      if (!PathUtils.isChildPath(affectedFile, this.#pkgPath)) {
        continue;
      }

      const affectedSourceFile = this.#program!.getSourceFile(affectedFile);

      if (
        !affectedSourceFile ||
        (this.#ngProgram && this.#ngProgram.compiler.ignoreForDiagnostics.has(affectedSourceFile))
      ) {
        continue;
      }

      // this.#debug(`get diagnostics of file ${affectedFile}...`);

      this.#perf.run("get file diagnostics", () => {
        diagnostics.push(
          ...this.#program!.getSyntacticDiagnostics(affectedSourceFile),
          ...this.#program!.getSemanticDiagnostics(affectedSourceFile),
        );
      });

      if (this.#ngProgram) {
        this.#perf.run("get file diagnostics: ng", () => {
          if (affectedSourceFile.isDeclarationFile) {
            return;
          }

          diagnostics.push(
            ...this.#ngProgram!.compiler.getDiagnosticsForFile(
              affectedSourceFile,
              OptimizeFor.WholeProgram,
            ),
          );
        });
      }
    }

    this.#perf.run("emit", () => {
      this.#debug(`prepare emit...`);

      let transformers: ts.CustomTransformers = {};

      if (this.#ngProgram) {
        transformers = {
          ...transformers,
          ...this.#ngProgram.compiler.prepareEmit().transformers,
        };
        (transformers.before ??= []).push(replaceBootstrap(() => this.#program!.getTypeChecker()));
        (transformers.before ??= []).push(
          createWorkerTransformer((file, importer) => {
            const fullPath = path.resolve(path.dirname(importer), file);
            const relPath = path.relative(path.resolve(this.#pkgPath, "src"), fullPath);
            return relPath.replace(/\.ts$/, "").replaceAll("\\", "/") + ".js";
          }),
        );
      }
      // (transformers.before ??= []).push(transformKeys(this.#program));

      const fixImportTransformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
        return (sf) => {
          const shouldAppendJs = (importText: string): string | undefined => {
            const resolved = ts.resolveModuleName(
              importText,
              sf.fileName,
              this.#program!.getCompilerOptions(),
              ts.sys,
            );

            const resolvedInfo = resolved.resolvedModule;
            if (!resolvedInfo) return undefined;

            const resolvedFileName = resolvedInfo.resolvedFileName;

            // ① .ts / .tsx / .js / .jsx 만 대상
            if (!/\.(d\.ts|ts|tsx|js|jsx)$/i.test(resolvedFileName)) return undefined;

            // ② 사용자가 .js, .mjs, .json 등 명시한 경우 무시
            if (/\.[mc]?js$|\.json$/i.test(importText)) return undefined;

            // 3. import 경로의 마지막 부분이 파일명(확장자 제외)과 같으면 → .js 붙여야 함
            const importLastName = importText.split("/").pop();
            const resolvedFileNameOnly = path.basename(resolvedFileName).replace(/\.(d\.ts|ts|tsx|js|jsx)$/, "");

            if (importLastName === resolvedFileNameOnly) {
              return importText + ".js";
            }

            // 4. 그렇지 않으면 → index.ts 같은 루트 패키지 import → .js 붙이지 않음
            return undefined;
          };

          const visitor: ts.Visitor = (node): ts.Node => {
            // import { x } from "./foo"
            if (
              ts.isImportDeclaration(node) &&
              ts.isStringLiteral(node.moduleSpecifier)
            ) {
              const newPath = shouldAppendJs(node.moduleSpecifier.text);
              if (newPath != null) {
                return ts.factory.updateImportDeclaration(
                  node,
                  node.modifiers,
                  node.importClause,
                  ts.factory.createStringLiteral(newPath),
                  undefined,
                );
              }
            }

            // export * from "./bar"
            if (
              ts.isExportDeclaration(node) &&
              node.moduleSpecifier &&
              ts.isStringLiteral(node.moduleSpecifier)
            ) {
              const newPath = shouldAppendJs(node.moduleSpecifier.text);
              if (newPath != null) {
                return ts.factory.updateExportDeclaration(
                  node,
                  node.modifiers,
                  node.isTypeOnly,
                  node.exportClause,
                  ts.factory.createStringLiteral(newPath),
                  undefined,
                );
              }
            }

            // dynamic import("./baz")
            if (
              ts.isCallExpression(node) &&
              node.expression.kind === ts.SyntaxKind.ImportKeyword &&
              node.arguments.length === 1 &&
              ts.isStringLiteral(node.arguments[0])
            ) {
              const newPath = shouldAppendJs(node.arguments[0].text);
              if (newPath != null) {
                return ts.factory.updateCallExpression(
                  node,
                  node.expression,
                  undefined,
                  [ts.factory.createStringLiteral(newPath)],
                );
              }
            }

            return ts.visitEachChild(node, visitor, context);
          };

          return ts.visitNode(sf, visitor) as ts.SourceFile;
        };
      };
      (transformers.before ??= []).push(fixImportTransformer);

      this.#debug(`emit for files...`);

      // affected에 새로 추가된 파일은 포함되지 않는 현상이 있어 sourceFileSet으로 바꿈
      // 비교해보니, 딱히 getSourceFiles라서 더 느려지는것 같지는 않음
      // 그래도 affected로 다시 테스트 (조금이라도 더 빠르게)
      for (const affectedFile of this.#affectedFileSet) {
        if (this.#emittedFilesCacheMap.has(affectedFile)) {
          continue;
        }

        const sf = this.#program!.getSourceFile(affectedFile);
        if (!sf) {
          continue;
        }

        if (sf.isDeclarationFile) {
          continue;
        }

        if (this.#ngProgram?.compiler.ignoreForEmit.has(sf)) {
          continue;
        }

        if (this.#ngProgram?.compiler.incrementalCompilation.safeToSkipEmit(sf)) {
          continue;
        }

        // esbuild를 통해 bundle로 묶어야 하는놈들은 모든 output이 있어야 함.
        if (!this.#isForBundle) {
          if (!PathUtils.isChildPath(sf.fileName, this.#pkgPath)) {
            continue;
          }
        }

        this.#program!.emit(
          sf,
          (fileName, text, writeByteOrderMark, onError, sourceFiles, data) => {
            if (!sourceFiles || sourceFiles.length === 0) {
              this.#compilerHost.writeFile(
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
              if (this.#ngProgram.compiler.ignoreForEmit.has(sourceFile)) {
                return;
              }
              this.#ngProgram.compiler.incrementalCompilation.recordSuccessfulEmit(sourceFile);
            }

            const emitFileInfoCaches = this.#emittedFilesCacheMap.getOrCreate(PathUtils.norm(
              sourceFile.fileName), []);

            if (PathUtils.isChildPath(sourceFile.fileName, this.#pkgPath)) {
              let realFilePath = PathUtils.norm(fileName);
              let realText = text;
              if (
                PathUtils.isChildPath(
                  realFilePath,
                  path.resolve(this.#distPath, path.basename(this.#pkgPath), "src"),
                )
              ) {
                realFilePath = PathUtils.norm(
                  this.#distPath,
                  path.relative(
                    path.resolve(this.#distPath, path.basename(this.#pkgPath), "src"),
                    realFilePath,
                  ),
                );

                if (fileName.endsWith(".js.map")) {
                  const sourceMapContents = JSON.parse(realText);
                  // remove "../../"
                  sourceMapContents.sources[0] = sourceMapContents.sources[0].slice(6);
                  realText = JSON.stringify(sourceMapContents);
                }
              }

              emitFileInfoCaches.push({
                outAbsPath: realFilePath,
                text: realText,
              });
            }
            else {
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

    //-- global style
    if (
      this.#globalStyleFilePath != null &&
      FsUtils.exists(this.#globalStyleFilePath) &&
      !this.#emittedFilesCacheMap.has(this.#globalStyleFilePath)
    ) {
      this.#debug(`bundle global style...`);

      await this.#perf.run("bundle global style", async () => {
        const data = FsUtils.readFile(this.#globalStyleFilePath!);
        const contents = await this.#bundleStylesheetAsync(
          data,
          this.#globalStyleFilePath!,
          this.#globalStyleFilePath,
        );
        const emitFileInfos = this.#emittedFilesCacheMap.getOrCreate(
          this.#globalStyleFilePath!,
          [],
        );
        emitFileInfos.push({
          outAbsPath: PathUtils.norm(
            this.#pkgPath,
            path.relative(path.resolve(this.#pkgPath, "src"), this.#globalStyleFilePath!)
              .replace(/\.scss$/, ".css"),
          ),
          text: contents,
        });
        emitFileSet.add(this.#globalStyleFilePath!);
      });
    }

    return {
      emitFileSet,
      diagnostics,
    };
  }

  #debug(...msg: any[]): void {
    this.#logger.debug(`[${path.basename(this.#pkgPath)}]`, ...msg);
  }

  #findDeps(sf: ts.SourceFile) {
    const deps: ({
      fileName: TNormPath;
      importName: string;
      exportName?: string;
    } | ISdBuildMessage)[] = [];

    const tc = this.#program!.getTypeChecker();

    const visit = (node: ts.Node) => {
      if (ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier) {
          const moduleSymbol = tc.getSymbolAtLocation(node.moduleSpecifier);
          if (!moduleSymbol) {
            const pos = ts.getLineAndCharacterOfPosition(sf, node.getStart());
            deps.push({
              filePath: PathUtils.norm(sf.fileName),
              line: pos.line,
              char: pos.character,
              code: undefined,
              severity: "error",
              message: "export moduleSymbol not found",
              type: "deps",
            });
            return;
          }

          const decls = moduleSymbol.getDeclarations();
          if (!decls) {
            const pos = ts.getLineAndCharacterOfPosition(sf, node.getStart());
            deps.push({
              filePath: PathUtils.norm(sf.fileName),
              line: pos.line,
              char: pos.character,
              code: undefined,
              severity: "error",
              message: "export decls not found",
              type: "deps",
            });
            return;
          }

          const namedBindings = node.exportClause;
          if (namedBindings && ts.isNamedExports(namedBindings)) {
            for (const el of namedBindings.elements) {
              for (const decl of decls) {
                deps.push({
                  fileName: PathUtils.norm(decl.getSourceFile().fileName),
                  importName: el.name.text,
                  exportName: el.propertyName?.text ?? el.name.text,
                });
              }
            }
          }
          else {
            if (!moduleSymbol.exports) {
              const pos = ts.getLineAndCharacterOfPosition(sf, node.getStart());
              deps.push({
                filePath: PathUtils.norm(sf.fileName),
                line: pos.line,
                char: pos.character,
                code: undefined,
                severity: "error",
                message: "moduleSymbol exports not found",
                type: "deps",
              });
              return;
            }

            for (const decl of decls) {
              for (const key of moduleSymbol.exports.keys()) {
                deps.push({
                  fileName: PathUtils.norm(decl.getSourceFile().fileName),
                  importName: key.toString(),
                  exportName: key.toString(),
                });
              }
            }
          }
        }
      }
      else if (ts.isImportDeclaration(node)) {
        const moduleSymbol = tc.getSymbolAtLocation(node.moduleSpecifier);
        if (!moduleSymbol) {
          if (ts.isStringLiteral(node.moduleSpecifier)
            && node.moduleSpecifier.text.startsWith("./")) {
            deps.push({
              fileName: PathUtils.norm(path.resolve(
                path.dirname(sf.fileName),
                node.moduleSpecifier.text + ".ts",
              )),
              importName: "*",
            });

            // const pos = ts.getLineAndCharacterOfPosition(sf, node.getStart());
            // deps.push({
            //   filePath: PathUtil.norm(sf.fileName),
            //   line: pos.line,
            //   char: pos.character,
            //   code: undefined,
            //   severity: "error",
            //   message: `import moduleSymbol not found (${node.moduleSpecifier.text})`,
            //   type: "deps",
            // });
            // return;
          }

          /*else {
            throw new NeverEntryError(`import moduleSymbol: ${sf.fileName} ${node.moduleSpecifier["text"]}`);
          }*/
        }
        else {
          const decls = moduleSymbol.getDeclarations();
          if (!decls) {
            const pos = ts.getLineAndCharacterOfPosition(sf, node.getStart());
            deps.push({
              filePath: PathUtils.norm(sf.fileName),
              line: pos.line,
              char: pos.character,
              code: undefined,
              severity: "error",
              message: `import decls not found (${moduleSymbol.name})`,
              type: "deps",
            });
            return;
          }

          const namedBindings = node.importClause?.namedBindings;
          if (namedBindings && ts.isNamedImports(namedBindings)) {
            for (const el of namedBindings.elements) {
              for (const decl of decls) {
                deps.push({
                  fileName: PathUtils.norm(decl.getSourceFile().fileName),
                  importName: el.name.text,
                });
              }
            }
          }
          else {
            for (const decl of decls) {
              deps.push({
                fileName: PathUtils.norm(decl.getSourceFile().fileName),
                importName: "*",
              });
            }
          }
        }
      }

      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        if (ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text.startsWith("./")) {

          const moduleSymbol = tc.getSymbolAtLocation(node.arguments[0]);
          if (!moduleSymbol) {
            deps.push({
              fileName: PathUtils.norm(path.resolve(
                path.dirname(sf.fileName),
                node.arguments[0].text + ".ts",
              )),
              importName: "*",
            });

            // const pos = ts.getLineAndCharacterOfPosition(sf, node.getStart());
            // deps.push({
            //   filePath: PathUtil.norm(sf.fileName),
            //   line: pos.line,
            //   char: pos.character,
            //   code: undefined,
            //   severity: "error",
            //   message: `import() moduleSymbol not found (${node.arguments[0].text})`,
            //   type: "deps",
            // });
            // return;
          }
          else {
            const decls = moduleSymbol.getDeclarations();
            if (!decls) {
              const pos = ts.getLineAndCharacterOfPosition(sf, node.getStart());
              deps.push({
                filePath: PathUtils.norm(sf.fileName),
                line: pos.line,
                char: pos.character,
                code: undefined,
                severity: "error",
                message: `import() decls not found (${node.arguments[0].text})`,
                type: "deps",
              });
              return;
            }

            for (const decl of decls) {
              deps.push({
                fileName: PathUtils.norm(decl.getSourceFile().fileName),
                importName: "*",
              });
            }
          }
        }
      }

      node.forEachChild(visit);
    };

    sf.forEachChild(visit);

    return deps;
  }
}
