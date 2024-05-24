import ts, {CompilerOptions} from "typescript";
import path from "path";
import {FsUtil, Logger, PathUtil} from "@simplysm/sd-core-node";
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
  readonly #logger = Logger.get(["simplysm", "sd-cli", "SdTsCompiler"]);

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
  readonly #stylesheetBundlingResultMap = new Map<string, IStylesheetBundlingResult>();

  readonly #pkgPath: string;
  readonly #distPath: string;
  readonly #globalStyleFilePath?: string;

  constructor(pkgPath: string,
              additionalOptions: CompilerOptions,
              isDevMode: boolean,
              globalStyleFilePath?: string) {
    this.#pkgPath = pkgPath;
    this.#globalStyleFilePath = globalStyleFilePath != null ? path.normalize(globalStyleFilePath) : undefined;


    this.#debug("초기화...");

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

    const baseReadFile = this.#compilerHost.readFile;
    this.#compilerHost.readFile = (fileName) => {
      this.#watchFileSet.add(path.normalize(fileName));
      return baseReadFile.call(this.#compilerHost, fileName);
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
    // containingFile: 포함된 파일 (.ts)
    // resourceFile: 외부 리소스 파일 (styleUrls로 입력하지 않고 styles에 직접 입력한 경우 null)
    // referencedFiles: import한 외부 scss 파일 혹은 woff파일등 외부 파일

    this.#debug(`스타일시트 번들링...(${containingFile}, ${resourceFile})`);

    const stylesheetResult = resourceFile != null
      ? await this.#stylesheetBundler!.bundleFile(resourceFile)
      : await this.#stylesheetBundler!.bundleInline(
        data,
        containingFile,
        "scss",
      );

    if (stylesheetResult.referencedFiles) {
      for (const referencedFile of stylesheetResult.referencedFiles) {
        const depCacheSet = this.#resourceDependencyCacheMap.getOrCreate(path.normalize(referencedFile), new Set<string>());
        depCacheSet.add(path.normalize(resourceFile ?? containingFile));
      }

      this.#watchFileSet.adds(...Array.from(stylesheetResult.referencedFiles.values()).map(item => path.normalize(item)));
    }

    this.#stylesheetBundlingResultMap.set(path.normalize(resourceFile ?? containingFile), {
      outputFiles: stylesheetResult.outputFiles,
      metafile: stylesheetResult.metafile,
      errors: stylesheetResult.errors,
      warnings: stylesheetResult.warnings
    });

    return stylesheetResult.contents;
  }

  invalidate(modifiedFileSet: Set<string>) {
    this.#stylesheetBundler?.invalidate(modifiedFileSet);

    for (const modifiedFile of modifiedFileSet) {
      this.#sourceFileCacheMap.delete(path.normalize(modifiedFile));
      this.#emittedFilesCacheMap.delete(path.normalize(modifiedFile));

      if (this.#resourceDependencyCacheMap.has(path.normalize(modifiedFile))) {
        for (const referencingFile of this.#resourceDependencyCacheMap.get(path.normalize(modifiedFile))!) {
          this.#sourceFileCacheMap.delete(path.normalize(referencingFile));
          this.#emittedFilesCacheMap.delete(path.normalize(referencingFile));
        }
      }
    }

    this.#modifiedFileSet.adds(...modifiedFileSet);
  }

  async buildAsync(): Promise<ISdTsCompilerResult> {
    const affectedFileSet = new Set<string>();
    const emitFileSet = new Set<string>();

    this.#resourceDependencyCacheMap.clear();
    this.#watchFileSet.clear();
    this.#stylesheetBundlingResultMap.clear();

    this.#debug(`create program...`);

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

    this.#debug(`create builder...`);

    this.#builder = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
      this.#program,
      this.#compilerHost,
      this.#builder
    );

    if (this.#ngProgram) {
      await this.#ngProgram.compiler.analyzeAsync();
    }

    this.#debug(`get affected...`);

    while (true) {
      const result = this.#builder.getSemanticDiagnosticsOfNextAffectedFile(undefined, (sourceFile) => {
        if (
          this.#ngProgram
          && this.#ngProgram.compiler.ignoreForDiagnostics.has(sourceFile)
          && sourceFile.fileName.endsWith('.ngtypecheck.ts')
        ) {
          const originalFilename = sourceFile.fileName.slice(0, -15) + '.ts';
          const originalSourceFile = this.#builder!.getSourceFile(originalFilename);
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

    this.#debug(`get resource ref...`);

    if (this.#ngProgram) {
      this.#builder.getSourceFiles()
        .filter(sf => !this.#ngProgram || !this.#ngProgram.compiler.ignoreForEmit.has(sf))
        .forEach(sf => {
          const deps = this.#ngProgram!.compiler.getResourceDependencies(sf);
          for (const dep of deps) {
            const ref = this.#resourceDependencyCacheMap.getOrCreate(path.normalize(dep), new Set<string>());
            ref.add(path.normalize(sf.fileName));
            if (this.#modifiedFileSet.has(path.normalize(dep))) {
              affectedFileSet.add(path.normalize(sf.fileName));
            }
          }
        });
    }

    this.#debug(`get diagnostics...`);

    const diagnostics: ts.Diagnostic[] = [];

    diagnostics.push(
      ...this.#builder.getConfigFileParsingDiagnostics(),
      ...this.#builder.getOptionsDiagnostics(),
      ...this.#builder.getGlobalDiagnostics()
    );

    if (this.#ngProgram) {
      diagnostics.push(...this.#ngProgram.compiler.getOptionDiagnostics());
    }

    for (const affectedFile of affectedFileSet) {
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

    this.#debug(`prepare emit...`);

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

        const emitFiles = this.#emittedFilesCacheMap.getOrCreate(path.normalize(sourceFile.fileName), []);
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

          emitFiles.push({
            outRelPath: path.relative(this.#distPath, realFilePath),
            text: realText
          });
        }
        else {
          emitFiles.push({text});
        }

        emitFileSet.add(path.normalize(sourceFile.fileName));
      }, undefined, undefined, this.#ngProgram?.compiler.prepareEmit().transformers);

      if (!affectedFileResult) {
        break;
      }

      diagnostics.push(...affectedFileResult.result.diagnostics);
    }

    //-- global style
    if (
      this.#globalStyleFilePath != null
      && FsUtil.exists(this.#globalStyleFilePath)
      && !this.#emittedFilesCacheMap.has(this.#globalStyleFilePath)
    ) {
      this.#debug(`bundle global style...`);

      const data = await FsUtil.readFileAsync(this.#globalStyleFilePath);
      const contents = await this.#bundleStylesheetAsync(data, this.#globalStyleFilePath, this.#globalStyleFilePath);
      const emitFiles = this.#emittedFilesCacheMap.getOrCreate(this.#globalStyleFilePath, []);
      emitFiles.push({
        outRelPath: path.relative(path.resolve(this.#pkgPath, "src"), this.#globalStyleFilePath).replace(/\.scss$/, ".css"),
        text: contents
      });
      emitFileSet.add(this.#globalStyleFilePath);
    }

    //-- init

    this.#modifiedFileSet.clear();

    this.#debug(`build completed`);

    //-- result

    return {
      program: this.#program,
      typescriptDiagnostics: diagnostics,
      stylesheetBundlingResultMap: this.#stylesheetBundlingResultMap,
      emitFilesCacheMap: this.#emittedFilesCacheMap,
      watchFileSet: this.#watchFileSet,
      affectedFileSet,
      emitFileSet
    };
  }

  #debug(...msg: any[]): void {
    this.#logger.debug(`[${path.basename(this.#pkgPath)}]`, ...msg);
  }
}

export interface ISdTsCompilerResult {
  program: ts.Program;
  typescriptDiagnostics: ts.Diagnostic[];
  stylesheetBundlingResultMap: Map<string, IStylesheetBundlingResult>;
  emitFilesCacheMap: Map<string, { outRelPath?: string; text: string; }[]>;
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