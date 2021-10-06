import * as ts from "typescript";
import { ITsConfig } from "../commons";
import { FsUtil } from "@simplysm/sd-core-node/src";
import { CacheMap } from "../../../sd-core-common/src/types/CacheMap";
import { StringUtil } from "@simplysm/sd-core-common";
import { EventEmitter } from "events";
import { Logger } from "@simplysm/sd-core-node";
import * as path from "path";

export class SdCliTypescriptWatcher extends EventEmitter {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  private _program?: ts.Program;
  private readonly _fileCache: CacheMap<IFileCache> = new CacheMap<IFileCache>({});
  private readonly _moduleResolutionCache: ts.ModuleResolutionCache;

  public constructor(public rootPath: string,
                     public tsConfigFilePath: string) {
    super();
    this._moduleResolutionCache = ts.createModuleResolutionCache(this.rootPath, (s) => s);
  }

  public on(event: "change", listener: (filePaths?: string[]) => void): this;
  public on(event: "complete", listener: (diagnostics: ts.Diagnostic[]) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public async getParsedTsConfigAsync(): Promise<ts.ParsedCommandLine> {
    const tsConfig: ITsConfig = await FsUtil.readJsonAsync(this.tsConfigFilePath);
    return ts.parseJsonConfigFileContent(tsConfig, ts.sys, this.rootPath);
  }

  public async watchAsync(): Promise<void> {
    this.emit("change");

    await this._reloadProgramAsync();

    const fileNames = this._fileCache.keys;
    const watcher = await FsUtil.watchAsync(
      fileNames,
      async (changeInfos) => {
        this.emit("change", changeInfos.map((item) => item.filePath));

        for (const changeInfo of changeInfos) {
          this._fileCache.delete(changeInfo.filePath);
        }

        await this._reloadProgramAsync();

        const watchFileNames = this._fileCache.keys;
        watcher.add(watchFileNames);

        const watchDiagnostics = [
          ...this._program.getOptionsDiagnostics(),
          ...this._program.getGlobalDiagnostics(),
          ...this._program.getSyntacticDiagnostics(),
          ...this._program.getSemanticDiagnostics()
        ];
        for (const sourceFile of this._program.getSourceFiles()) {
          this._program.emit(sourceFile);
        }

        this.emit("complete", watchDiagnostics);
      },
      (err) => {
        this._logger.error(err);
      }
    );

    const diagnostics = [
      ...this._program.getOptionsDiagnostics(),
      ...this._program.getGlobalDiagnostics(),
      ...this._program.getSyntacticDiagnostics(),
      ...this._program.getSemanticDiagnostics()
    ];
    for (const sourceFile of this._program.getSourceFiles()) {
      this._program.emit(sourceFile);
    }

    this.emit("complete", diagnostics);
  }

  private async _reloadProgramAsync(): Promise<void> {
    const parsedTsConfig = await this.getParsedTsConfigAsync();
    const cacheCompilerHost = this._createCacheCompilerHost(parsedTsConfig);

    this._program = ts.createProgram(
      parsedTsConfig.fileNames,
      parsedTsConfig.options,
      cacheCompilerHost,
      this._program
    );
  }

  private _createCacheCompilerHost(parsedTsConfig: ts.ParsedCommandLine): ts.CompilerHost {
    const compilerHost = ts.createCompilerHost(parsedTsConfig.options);

    const cacheCompilerHost = { ...compilerHost };
    cacheCompilerHost.fileExists = (fileName: string) => {
      const cache = this._fileCache.getOrCreate(path.resolve(fileName));
      if (cache.exists === undefined) {
        cache.exists = compilerHost.fileExists.call(cacheCompilerHost, fileName);
      }
      return cache.exists;
    };

    cacheCompilerHost.getSourceFile = (fileName: string, languageVersion: ts.ScriptTarget) => {
      const cache = this._fileCache.getOrCreate(path.resolve(fileName));
      if (!cache.sourceFile) {
        cache.sourceFile = compilerHost.getSourceFile.call(cacheCompilerHost, fileName, languageVersion);
      }
      if (!cache.dependencyFiles) {
        cache.dependencyFiles = this._getDependencyFiles()
      }
      /*if (!cache.dependencies) {
        cache.dependencies = this._getDependencies(
          cache.sourceFile,
          parsedTsConfig.options,
          compilerHost
        );
      }*/
      return cache.sourceFile;
    };

    cacheCompilerHost.writeFile = (fileName: string,
                                   data: string,
                                   writeByteOrderMark: boolean,
                                   onError?: (message: string) => void,
                                   sourceFiles?: readonly ts.SourceFile[]) => {
      if (fileName.endsWith(".d.ts")) {
        sourceFiles.forEach((source) => {
          const cache = this._fileCache.getOrCreate(path.resolve(source.fileName));
          if (StringUtil.isNullOrEmpty(cache.declFilePath)) {
            cache.declFilePath = fileName;
          }
        });
      }

      if (fileName.endsWith(".js")) {
        sourceFiles.forEach((source) => {
          const cache = this._fileCache.getOrCreate(path.resolve(source.fileName));
          if (StringUtil.isNullOrEmpty(cache.jsFilePath)) {
            cache.jsFilePath = fileName;
          }
        });
      }

      compilerHost.writeFile.call(cacheCompilerHost, fileName, data, writeByteOrderMark, onError, sourceFiles);
    };

    cacheCompilerHost.readFile = (fileName: string) => {
      const cache = this._fileCache.getOrCreate(path.resolve(fileName));
      if (cache.content === undefined) {
        cache.content = compilerHost.readFile.call(cacheCompilerHost, fileName);
      }
      return cache.content;
    };

    cacheCompilerHost.resolveModuleNames = (moduleNames: string[], containingFile: string) => {
      return moduleNames.map((moduleName) => {
        const { resolvedModule } = ts.resolveModuleName(
          moduleName,
          containingFile,
          parsedTsConfig.options,
          compilerHost,
          this._moduleResolutionCache
        );

        return resolvedModule;
      });
    };

    return cacheCompilerHost;
  }

  /*private _getDependencies(sourceFile: ts.SourceFile,
                           compilerOptions: ts.CompilerOptions,
                           compilerHost: ts.CompilerHost): { imports: ISourceFileDependency[]; exports: ISourceFileDependency[]; exportTargetNames: string[] } {
    const imports: ISourceFileDependency[] = [];
    const exports: ISourceFileDependency[] = [];
    const exportTargetNames: string[] = [];
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isImportDeclaration(node) || ts.isImportEqualsDeclaration(node) || ts.isExportDeclaration(node)) {
        const exp = this._getDependencyExpression(node);
        if (exp && ts.isStringLiteral(exp)) {
          const moduleName = exp.text;
          const filePath = ts.resolveModuleName(
            moduleName,
            sourceFile.fileName,
            compilerOptions,
            compilerHost,
            this._moduleResolutionCache
          ).resolvedModule?.resolvedFileName;
          const targets = this._getDependencyTargetNames(node);

          if (ts.isImportDeclaration(node) || ts.isImportEqualsDeclaration(node)) {
            imports.push({ moduleName, filePath, targets });
          }
          else if (ts.isExportDeclaration(node)) {
            exports.push({ moduleName, filePath, targets });
          }
        }
      }
      if (node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)) {
        if (ts.isVariableStatement(node)) {
          const targetNames = node.declarationList.declarations.map((item) => {
            if (ts.isIdentifier(item.name)) {
              return item.name.text;
            }
            else {
              throw new NotImplementError();
            }
          });
          exportTargetNames.push(...targetNames);
        }
        else if (
          ts.isFunctionDeclaration(node)
          || ts.isClassDeclaration(node)
          || ts.isInterfaceDeclaration(node)
          || ts.isTypeAliasDeclaration(node)
          || ts.isEnumDeclaration(node)
          || ts.isModuleDeclaration(node)
          || ts.isImportEqualsDeclaration(node)
        ) {
          exportTargetNames.push(node.name.text);
        }
        else {
          throw new NotImplementError();
        }
      }
    });

    return { imports, exports, exportTargetNames };
  }

  private _getDependencyExpression(node: ts.Node): ts.Expression | undefined {
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
  }

  private _getDependencyTargetNames(node: ts.Node): string[] | undefined {
    if (ts.isImportDeclaration(node)) {
      if (node.importClause) {
        const namedBindings = node.importClause.namedBindings;
        // import { Test } from "./Test"
        if (ts.isNamedImports(namedBindings)) {
          return namedBindings.elements.map((item) => item.name.text);
        }
      }
    }
    else if (ts.isExportDeclaration(node)) {
      if (node.exportClause) {
        const namedBindings = node.exportClause;
        // export { Test } from "./Test"
        if (ts.isNamedExports(namedBindings)) {
          return namedBindings.elements.map((item) => item.name.text);
        }
      }
    }

    return undefined;
  }*/
}

interface IFileCache {
  exists?: boolean;
  sourceFile?: ts.SourceFile;
  declFilePath?: string;
  jsFilePath?: string;
  content?: string;
  dependencyFiles?: string[];
  /*dependencies?: {
    imports: ISourceFileDependency[];
    exports: ISourceFileDependency[];
    exportTargetNames: string[];
  };*/
}

/*interface ISourceFileDependency {
  moduleName: string;
  filePath: string;
  targets?: string[];
}*/
