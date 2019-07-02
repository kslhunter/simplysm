import * as ts from "typescript";
import {FileChangeInfoType, FileWatcher, JsonConvert, optional} from "@simplysm/sd-core";
import * as fs from "fs-extra";
import * as path from "path";
import * as sass from "node-sass";
import * as tslint from "tslint";
import * as glob from "glob";
import {MetadataCollector} from "@angular/compiler-cli";

export class SdTypescriptBuilder {
  private readonly _tsConfig: ts.ParsedCommandLine;
  private readonly _contextPath: string;
  private readonly _host: ts.CompilerHost;
  private _program: ts.Program;
  private _checker: ts.TypeChecker;

  private readonly _fileInfos: {
    filePath: string;
    sourceFile: ts.SourceFile | undefined;
    version: number;
    dependencies: string[] | undefined;
  }[] = [];

  public readonly rootDirPath: string;
  public readonly outDir: string;

  public constructor(private readonly _tsConfigFilePath: string) {
    this._contextPath = path.dirname(this._tsConfigFilePath);
    this._tsConfig = ts.parseJsonConfigFileContent(fs.readJsonSync(this._tsConfigFilePath), ts.sys, this._contextPath);
    this._tsConfig.fileNames = glob.sync(path.resolve(this._contextPath, "src", "**", "*.ts"));

    this._host = ts.createCompilerHost(this._tsConfig.options);
    this._host["sourceFileVersions"] = {};

    this._host.getSourceFile = (filePath, languageVersion) => {
      const normalFilePath = path.normalize(filePath);

      const fileInfo = this._fileInfos.single(item => item.filePath === normalFilePath);
      if (fileInfo && this._host["sourceFileVersions"][normalFilePath] === fileInfo.version) {
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
        sourceFile["scssDependencies"] = converted.dependencies.map(item => path.normalize(item));

        if (!fileInfo) {
          const newFileInfo = {
            filePath: normalFilePath,
            sourceFile,
            version: 0,
            dependencies: undefined
          };
          this._fileInfos.push(newFileInfo);
          this._host["sourceFileVersions"][normalFilePath] = newFileInfo.version;
          return newFileInfo.sourceFile;
        }
        else {
          fileInfo.sourceFile = sourceFile;
          this._host["sourceFileVersions"][normalFilePath] = fileInfo.version;
          return fileInfo.sourceFile;
        }
      }
    };

    this.rootDirPath = path.normalize(this._tsConfig.options.rootDir!);
    this.outDir = path.normalize(this._tsConfig.options.outDir!);

    this._program = ts.createProgram(this._tsConfig.fileNames, this._tsConfig.options, this._host);
    this._checker = this._program.getTypeChecker();
  }

  public getFilePaths(): string[] {
    return this._program.getSourceFiles().filter(item => this._isMyFile(item.fileName)).map(item => path.normalize(item.fileName));
  }

  public async watch(callback: (changeInfos: ITsFileChangeInfo[]) => void, watch?: () => void): Promise<void> {
    this._updateDependencies();

    callback(
      this._program.getSourceFiles().filter(item => this._isMyFile(item.fileName)).map(item => ({
        type: "add",
        filePath: path.normalize(item.fileName)
      }))
    );

    const createWatcher = async (first?: boolean) => {
      const watchFiles = this._fileInfos.mapMany(item1 => [item1.filePath, ...(item1.dependencies || [])]).distinct();

      const watcher = await FileWatcher.watch(
        watchFiles,
        ["add", "change", "unlink"],
        async changeInfos => {
          watcher.close();

          if (watch) {
            watch();
          }

          for (const changeInfo of changeInfos) {
            if (!changeInfo.filePath.endsWith(".scss")) {
              const fileInfo = this._fileInfos.single(item => item.filePath === changeInfo.filePath);
              if (fileInfo) {
                fileInfo.version++;
              }
            }
            else {
              const fileInfos = this._fileInfos.filter(item => item.dependencies && item.dependencies.includes(changeInfo.filePath));
              for (const fileInfo of fileInfos) {
                fileInfo.version++;
              }
            }
          }

          this._program = ts.createProgram(this._tsConfig.fileNames, this._tsConfig.options, this._host);
          this._checker = this._program.getTypeChecker();
          this._updateDependencies();

          const currentChangedInfos: ITsFileChangeInfo[] = changeInfos.filter(item => this._isMyFile(item.filePath));
          currentChangedInfos.push(
            ...this._getReverseDependencies(changeInfos.map(item => item.filePath).filter(item => !item.endsWith(".scss")))
              .filter(item => !currentChangedInfos.some(item1 => item1.filePath === item))
              .map(item => ({type: "dependency", filePath: item} as ITsFileChangeInfo))
          );
          currentChangedInfos.push(
            ...this._getReverseDependencies(changeInfos.map(item => item.filePath).filter(item => item.endsWith(".scss")))
              .filter(item => !currentChangedInfos.some(item1 => item1.filePath === item))
              .map(item => ({type: "dependency-scss", filePath: item} as ITsFileChangeInfo))
          );

          callback(currentChangedInfos);

          await createWatcher();
        }
      );
    };

    await createWatcher(true);
  }

  public compile(fileName: string): string[] {
    const relativePath = path.relative(this.rootDirPath, fileName);
    const outFilePath = path.resolve(this.outDir, relativePath).replace(/\.ts$/, ".js");

    const sourceFile = this._program.getSourceFile(fileName);
    if (!sourceFile) {
      fs.removeSync(outFilePath);
      fs.removeSync(outFilePath + ".map");
      return [];
    }

    const diagnostics: ts.Diagnostic[] = [];

    const result = ts.transpileModule(sourceFile.getFullText(), {
      fileName,
      compilerOptions: this._tsConfig.options,
      reportDiagnostics: false
    });

    if (result.diagnostics && result.diagnostics.length > 0) {
      diagnostics.pushRange(result.diagnostics);
    }

    fs.mkdirsSync(path.dirname(outFilePath));
    const prevOutText = fs.pathExistsSync(outFilePath) ? fs.readFileSync(outFilePath).toString() : undefined;
    if (prevOutText !== result.outputText) {
      fs.writeFileSync(outFilePath, result.outputText);
    }

    if (this._tsConfig.options.sourceMap && !this._tsConfig.options.inlineSourceMap) {
      const prevOutMapText = fs.pathExistsSync(outFilePath + ".map") ? fs.readFileSync(outFilePath + ".map").toString() : undefined;
      if (prevOutMapText !== result.sourceMapText) {
        fs.writeFileSync(outFilePath + ".map", result.sourceMapText);
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

  public emitDeclaration(fileName: string): string[] {
    if (!this._tsConfig.options.declaration) {
      return this.typeCheck(fileName);
    }

    const sourceFile = this._program.getSourceFile(fileName);

    if (!sourceFile) {
      const relativePath = path.relative(this.rootDirPath, fileName);
      const outPath = path.resolve(this.outDir, relativePath).replace(/\.ts$/, ".d.ts");
      fs.removeSync(outPath);
      return [];
    }

    return ts.getPreEmitDiagnostics(this._program, sourceFile)
      .concat(
        this._program.emit(
          sourceFile,
          (filePath, data, writeByteOrderMark) => {
            const prevOutText = fs.pathExistsSync(filePath) ? fs.readFileSync(filePath).toString() : undefined;
            if (data !== prevOutText) {
              ts.sys.writeFile(filePath, data, writeByteOrderMark);
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

    for (const fileName of fileNames) {
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

  public generateMetadata(fileName: string): string[] {
    const relativePath = path.relative(this.rootDirPath, fileName);
    const outFilePath = path.resolve(this.outDir, relativePath).replace(/\.ts$/, ".metadata.json");

    const sourceFile = this._program.getSourceFile(fileName);
    if (!sourceFile) {
      fs.removeSync(outFilePath);
      return [];
    }

    const diagnostics: ts.Diagnostic[] = [];
    const metadata = new MetadataCollector().getMetadata(sourceFile, false, (value, tsNode) => {
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

    if (metadata) {
      const metadataText = JsonConvert.stringify(metadata);

      fs.mkdirsSync(path.dirname(outFilePath));

      const prevOutText = fs.pathExistsSync(outFilePath) ? fs.readFileSync(outFilePath).toString() : undefined;
      if (!prevOutText || metadataText !== prevOutText) {
        fs.writeFileSync(outFilePath, metadataText);
      }
    }

    return diagnostics.map(item => this._diagnosticToMessage(item)).filterExists().distinct();
  }

  private _updateDependencies(): void {
    for (const fileInfo of this._fileInfos) {
      if (!fileInfo.dependencies && fileInfo.sourceFile) {
        fileInfo.dependencies = this._getDependencies(fileInfo.sourceFile);
      }
    }
  }

  public getNgModules(): { module: string | undefined; path: string; name: string; exports: string[]; providers: string[] }[] {
    const result: { module: string | undefined; path: string; name: string; exports: string[]; providers: string[] }[] = [];

    const sourceFiles = this._program.getSourceFiles();
    for (const sourceFile of sourceFiles) {
      try {
        const imports = this.getImports(sourceFile.fileName);

        if (sourceFile.fileName.endsWith(".ts") && !sourceFile.fileName.endsWith(".d.ts")) {
          result.push(...this._getSourceNodes(sourceFile)
            .filter(node =>
              node.kind === ts.SyntaxKind.Decorator &&
              (node as ts.Decorator).expression.kind === ts.SyntaxKind.CallExpression
            )
            .map(node => (node as ts.Decorator).expression as ts.CallExpression)
            .filter(expr => {
              const identifier = expr.expression as ts.Identifier;
              const importInfo = imports.single(item => item.targets.includes(identifier.text));
              return identifier.text === "NgModule" && importInfo && importInfo.module === "@angular/core";
            })
            .filter(expr => expr.arguments[0] && expr.arguments[0].kind === ts.SyntaxKind.ObjectLiteralExpression)
            .map(expr => {
              const args = expr.arguments[0] as ts.ObjectLiteralExpression;
              const classNode = this._getParentClassNode(expr)!;

              const exportProperty = args.properties.filter(item => (item.name as ts.Identifier).text === "exports")[0] as ts.PropertyAssignment;
              const exports = exportProperty
                ? (exportProperty.initializer as ts.ArrayLiteralExpression).elements.map(item => (item as ts.Identifier).text)
                : [];

              const providerProperty = args.properties.filter(item => (item.name as ts.Identifier).text === "providers")[0] as ts.PropertyAssignment;
              const providers = providerProperty
                ? (providerProperty.initializer as ts.ArrayLiteralExpression).elements.map(item => (item as ts.Identifier).text)
                : [];

              providers.push(
                ...classNode.members
                  .filter(item => item.kind === ts.SyntaxKind.MethodDeclaration)
                  .filter(item =>
                    optional(() =>
                      (((item as ts.MethodDeclaration).type as ts.TypeReferenceNode).typeName as ts.Identifier).text === "ModuleWithProviders"
                    ) ||
                    false
                  )
                  .mapMany(item =>
                    ((item as ts.MethodDeclaration).body as ts.FunctionBody).getFullText()
                      .replace(/[\r\n ]/g, "")
                      .match(/providers:\[([^\]]*)]/)![1]
                      .split(",")
                  )
              );

              return {
                module: undefined,
                path: path.normalize(sourceFile.fileName),
                name: classNode.name!.text,
                exports: exports.distinct(),
                providers: providers.distinct()
              };
            }));
        }
        else if (sourceFile.fileName.endsWith(".d.ts")) {
          const metadataFilePath = sourceFile.fileName.replace(/\.d\.ts$/, ".metadata.json");
          if (fs.pathExistsSync(metadataFilePath)) {
            const nodeModulesDirPath = path.resolve(process.cwd(), "node_modules");

            let module: string | undefined;
            if (path.normalize(sourceFile.fileName).startsWith(nodeModulesDirPath)) {
              const relativePath = path.relative(nodeModulesDirPath, sourceFile.fileName).replace(/\\/g, "/");
              module = relativePath.split("/")[0].includes("@")
                ? relativePath.split("/")[0] + "/" + relativePath.split("/")[1]
                : relativePath.split("/")[0];
            }

            const metadata = fs.readJsonSync(metadataFilePath);

            result.push(...Object.keys(metadata.metadata)
              .filter(key =>
                optional(() =>
                  metadata.metadata[key].decorators.some((item: any) => item.expression.name === "NgModule" && item.expression.module === "@angular/core")
                ) ||
                false
              )
              .map(key => {
                const decorator = metadata.metadata[key].decorators.single((item: any) => item.expression.name === "NgModule" && item.expression.module === "@angular/core");

                const exports: string[] = (optional(() => decorator.arguments[0].exports) || []).map((item: any) => item.name);

                const providerProperties = optional(() => decorator.arguments[0].providers) || [];

                // noinspection SuspiciousTypeOfGuard
                const providers: string[] = ((providerProperties instanceof Array) ? providerProperties : [providerProperties])
                  .map((item: any) => optional(() => item.name || /*item.provide.name ||*/ item.expression.name))
                  .filterExists();

                if (metadata.metadata[key].statics) {
                  providers.push(
                    ...Object.keys(metadata.metadata[key].statics)
                      .mapMany(key1 =>
                        ((optional(() => metadata.metadata[key].statics[key1].value.providers) as any[]) || [])
                          .map((item: any) => optional(() => item.name || /*item.provide.name ||*/ item.expression.name))
                          .filterExists()
                      )
                  );
                }

                const refProviders = providers.filter(item => item.startsWith("ɵ"));
                for (const refProvider of refProviders) {
                  try {
                    providers.push(
                      ...(metadata.metadata[refProvider] instanceof Array ? metadata.metadata[refProvider] : [metadata.metadata[refProvider]])
                        .map((item: any) => optional(() => item.name || /*item.provide.name ||*/ item.expression.name))
                        .filterExists()
                    );
                  }
                  catch (err) {
                    err.message = "[refProvider: " + refProvider + "] ==>\n" + err.message;
                    throw err;
                  }
                }
                providers.remove(refProviders);

                return {
                  module,
                  path: path.normalize(sourceFile.fileName),
                  name: key,
                  exports: exports.distinct(),
                  providers: providers.distinct()
                };
              })
            );
          }
        }
      }
      catch (err) {
        err.message = sourceFile.fileName + "==>\n" + err.message;
        throw err;
      }
    }

    return result;
  }

  public getNgComponentAndDirectives(): { module: string | undefined; path: string; name: string; selector: string; template: string | undefined }[] {
    const result: { module: string | undefined; path: string; name: string; selector: string; template: string | undefined }[] = [];

    const sourceFiles = this._program.getSourceFiles();
    for (const sourceFile of sourceFiles) {
      try {
        const imports = this.getImports(sourceFile.fileName);

        if (sourceFile.fileName.endsWith(".ts") && !sourceFile.fileName.endsWith(".d.ts")) {
          result.push(...this._getSourceNodes(sourceFile)
            .filter(node =>
              node.kind === ts.SyntaxKind.Decorator &&
              (node as ts.Decorator).expression.kind === ts.SyntaxKind.CallExpression
            )
            .map(node => (node as ts.Decorator).expression as ts.CallExpression)
            .filter(expr => {
              const identifier = expr.expression as ts.Identifier;
              const importInfo = imports.single(item => item.targets.includes(identifier.text));
              return (identifier.text === "Component" || identifier.text === "Directive") && importInfo && importInfo.module === "@angular/core";
            })
            .filter(expr => expr.arguments[0] && expr.arguments[0].kind === ts.SyntaxKind.ObjectLiteralExpression)
            .map(expr => {
              const args = expr.arguments[0] as ts.ObjectLiteralExpression;
              const classNode = this._getParentClassNode(expr)!;

              const selectorProperty = args.properties.filter(item => (item.name as ts.Identifier).text === "selector")[0] as ts.PropertyAssignment;
              const selector = (selectorProperty.initializer as ts.StringLiteral).text;

              const templateProperty = args.properties.filter(item => (item.name as ts.Identifier).text === "template")[0] as ts.PropertyAssignment;
              const template = (templateProperty.initializer as ts.StringLiteral).text;

              return {
                module: undefined,
                path: path.normalize(sourceFile.fileName),
                name: classNode.name!.text,
                selector,
                template
              };
            }));
        }
        else if (sourceFile.fileName.endsWith(".d.ts")) {
          const metadataFilePath = sourceFile.fileName.replace(/\.d\.ts$/, ".metadata.json");
          if (fs.pathExistsSync(metadataFilePath)) {
            const nodeModulesDirPath = path.resolve(process.cwd(), "node_modules");

            let module: string | undefined;
            if (path.normalize(sourceFile.fileName).startsWith(nodeModulesDirPath)) {
              const relativePath = path.relative(nodeModulesDirPath, sourceFile.fileName).replace(/\\/g, "/");
              module = relativePath.split("/")[0].includes("@")
                ? relativePath.split("/")[0] + "/" + relativePath.split("/")[1]
                : relativePath.split("/")[0];
            }

            const metadata = fs.readJsonSync(metadataFilePath);

            result.push(...Object.keys(metadata.metadata)
              .filter(key =>
                optional(() =>
                  metadata.metadata[key].decorators.some((item: any) => (item.expression.name === "Component" || item.expression.name === "Directive") && item.expression.module === "@angular/core")
                ) ||
                false
              )
              .map(key => {
                const decorator = metadata.metadata[key].decorators.single((item: any) => (item.expression.name === "Component" || item.expression.name === "Directive") && item.expression.module === "@angular/core");

                const selector = decorator.arguments[0].selector;
                const template = decorator.arguments[0].template;

                return {
                  module,
                  path: path.normalize(sourceFile.fileName),
                  name: key,
                  selector,
                  template
                };
              })
            );
          }
        }
      }
      catch (err) {
        err.message = sourceFile.fileName + "==>\n" + err.message;
        throw err;
      }
    }

    return result;
  }

  public getImports(filePath: string): { module: string; targets: string[] }[] {
    const sourceFile = this._program.getSourceFile(filePath)!;
    return this._getSourceNodes(sourceFile)
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

  private _getParentClassNode(node: ts.Node): ts.ClassDeclaration | undefined {
    if (ts.isClassDeclaration(node)) {
      return node;
    }

    return node.parent && this._getParentClassNode(node.parent);
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

  /*private _findNodes(node: ts.Node | undefined, kind: ts.SyntaxKind): ts.Node[] {
    if (!node) {
      return [];
    }

    const result: ts.Node[] = [];

    if (node.kind === kind) {
      result.push(node);
    }

    for (const child of node.getChildren()) {
      result.push(...this._findNodes(child, kind));
    }

    return result;
  }*/

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
              result.push(path.normalize(fileName));
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

      if (sourceFile["scssDependencies"]) {
        result.push(...(sourceFile["scssDependencies"] as string[]).filter(item => !result.includes(item)));
      }
    };

    doing(sourceFile);

    return result;
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
          this._isMyFile(fileInfo.filePath) &&
          fileInfo.dependencies &&
          fileInfo.dependencies.includes(filePath) &&
          !result.some(item1 => item1 === fileInfo.filePath)
        )
        .map(fileInfo => fileInfo.filePath);

      result.push(...currResult);
    }

    return result;
  }

  private _isMyFile(filePath: string): boolean {
    return filePath.endsWith(".ts") && path.normalize(filePath).startsWith(path.normalize(this.rootDirPath));
  }
}

interface ITsFileChangeInfo {
  type: TsFileChangeInfoType;
  filePath: string;
}

type TsFileChangeInfoType = FileChangeInfoType | "dependency" | "dependency-scss";
