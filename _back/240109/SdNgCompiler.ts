import path from "path";
import {FsUtil} from "@simplysm/sd-core-node";
import ts from "typescript";
import {NgtscProgram, OptimizeFor} from "@angular/compiler-cli";
import {
  ComponentStylesheetBundler
} from "@angular-devkit/build-angular/src/tools/esbuild/angular/component-stylesheets";
import esbuild, {PartialMessage, ResolveOptions, ResolveResult} from "esbuild";
import {AngularCompilerHost} from "@angular-devkit/build-angular/src/tools/esbuild/angular/angular-host";
import {StringUtil} from "@simplysm/sd-core-common";
import {transformSupportedBrowsersToTargets} from "@angular-devkit/build-angular/src/tools/esbuild/utils";
import browserslist from "browserslist";
import {JavaScriptTransformer} from "@angular-devkit/build-angular/src/tools/esbuild/javascript-transformer";
import os from "os";
import {createHash} from "crypto";
import {convertTypeScriptDiagnostic} from "@angular-devkit/build-angular/src/tools/esbuild/angular/diagnostics";

export class SdNgCompiler {
  #parsedTsConfig: ts.ParsedCommandLine;
  #compilerHost: AngularCompilerHost;
  #javascriptTransformer: JavaScriptTransformer;

  #sourceFileCache = new Map<string, ts.SourceFile>();
  #referencingMap = new Map<string, Set<string>>();
  #tscPrepareMap = new Map<string, string>();
  #outputCacheMap = new Map<string, Uint8Array>();

  #ngProgram: NgtscProgram | undefined;
  #builder: ts.EmitAndSemanticDiagnosticsBuilderProgram | undefined;

  #resultCache: IResultCache = {
    watchFileSet: new Set<string>(),
    affectedFileSet: new Set<string>(),
    additionalResultMap: new Map<string, IAdditionalResult>()
  };

  #stylesheetBundler: ComponentStylesheetBundler | undefined;

  constructor(private _conf: {
    pkgPath: string;
    dev: boolean;
    modifiedFileSet: Set<string>;
  }) {
    const tsConfigPath = path.resolve(this._conf.pkgPath, "tsconfig.json");
    const tsConfig = FsUtil.readJson(tsConfigPath);
    this.#parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig, ts.sys, this._conf.pkgPath, {
      ...tsConfig.angularCompilerOptions,
      declaration: false
    });

    //-- stylesheetBundler
    const browserTarget = transformSupportedBrowsersToTargets(browserslist("defaults and fully supports es6-module"));
    this.#stylesheetBundler = new ComponentStylesheetBundler(
      {
        workspaceRoot: this._conf.pkgPath,
        optimization: !this._conf.dev,
        sourcemap: this._conf.dev ? 'inline' : false,
        outputNames: {bundles: '[name]', media: 'media/[name]'},
        includePaths: [],
        externalDependencies: [],
        target: browserTarget,
        preserveSymlinks: false,
        tailwindConfiguration: undefined
      },
      this._conf.dev
    );

    //-- compilerHost
    this.#compilerHost = this.#createCompilerHost();

    //-- js babel transformer
    this.#javascriptTransformer = new JavaScriptTransformer({
      thirdPartySourcemaps: this._conf.dev,
      sourcemap: this._conf.dev,
      jit: false,
      advancedOptimizations: true
    }, os.cpus().length);
  }

  async compileAsync(): Promise<{
    errors: PartialMessage[];
    warnings: PartialMessage[];
  } | null | void> {
    //-- modified
    this.#stylesheetBundler!.invalidate(this._conf.modifiedFileSet);
    for (const modifiedFile of this._conf.modifiedFileSet) {
      this.#sourceFileCache.delete(modifiedFile);
      this.#outputCacheMap.delete(modifiedFile);

      if (this.#referencingMap.has(modifiedFile)) {
        for (const referencingFile of this.#referencingMap.get(modifiedFile)!) {
          this.#sourceFileCache.delete(referencingFile);
          this.#outputCacheMap.delete(modifiedFile);
        }
      }
    }
    this.#referencingMap.clear();

    //-- init resultCache

    this.#resultCache = {
      watchFileSet: new Set<string>(),
      affectedFileSet: new Set<string>(),
      additionalResultMap: new Map<string, IAdditionalResult>()
    };

    //-- createBuilder

    this.#ngProgram = new NgtscProgram(
      this.#parsedTsConfig.fileNames,
      this.#parsedTsConfig.options,
      this.#compilerHost,
      this.#ngProgram
    );
    const ngCompiler = this.#ngProgram.compiler;
    const program = this.#ngProgram.getTsProgram();

    const baseGetSourceFiles = program.getSourceFiles;
    program.getSourceFiles = function (...parameters) {
      const files: readonly (ts.SourceFile & { version?: string })[] = baseGetSourceFiles(...parameters);

      for (const file of files) {
        if (file.version === undefined) {
          file.version = createHash("sha256").update(file.text).digest("hex");
        }
      }

      return files;
    };

    this.#builder = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
      program,
      this.#compilerHost,
      this.#builder
    );

    await ngCompiler.analyzeAsync();

    //-- affectedFilePathSet

    this.#resultCache.affectedFileSet.adds(...this.#findAffectedFileSet());

    // Deps -> refMap
    this.#builder.getSourceFiles().filter(sf => !ngCompiler.ignoreForEmit.has(sf))
      .forEach(sf => {
        this.#resultCache.watchFileSet.add(path.normalize(sf.fileName));

        const deps = ngCompiler.getResourceDependencies(sf);
        for (const dep of deps) {
          const ref = this.#referencingMap.getOrCreate(dep, new Set<string>());
          ref.add(dep);

          this.#resultCache.watchFileSet.add(path.normalize(dep));
        }
      });

    // refMap, modFile -> affectedFileSet
    for (const modifiedFile of this._conf.modifiedFileSet) {
      this.#resultCache.affectedFileSet.adds(...this.#referencingMap.get(modifiedFile) ?? []);
    }

    //-- diagnostics / build

    const diagnostics: ts.Diagnostic[] = [];

    diagnostics.push(
      ...this.#builder.getConfigFileParsingDiagnostics(),
      ...ngCompiler.getOptionDiagnostics(),
      ...this.#builder.getOptionsDiagnostics(),
      ...this.#builder.getGlobalDiagnostics()
    );

    for (const affectedFile of this.#resultCache.affectedFileSet) {
      const affectedSourceFile = this.#sourceFileCache.get(path.normalize(affectedFile));
      if (!affectedSourceFile || ngCompiler.ignoreForDiagnostics.has(affectedSourceFile)) {
        continue;
      }

      diagnostics.push(
        ...this.#builder.getSyntacticDiagnostics(affectedSourceFile),
        ...this.#builder.getSemanticDiagnostics(affectedSourceFile)
      );

      if (affectedSourceFile.isDeclarationFile) {
        continue;
      }

      diagnostics.push(
        ...ngCompiler.getDiagnosticsForFile(affectedSourceFile, OptimizeFor.WholeProgram),
      );
    }

    //-- prepare emit cache
    while (true) {
      const affectedFileResult = this.#builder.emitNextAffectedFile((fileName, text, writeByteOrderMark, onError, sourceFiles, data) => {
        if (!sourceFiles || sourceFiles.length === 0) {
          this.#compilerHost.writeFile(fileName, text, writeByteOrderMark, onError, sourceFiles, data);
          return;
        }

        const sourceFile = ts.getOriginalNode(sourceFiles[0], ts.isSourceFile);
        if (ngCompiler.ignoreForEmit.has(sourceFile)) {
          return;
        }

        ngCompiler.incrementalCompilation.recordSuccessfulEmit(sourceFile);
        this.#tscPrepareMap.set(path.normalize(sourceFile.fileName), text);
      }, undefined, undefined, this.#ngProgram.compiler.prepareEmit().transformers);

      if (!affectedFileResult) {
        break;
      }

      diagnostics.push(...affectedFileResult.result.diagnostics);
    }

    //-- return err/warn

    return {
      errors: [
        ...diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).map(item => convertTypeScriptDiagnostic(ts, item)),
        ...Array.from(this.#resultCache.additionalResultMap.values()).flatMap(item => item.errors)
      ].filterExists(),
      warnings: [
        ...diagnostics.filter(item => item.category !== ts.DiagnosticCategory.Error).map(item => convertTypeScriptDiagnostic(ts, item)),
        ...Array.from(this.#resultCache.additionalResultMap.values()).flatMap(item => item.warnings)
      ],
    };
  }

  async transformAsync(args: {
    path: string,
    resolve: (path: string, options?: ResolveOptions) => Promise<ResolveResult>
  }): Promise<{ contents: string | Uint8Array, loader: "js" } | null | undefined> {
    this.#resultCache.watchFileSet.add(path.normalize(args.path));

    const output = this.#outputCacheMap.get(path.normalize(args.path));
    if (output != null) {
      return {contents: output, loader: "js"};
    }

    const {sideEffects} = await args.resolve(args.path, {
      kind: 'import-statement',
      resolveDir: this._conf.pkgPath,
    });

    let newContents: Uint8Array;
    if (/\.ts$/.test(args.path)) {
      const contents = this.#tscPrepareMap.get(path.normalize(args.path));
      newContents = await this.#javascriptTransformer.transformData(
        args.path,
        contents!,
        true,
        sideEffects
      );
    }
    else if (/\.[cm]?js$/.test(args.path)) {
      newContents = await this.#javascriptTransformer.transformFile(
        args.path,
        false,
        sideEffects
      );
    }
    else {
      return null;
    }

    this.#outputCacheMap.set(path.normalize(args.path), newContents);

    return {contents: newContents, loader: "js"};
  }

  getResult() {
    return {
      watchFileSet: this.#resultCache.watchFileSet,
      affectedFileSet: this.#resultCache.affectedFileSet,
      additionalResultMap: this.#resultCache.additionalResultMap,
      program: this.#ngProgram!.getTsProgram()
    };
  }

  #createCompilerHost() {
    const compilerHost: AngularCompilerHost = ts.createIncrementalCompilerHost(this.#parsedTsConfig.options);
    compilerHost.readResource = (fileName: string) => {
      return compilerHost.readFile(fileName) ?? "";
    };

    compilerHost.transformResource = async (data: string, context: {
      type: string,
      containingFile: string,
      resourceFile: any
    }) => {
      if (context.type !== "style") {
        return null;
      }

      const stylesheetResult = context.resourceFile != null
        ? await this.#stylesheetBundler!.bundleFile(context.resourceFile)
        : await this.#stylesheetBundler!.bundleInline(
          data,
          context.containingFile,
          "scss",
        );

      this.#resultCache.watchFileSet.add(path.normalize(context.containingFile));

      if (stylesheetResult.referencedFiles) {
        for (const referencedFile of stylesheetResult.referencedFiles) {
          const referencingMapValSet = this.#referencingMap.getOrCreate(path.normalize(referencedFile), new Set<string>());
          referencingMapValSet.add(path.normalize(context.containingFile));
        }

        this.#resultCache.watchFileSet.adds(...Array.from(stylesheetResult.referencedFiles.values()).map(item => path.normalize(item)));
      }

      this.#resultCache.additionalResultMap.set(path.normalize(context.resourceFile ?? context.containingFile), {
        outputFiles: stylesheetResult.resourceFiles,
        metafile: stylesheetResult.metafile,
        errors: stylesheetResult.errors,
        warnings: stylesheetResult.warnings
      });

      return StringUtil.isNullOrEmpty(stylesheetResult.contents) ? null : {content: stylesheetResult.contents};
    };

    compilerHost.getModifiedResourceFiles = () => {
      return this._conf.modifiedFileSet;
    };

    const baseGetSourceFile = compilerHost.getSourceFile;
    compilerHost.getSourceFile = (fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile, ...args) => {
      if (!shouldCreateNewSourceFile && this.#sourceFileCache.has(path.normalize(fileName))) {
        return this.#sourceFileCache.get(path.normalize(fileName));
      }

      const file = baseGetSourceFile.call(
        compilerHost,
        fileName,
        languageVersionOrOptions,
        onError,
        true,
        ...args,
      );

      if (file) {
        this.#sourceFileCache.set(path.normalize(fileName), file);
      }

      return file;
    };

    return compilerHost;
  }

  #findAffectedFileSet() {
    const affectedFileSet = new Set<string>();

    while (true) {
      const result = this.#builder!.getSemanticDiagnosticsOfNextAffectedFile(undefined, (sourceFile) => {
        if (this.#ngProgram?.compiler.ignoreForDiagnostics.has(sourceFile) && sourceFile.fileName.endsWith('.ngtypecheck.ts')) {
          const originalFilename = sourceFile.fileName.slice(0, -15) + '.ts';
          const originalSourceFile = this.#sourceFileCache.get(originalFilename);
          if (originalSourceFile) {
            affectedFileSet.add(path.normalize(originalSourceFile.fileName));
          }

          return true;
        }

        return false;
      });

      if (!result) {
        break;
      }

      affectedFileSet.add(path.normalize((result.affected as ts.SourceFile).fileName));
    }

    return affectedFileSet;
  }
}

interface IResultCache {
  watchFileSet: Set<string>;
  affectedFileSet: Set<string>;
  additionalResultMap: Map<string, IAdditionalResult>;
}

interface IAdditionalResult {
  outputFiles: esbuild.OutputFile[];
  metafile?: esbuild.Metafile;
  errors?: esbuild.PartialMessage[];
  warnings: esbuild.PartialMessage[];
}