import * as ts from "typescript";
import {FileChangeInfoType, FileWatcher, IFileChangeInfo, optional} from "@simplysm/sd-core";
import * as fs from "fs-extra";
import * as path from "path";
import * as sass from "node-sass";
import * as tslint from "tslint";
import * as glob from "glob";
import {MetadataCollector, ModuleMetadata} from "@angular/compiler-cli";

export class SdTypescriptBuilder {
  private readonly _tsConfig: ts.ParsedCommandLine;
  private readonly _contextPath: string;
  private readonly _host: ts.CompilerHost;
  private _program: ts.Program;
  private _checker: ts.TypeChecker;

  private readonly _fileInfos: ITsFileInfo[] = [];

  public readonly rootDirPath: string;
  public readonly outDir: string;

  public constructor(private readonly _tsConfigFilePath: string) {
    this._contextPath = path.dirname(this._tsConfigFilePath);
    this._tsConfig = ts.parseJsonConfigFileContent(fs.readJsonSync(this._tsConfigFilePath), ts.sys, this._contextPath);

    this._host = ts.createCompilerHost(this._tsConfig.options);

    this._host.getSourceFile = (filePath, languageVersion) => {
      const normalFilePath = path.normalize(filePath);

      const fileInfo = this._fileInfos.single(item => item.filePath === normalFilePath);
      if (fileInfo && fileInfo.syncVersions.sourceFile === fileInfo.version) {
        return fileInfo.sourceFile;
      }
      else {
        let content = this._host.readFile(normalFilePath);
        if (!content) {
          return undefined;
        }

        const converted = SdTypescriptBuilder.convertScssToCss(normalFilePath, content);

        content = converted.content;
        const sourceFile = ts.createSourceFile(normalFilePath, content, languageVersion);

        if (!fileInfo) {
          const newFileInfo: ITsFileInfo = {
            filePath: normalFilePath,
            sourceFile,
            version: 0,
            isMyFile: this.isMyFile(normalFilePath),
            embedDependencies: converted.dependencies.map(item => path.normalize(item)),
            syncVersions: {}
          };
          this._fileInfos.push(newFileInfo);
          newFileInfo.syncVersions.sourceFile = newFileInfo.version;
          return newFileInfo.sourceFile;
        }
        else {
          fileInfo.sourceFile = sourceFile;
          fileInfo.syncVersions.sourceFile = fileInfo.version;
          return fileInfo.sourceFile;
        }
      }
    };

    this.rootDirPath = path.normalize(this._tsConfig.options.rootDir!);
    this.outDir = path.normalize(this._tsConfig.options.outDir!);

    this._program = ts.createProgram(glob.sync(path.resolve(this._tsConfig.options.rootDir!, "**", "*.ts")), this._tsConfig.options, this._host);
    this._checker = this._program.getTypeChecker();
  }

  public getFilePaths(): string[] {
    return this._fileInfos.filter(item => item.isMyFile).map(item => item.filePath);
  }

  public getWatchFilePaths(): string[] {
    return this._fileInfos.mapMany(item1 => [
      item1.filePath,
      ...(item1.dependencies || []),
      ...(item1.embedDependencies || [])
    ]).distinct();
  }

  public async watch(callback: (changeInfos: ITsFileChangeInfo[]) => IFileChangeInfo[] | void | Promise<IFileChangeInfo[] | void>, watch?: () => void, done?: () => void): Promise<void> {
    this.updateDependencies();

    const firstNewChangedFileInfos = await callback(this._fileInfos.filter(item => item.isMyFile).map(item => ({
      type: "add",
      filePath: item.filePath
    })));

    if (firstNewChangedFileInfos && firstNewChangedFileInfos.length > 0) {
      await this.applyChanges(firstNewChangedFileInfos, changedInfos => {
        return callback(changedInfos);
      });
    }

    if (done) {
      done();
    }

    const createWatcher = async () => {
      const watcher = await FileWatcher.watch(
        [path.resolve(this.rootDirPath, "**", "*.ts"), ...this.getWatchFilePaths()],
        ["add", "change", "unlink"],
        async changeInfos => {
          watcher.close();

          if (watch) {
            watch();
          }

          await this.applyChanges(changeInfos, changedInfos => {
            return callback(changedInfos);
          });

          if (done) {
            done();
          }

          await createWatcher();
        }
      );
    };

    await createWatcher();
  }

  public async applyChanges(changeInfos: IFileChangeInfo[], callback: (changeInfos: ITsFileChangeInfo[]) => IFileChangeInfo[] | void | Promise<IFileChangeInfo[] | void>): Promise<IFileChangeInfo[]> {
    const result = Object.clone(changeInfos);

    this.configFileInfos(changeInfos);
    this.initializeProgram();
    this.updateDependencies();

    const currentChangeInfos: ITsFileChangeInfo[] = this.convertChangeInfosByDependencies(changeInfos);

    const newChangedFileInfos = await callback(currentChangeInfos);

    if (newChangedFileInfos && newChangedFileInfos.length > 0) {
      result.push(...await this.applyChanges(newChangedFileInfos, currChangeInfos => {
        return callback(currChangeInfos);
      }));
    }

    return result;
  }

  public configFileInfos(changeInfos: IFileChangeInfo[]): void {
    for (const changeInfo of changeInfos) {
      if (changeInfo.type === "unlink") {
        this._fileInfos.remove(item => item.filePath === changeInfo.filePath);
      }
      else {
        const fileInfos = this._fileInfos
          .filter(item =>
            item.filePath === changeInfo.filePath ||
            item.embedDependencies && item.embedDependencies.includes(changeInfo.filePath)
          );
        if (fileInfos.length > 0) {
          for (const fileInfo of fileInfos) {
            fileInfo.version++;
          }
        }
      }
    }
  }

  public convertChangeInfosByDependencies(changeInfos: IFileChangeInfo[]): ITsFileChangeInfo[] {
    const result: ITsFileChangeInfo[] = changeInfos.filter(item => this.isMyFile(item.filePath));
    result.push(
      ...this._getReverseDependencies(changeInfos.map(item => item.filePath))
        .filter(item => !result.some(item1 => item1.filePath === item))
        .map(item => ({type: "dependency", filePath: item} as ITsFileChangeInfo))
    );
    result.push(
      ...this._getReverseEmbedDependencies(changeInfos.map(item => item.filePath))
        .filter(item => !result.some(item1 => item1.filePath === item))
        .map(item => ({type: "embed-dependency", filePath: item} as ITsFileChangeInfo))
    );

    return result;
  }

  public initializeProgram(): void {
    const oldProgram = this._program;
    this._program = ts.createProgram(glob.sync(path.resolve(this._tsConfig.options.rootDir!, "**", "*.ts")), this._tsConfig.options, this._host, oldProgram);
    this._checker = this._program.getTypeChecker();
  }

  public compile(filePath: string): string[] {
    const relativePath = path.relative(this.rootDirPath, filePath);
    const outFilePath = path.resolve(this.outDir, relativePath).replace(/\.ts$/, ".js");

    const sourceFile = this._program.getSourceFile(filePath);
    if (!sourceFile) {
      fs.removeSync(outFilePath);
      fs.removeSync(outFilePath + ".map");
      return [];
    }

    const diagnostics: ts.Diagnostic[] = [];

    const result = ts.transpileModule(sourceFile.getFullText(), {
      fileName: filePath,
      compilerOptions: this._tsConfig.options,
      reportDiagnostics: false
    });

    if (result.diagnostics && result.diagnostics.length > 0) {
      diagnostics.pushRange(result.diagnostics);
    }

    fs.mkdirsSync(path.dirname(outFilePath));

    const fileInfo = this._fileInfos.single(item => item.filePath === path.normalize(filePath))!;

    const prevOutText = fileInfo.outputText;
    if (prevOutText !== result.outputText) {
      fs.writeFileSync(outFilePath, result.outputText);
      fileInfo.outputText = result.outputText;
    }

    if (this._tsConfig.options.sourceMap && !this._tsConfig.options.inlineSourceMap) {
      const prevOutMapText = fileInfo.sourceMapText;
      if (prevOutMapText !== result.sourceMapText) {
        fs.writeFileSync(outFilePath + ".map", result.sourceMapText);
        fileInfo.sourceMapText = result.sourceMapText;
      }
    }

    return diagnostics.map(item => this._diagnosticToMessage(item)).filterExists().distinct();
  }

  public typeCheck(fileName: string): string[] {
    const sourceFile = this._program.getSourceFile(fileName);
    if (!sourceFile) {
      return [];
    }

    return this._program.getSemanticDiagnostics(sourceFile).concat(this._program.getSyntacticDiagnostics(sourceFile))
      .map(item => this._diagnosticToMessage(item)).filterExists().distinct();
  }

  public emitDeclaration(filePath: string): string[] {
    if (!this._tsConfig.options.declaration) {
      return this.typeCheck(filePath);
    }

    const sourceFile = this._program.getSourceFile(filePath);

    if (!sourceFile) {
      const relativePath = path.relative(this.rootDirPath, filePath);
      const outPath = path.resolve(this.outDir, relativePath).replace(/\.ts$/, ".d.ts");
      fs.removeSync(outPath);
      return [];
    }

    const fileInfo = this._fileInfos.single(item => item.filePath === path.normalize(filePath))!;

    return ts.getPreEmitDiagnostics(this._program, sourceFile)
      .concat(
        this._program.emit(
          sourceFile,
          (emitFilePath, data, writeByteOrderMark) => {
            const prevOutText = fileInfo.declarationText;
            if (data !== prevOutText) {
              ts.sys.writeFile(emitFilePath, data, writeByteOrderMark);
              fileInfo.declarationText = data;
            }
          },
          undefined,
          true
        ).diagnostics
      )
      .map(item => this._diagnosticToMessage(item)).filterExists().distinct();
  }

  public lint(fileNames: string[]): string[] {
    const linter = new tslint.Linter({formatter: "json", fix: false}, this._program);
    const config = tslint.Configuration.findConfiguration(path.resolve(this._contextPath, "tslint.json")).results!;

    for (const fileName of fileNames.distinct()) {
      const sourceFile = this._program.getSourceFile(fileName);
      if (!sourceFile) continue;

      linter.lint(sourceFile.fileName, sourceFile.getFullText(), config);
    }

    const failures = linter.getResult().failures;

    return failures.map(item => ({
      file: this._program.getSourceFile(item.getFileName()),
      start: item.getStartPosition().getPosition(),
      messageText: item.getFailure(),
      category: ts.DiagnosticCategory.Warning,
      code: 0,
      length: undefined,
      rule: item.getRuleName()
    })).map(item => this._diagnosticToMessage(item)).filterExists().distinct();
  }

  public generateMetadata(filePath: string): string[] {
    const relativePath = path.relative(this.rootDirPath, filePath);
    const outFilePath = path.resolve(this.outDir, relativePath).replace(/\.ts$/, ".metadata.json");

    const sourceFile = this._program.getSourceFile(filePath);
    if (!sourceFile) {
      fs.removeSync(outFilePath);
      return [];
    }

    const fileInfo = this._fileInfos.single(item => item.filePath === path.normalize(filePath))!;
    const prevOutMetadata = fileInfo.metadata;

    const metadataObj = this._getMetadata(filePath);

    if (metadataObj.metadata) {
      fs.mkdirsSync(path.dirname(outFilePath));

      if (!prevOutMetadata || !Object.equal(metadataObj.metadata, prevOutMetadata)) {
        fs.writeJsonSync(outFilePath, metadataObj.metadata);
      }
    }

    return metadataObj.diagnostics.map(item => this._diagnosticToMessage(item)).filterExists().distinct();
  }

  public getNgModules(): ITsNgModuleInfo[] {
    const result: ITsNgModuleInfo[] = [];

    const sourceFiles = this._program.getSourceFiles();
    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.fileName;
      const fileInfo = this._fileInfos.single(item => item.filePath === path.normalize(filePath))!;

      if (fileInfo.syncVersions.ngModules !== fileInfo.version) {
        try {
          const module = this._getModuleName(sourceFile.fileName);

          const modules = this._getClassMetadataByDecorator(sourceFile.fileName, "@angular/core", ["NgModule"])
            .filterExists()
            .map(classMetadataObj => {
              const decorator = classMetadataObj.decorator;

              const exports: string[] = (optional(() => decorator.arguments[0].exports) || []).map((item: any) => item.name);

              const providerProperties = optional(() => decorator.arguments[0].providers) || [];

              // noinspection SuspiciousTypeOfGuard
              let providers: string[] = ((providerProperties instanceof Array) ? providerProperties : [providerProperties])
                .map((item: any) => optional(() => item.name || /*item.provide.name ||*/ item.expression.name))
                .filterExists();

              if (classMetadataObj.statics) {
                providers.push(
                  ...Object.keys(classMetadataObj.statics)
                    .mapMany(key1 =>
                      ((optional(() => classMetadataObj.statics[key1].value.providers) as any[]) || [])
                        .map((item: any) => optional(() => item.name || /*item.provide.name ||*/ item.expression.name))
                        .filterExists()
                    )
                );
              }

              providers = this._convertMetadataReferenceTarget(filePath, providers);

              return {
                module,
                path: path.normalize(sourceFile.fileName),
                name: classMetadataObj.name,
                exports: exports.distinct(),
                providers: providers.distinct()
              };
            });

          fileInfo.ngModules = modules;
          result.push(...modules);
        }
        catch (err) {
          err.message = sourceFile.fileName + " ==>\n" + err.message;
          throw err;
        }
      }
      else {
        result.push(...fileInfo.ngModules || []);
      }

      fileInfo.syncVersions.ngModules = fileInfo.version;
    }

    return result.distinct();
  }

  private _convertMetadataReferenceTarget(filePath: string, metadataNames: string[]): string[] {
    const metadataObj = this._getMetadata(filePath);
    if (metadataObj.diagnostics.length > 0) {
      throw new Error(metadataObj.diagnostics.map(item => this._diagnosticToMessage(item)).filterExists().distinct().join("\n"));
    }

    const metadata = metadataObj.metadata as any;
    if (!metadata) {
      throw new Error();
    }

    const result: string[] = metadataNames;

    const refNames = result.filter(item => item.startsWith("ɵ"));
    for (const refName of refNames) {
      try {
        const newRefs = (metadata.metadata[refName] instanceof Array ? metadata.metadata[refName] : [metadata.metadata[refName]])
          .map((item: any) => optional(() => item.name || item.expression.name))
          .filterExists();
        result.push(...newRefs);
        result.push(...this._convertMetadataReferenceTarget(filePath, newRefs));
      }
      catch (err) {
        err.message = "[refProvider: " + refName + "] ==>\n" + err.message;
        throw err;
      }
    }
    result.remove(refNames);

    return result.distinct();
  }

  private _getClassMetadataByDecorator(filePath: string, decoratorModule: string, decoratorNames: string[]): { name: string; decorator: any; statics: any }[] {
    const metadataObj = this._getMetadata(filePath);
    if (metadataObj.diagnostics.length > 0) {
      throw new Error(metadataObj.diagnostics.map(item => this._diagnosticToMessage(item)).filterExists().distinct().join("\n"));
    }

    const metadata = metadataObj.metadata as any;
    if (!metadata) {
      return [];
    }

    return Object.keys(metadata.metadata)
      .filter(key =>
        optional(() =>
          metadata.metadata[key].decorators.some((item: any) => decoratorNames.includes(item.expression.name) && item.expression.module === decoratorModule)
        ) ||
        false
      )
      .map(key => ({
        name: key,
        decorator: metadata.metadata[key].decorators.single((item: any) => decoratorNames.includes(item.expression.name) && item.expression.module === decoratorModule),
        statics: metadata.metadata[key].statics
      }));
  }

  private _getModuleName(filePath: string): string | undefined {
    const nodeModulesDirPath = path.resolve(process.cwd(), "node_modules");

    if (path.normalize(filePath).startsWith(nodeModulesDirPath)) {
      const relativePath = path.relative(nodeModulesDirPath, filePath).replace(/\\/g, "/");
      return relativePath.split("/")[0].includes("@")
        ? relativePath.split("/")[0] + "/" + relativePath.split("/")[1]
        : relativePath.split("/")[0];
    }

    return undefined;
  }

  public getNgComponentAndDirectives(): ITsNgComponentOrDirectiveInfo[] {
    const result: ITsNgComponentOrDirectiveInfo[] = [];

    const sourceFiles = this._program.getSourceFiles();
    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.fileName;
      const fileInfo = this._fileInfos.single(item => item.filePath === path.normalize(filePath))!;

      if (fileInfo.syncVersions.ngComponentOrDirectives !== fileInfo.version) {
        try {
          const module = this._getModuleName(sourceFile.fileName);

          const modules = this._getClassMetadataByDecorator(sourceFile.fileName, "@angular/core", ["Component", "Directive"])
            .filterExists()
            .map(classMetadataObj => {
              const decorator = classMetadataObj.decorator;

              const selector = decorator.arguments[0].selector;
              const template = decorator.arguments[0].template;

              return {
                module,
                path: path.normalize(sourceFile.fileName),
                name: classMetadataObj.name,
                selector,
                template
              };
            });

          fileInfo.ngComponentOrDirectives = modules;
          result.push(...modules);
        }
        catch (err) {
          err.message = sourceFile.fileName + " ==>\n" + err.message;
          throw err;
        }
      }
      else {
        result.push(...fileInfo.ngComponentOrDirectives || []);
      }

      fileInfo.syncVersions.ngComponentOrDirectives = fileInfo.version;
    }

    return result.distinct();
  }

  public getImports(filePath: string): ITsImportInfo[] {
    const fileInfo = this._fileInfos.single(item => item.filePath === path.normalize(filePath))!;

    if (fileInfo.syncVersions.imports !== fileInfo.version) {
      const sourceFile = this._program.getSourceFile(filePath)!;

      fileInfo.imports = this._getSourceNodes(sourceFile)
        .filter(node => node.kind === ts.SyntaxKind.ImportDeclaration)
        .map(node => ({
          module: ((node as ts.ImportDeclaration).moduleSpecifier as ts.StringLiteral).text,
          targets: optional(() =>
            ((node as ts.ImportDeclaration).importClause!.namedBindings! as ts.NamedImports).elements
              .map(item => item.propertyName ? item.propertyName.text : item.name.text)
          )
        }))
        .filter(item => item.module && item.targets) as { module: string; targets: string[] }[];
    }

    fileInfo.syncVersions.imports = fileInfo.version;
    return fileInfo.imports || [];
  }

  private _getMetadata(filePath: string): { metadata: ModuleMetadata | undefined; diagnostics: ts.Diagnostic[] } {
    const fileInfo = this._fileInfos.single(item => item.filePath === path.normalize(filePath))!;

    const diagnostics: ts.Diagnostic[] = [];

    if (fileInfo.syncVersions.metadata !== fileInfo.version) {
      const sourceFile = this._program.getSourceFile(filePath)!;

      if (filePath.endsWith(".d.ts")) {
        const metadataFilePath = filePath.replace(/\.d\.ts$/, ".metadata.json");
        if (fs.pathExistsSync(metadataFilePath)) {
          const metadataContent = fs.readJsonSync(metadataFilePath);
          fileInfo.metadata = metadataContent instanceof Array ? metadataContent[0] : metadataContent;
        }
        else {
          fileInfo.metadata = undefined;
        }
      }
      else {
        fileInfo.metadata = new MetadataCollector().getMetadata(sourceFile, false, (value, tsNode) => {
          if (value && value["__symbolic"] && value["__symbolic"] === "error") {
            diagnostics.push({
              file: sourceFile,
              start: tsNode.parent ? tsNode.getStart() : tsNode.pos,
              messageText: value["message"],
              category: ts.DiagnosticCategory.Error,
              code: 0,
              length: undefined
            });
          }

          return value;
        });
      }
    }

    fileInfo.syncVersions.metadata = fileInfo.version;
    return {metadata: fileInfo.metadata, diagnostics};
  }

  private _getSourceNodes(sourceFile: ts.SourceFile): ts.Node[] {
    const nodes: ts.Node[] = [sourceFile];
    const result = [];

    while (nodes.length > 0) {
      const node = nodes.shift();

      if (node) {
        result.push(node);
        if (node.getChildCount(sourceFile) >= 0) {
          nodes.unshift(...node.getChildren());
        }
      }
    }

    return result;
  }

  public updateDependencies(): void {
    for (const fileInfo of this._fileInfos) {
      if (!fileInfo.dependencies && fileInfo.sourceFile) {
        fileInfo.dependencies = this._getDependencies(fileInfo.sourceFile);
      }
    }
  }

  private _getDependencies(sourceFile: ts.SourceFile): string[] {
    const result: string[] = [];

    const doing = (sf: ts.SourceFile) => {
      if (!sf["imports"]) {
        return;
      }

      for (const importNode of sf["imports"]) {
        const symbol = this._checker.getSymbolAtLocation(importNode);
        if (symbol && symbol.declarations) {
          for (const decl of symbol.declarations) {
            let node = decl as ts.Node;
            while (node && node.kind !== ts.SyntaxKind.SourceFile) {
              node = node.parent;
            }

            const fileName = path.normalize((node as ts.SourceFile).fileName);
            if (!result.includes(fileName) && fileName !== path.normalize(sourceFile.fileName)) {
              result.push(fileName);
              const fileInfo = this._fileInfos.single(item => item.filePath === fileName);
              if (fileInfo && fileInfo.dependencies) {
                result.push(...fileInfo.dependencies.filter(item => !result.includes(item) && item !== path.normalize(sourceFile.fileName)));
              }
              else {
                const newSourceFile = this._program.getSourceFile(fileName);
                if (newSourceFile) {
                  doing(newSourceFile);
                }
              }
            }
          }
        }
      }

      const matches = sf.getFullText().replace(/[\r\n\s]/g, "").match(/loadChildren:"([^#]*)#/g);
      if (matches) {
        for (const match of matches) {
          const importRelativePath = match.match(/loadChildren:"([^#]*)#/)![1];
          const importFilePath = path.resolve(path.dirname(sf.fileName), importRelativePath) + ".ts";
          result.push(importFilePath);
        }
      }
    };

    doing(sourceFile);

    return result.distinct();
  }

  public static convertScssToCss(fileName: string, content: string): { content: string; dependencies: string[] } {
    const scssRegex = /(scss\()?\/\* *language=SCSS *\*\/ *[`"'](((?!['"`]\)?[\],][,;]?[\r\n\\])(.|\r|\n))*)['"`]\)?/;

    let deps: string[] = [];
    let newContent = content;
    const matches = newContent.match(new RegExp(scssRegex, "gi"));
    if (matches) {
      const results = matches.map(match => sass.renderSync({
        file: fileName,
        data: match.match(scssRegex)![2],
        sourceMapEmbed: false,
        sourceMap: false,
        outputStyle: "compressed"
      }));

      deps = results.map(result => result.stats.includedFiles).reduce((a, b) => a.concat(b));

      let i = 0;
      newContent = newContent.replace(new RegExp(scssRegex, "gi"), () => {
        let result = "`" + results[i].css.toString() + "`";
        const prev = matches[i];

        const diffCount = Array.from(prev).filter(item => item === "\n").length - Array.from(result).filter(item => item === "\n").length;
        result += "/* tslint:disable */";
        for (let j = 0; j < diffCount; j++) {
          result += "\n";
        }
        result += "/* tslint:enable */";

        i++;
        return result;
      });
    }

    return {
      content: newContent,
      dependencies: deps
    };
  }

  private _diagnosticToMessage(diagnostic: ts.Diagnostic): string | undefined {
    if (diagnostic.file) {
      const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
      const tsMessage = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      return `${diagnostic.file.fileName}(${position.line + 1},${position.character + 1}): ${diagnostic.category.toString().toLowerCase()}: ${tsMessage}` + (diagnostic["rule"] ? ` (${diagnostic["rule"]})` : "");
    }
    else {
      return undefined;
    }
  }

  private _getReverseDependencies(filePaths: string[]): string[] {
    const result: string[] = [];

    for (const filePath of filePaths) {
      const currResult = this._fileInfos
        .filter(fileInfo =>
          fileInfo.isMyFile &&
          fileInfo.dependencies &&
          fileInfo.dependencies.includes(filePath) &&
          !result.some(item1 => item1 === fileInfo.filePath)
        )
        .map(fileInfo => fileInfo.filePath);

      result.push(...currResult);
    }

    return result;
  }

  private _getReverseEmbedDependencies(filePaths: string[]): string[] {
    const result: string[] = [];

    for (const filePath of filePaths) {
      const currResult = this._fileInfos
        .filter(fileInfo =>
          fileInfo.isMyFile &&
          fileInfo.embedDependencies.includes(filePath) &&
          !result.some(item1 => item1 === fileInfo.filePath)
        )
        .map(fileInfo => fileInfo.filePath);

      result.push(...currResult);
    }

    return result;
  }

  public isMyFile(filePath: string): boolean {
    return filePath.endsWith(".ts") && path.normalize(filePath).startsWith(path.normalize(this.rootDirPath));
  }
}

export interface ITsFileChangeInfo {
  type: TsFileChangeInfoType;
  filePath: string;
}

export type TsFileChangeInfoType = FileChangeInfoType | "dependency" | "embed-dependency";

interface ITsImportInfo {
  module: string;
  targets: string[];
}

export interface ITsNgModuleInfo {
  module: string | undefined;
  path: string;
  name: string;
  exports: string[];
  providers: string[];
}

export interface ITsNgComponentOrDirectiveInfo {
  module: string | undefined;
  path: string;
  name: string;
  selector: string;
  template: string | undefined;
}

interface ITsFileInfo {
  filePath: string;
  sourceFile: ts.SourceFile | undefined;
  version: number;
  isMyFile: boolean;
  embedDependencies: string[];
  dependencies?: string[];
  outputText?: string;
  sourceMapText?: string;
  declarationText?: string;
  metadata?: ModuleMetadata;
  imports?: ITsImportInfo[];
  ngModules?: ITsNgModuleInfo[];
  ngComponentOrDirectives?: ITsNgComponentOrDirectiveInfo[];
  syncVersions: {
    sourceFile?: number;
    imports?: number;
    metadata?: number;
    ngModules?: number;
    ngComponentOrDirectives?: number;
  };
}
