import * as ts from "typescript";
import { ISdAutoIndexConfig, ISdPackageBuildResult, ITsconfig } from "../commons";
import * as path from "path";
import { SdTsDiagnosticUtil } from "../utils/SdTsDiagnosticUtil";
import { NgccProcessingCache } from "ng-packagr/lib/ng-package/ngcc-cache";
import { NgccProcessor } from "ng-packagr/lib/ngc/ngcc-processor";
import { EntryPointNode } from "ng-packagr/lib/ng-package/nodes";
import { ngccTransformCompilerHost } from "ng-packagr/lib/ts/ngcc-transform-compiler-host";
import { ModuleMetadata, NgtscProgram } from "@angular/compiler-cli";
import { ITsBuildFileCache, ITsGenResult, SdCliTypescriptBuilder } from "./SdCliTypescriptBuilder";
import { NgCompiler } from "@angular/compiler-cli/src/ngtsc/core";
import { NeverEntryError } from "@simplysm/sd-core-common";
import { FsUtil, PathUtil } from "@simplysm/sd-core-node";
import * as os from "os";
import * as nodeSass from "node-sass";
import { createHash } from "crypto";
import { SdCliNgModuleFilesGenerator } from "../build-tools/SdCliNgModuleFilesGenerator";
import { OptimizeFor } from "@angular/compiler-cli/src/ngtsc/typecheck/api";

export class SdCliNgLibraryBuilder extends SdCliTypescriptBuilder {
  protected _ngProgram?: NgtscProgram;
  protected _ngCompiler?: NgCompiler;
  private readonly _ngccProcessingCache = new NgccProcessingCache();

  protected override readonly _fileCache = new Map<string, (ITsBuildFileCache & { scssResult?: { content: string; dependencies: string[] }; metadata?: ModuleMetadata })>();

  private readonly _moduleFilesGenerator = new SdCliNgModuleFilesGenerator(this.rootPath);

  public constructor(public rootPath: string,
                     public tsconfigFilePath: string,
                     ignoreProcesses: ("emit" | "check" | "genIndex" | "lint" | "genNgModule")[],
                     public autoIndexConfig: ISdAutoIndexConfig | undefined) {
    super(rootPath, tsconfigFilePath, ignoreProcesses as ("emit" | "check" | "lint" | "genIndex")[], autoIndexConfig);
    this.ignoreProcesses = ignoreProcesses;

    const tsconfig: ITsconfig = FsUtil.readJson(this.tsconfigFilePath);
    this._parsedTsconfig = {
      ...this._parsedTsconfig,
      options: {
        baseUrl: path.dirname(this.tsconfigFilePath),
        ...this._parsedTsconfig.options,
        ...tsconfig.angularCompilerOptions
      }
    };
  }

  protected override async _runProgramAsync(dirtyFilePaths: string[]): Promise<ISdPackageBuildResult[]> {
    if (!this._ngCompiler) throw new NeverEntryError();
    if (!this._builder) throw new NeverEntryError();

    const diagnostics: ts.Diagnostic[] = [];

    if (!this.ignoreProcesses.includes("check")) {
      diagnostics.push(
        ...this._ngCompiler.getOptionDiagnostics(),
        ...this._builder.getOptionsDiagnostics(),
        ...this._builder.getGlobalDiagnostics()
      );

      await this._ngCompiler.analyzeAsync();

      for (const filePath of dirtyFilePaths) {
        const sourceFile = this._builder.getSourceFile(filePath);
        if (!sourceFile) throw new NeverEntryError();

        if (this._ngCompiler.ignoreForDiagnostics.has(sourceFile)) continue;
        if (sourceFile.isDeclarationFile) continue;

        diagnostics.push(
          ...this._builder.getSyntacticDiagnostics(sourceFile),
          ...this._builder.getSemanticDiagnostics(sourceFile),
          ...this._ngCompiler.getDiagnosticsForFile(sourceFile, OptimizeFor.WholeProgram)
        );
      }
    }

    if (!this.ignoreProcesses.includes("emit")) {
      const transformers = this._ngCompiler.prepareEmit().transformers;

      for (const filePath of dirtyFilePaths) {
        const sourceFile = this._builder.getSourceFile(filePath);
        if (!sourceFile) throw new NeverEntryError();

        if (this._ngCompiler.ignoreForEmit.has(sourceFile)) continue;
        this._builder.emit(sourceFile, undefined, undefined, undefined, transformers);

        /*if (this._parsedTsconfig.options.declaration) {
          if (sourceFile.fileName.endsWith(".ts") && !sourceFile.fileName.endsWith(".d.ts")) {
            const fileCache = this._fileCache.getOrCreate(PathUtil.posix(sourceFile.fileName), {});
            fileCache.metadata = this._getMetadata(sourceFile);

            if (fileCache.metadata) {
              this._writeMetadataFile(sourceFile, fileCache.metadata);
            }
          }
        }*/
      }
    }

    return diagnostics.map((item) => SdTsDiagnosticUtil.convertDiagnosticsToResult(item)).filterExists();
  }

  /*private _writeMetadataFile(sourceFile: ts.SourceFile, metadata: ModuleMetadata): void {
    const metadataText = JSON.stringify([metadata]);
    const outFileName = path.resolve(
      this._parsedTsconfig.options.declarationDir!,
      path.relative(path.resolve(this.rootPath, "src"), sourceFile.fileName)
    ).replace(/\.ts$/, ".metadata.json");
    this._cacheCompilerHost!.writeFile(outFileName, metadataText, false, undefined, [sourceFile]);
  }

  private _getMetadata(sourceFile: ts.SourceFile): ModuleMetadata | undefined {
    return new MetadataCollector().getMetadata(sourceFile, true);
  }*/

  public override async reloadProgramAsync(watch: boolean): Promise<string[]> {
    this._moduleResolutionCache = ts.createModuleResolutionCache(this.rootPath, (s) => s, this._parsedTsconfig.options);
    this._cacheCompilerHost = await this._createCacheCompilerHostAsync(this._parsedTsconfig, this._moduleResolutionCache);

    this._ngProgram = new NgtscProgram(
      this._parsedTsconfig.fileNames,
      this._parsedTsconfig.options,
      this._cacheCompilerHost,
      this._ngProgram
    );

    this._ngCompiler = this._ngProgram.compiler;
    this._program = this._ngProgram.getTsProgram();

    const baseGetSourceFiles = this._program.getSourceFiles;
    this._program.getSourceFiles = function (...parameters) {
      const sourceFiles: readonly (ts.SourceFile & { version?: string })[] = baseGetSourceFiles(...parameters);

      for (const sourceFile of sourceFiles) {
        if (sourceFile.version === undefined) {
          sourceFile.version = createHash("sha256").update(sourceFile.text).digest("hex");
        }
      }

      return sourceFiles;
    };

    if (watch) {
      const builder = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
        this._program,
        this._cacheCompilerHost,
        this._builder as ts.EmitAndSemanticDiagnosticsBuilderProgram
      );
      this._builder = builder;

      const affectedFilePaths: string[] = [];
      while (true) {
        const result = builder.getSemanticDiagnosticsOfNextAffectedFile(undefined, (sourceFile) => {
          if (this._ngCompiler!.ignoreForDiagnostics.has(sourceFile) && sourceFile.fileName.endsWith(".ngtypecheck.ts")) {
            const originalFilename = sourceFile.fileName.slice(0, -15) + ".ts";
            const originalSourceFile = builder.getSourceFile(originalFilename);
            if (originalSourceFile) {
              affectedFilePaths.push(originalSourceFile.fileName);
            }
            return true;
          }
          return false;
        });

        if (!result) break;

        if ("fileName" in result.affected) {
          affectedFilePaths.push(result.affected.fileName);
        }
      }

      return affectedFilePaths;
    }
    else {
      this._builder = ts.createAbstractBuilder(this._program, this._cacheCompilerHost);
      return this._builder.getSourceFiles().map((item) => item.fileName);
    }
  }

  protected override _deleteFileCaches(filePaths: string[]): void {
    super._deleteFileCaches(filePaths);
    this._moduleFilesGenerator.decacheFilePaths(filePaths);
  }

  public async generateAdditionalFilesAsync(dirtyFilePaths: string[], watch: boolean): Promise<ITsGenResult> {
    const results: ITsGenResult[] = [];

    const prevResult = await super._generateIndexFileAsync(dirtyFilePaths, watch);
    results.push(prevResult);
    const genModuleResult = await this._generateModuleFilesAsync(prevResult.dirtyFilePaths, watch);
    results.push(genModuleResult);

    if (genModuleResult.changed) {
      const newResult = await super._generateIndexFileAsync(genModuleResult.dirtyFilePaths, watch);
      results.push(newResult);
    }

    return {
      dirtyFilePaths: results.last()!.dirtyFilePaths,
      changed: results.some((item) => item.changed),
      result: results.mapMany((item) => item.result).distinct()
    };
  }

  private async _generateModuleFilesAsync(dirtyFilePaths: string[], watch: boolean): Promise<ITsGenResult> {
    const result: ITsGenResult = {
      dirtyFilePaths: [...dirtyFilePaths],
      result: [],
      changed: false
    };
    if (this.ignoreProcesses.includes("genNgModule")) return result;

    const reloadResult = await this._moduleFilesGenerator.reloadSourceFilesAsync(
      dirtyFilePaths,
      this._cacheCompilerHost!,
      this._moduleResolutionCache!,
      this._ngProgram!
    );
    result.result.push(...reloadResult.result);

    if (reloadResult.changed) {
      const generateResult = await this._moduleFilesGenerator.generateAsync();
      result.result.push(...generateResult.result);
      if (generateResult.changedFilePaths.length > 0) {
        const reloadProgramResult = await this.reloadChangedProgramAsync(generateResult.changedFilePaths, dirtyFilePaths, watch);
        result.dirtyFilePaths = reloadProgramResult.dirtyFilePaths;
        result.changed = reloadProgramResult.changed;
      }
    }

    return result;
  }

  protected override async _createCacheCompilerHostAsync(parsedTsconfig: ts.ParsedCommandLine, moduleResolutionCache: ts.ModuleResolutionCache): Promise<ts.CompilerHost> {
    const tsCacheCompilerHost = await super._createCacheCompilerHostAsync(parsedTsconfig, moduleResolutionCache);

    const ngccProcessor = new NgccProcessor(
      this._ngccProcessingCache,
      this.tsconfigFilePath,
      parsedTsconfig.options,
      parsedTsconfig.fileNames.map((item) => ({ url: item }) as EntryPointNode)
    );

    await ngccProcessor.process();

    const ngCompilerHost = ngccTransformCompilerHost(
      tsCacheCompilerHost,
      parsedTsconfig.options,
      ngccProcessor,
      moduleResolutionCache
    );

    const resultCompilerHost = { ...ngCompilerHost };
    /*resultCompilerHost.writeFile = (fileName: string,
                                    data: string,
                                    writeByteOrderMark: boolean,
                                    onError?: (message: string) => void,
                                    sourceFiles?: readonly ts.SourceFile[]) => {
      if (!fileName.includes(".ngtypecheck.")) {
        ngCompilerHost.writeFile.call(resultCompilerHost, fileName, data, writeByteOrderMark, onError, sourceFiles);
      }
    };*/

    resultCompilerHost.getSourceFile = (fileName: string, languageVersion: ts.ScriptTarget) => {
      if (!FsUtil.exists(fileName)) {
        this._fileCache.delete(PathUtil.posix(fileName));
        return undefined;
      }

      const cache = this._fileCache.getOrCreate(PathUtil.posix(fileName), {});

      if (cache.scssResult === undefined && fileName.endsWith(".ts") && !fileName.endsWith(".d.ts")) {
        const orgContent = FsUtil.readFile(fileName);
        cache.scssResult = this._replaceScssToCss(fileName, orgContent);
      }
      if (cache.sourceFile === undefined) {
        if (cache.scssResult) {
          cache.sourceFile = ts.createSourceFile(fileName, cache.scssResult.content, languageVersion);
        }
        else {
          cache.sourceFile = ngCompilerHost.getSourceFile.call(resultCompilerHost, fileName, languageVersion);
        }

        cache.dependencyFilePaths = undefined;
      }
      if (cache.dependencyFilePaths === undefined) {
        cache.dependencyFilePaths = [
          ...this._getDependencyFilePaths(
            cache.sourceFile!,
            parsedTsconfig.options,
            ngCompilerHost,
            moduleResolutionCache
          ),
          ...cache.scssResult ? cache.scssResult.dependencies : []
        ];
      }
      return cache.sourceFile;
    };

    return resultCompilerHost;
  }

  private _replaceScssToCss(filePath: string, content: string): { content: string; dependencies: string[] } {
    const scssRegex = /\/\* *language=SCSS *\*\/ *[`"'](((?!['"`]\)?[\],][,;]?[\r\n\\])(.|\r|\n))*)['"`]/;

    const matches = content.match(new RegExp(scssRegex, "gi"));
    if (!matches) {
      return { content, dependencies: [] };
    }

    const results = matches.map((match) => nodeSass.renderSync({
      file: filePath,
      data: scssRegex.exec(match)?.[1],
      precision: 8,
      includePaths: [],
      outputStyle: "expanded",
      sourceMapEmbed: false,
      sourceMap: false
    }));

    const deps = results.mapMany((result) => result.stats.includedFiles).map((item) => path.resolve(item));

    let i = 0;
    const newContent = content.replace(new RegExp(scssRegex, "gi"), () => {
      let result = "`" + results[i].css.toString() + "`";
      const prev = matches[i];

      const diffCount = Array.from(prev).filter((item) => item === "\n").length
        - Array.from(result).filter((item) => item === "\n").length;

      for (let j = 0; j < diffCount; j++) {
        result += os.EOL;
      }

      i += 1;
      return result;
    });

    return { content: newContent, dependencies: deps };
  }
}
