import ts, {CompilerOptions} from "typescript";
import path from "path";
import {FsUtil, PathUtil} from "@simplysm/sd-core-node";
import {transformSupportedBrowsersToTargets} from "@angular-devkit/build-angular/src/tools/esbuild/utils";
import browserslist from "browserslist";
import {
  ComponentStylesheetBundler
} from "@angular-devkit/build-angular/src/tools/esbuild/angular/component-stylesheets";
import {AngularCompilerHost} from "@angular-devkit/build-angular/src/tools/esbuild/angular/angular-host";
import {StringUtil} from "@simplysm/sd-core-common";
import esbuild from "esbuild";
import {NgtscProgram, OptimizeFor} from "@angular/compiler-cli";
import {createHash} from "crypto";

export class SdTsCompiler {
  readonly #parsedTsconfig: ts.ParsedCommandLine;
  readonly #isForAngular: boolean;

  readonly #resourceDependencyCacheMap = new Map<string, Set<string>>();
  readonly #sourceFileCacheMap = new Map<string, ts.SourceFile>();
  readonly #emittedFilesCacheMap = new Map<string, {
    outRelPath?: string;
    text: string;
  }[]>();

  readonly #stylesheetBundler: ComponentStylesheetBundler | undefined;
  readonly #compilerHost: ts.CompilerHost | AngularCompilerHost;

  #ngProgram: NgtscProgram | undefined;
  #program: ts.Program | undefined;
  #builder: ts.EmitAndSemanticDiagnosticsBuilderProgram | undefined;

  readonly #modifiedFileSet = new Set<string>();

  readonly #watchFileSet = new Set<string>();
  readonly #stylesheetResultMap = new Map<string, IStylesheetResult>();
  readonly #affectedFileSet = new Set<string>();

  readonly #pkgPath: string;
  readonly #distPath: string;
  readonly #globalStyleFilePath?: string;

  constructor(pkgPath: string,
              additionalOptions: CompilerOptions,
              isDevMode: boolean,
              globalStyleFilePath?: string) {
    this.#pkgPath = pkgPath;
    this.#globalStyleFilePath = globalStyleFilePath != null ? path.normalize(globalStyleFilePath) : undefined;

    //-- isForAngular / parsedTsConfig

    const tsconfigPath = path.resolve(pkgPath, "tsconfig.json");
    const tsconfig = FsUtil.readJson(tsconfigPath);
    this.#isForAngular = Boolean(tsconfig.angularCompilerOptions);
    this.#parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, pkgPath, {
      ...tsconfig.angularCompilerOptions,
      ...additionalOptions
    });

    this.#distPath = this.#parsedTsconfig.options.outDir ?? path.resolve(pkgPath, "dist");

    //-- compilerHost

    this.#compilerHost = ts.createIncrementalCompilerHost(this.#parsedTsconfig.options);

    const baseGetSourceFile = this.#compilerHost.getSourceFile;
    this.#compilerHost.getSourceFile = (fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile, ...args) => {
      if (!shouldCreateNewSourceFile && this.#sourceFileCacheMap.has(path.normalize(fileName))) {
        return this.#sourceFileCacheMap.get(path.normalize(fileName));
      }

      const sf = baseGetSourceFile.call(
        this.#compilerHost,
        fileName,
        languageVersionOrOptions,
        onError,
        true,
        ...args,
      );

      if (sf) {
        this.#sourceFileCacheMap.set(path.normalize(fileName), sf);
      }
      else {
        this.#sourceFileCacheMap.delete(path.normalize(fileName));
      }

      return sf;
    };

    if (this.#isForAngular) {
      //-- stylesheetBundler

      const browserTarget = transformSupportedBrowsersToTargets(browserslist("defaults and fully supports es6-module"));
      this.#stylesheetBundler = new ComponentStylesheetBundler(
        {
          workspaceRoot: pkgPath,
          optimization: !isDevMode,
          inlineFonts: true,
          preserveSymlinks: false,
          sourcemap: 'inline', //conf.dev ? 'inline' : false,
          outputNames: {bundles: '[name]', media: 'media/[name]'},
          includePaths: [],
          externalDependencies: [],
          target: browserTarget,
          tailwindConfiguration: undefined,
          cacheOptions: {
            enabled: true,
            path: ".cache/angular",
            basePath: ".cache"
          }
        },
        isDevMode
      );

      //-- compilerHost

      (this.#compilerHost as AngularCompilerHost).readResource = (fileName: string) => {
        return this.#compilerHost.readFile(fileName) ?? "";
      };

      (this.#compilerHost as AngularCompilerHost).transformResource = async (data: string, context: {
        type: string,
        containingFile: string,
        resourceFile: string | null
      }) => {
        if (context.type !== "style") {
          return null;
        }

        const contents = await this.#bundleStylesheetAsync(data, context.containingFile, context.resourceFile);

        return StringUtil.isNullOrEmpty(contents) ? null : {content: contents};
      };

      (this.#compilerHost as AngularCompilerHost).getModifiedResourceFiles = () => {
        return this.#modifiedFileSet;
      };
    }
  }

  async #bundleStylesheetAsync(data: string, containingFile: string, resourceFile: string | null = null) {
    const stylesheetResult = resourceFile != null
      ? await this.#stylesheetBundler!.bundleFile(resourceFile)
      : await this.#stylesheetBundler!.bundleInline(
        data,
        containingFile,
        "scss",
      );

    this.#watchFileSet.add(path.normalize(containingFile));
    if (resourceFile != null) {
      this.#watchFileSet.add(path.normalize(resourceFile));
    }

    if (stylesheetResult.referencedFiles) {
      for (const referencedFile of stylesheetResult.referencedFiles) {
        const referencingMapValSet = this.#resourceDependencyCacheMap.getOrCreate(path.normalize(referencedFile), new Set<string>());
        referencingMapValSet.add(path.normalize(containingFile));
        if (resourceFile != null) {
          referencingMapValSet.add(path.normalize(resourceFile));
        }
      }

      this.#watchFileSet.adds(...Array.from(stylesheetResult.referencedFiles.values()).map(item => path.normalize(item)));
    }

    this.#stylesheetResultMap.set(path.normalize(resourceFile ?? containingFile), {
      outputFiles: stylesheetResult.outputFiles ?? [],
      metafile: stylesheetResult.metafile,
      errors: stylesheetResult.errors,
      warnings: stylesheetResult.warnings
    });

    return stylesheetResult.contents;
  }

  invalidate(modifiedFileSet: Set<string>) {
    this.#stylesheetBundler?.invalidate(modifiedFileSet);

    for (const modifiedFile of modifiedFileSet) {
      this.#stylesheetResultMap.delete(path.normalize(modifiedFile));
      this.#sourceFileCacheMap.delete(path.normalize(modifiedFile));
      this.#emittedFilesCacheMap.delete(path.normalize(modifiedFile));

      if (this.#resourceDependencyCacheMap.has(path.normalize(modifiedFile))) {
        for (const referencingFile of this.#resourceDependencyCacheMap.get(path.normalize(modifiedFile))!) {
          this.#stylesheetResultMap.delete(path.normalize(referencingFile));
          this.#sourceFileCacheMap.delete(path.normalize(referencingFile));
          this.#emittedFilesCacheMap.delete(path.normalize(referencingFile));
        }
      }
    }

    this.#modifiedFileSet.adds(...modifiedFileSet);
  }

  async buildAsync(): Promise<ISdTsCompiler2Result> {
    this.#resourceDependencyCacheMap.clear();
    this.#watchFileSet.clear();
    this.#stylesheetResultMap.clear();
    this.#affectedFileSet.clear();

    if (this.#isForAngular) {
      this.#ngProgram = new NgtscProgram(
        this.#parsedTsconfig.fileNames,
        this.#parsedTsconfig.options,
        this.#compilerHost,
        this.#ngProgram
      );
      this.#program = this.#ngProgram.getTsProgram();
    }
    else {
      // noinspection UnnecessaryLocalVariableJS
      this.#program = ts.createProgram(
        this.#parsedTsconfig.fileNames,
        this.#parsedTsconfig.options,
        this.#compilerHost,
        this.#program
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

    this.#builder = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
      this.#program,
      this.#compilerHost,
      this.#builder
    );

    if (this.#ngProgram) {
      await this.#ngProgram.compiler.analyzeAsync();
    }

    //-- affectedFilePathSet

    while (true) {
      const result = this.#builder.getSemanticDiagnosticsOfNextAffectedFile(undefined, (sourceFile) => {
        if (
          this.#ngProgram
          && this.#ngProgram.compiler.ignoreForDiagnostics.has(sourceFile)
          && sourceFile.fileName.endsWith('.ngtypecheck.ts')
        ) {
          const originalFilename = sourceFile.fileName.slice(0, -15) + '.ts';
          const originalSourceFile = this.#sourceFileCacheMap.get(originalFilename);
          if (originalSourceFile) {
            this.#affectedFileSet.add(path.normalize(originalSourceFile.fileName));
          }

          return true;
        }

        return false;
      });

      if (!result) {
        break;
      }

      this.#affectedFileSet.add(path.normalize((result.affected as ts.SourceFile).fileName));
    }

    // Deps -> refMap

    this.#builder.getSourceFiles().filter(sf => !this.#ngProgram || !this.#ngProgram.compiler.ignoreForEmit.has(sf))
      .forEach(sf => {
        this.#watchFileSet.add(path.normalize(sf.fileName));

        if (this.#ngProgram) {
          const deps = this.#ngProgram.compiler.getResourceDependencies(sf);
          for (const dep of deps) {
            const ref = this.#resourceDependencyCacheMap.getOrCreate(path.normalize(dep), new Set<string>());
            ref.add(path.normalize(sf.fileName));

            this.#watchFileSet.add(path.normalize(dep));
          }
        }
      });

    //-- diagnostics

    const diagnostics: ts.Diagnostic[] = [];

    diagnostics.push(
      ...this.#builder.getConfigFileParsingDiagnostics(),
      ...this.#builder.getOptionsDiagnostics(),
      ...this.#builder.getGlobalDiagnostics()
    );

    if (this.#ngProgram) {
      diagnostics.push(...this.#ngProgram.compiler.getOptionDiagnostics());
    }

    for (const affectedFile of this.#affectedFileSet) {
      const affectedSourceFile = this.#sourceFileCacheMap.get(affectedFile);
      if (!affectedSourceFile || (this.#ngProgram && this.#ngProgram.compiler.ignoreForDiagnostics.has(affectedSourceFile))) {
        continue;
      }

      diagnostics.push(
        ...this.#builder.getSyntacticDiagnostics(affectedSourceFile),
        ...this.#builder.getSemanticDiagnostics(affectedSourceFile)
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

    //-- prepare emit cache

    while (true) {
      const affectedFileResult = this.#builder.emitNextAffectedFile((fileName, text, writeByteOrderMark, onError, sourceFiles, data) => {
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

        const emittedFiles = this.#emittedFilesCacheMap.getOrCreate(path.normalize(sourceFile.fileName), []);
        if (PathUtil.isChildPath(sourceFile.fileName, this.#pkgPath)) {
          let realFilePath = fileName;
          let realText = text;
          if (PathUtil.isChildPath(realFilePath, path.resolve(this.#distPath, path.basename(this.#pkgPath), "src"))) {
            realFilePath = path.resolve(this.#distPath, path.relative(path.resolve(this.#distPath, path.basename(this.#pkgPath), "src"), realFilePath));

            if (fileName.endsWith(".js.map")) {
              const sourceMapContents = JSON.parse(realText);
              // remove "../../"
              sourceMapContents.sources[0] = sourceMapContents.sources[0].slice(6);
              realText = JSON.stringify(sourceMapContents);
            }
          }

          emittedFiles.push({
            outRelPath: path.relative(this.#distPath, realFilePath),
            text: realText
          });
        }
        else {
          emittedFiles.push({text});
        }
      }, undefined, undefined, this.#ngProgram?.compiler.prepareEmit().transformers);

      if (!affectedFileResult) {
        break;
      }

      diagnostics.push(...affectedFileResult.result.diagnostics);
    }

    //-- global style
    if (
      this.#globalStyleFilePath != null
      && !this.#stylesheetResultMap.has(this.#globalStyleFilePath)
      && FsUtil.exists(this.#globalStyleFilePath)
    ) {
      const data = await FsUtil.readFileAsync(this.#globalStyleFilePath);
      const contents = await this.#bundleStylesheetAsync(data, this.#globalStyleFilePath, this.#globalStyleFilePath);
      const emittedFiles = this.#emittedFilesCacheMap.getOrCreate(path.normalize(this.#globalStyleFilePath), []);
      emittedFiles.push({
        outRelPath: path.relative(path.resolve(this.#pkgPath, "src"), this.#globalStyleFilePath).replace(/\.scss$/, ".css"),
        text: contents
      });
      this.#affectedFileSet.add(this.#globalStyleFilePath);
    }

    //-- init

    this.#modifiedFileSet.clear();

    //-- result

    return {
      program: this.#program,
      typescriptDiagnostics: diagnostics,
      stylesheetResultMap: this.#stylesheetResultMap,
      emittedFilesCacheMap: this.#emittedFilesCacheMap,
      watchFileSet: this.#watchFileSet,
      affectedFileSet: this.#affectedFileSet
    };
  }
}

export interface ISdTsCompiler2Result {
  program: ts.Program,
  typescriptDiagnostics: ts.Diagnostic[],
  stylesheetResultMap: Map<string, IStylesheetResult>,
  emittedFilesCacheMap: Map<string, {
    outRelPath?: string;
    text: string;
  }[]>,
  watchFileSet: Set<string>,
  affectedFileSet: Set<string>
}

interface IStylesheetResult {
  outputFiles: esbuild.OutputFile[];
  metafile?: esbuild.Metafile;
  errors?: esbuild.PartialMessage[];
  warnings?: esbuild.PartialMessage[];
}