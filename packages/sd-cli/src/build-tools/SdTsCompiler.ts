import ts, { CompilerOptions } from "typescript";
import path from "path";
import { FsUtil, Logger, PathUtil } from "@simplysm/sd-core-node";
import { NeverEntryError, StringUtil } from "@simplysm/sd-core-common";
import esbuild from "esbuild";
import { NgtscProgram, OptimizeFor } from "@angular/compiler-cli";
import { createHash } from "crypto";
import { ComponentStylesheetBundler } from "@angular/build/src/tools/esbuild/angular/component-stylesheets";
import { AngularCompilerHost } from "@angular/build/src/tools/angular/angular-host";
import { transformSupportedBrowsersToTargets } from "@angular/build/src/tools/esbuild/utils";
import browserslist from "browserslist";
import transformKeys from "@simplysm/ts-transformer-keys/transformer";
import { replaceBootstrap } from "@angular/build/src/tools/angular/transformers/jit-bootstrap-transformer";

export class SdTsCompiler {
  readonly #logger = Logger.get(["simplysm", "sd-cli", "SdTsCompiler"]);

  readonly #parsedTsconfig: ts.ParsedCommandLine;
  readonly #isForAngular: boolean;

  readonly #revDependencyCacheMap = new Map<string, Set<string>>();
  readonly #resourceDependencyCacheMap = new Map<string, Set<string>>();
  readonly #sourceFileCacheMap = new Map<string, ts.SourceFile>();
  readonly #emittedFilesCacheMap = new Map<
    string,
    {
      outAbsPath?: string;
      text: string;
    }[]
  >();

  readonly #stylesheetBundler: ComponentStylesheetBundler | undefined;
  readonly #compilerHost: ts.CompilerHost | AngularCompilerHost;

  #ngProgram: NgtscProgram | undefined;
  #program: ts.Program | undefined;

  readonly #modifiedFileSet = new Set<string>();

  readonly #watchFileSet = new Set<string>();
  readonly #stylesheetBundlingResultMap = new Map<string, IStylesheetBundlingResult>();

  readonly #pkgPath: string;
  readonly #distPath: string;
  readonly #globalStyleFilePath?: string;

  constructor(pkgPath: string, additionalOptions: CompilerOptions, isDevMode: boolean, globalStyleFilePath?: string) {
    this.#pkgPath = pkgPath;
    this.#globalStyleFilePath = globalStyleFilePath != null ? path.normalize(globalStyleFilePath) : undefined;

    this.#debug("초기화...");

    //-- isForAngular / parsedTsConfig

    const tsconfigPath = path.resolve(pkgPath, "tsconfig.json");
    const tsconfig = FsUtil.readJson(tsconfigPath);
    this.#isForAngular = Boolean(tsconfig.angularCompilerOptions);
    this.#parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, pkgPath, {
      ...tsconfig.angularCompilerOptions,
      ...additionalOptions,
    });

    this.#distPath = this.#parsedTsconfig.options.outDir ?? path.resolve(pkgPath, "dist");

    //-- compilerHost

    this.#compilerHost = ts.createCompilerHost(this.#parsedTsconfig.options);

    const baseGetSourceFile = this.#compilerHost.getSourceFile;
    this.#compilerHost.getSourceFile = (
      fileName,
      languageVersionOrOptions,
      onError,
      shouldCreateNewSourceFile,
      ...args
    ) => {
      if (!shouldCreateNewSourceFile && this.#sourceFileCacheMap.has(path.normalize(fileName))) {
        return this.#sourceFileCacheMap.get(path.normalize(fileName));
      }

      const sf = baseGetSourceFile.call(this.#compilerHost, fileName, languageVersionOrOptions, onError, true, ...args);

      if (sf) {
        this.#sourceFileCacheMap.set(path.normalize(fileName), sf);
      } else {
        this.#sourceFileCacheMap.delete(path.normalize(fileName));
      }

      return sf;
    };

    const baseReadFile = this.#compilerHost.readFile;
    this.#compilerHost.readFile = (fileName) => {
      this.#watchFileSet.add(path.normalize(fileName));
      return baseReadFile.call(this.#compilerHost, fileName);
    };

    if (this.#isForAngular) {
      //-- stylesheetBundler
      this.#stylesheetBundler = new ComponentStylesheetBundler(
        {
          workspaceRoot: pkgPath,
          optimization: !isDevMode,
          inlineFonts: true,
          preserveSymlinks: false,
          sourcemap: "inline", //conf.dev ? 'inline' : false,
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
        isDevMode,
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

        const contents = await this.#bundleStylesheetAsync(data, context.containingFile, context.resourceFile);

        return StringUtil.isNullOrEmpty(contents) ? null : { content: contents };
      };

      (this.#compilerHost as AngularCompilerHost).getModifiedResourceFiles = () => {
        return this.#modifiedFileSet;
      };
    }
  }

  async #bundleStylesheetAsync(data: string, containingFile: string, resourceFile: string | null = null) {
    // containingFile: 포함된 파일 (.ts)
    // resourceFile: 외부 리소스 파일 (styleUrls로 입력하지 않고 styles에 직접 입력한 경우 null)
    // referencedFiles: import한 외부 scss 파일 혹은 woff파일등 외부 파일

    this.#debug(`스타일시트 번들링...(${containingFile}, ${resourceFile})`);

    const stylesheetResult =
      resourceFile != null
        ? await this.#stylesheetBundler!.bundleFile(resourceFile)
        : await this.#stylesheetBundler!.bundleInline(data, containingFile, "scss");

    if (stylesheetResult.referencedFiles) {
      for (const referencedFile of stylesheetResult.referencedFiles) {
        const depCacheSet = this.#resourceDependencyCacheMap.getOrCreate(
          path.normalize(referencedFile),
          new Set<string>(),
        );
        depCacheSet.add(path.normalize(resourceFile ?? containingFile));
      }

      this.#watchFileSet.adds(
        ...Array.from(stylesheetResult.referencedFiles.values()).map((item) => path.normalize(item)),
      );
    }

    this.#stylesheetBundlingResultMap.set(path.normalize(resourceFile ?? containingFile), {
      outputFiles: stylesheetResult.outputFiles,
      metafile: stylesheetResult.metafile,
      errors: stylesheetResult.errors,
      warnings: stylesheetResult.warnings,
    });

    return stylesheetResult.contents;
  }

  invalidate(modifiedFileSet: Set<string>) {
    this.#modifiedFileSet.adds(...Array.from(modifiedFileSet).map((item) => path.normalize(item)));
  }

  async buildAsync(): Promise<ISdTsCompilerResult> {
    const affectedFileSet = new Set<string>();
    const emitFileSet = new Set<string>();

    this.#debug(`get affected (old deps & old res deps)...`);

    for (const modifiedFile of this.#modifiedFileSet) {
      affectedFileSet.add(modifiedFile);
      affectedFileSet.adds(...(this.#revDependencyCacheMap.get(modifiedFile) ?? []));
      affectedFileSet.adds(...(this.#resourceDependencyCacheMap.get(modifiedFile) ?? []));

      this.#emittedFilesCacheMap.delete(path.normalize(modifiedFile));
    }

    this.#debug(`invalidate & clear cache...`);

    this.#stylesheetBundler?.invalidate(this.#modifiedFileSet);

    for (const affectedFile of affectedFileSet) {
      this.#sourceFileCacheMap.delete(path.normalize(affectedFile));
      this.#stylesheetBundlingResultMap.delete(path.normalize(affectedFile));
      this.#watchFileSet.delete(path.normalize(affectedFile));
    }

    this.#revDependencyCacheMap.clear();
    this.#resourceDependencyCacheMap.clear();

    this.#debug(`create program...`);

    if (this.#isForAngular) {
      this.#ngProgram = new NgtscProgram(
        this.#parsedTsconfig.fileNames,
        this.#parsedTsconfig.options,
        this.#compilerHost,
        this.#ngProgram,
      );
      this.#program = this.#ngProgram.getTsProgram();
    } else {
      this.#program = ts.createProgram(
        this.#parsedTsconfig.fileNames,
        this.#parsedTsconfig.options,
        this.#compilerHost,
        this.#program,
      );
    }

    const baseGetSourceFiles = this.#program.getSourceFiles;
    this.#program.getSourceFiles = function (...parameters) {
      const files: readonly (ts.SourceFile & { version?: string })[] = baseGetSourceFiles(...parameters);

      for (const file of files) {
        if (file.version === undefined) {
          file.version = createHash("sha256").update(file.text).digest("hex");
        }
      }

      return files;
    };

    this.#debug(`create builder...`);

    if (this.#ngProgram) {
      await this.#ngProgram.compiler.analyzeAsync();
    }

    const getOrgSourceFile = (sf: ts.SourceFile) => {
      if (sf.fileName.endsWith(".ngtypecheck.ts")) {
        const orgFileName = sf.fileName.slice(0, -15) + ".ts";
        return this.#program!.getSourceFile(orgFileName);
      }

      return sf;
    };

    this.#debug(`get affected (new deps)...`);

    const sourceFileSet = new Set(
      this.#program
        .getSourceFiles()
        .map((sf) => getOrgSourceFile(sf))
        .filterExists(),
    );

    const depMap = new Map<
      string,
      {
        fileName: string;
        importName: string;
        exportName?: string;
      }[]
    >();
    for (const sf of sourceFileSet) {
      const refs = this.#findDeps(sf);
      depMap.set(path.normalize(sf.fileName), refs);
    }

    const allDepMap = new Map<string, Set<string>>();
    const getAllDeps = (fileName: string, prevSet?: Set<string>) => {
      if (allDepMap.has(fileName)) {
        return allDepMap.get(fileName)!;
      }

      const result = new Set<string>();

      const deps = depMap.get(fileName) ?? [];
      result.adds(...deps.map((item) => item.fileName));

      for (const dep of deps) {
        const targetDeps = depMap.get(dep.fileName) ?? [];

        if (dep.importName === "*") {
          for (const targetRefItem of targetDeps.filter((item) => item.exportName != null)) {
            if (prevSet?.has(targetRefItem.fileName)) continue;

            result.add(targetRefItem.fileName);
            result.adds(...getAllDeps(targetRefItem.fileName, new Set<string>(prevSet).adds(...result)));
          }
        } else {
          for (const targetRefItem of targetDeps.filter((item) => item.exportName === dep.importName)) {
            if (prevSet?.has(targetRefItem.fileName)) continue;

            result.add(targetRefItem.fileName);
            result.adds(...getAllDeps(targetRefItem.fileName, new Set<string>(prevSet).adds(...result)));
          }
        }
      }

      return result;
    };

    for (const sf of sourceFileSet) {
      const deps = getAllDeps(path.normalize(sf.fileName));
      allDepMap.set(path.normalize(sf.fileName), deps);

      for (const dep of getAllDeps(path.normalize(sf.fileName))) {
        const depCache = this.#revDependencyCacheMap.getOrCreate(path.normalize(dep), new Set<string>());
        depCache.add(path.normalize(sf.fileName));
        if (this.#modifiedFileSet.has(path.normalize(dep))) {
          affectedFileSet.add(path.normalize(sf.fileName));
        }
      }

      if (this.#ngProgram) {
        if (this.#ngProgram.compiler.ignoreForEmit.has(sf)) {
          continue;
        }

        for (const dep of this.#ngProgram.compiler.getResourceDependencies(sf)) {
          const ref = this.#resourceDependencyCacheMap.getOrCreate(path.normalize(dep), new Set<string>());
          ref.add(path.normalize(sf.fileName));
          if (this.#modifiedFileSet.has(path.normalize(dep))) {
            affectedFileSet.add(path.normalize(sf.fileName));
          }
        }
      }
    }

    if (affectedFileSet.size === 0) {
      this.#debug(`get affected (init)...`);

      for (const sf of this.#program.getSourceFiles()) {
        const orgSf = getOrgSourceFile(sf);
        if (!orgSf) continue;

        affectedFileSet.add(path.normalize(orgSf.fileName));
      }
    }

    this.#debug(`get diagnostics...`);

    const diagnostics: ts.Diagnostic[] = [];

    diagnostics.push(
      ...this.#program.getConfigFileParsingDiagnostics(),
      ...this.#program.getOptionsDiagnostics(),
      ...this.#program.getGlobalDiagnostics(),
    );

    if (this.#ngProgram) {
      diagnostics.push(...this.#ngProgram.compiler.getOptionDiagnostics());
    }

    for (const affectedFile of affectedFileSet) {
      const affectedSourceFile = this.#program.getSourceFile(affectedFile);
      if (
        !affectedSourceFile ||
        (this.#ngProgram && this.#ngProgram.compiler.ignoreForDiagnostics.has(affectedSourceFile))
      ) {
        continue;
      }

      diagnostics.push(
        ...this.#program.getSyntacticDiagnostics(affectedSourceFile),
        ...this.#program.getSemanticDiagnostics(affectedSourceFile),
      );

      if (this.#ngProgram) {
        if (affectedSourceFile.isDeclarationFile) {
          continue;
        }

        diagnostics.push(
          ...this.#ngProgram.compiler.getDiagnosticsForFile(affectedSourceFile, OptimizeFor.WholeProgram),
        );
      }
    }

    this.#debug(`prepare emit...`);

    let transformers: ts.CustomTransformers = {};

    if (this.#ngProgram) {
      transformers = {
        ...transformers,
        ...this.#ngProgram.compiler.prepareEmit().transformers,
      };
      (transformers.before ??= []).push(replaceBootstrap(() => this.#program!.getTypeChecker()));
    }
    (transformers.before ??= []).push(transformKeys(this.#program));

    // affected에 새로 추가된 파일은 포함되지 않는 현상이 있어 getSourceFiles로 바꿈
    // -> 너무 느려져서 다시 돌림. 포함안되는 현상은 getAllDep 문제인가?
    for (const affectedFile of affectedFileSet) {
      if (this.#emittedFilesCacheMap.has(affectedFile)) {
        continue;
      }

      const sf = this.#program.getSourceFile(affectedFile);
      if (!sf) {
        continue;
      }

      // for (const sf of sourceFileSet) {

      if (this.#emittedFilesCacheMap.has(path.normalize(sf.fileName))) {
        continue;
      }

      if (sf.isDeclarationFile) {
        continue;
      }

      if (this.#ngProgram?.compiler.ignoreForEmit.has(sf)) {
        continue;
      }

      this.#debug(`emit for`, sf.fileName);
      this.#program.emit(
        sf,
        (fileName, text, writeByteOrderMark, onError, sourceFiles, data) => {
          if (!sourceFiles || sourceFiles.length === 0) {
            this.#compilerHost.writeFile(fileName, text, writeByteOrderMark, onError, sourceFiles, data);
            return;
          }

          const sourceFile = ts.getOriginalNode(sourceFiles[0], ts.isSourceFile);
          if (this.#ngProgram) {
            if (this.#ngProgram.compiler.ignoreForEmit.has(sourceFile)) {
              return;
            }
            this.#ngProgram.compiler.incrementalCompilation.recordSuccessfulEmit(sourceFile);
          }

          const emitFileInfoCaches = this.#emittedFilesCacheMap.getOrCreate(path.normalize(sourceFile.fileName), []);
          if (PathUtil.isChildPath(sourceFile.fileName, this.#pkgPath)) {
            let realFilePath = fileName;
            let realText = text;
            if (PathUtil.isChildPath(realFilePath, path.resolve(this.#distPath, path.basename(this.#pkgPath), "src"))) {
              realFilePath = path.resolve(
                this.#distPath,
                path.relative(path.resolve(this.#distPath, path.basename(this.#pkgPath), "src"), realFilePath),
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
          } else {
            emitFileInfoCaches.push({ text });
          }

          emitFileSet.add(path.normalize(sourceFile.fileName));
        },
        undefined,
        undefined,
        transformers,
      );
    }

    //-- global style
    if (
      this.#globalStyleFilePath != null &&
      FsUtil.exists(this.#globalStyleFilePath) &&
      !this.#emittedFilesCacheMap.has(this.#globalStyleFilePath)
    ) {
      this.#debug(`bundle global style...`);

      const data = await FsUtil.readFileAsync(this.#globalStyleFilePath);
      const contents = await this.#bundleStylesheetAsync(data, this.#globalStyleFilePath, this.#globalStyleFilePath);
      const emitFileInfos = this.#emittedFilesCacheMap.getOrCreate(this.#globalStyleFilePath, []);
      emitFileInfos.push({
        outAbsPath: path.resolve(
          this.#pkgPath,
          path.relative(path.resolve(this.#pkgPath, "src"), this.#globalStyleFilePath).replace(/\.scss$/, ".css"),
        ),
        text: contents,
      });
      emitFileSet.add(this.#globalStyleFilePath);
    }

    //-- init

    this.#modifiedFileSet.clear();

    this.#debug(`build completed`, affectedFileSet, diagnostics.length);

    //-- result

    return {
      program: this.#program,
      typescriptDiagnostics: diagnostics,
      stylesheetBundlingResultMap: this.#stylesheetBundlingResultMap,
      emittedFilesCacheMap: this.#emittedFilesCacheMap,
      watchFileSet: this.#watchFileSet,
      affectedFileSet,
      emitFileSet,
    };
  }

  #debug(...msg: any[]): void {
    this.#logger.debug(`[${path.basename(this.#pkgPath)}]`, ...msg);
  }

  #findDeps(sf: ts.SourceFile) {
    const deps: {
      fileName: string;
      importName: string;
      exportName?: string;
    }[] = [];

    const tc = this.#program!.getTypeChecker();

    sf.forEachChild((node) => {
      if (ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier) {
          const moduleSymbol = tc.getSymbolAtLocation(node.moduleSpecifier);
          if (!moduleSymbol) throw new NeverEntryError(`export moduleSymbol: ${sf.fileName}`);

          const decls = moduleSymbol.getDeclarations();
          if (!decls) throw new NeverEntryError(`export decls: ${sf.fileName}`);

          const namedBindings = node.exportClause;
          if (namedBindings && ts.isNamedExports(namedBindings)) {
            for (const el of namedBindings.elements) {
              for (const decl of decls) {
                deps.push({
                  fileName: path.normalize(decl.getSourceFile().fileName),
                  importName: el.name.text,
                  exportName: el.propertyName?.text ?? el.name.text,
                });
              }
            }
          } else {
            if (!moduleSymbol.exports) {
              throw new NeverEntryError("1234");
            }

            for (const decl of decls) {
              for (const key of moduleSymbol.exports.keys()) {
                deps.push({
                  fileName: path.normalize(decl.getSourceFile().fileName),
                  importName: key.toString(),
                  exportName: key.toString(),
                });
              }
            }
          }
        }
      } else if (ts.isImportDeclaration(node)) {
        const moduleSymbol = tc.getSymbolAtLocation(node.moduleSpecifier);
        if (!moduleSymbol) {
          if (ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text.startsWith("./")) {
            deps.push({
              fileName: path.normalize(path.resolve(path.dirname(sf.fileName), node.moduleSpecifier.text)),
              importName: "*",
            });
          }
          /*else {
            throw new NeverEntryError(`import moduleSymbol: ${sf.fileName} ${node.moduleSpecifier["text"]}`);
          }*/
        } else {
          const decls = moduleSymbol.getDeclarations();
          if (!decls) throw new NeverEntryError(`import decls: ${sf.fileName}`);

          const namedBindings = node.importClause?.namedBindings;
          if (namedBindings && ts.isNamedImports(namedBindings)) {
            for (const el of namedBindings.elements) {
              for (const decl of decls) {
                deps.push({
                  fileName: path.normalize(decl.getSourceFile().fileName),
                  importName: el.name.text,
                });
              }
            }
          } else {
            for (const decl of decls) {
              deps.push({
                fileName: path.normalize(decl.getSourceFile().fileName),
                importName: "*",
              });
            }
          }
        }
      }
    });

    return deps;
  }
}

export interface ISdTsCompilerResult {
  program: ts.Program;
  typescriptDiagnostics: ts.Diagnostic[];
  stylesheetBundlingResultMap: Map<string, IStylesheetBundlingResult>;
  emittedFilesCacheMap: Map<string, { outAbsPath?: string; text: string }[]>;
  watchFileSet: Set<string>;

  affectedFileSet: Set<string>;
  emitFileSet: Set<string>;
}

interface IStylesheetBundlingResult {
  outputFiles: esbuild.OutputFile[];
  metafile?: esbuild.Metafile;
  errors?: esbuild.PartialMessage[];
  warnings?: esbuild.PartialMessage[];
}
