import * as ts from "typescript";
import { ISdAutoIndexConfig, ISdPackageBuildResult } from "../commons";
import * as path from "path";
import { SdTsDiagnosticUtil } from "../utils/SdTsDiagnosticUtil";
import { NgccProcessingCache } from "ng-packagr/lib/ng-package/ngcc-cache";
import { NgccProcessor } from "ng-packagr/lib/ngc/ngcc-processor";
import { EntryPointNode } from "ng-packagr/lib/ng-package/nodes";
import { ngccTransformCompilerHost } from "ng-packagr/lib/ts/ngcc-transform-compiler-host";
import { MetadataCollector, NgtscProgram } from "@angular/compiler-cli";
import { ITsBuildFileCache, ITsGenResult, SdCliTypescriptBuilder } from "./SdCliTypescriptBuilder";
import { NgCompiler } from "@angular/compiler-cli/src/ngtsc/core";
import { NeverEntryError, StringUtil } from "@simplysm/sd-core-common";
import { PathUtil } from "@simplysm/sd-core-node";
import * as os from "os";
import * as nodeSass from "node-sass";
import { SdCliNgModuleFilesGenerator } from "../build-tools/SdCliNgModuleFilesGenerator";
import { OptimizeFor } from "@angular/compiler-cli/src/ngtsc/typecheck/api";
import { ModuleMetadata } from "@angular/compiler-cli/src/metadata/schema";

export class SdCliNgLibraryBuilder extends SdCliTypescriptBuilder {
  protected _ngProgram?: NgtscProgram;
  protected _ngCompiler?: NgCompiler;
  private readonly _ngccProcessingCache = new NgccProcessingCache();

  private readonly _moduleFilesGenerator = new SdCliNgModuleFilesGenerator(this.rootPath);

  protected override readonly _fileCache = new Map<string, (ITsBuildFileCache & { scssDependencies?: string[] })>();

  public constructor(public rootPath: string,
                     public tsconfigFilePath: string,
                     skipProcesses: ("emit" | "check" | "lint" | "genIndex" | "genNgModule")[],
                     public autoIndexConfig: ISdAutoIndexConfig | undefined) {
    super(rootPath, tsconfigFilePath, skipProcesses as ("emit" | "check" | "lint" | "genIndex")[], autoIndexConfig);
    this.skipProcesses = skipProcesses;
  }

  protected override async _runProgramAsync(dirtyFilePaths: string[]): Promise<ISdPackageBuildResult[]> {
    this._logger.debug("빌드", dirtyFilePaths);

    if (!this._ngCompiler) throw new NeverEntryError();
    if (!this._builder) throw new NeverEntryError();

    const diagnostics: ts.Diagnostic[] = [];

    if (!this.skipProcesses.includes("check")) {
      diagnostics.push(
        ...this._ngCompiler.getOptionDiagnostics(),
        ...this._builder.getOptionsDiagnostics(),
        ...this._builder.getGlobalDiagnostics()
      );

      await this._ngCompiler.analyzeAsync();

      for (const sourceFile of this._builder.getSourceFiles()) {
        /*for (const filePath of dirtyFilePaths) {
          const sourceFile = this._builder.getSourceFile(filePath);
          if (!sourceFile) continue;*/

        if (this._ngCompiler.ignoreForDiagnostics.has(sourceFile)) continue;
        if (sourceFile.isDeclarationFile) continue;

        diagnostics.push(
          ...this._builder.getSyntacticDiagnostics(sourceFile),
          ...this._builder.getSemanticDiagnostics(sourceFile),
          ...this._ngCompiler.getDiagnosticsForFile(sourceFile, OptimizeFor.WholeProgram)
        );
      }
    }

    if (!this.skipProcesses.includes("emit")) {
      const transformers = this._ngCompiler.prepareEmit().transformers;

      for (const filePath of dirtyFilePaths) {
        const sourceFile = this._builder.getSourceFile(filePath);
        if (!sourceFile) continue;
        if (this._ngCompiler.ignoreForEmit.has(sourceFile)) continue;
        if (sourceFile.isDeclarationFile) continue;

        this._builder.emit(sourceFile, undefined, undefined, undefined, transformers);

        if (this._program!.getCompilerOptions().declaration) {
          if (sourceFile.fileName.endsWith(".ts") && !sourceFile.fileName.endsWith(".d.ts")) {
            const metadata = this._getMetadata(sourceFile);
            if (metadata) {
              this._writeMetadataFile(sourceFile, metadata);
            }
          }
        }
      }

      /*if (this._parsedTsconfig.options.declaration) {
        this._writeMetadataBundles();
      }*/
    }

    const result = diagnostics.map((item) => SdTsDiagnosticUtil.convertDiagnosticsToResult(item)).filterExists();

    this._logger.debug("빌드 결과", result);

    return result;
  }

  private _writeMetadataFile(sourceFile: ts.SourceFile, metadata: ModuleMetadata): void {
    const metadataText = JSON.stringify({
      ...metadata,
      importAs: this.npmConfig.name
    });
    const outFileName = path.resolve(
      this._program!.getCompilerOptions().declarationDir!,
      path.relative(path.resolve(this.rootPath, "src"), sourceFile.fileName)
    ).replace(/\.ts$/, ".sd-metadata.json");
    this._cacheCompilerHost!.writeFile(outFileName, metadataText, false, undefined, [sourceFile]);
  }

  private _getMetadata(sourceFile: ts.SourceFile): ModuleMetadata | undefined {
    return new MetadataCollector().getMetadata(sourceFile, true);
  }

  /*private _writeMetadataBundles(): void {
    for (const rootFilePath of this._parsedTsconfig.fileNames) {
      const metadata = new MetadataBundler(
        rootFilePath.replace(/\.ts$/, ""),
        rootFilePath.endsWith("/index.ts") ? this.npmConfig.name
          : (this.npmConfig.name + "/" + PathUtil.posix(path.relative(path.resolve(this.rootPath, "src"), rootFilePath)).replace(/\.ts/, "")),
        new CompilerHostAdapter(this._cacheCompilerHost!, null, this._parsedTsconfig.options),
        undefined
      ).getMetadataBundle().metadata;

      const outFileName = path.resolve(
        this._parsedTsconfig.options.declarationDir!,
        path.relative(path.resolve(this.rootPath, "src"), rootFilePath)
      ).replace(/\.ts$/, ".sd-metadata.json");

      const fileCache = this._fileCache.get(PathUtil.posix(rootFilePath));
      if (!fileCache?.sourceFile) throw new NeverEntryError();
      this._cacheCompilerHost!.writeFile(outFileName, JSON.stringify(metadata), false, undefined, [fileCache.sourceFile]);
    }
  }*/

  public override getParsedTsconfig(): ts.ParsedCommandLine {
    return ts.parseJsonConfigFileContent(this._tsconfig, ts.sys, this.rootPath, this._tsconfig.angularCompilerOptions);
  }

  public override configProgram(parsedTsconfig: ts.ParsedCommandLine): void {
    this._ngProgram = new NgtscProgram(
      parsedTsconfig.fileNames,
      parsedTsconfig.options,
      this._cacheCompilerHost!,
      this._ngProgram
    );

    this._ngCompiler = this._ngProgram.compiler;
    this._program = this._ngProgram.getTsProgram();
  }

  public override getSemanticDiagnosticsOfNextAffectedFiles(): string[] | undefined {
    const builder = this._builder as ts.SemanticDiagnosticsBuilderProgram;
    const affectedFilePaths: string[] = [];
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

    if (result && "fileName" in result.affected) {
      affectedFilePaths.push(result.affected.fileName);
      return affectedFilePaths.distinct();
    }
    if (!result) {
      return undefined;
    }

    return [];
  }

  protected override _deleteFileCaches(filePaths: string[]): void {
    super._deleteFileCaches(filePaths);
    this._moduleFilesGenerator.deleteFileCaches(filePaths);
  }

  public async generateAdditionalFilesAsync(dirtyFilePaths: string[], watch: boolean): Promise<ITsGenResult> {
    const result: ITsGenResult = { dirtyFilePaths: [], result: [] };

    // index.ts 파일 생성
    const genIndexResult = await super._generateIndexFileAsync(watch);
    result.result.push(...genIndexResult.result);
    result.dirtyFilePaths.push(...genIndexResult.dirtyFilePaths);

    // Angular Module 및 RoutingModule 생성
    const genModuleResult = await this._generateModuleFilesAsync(
      [...dirtyFilePaths, ...genIndexResult.dirtyFilePaths].distinct(),
      watch
    );
    result.result.push(...genModuleResult.result);
    result.dirtyFilePaths.push(...genModuleResult.dirtyFilePaths);

    // 'Angular Module 및 RoutingModule 생성'중에 변경사항이 있다면, index.ts 다시 생성
    if (genModuleResult.dirtyFilePaths.length > 0) {
      const newGenIndexResult = await super._generateIndexFileAsync(watch);
      result.result.push(...newGenIndexResult.result);
      result.dirtyFilePaths.push(...newGenIndexResult.dirtyFilePaths);
    }

    return {
      dirtyFilePaths: result.dirtyFilePaths.distinct(),
      result: result.result.distinct()
    };
  }

  private async _generateModuleFilesAsync(dirtyFilePaths: string[], watch: boolean): Promise<ITsGenResult> {
    this._logger.debug("Angular Module, RoutingModule 생성", dirtyFilePaths);

    const result: ITsGenResult = { dirtyFilePaths: [], result: [] };
    if (this.skipProcesses.includes("genNgModule")) return result;

    const reloadResult = await this._moduleFilesGenerator.reloadSourceFilesAsync(
      dirtyFilePaths,
      this._cacheCompilerHost!,
      this._moduleResolutionCache!,
      this._ngProgram!
    );
    result.result.push(...reloadResult.result);

    if (!reloadResult.changed) return result;

    const generateResult = await this._moduleFilesGenerator.generateAsync();
    result.result.push(...generateResult.result);
    if (generateResult.changedFilePaths.length > 0) {
      const reloadChangedProgramResult = await this.reloadChangedProgramAsync(generateResult.changedFilePaths, watch);
      result.dirtyFilePaths = reloadChangedProgramResult.dirtyFilePaths;
      result.result.push(...reloadChangedProgramResult.result);
    }

    this._logger.debug("Angular Module, RoutingModule 생성 결과", result);

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

    resultCompilerHost.getSourceFile = (fileName: string, languageVersion: ts.ScriptTarget) => {
      const cache = this._fileCache.getOrCreate(PathUtil.posix(fileName), {});
      if (!cache.sourceFile) {
        const orgContent = ngCompilerHost.readFile.call(resultCompilerHost, fileName);
        if (StringUtil.isNullOrEmpty(orgContent)) {
          cache.sourceFile = undefined;
          cache.scssDependencies = undefined;
        }
        else {
          const scssResult = this._replaceScssToCss(fileName, orgContent);
          cache.sourceFile = ts.createSourceFile(fileName, scssResult.content, languageVersion);
          cache.scssDependencies = scssResult.dependencies;
        }
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
