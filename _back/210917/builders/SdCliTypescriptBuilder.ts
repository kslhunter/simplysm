import * as ts from "typescript";
import { INpmConfig, ISdAutoIndexConfig, ISdPackageBuildResult, ITsconfig } from "../commons";
import { FsUtil, Logger, PathUtil, SdFsWatcher } from "@simplysm/sd-core-node";
import { NeverEntryError, StringUtil } from "@simplysm/sd-core-common";
import { EventEmitter } from "events";
import * as path from "path";
import { SdTsDiagnosticUtil } from "../utils/SdTsDiagnosticUtil";
import { ESLint } from "eslint";
import { createHash } from "crypto";
import { SdCliIndexFileGenerator } from "../build-tools/SdCliIndexFileGenerator";

export class SdCliTypescriptBuilder extends EventEmitter {
  protected readonly _logger: Logger;

  protected _parsedTsconfig: ts.ParsedCommandLine;
  public readonly npmConfig: INpmConfig;

  protected _moduleResolutionCache?: ts.ModuleResolutionCache;
  protected _cacheCompilerHost?: ts.CompilerHost;
  protected _program?: ts.Program;
  protected _builder?: ts.BuilderProgram | ts.EmitAndSemanticDiagnosticsBuilderProgram;
  protected readonly _fileCache: Map<string, ITsBuildFileCache> = new Map<string, ITsBuildFileCache>();

  private readonly _resultMap = new Map<string, ISdPackageBuildResult[]>();

  private readonly _indexFileGenerator?: SdCliIndexFileGenerator;

  private _watcher?: SdFsWatcher;

  public ignoreProcesses: string[];

  public constructor(public rootPath: string,
                     public tsconfigFilePath: string,
                     ignoreProcesses: ("emit" | "check" | "lint" | "genIndex")[],
                     public autoIndexConfig: ISdAutoIndexConfig | undefined) {
    super();
    this.ignoreProcesses = ignoreProcesses;

    const tsconfig: ITsconfig = FsUtil.readJson(this.tsconfigFilePath);
    this._parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this.rootPath);

    this.npmConfig = FsUtil.readJson(path.resolve(this.rootPath, "package.json"));
    this._logger = Logger.get(["simplysm", "sd-cli", this.constructor.name, this.npmConfig.name]);

    if (this.autoIndexConfig) {
      this._indexFileGenerator = new SdCliIndexFileGenerator(this.rootPath, this.autoIndexConfig);
    }
  }

  public on(event: "change", listener: () => void): this;
  public on(event: "complete", listener: (results: ISdPackageBuildResult[]) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public async buildAsync(watch: boolean): Promise<void> {
    this.emit("change");

    // DIST 비우기
    await FsUtil.removeAsync(this._parsedTsconfig.options.outDir!);
    if (this._parsedTsconfig.options.declarationDir !== undefined) {
      await FsUtil.removeAsync(this._parsedTsconfig.options.declarationDir);
    }

    let buildFilePaths = await this.reloadProgramAsync(watch);
    const buildGenAdditionalResult = await this.generateAdditionalFilesAsync(buildFilePaths, watch);
    if (buildGenAdditionalResult.dirtyFilePaths.length > 0) {
      buildFilePaths = buildFilePaths.concat(buildGenAdditionalResult.dirtyFilePaths).distinct();
    }

    if (watch) {
      const watchPaths = this._getWatchPaths();
      this._watcher = new SdFsWatcher();
      this._watcher
        .on("change", async (changeInfos) => {
          try {
            const changedFilePaths = changeInfos
              .map((item) => PathUtil.posix(item.filePath))
              .filter((item) => path.basename(item).includes("."))
              .distinct();
            if (changedFilePaths.length === 0) return;
            this.emit("change");

            let dirtyFilePaths = await this.reloadChangedProgramAsync(changedFilePaths, watch);
            if (dirtyFilePaths.length === 0) {
              this.emit("complete", Array.from(this._resultMap.values()).mapMany());
              return;
            }

            const watchGenAdditionalResult = await this.generateAdditionalFilesAsync(dirtyFilePaths, watch);
            if (watchGenAdditionalResult.dirtyFilePaths.length > 0) {
              dirtyFilePaths = dirtyFilePaths.concat(watchGenAdditionalResult.dirtyFilePaths).distinct();
            }

            const watchDoAllResults = await this.doAllAsync(dirtyFilePaths);

            // 결과 MAP에서 DIRTY FILE 삭제
            this._resultMap.delete("undefined");
            for (const dirtyFilePath of dirtyFilePaths) {
              this._resultMap.delete(dirtyFilePath);
            }

            // 결과 MAP 구성
            const result = [...watchGenAdditionalResult.result, ...watchDoAllResults].distinct();
            for (const resultItem of result) {
              const posixFilePath = resultItem.filePath !== undefined ? PathUtil.posix(resultItem.filePath) : "undefined";
              const resultMapValue = this._resultMap.getOrCreate(posixFilePath, []);
              resultMapValue.push(resultItem);
            }

            this.emit("complete", Array.from(this._resultMap.values()).mapMany());
          }
          catch (err) {
            this.emit("complete", [{
              filePath: undefined,
              severity: "error",
              message: err.stack ?? err.message
            }]);
          }
        })
        .watch(watchPaths);

      // 빌드 및 린트
      const buildDoAllResults = await this.doAllAsync(buildFilePaths);
      const buildResult = [...buildGenAdditionalResult.result, ...buildDoAllResults].distinct();

      // 결과 MAP 구성
      for (const buildResultItem of buildResult) {
        const posixFilePath = buildResultItem.filePath !== undefined ? PathUtil.posix(buildResultItem.filePath) : "undefined";
        const resultMapValue = this._resultMap.getOrCreate(posixFilePath, []);
        resultMapValue.push(buildResultItem);
      }
      this.emit("complete", Array.from(this._resultMap.values()).mapMany());
    }
    else {
      const buildDoAllResults = await this.doAllAsync(buildFilePaths);
      this.emit("complete", buildDoAllResults);
    }
  }

  protected async generateAdditionalFilesAsync(dirtyFilePaths: string[], watch: boolean): Promise<ITsGenResult> {
    return await this._generateIndexFileAsync(watch);
  }

  protected async _generateIndexFileAsync(watch: boolean): Promise<ITsGenResult> {
    const result: ITsGenResult = { dirtyFilePaths: [], result: [] };
    if (this.ignoreProcesses.includes("genIndex")) return result;

    if (this._indexFileGenerator) {
      const generateResult = await this._indexFileGenerator.generateAsync();
      result.result.push(...generateResult.result);
      if (generateResult.changed) {
        result.dirtyFilePaths = await this.reloadChangedProgramAsync([this._indexFileGenerator.indexFilePath], watch);
      }
    }

    return result;
  }

  protected _reloadWatchPaths(): void {
    if (this._watcher) {
      this._watcher.replaceWatchPaths(this._getWatchPaths());
    }
  }

  public async doAllAsync(dirtyFilePaths: string[]): Promise<ISdPackageBuildResult[]> {
    return (
      await Promise.all([
        (async () => {
          if (this.ignoreProcesses.includes("check") && this.ignoreProcesses.includes("emit")) return [];

          this._logger.debug("빌드 시작");
          const result = await this._runProgramAsync(dirtyFilePaths);
          this._logger.debug("빌드 완료");
          return result;
        })()/* TODO: ,
          (async () => {
            if (this.ignoreProcesses.includes("lint")) return [];

            this._logger.debug("린트 시작");
            const result = await this._lintAsync(dirtyFilePaths);
            this._logger.debug("린트 완료");
            return result;
          })()*/
      ])
    ).mapMany();
  }

  protected async _lintAsync(dirtyFilePaths: string[]): Promise<ISdPackageBuildResult[]> {
    const linter = new ESLint({
      overrideConfig: {
        overrides: [
          {
            files: ["*.ts"],
            parserOptions: {
              program: this._program
            },
            settings: {
              "import/resolver": {
                typescript: {
                  project: this.tsconfigFilePath
                }
              }
            }
          }
        ]
      }
    });

    const filePaths = dirtyFilePaths
      .filter((item) => (
        !item.includes("node_modules")
        && PathUtil.isChildPath(item, this.rootPath)
        && FsUtil.exists(item)
        && !FsUtil.isDirectory(item)
      ))
      .distinct();
    const lintResults = await linter.lintFiles(filePaths);

    return lintResults.mapMany((report) => (
      report.messages.map((msg) => {
        const severity: "warning" | "error" = msg.severity === 1 ? "warning" : "error";

        return {
          filePath: report.filePath,
          severity,
          message: `${report.filePath}(${msg.line}, ${msg.column}): ${msg.ruleId ?? ""}: ${severity} ${msg.message}`
        };
      })
    ));
  }

  protected _getWatchPaths(): string[] {
    return Array.from(this._fileCache.entries())
      .mapMany((item) => [item[0], ...item[1].dependencyFilePaths ?? []])
      .map((item) => PathUtil.posix(path.dirname(item)))
      .filter((item) => FsUtil.exists(item))
      .distinct();
  }

  protected _getRelativeFilePaths(filePath: string): string[] {
    return Array.from(this._fileCache.entries()).filter((item) => item[1].dependencyFilePaths?.includes(filePath)).map((item) => item[0]).distinct();
  }

  protected _deleteFileCaches(filePaths: string[]): void {
    for (const filePath of filePaths) {
      if (!FsUtil.exists(filePath)) {
        const cachedFileInfo = this._fileCache.get(filePath);
        if (cachedFileInfo) {
          if (!StringUtil.isNullOrEmpty(cachedFileInfo.jsFilePath)) {
            FsUtil.remove(cachedFileInfo.jsFilePath);
          }
          if (!StringUtil.isNullOrEmpty(cachedFileInfo.dtsFilePath)) {
            FsUtil.remove(cachedFileInfo.dtsFilePath);
          }
        }
      }
      this._fileCache.delete(filePath);

      if (this._indexFileGenerator && filePath === this._indexFileGenerator.indexFilePath) {
        this._indexFileGenerator.reloadContentCache();
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async _runProgramAsync(dirtyFilePaths: string[]): Promise<ISdPackageBuildResult[]> {
    if (!this._builder) throw new NeverEntryError();

    const diagnostics: ts.Diagnostic[] = [];

    if (!this.ignoreProcesses.includes("check")) {
      diagnostics.push(
        ...this._builder.getOptionsDiagnostics(),
        ...this._builder.getGlobalDiagnostics()
      );

      for (const dirtyFilePath of dirtyFilePaths) {
        const sourceFile = this._builder.getSourceFile(dirtyFilePath);
        if (!sourceFile) throw new NeverEntryError();
        diagnostics.push(
          ...this._builder.getSyntacticDiagnostics(sourceFile),
          ...this._builder.getSemanticDiagnostics(sourceFile)
        );
      }
    }

    if (!this.ignoreProcesses.includes("emit")) {
      for (const dirtyFilePath of dirtyFilePaths) {
        const sourceFile = this._builder.getSourceFile(dirtyFilePath);
        if (!sourceFile) throw new NeverEntryError();
        this._builder.emit(sourceFile);
      }
    }

    return diagnostics.map((item) => SdTsDiagnosticUtil.convertDiagnosticsToResult(item)).filterExists();
  }

  public async reloadChangedProgramAsync(changedFilePaths: string[], watch: boolean): Promise<string[]> {
    const delCachePaths = changedFilePaths.mapMany((item) => [item, ...this._getRelativeFilePaths(item)]).distinct();
    this._deleteFileCaches(delCachePaths);
    const dirtyFilePaths = await this.reloadProgramAsync(watch);
    if (dirtyFilePaths.length > 0 && watch) {
      this._reloadWatchPaths();
    }

    return dirtyFilePaths;
  }

  public async reloadProgramAsync(watch: boolean): Promise<string[]> {
    this._moduleResolutionCache = ts.createModuleResolutionCache(this.rootPath, (s) => s, this._parsedTsconfig.options);
    this._cacheCompilerHost = await this._createCacheCompilerHostAsync(this._parsedTsconfig, this._moduleResolutionCache);

    this._program = ts.createProgram(
      this._parsedTsconfig.fileNames,
      this._parsedTsconfig.options,
      this._cacheCompilerHost,
      this._program
    );

    const baseGetSourceFiles = this._program.getSourceFiles;
    this._program.getSourceFiles = function (...parameters) {
      const files: readonly (ts.SourceFile & { version?: string })[] = baseGetSourceFiles(...parameters);

      for (const file of files) {
        if (file.version === undefined) {
          file.version = createHash("sha256").update(file.text).digest("hex");
        }
      }

      return files;
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
        const result = builder.getSemanticDiagnosticsOfNextAffectedFile();

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

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async _createCacheCompilerHostAsync(parsedTsconfig: ts.ParsedCommandLine, moduleResolutionCache: ts.ModuleResolutionCache): Promise<ts.CompilerHost> {
    const compilerHost = ts.createCompilerHost(parsedTsconfig.options);

    const cacheCompilerHost = { ...compilerHost };
    cacheCompilerHost.fileExists = (fileName: string) => {
      const cache = this._fileCache.getOrCreate(PathUtil.posix(fileName), {});
      if (cache.exists === undefined) {
        cache.exists = compilerHost.fileExists.call(cacheCompilerHost, fileName);
      }
      return cache.exists;
    };

    cacheCompilerHost.getSourceFile = (fileName: string, languageVersion: ts.ScriptTarget) => {
      const cache = this._fileCache.getOrCreate(PathUtil.posix(fileName), {});
      if (!cache.sourceFile) {
        cache.sourceFile = compilerHost.getSourceFile.call(cacheCompilerHost, fileName, languageVersion);
      }
      if (!cache.dependencyFilePaths) {
        cache.dependencyFilePaths = this._getDependencyFilePaths(
          cache.sourceFile!,
          parsedTsconfig.options,
          cacheCompilerHost,
          moduleResolutionCache
        );
      }
      return cache.sourceFile;
    };

    cacheCompilerHost.writeFile = (fileName: string,
                                   data: string,
                                   writeByteOrderMark: boolean,
                                   onError?: (message: string) => void,
                                   sourceFiles?: readonly ts.SourceFile[]) => {
      if (sourceFiles && fileName.endsWith(".d.ts")) {
        sourceFiles.forEach((source) => {
          const cache = this._fileCache.getOrCreate(PathUtil.posix(source.fileName), {});
          if (StringUtil.isNullOrEmpty(cache.dtsFilePath)) {
            cache.dtsFilePath = fileName;
            compilerHost.writeFile.call(cacheCompilerHost, fileName, data, writeByteOrderMark, onError, sourceFiles);
          }
        });
      }
      else if (sourceFiles && fileName.endsWith(".js")) {
        sourceFiles.forEach((source) => {
          const cache = this._fileCache.getOrCreate(PathUtil.posix(source.fileName), {});
          if (StringUtil.isNullOrEmpty(cache.jsFilePath)) {
            cache.jsFilePath = fileName;
            compilerHost.writeFile.call(cacheCompilerHost, fileName, data, writeByteOrderMark, onError, sourceFiles);
          }
        });
      }
      else {
        compilerHost.writeFile.call(cacheCompilerHost, fileName, data, writeByteOrderMark, onError, sourceFiles);
      }
    };

    cacheCompilerHost.readFile = (fileName: string) => {
      const cache = this._fileCache.getOrCreate(PathUtil.posix(fileName), {});
      if (cache.content === undefined) {
        cache.content = compilerHost.readFile.call(cacheCompilerHost, fileName);
      }
      return cache.content;
    };

    cacheCompilerHost.resolveModuleNames = (moduleNames: string[], containingFile: string) => {
      return moduleNames.map((moduleName) => {
        return ts.resolveModuleName(
          moduleName,
          containingFile,
          parsedTsconfig.options,
          compilerHost,
          moduleResolutionCache
        ).resolvedModule;
      });
    };

    return cacheCompilerHost;
  }

  /*protected _getDependencyFilePaths(sourceFile: ts.SourceFile,
                                    compilerOptions: ts.CompilerOptions,
                                    compilerHost: ts.CompilerHost,
                                    moduleResolutionCache: ts.ModuleResolutionCache): string[] {
    const result: string[] = [];
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isImportDeclaration(node) || ts.isImportEqualsDeclaration(node) || ts.isExportDeclaration(node)) {
        const exp = this._getDependencyExpression(node);
        if (exp && ts.isStringLiteral(exp)) {
          const moduleName = exp.text;

          const resolvedModule = ts.resolveModuleName(
            moduleName,
            sourceFile.fileName,
            compilerOptions,
            compilerHost,
            moduleResolutionCache
          ).resolvedModule;

          if (resolvedModule) {
            result.push(PathUtil.posix(resolvedModule.resolvedFileName));
          }
          else if (moduleName.startsWith(".")) {
            result.push(...[
              PathUtil.posix(path.dirname(sourceFile.fileName), moduleName),
              PathUtil.posix(path.dirname(sourceFile.fileName), moduleName) + ".ts",
              PathUtil.posix(path.dirname(sourceFile.fileName), moduleName) + ".d.ts"
            ]);
          }
        }
      }
    });
    return result;
  }

  protected _getDependencyExpression(node: ts.Node): ts.Expression | undefined {
    if (ts.isImportDeclaration(node)) {
      return node.moduleSpecifier;
    }
    else if (ts.isImportEqualsDeclaration(node)) {
      const reference = node.moduleReference;
      if (ts.isExternalModuleReference(reference)) {
        return reference.expression;
      }
    }
    else if (ts.isExportDeclaration(node)) {
      return node.moduleSpecifier;
    }

    return undefined;
  }*/
}

export interface ITsBuildFileCache {
  exists?: boolean;
  sourceFile?: ts.SourceFile;
  dtsFilePath?: string;
  jsFilePath?: string;
  content?: string;
  dependencyFilePaths?: string[];
}

export interface ITsGenResult {
  dirtyFilePaths: string[];
  result: ISdPackageBuildResult[];
}
