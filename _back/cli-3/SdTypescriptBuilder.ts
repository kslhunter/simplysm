import * as ts from "typescript";
import {FileChangeInfoType, FileWatcher, IFileChangeInfo, optional} from "@simplysm/sd-core";
import * as fs from "fs-extra";
import * as path from "path";
import * as sass from "node-sass";
import * as tslint from "tslint";
import {MetadataCollector} from "@angular/compiler-cli";

export class SdTypescriptBuilder {
  private readonly _tsConfig: ts.ParsedCommandLine;
  private readonly _contextPath: string;
  private readonly _lsHost: ts.LanguageServiceHost;
  private readonly _ls: ts.LanguageService;

  public _fileInfos: IFileInfo[] = [];
  public readonly rootDir: string;
  public readonly outDir: string;

  public constructor(private readonly _tsConfigFilePath: string) {
    this._contextPath = path.dirname(this._tsConfigFilePath);
    this._tsConfig = ts.parseJsonConfigFileContent(fs.readJsonSync(this._tsConfigFilePath), ts.sys, this._contextPath);

    this._lsHost = {
      getScriptFileNames: () => {
        return this._fileInfos.map(item => item.filePath);
      },
      getScriptVersion: fileName => (optional(() => this._fileInfos.single(item => item.filePath === fileName)!.version) || 0).toString(),
      getScriptSnapshot: filePath => {
        if (!fs.existsSync(filePath)) {
          return undefined;
        }

        return ts.ScriptSnapshot.fromString(fs.readFileSync(filePath).toString());
      },
      getCurrentDirectory: () => this._contextPath,
      getCompilationSettings: () => this._tsConfig.options,
      getDefaultLibFileName: options => ts.getDefaultLibFilePath(options)
    };

    // console.log(ts.resolveModuleName("jsftp", path.resolve(this._contextPath, "src", "index.ts"), this._tsConfig.options, ts.sys));
    // console.log(ts.resolveTypeReferenceDirective("jsftp", path.resolve(this._contextPath, "src", "index.ts"), this._tsConfig.options, ts.sys).resolvedTypeReferenceDirective);

    this._ls = ts.createLanguageService(this._lsHost, ts.createDocumentRegistry(undefined, this._contextPath));

    this.rootDir = path.normalize(this._tsConfig.options.rootDir!);
    this.outDir = path.normalize(this._tsConfig.options.outDir!);

    this._updateFileInfos(this._tsConfig.fileNames.map(item => ({type: "add", filePath: path.normalize(item)})));
    if (this._tsConfigFilePath.includes("sd-angular")) {
      console.log(this._fileInfos);
    }
  }

  public async watch(callback: (changeInfos: ITsFileChangeInfo[]) => void): Promise<void> {
    const watchFiles = this._fileInfos.map(item => item.filePath);

    callback(
      this._fileInfos.filter(item => this._isMyFile(item.filePath)).map(item => ({
        type: "add",
        filePath: item.filePath
      }))
    );

    const watcher = await FileWatcher.watch(watchFiles, ["add", "change", "unlink"], async changeInfos => {
      watcher.close();

      this._updateFileInfos(changeInfos);

      const currentChangedInfos: ITsFileChangeInfo[] = [
        ...changeInfos.filter(item => this._fileInfos.some(item1 => item1.filePath === item.filePath)),
        ...this._getReverseDependencies(changeInfos.map(item => item.filePath).filter(item => !item.endsWith(".scss")))
          .map(item => ({type: "dependency", filePath: item} as ITsFileChangeInfo)),
        ...this._getReverseDependencies(changeInfos.map(item => item.filePath).filter(item => item.endsWith(".scss")))
          .map(item => ({type: "dependency-scss", filePath: item} as ITsFileChangeInfo))
      ];

      callback(currentChangedInfos);

      await this.watch(callback);
    });
  }

  public compile(fileName: string): string[] {
    const relativePath = path.relative(this.rootDir, fileName);
    const outPath = path.resolve(this.outDir, relativePath).replace(/\.ts$/, ".js");

    const sourceFile = this._ls.getProgram()!.getSourceFile(fileName);
    if (!sourceFile) {
      fs.removeSync(outPath);
      fs.removeSync(outPath + ".map");
      return [];
    }

    const diagnostics: ts.Diagnostic[] = [];
    const content = this._convertScssToCss(sourceFile);

    const result = ts.transpileModule(content, {
      fileName,
      compilerOptions: this._tsConfig.options,
      reportDiagnostics: false
    });

    if (result.diagnostics && result.diagnostics.length > 0) {
      diagnostics.pushRange(result.diagnostics);
    }

    fs.mkdirsSync(path.dirname(outPath));
    fs.writeFileSync(outPath, result.outputText);

    if (this._tsConfig.options.sourceMap && !this._tsConfig.options.inlineSourceMap) {
      fs.writeFileSync(outPath + ".map", result.sourceMapText);
    }

    return diagnostics.map(item => this._diagnosticToMessage(item)).filterExists().distinct();
  }

  public typeCheck(fileName: string): string[] {
    const program = this._ls.getProgram()!;
    const sourceFile = program.getSourceFile(fileName);
    if (!sourceFile) {
      return [];
    }

    return program.getSemanticDiagnostics(sourceFile).concat(program.getSyntacticDiagnostics(sourceFile))
      .map(item => this._diagnosticToMessage(item)).filterExists().distinct();
  }

  public emitDeclaration(fileName: string): string[] {
    const program = this._ls.getProgram()!;
    const sourceFile = program.getSourceFile(fileName);

    if (!sourceFile) {
      const relativePath = path.relative(this.rootDir, fileName);
      const outPath = path.resolve(this.outDir, relativePath).replace(/\.ts$/, ".d.ts");
      fs.removeSync(outPath);
      return [];
    }

    return program.getSemanticDiagnostics(sourceFile).concat(program.getSyntacticDiagnostics(sourceFile))
      .map(item => this._diagnosticToMessage(item)).filterExists().distinct();
  }

  public lint(fileNames: string[]): string[] {
    const program = this._ls.getProgram()!;
    const linter = new tslint.Linter({formatter: "json", fix: false}, program);
    const config = tslint.Configuration.findConfiguration(path.resolve(this._contextPath, "tslint.json")).results!;

    for (const fileName of fileNames) {
      const sourceFile = program.getSourceFile(fileName);
      if (!sourceFile) continue;

      linter.lint(sourceFile.fileName, sourceFile.getFullText(), config);
    }

    const failures = linter.getResult().failures;

    return failures.map(item => ({
      file: program.getSourceFile(item.getFileName()),
      start: item.getStartPosition().getPosition(),
      messageText: item.getFailure(),
      category: ts.DiagnosticCategory.Warning,
      code: 0,
      length: undefined,
      rule: item.getRuleName()
    })).map(item => this._diagnosticToMessage(item)).filterExists().distinct();
  }

  public generateMetadata(fileName: string): string[] {
    const relativePath = path.relative(this.rootDir, fileName);
    const outPath = path.resolve(this.outDir, relativePath).replace(/\.ts$/, ".metadata.json");

    const program = this._ls.getProgram()!;
    const sourceFile = program.getSourceFile(fileName);
    if (!sourceFile) {
      fs.removeSync(outPath);
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
      fs.mkdirsSync(path.dirname(outPath));
      fs.writeJsonSync(outPath, metadata);
    }

    return diagnostics.map(item => this._diagnosticToMessage(item)).filterExists().distinct();
  }

  public _convertScssToCss(sourceFile: ts.SourceFile): string {
    const scssRegex = /(scss\()?\/\* *language=SCSS *\*\/ *[`"'](((?!['"`]\)?[\],][,;]?[\r\n\\])(.|\r|\n))*)['"`]\)?/;

    let newContent = sourceFile.getFullText();
    const matches = newContent.match(new RegExp(scssRegex, "gi"));
    if (matches) {
      const results = matches.map(match => {
        try {
          return sass.renderSync({
            file: sourceFile.fileName,
            data: match.match(scssRegex)![2],
            sourceMapEmbed: false,
            outputStyle: "compressed"
          });
        }
        catch (err) {
          console.error(err, match.match(scssRegex)![2]);
          throw err;
        }
      });

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

    return newContent;
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

  private _updateFileInfos(changeInfos: IFileChangeInfo[]): void {
    for (const changeInfo of changeInfos) {
      const fileInfo = this._fileInfos.single(item => item.filePath === changeInfo.filePath);
      if (changeInfo.type === "unlink") {
        if (fileInfo) {
          this._fileInfos.remove(fileInfo);
        }
      }
      else {
        if (fileInfo) {
          fileInfo.version++;
          fileInfo.dependencies = this._getDependencies(changeInfo.filePath);
        }
        else {
          const newFileInfo: IFileInfo = {
            filePath: changeInfo.filePath,
            version: 0,
            dependencies: []
          };
          this._fileInfos.push(newFileInfo);

          newFileInfo.dependencies = this._getDependencies(changeInfo.filePath);
        }
      }
    }

    for (const changedFileInfo of this._fileInfos.filter(item => changeInfos.some(item1 => item1.filePath === item.filePath))) {
      for (const changedFileInfoDep of changedFileInfo.dependencies) {

        if (!this._fileInfos.some(item => item.filePath === changedFileInfoDep)) {
          this._updateFileInfos([{type: "add", filePath: changedFileInfoDep}]);
        }

        const changedFileInfoDepFileInfo = this._fileInfos.single(item => item.filePath === changedFileInfoDep)!;
        changedFileInfo.dependencies.push(...changedFileInfoDepFileInfo.dependencies.filter(item => !changedFileInfo.dependencies.includes(item)));
      }
    }
  }

  private _getDependencies(filePath: string): string[] {
    const result: string[] = [];
    if (filePath.endsWith(".scss")) {
      const scssDeps = this._getScssDependencies(filePath, fs.readFileSync(filePath).toString());
      for (const scssDep of scssDeps) {
        if (!result.includes(scssDep)) {
          result.push(scssDep);
        }
      }
    }
    else {
      const program = this._ls.getProgram()!;
      const sourceFile = program.getSourceFile(filePath)!;
      if (!sourceFile) {
        console.log(filePath, this._fileInfos);
      }

      const importNodes = this._collectDeepNodes<ts.ImportDeclaration | ts.ExportDeclaration>(sourceFile, [ts.SyntaxKind.ImportDeclaration, ts.SyntaxKind.ExportDeclaration]);
      for (const importNode of importNodes) {

        if (!importNode.moduleSpecifier) {
          continue;
        }

        const moduleName = (importNode.moduleSpecifier as ts.StringLiteral).text;

        let types = [];
        for (const typeRootDirName of this._tsConfig.options.typeRoots!) {
          types = types.concat(
            fs.readdirSync(typeRootDirName)
              .filter(dirName => fs.lstatSync(path.resolve(typeRootDirName, dirName)).isDirectory())
          );
        }

        const options = {
          ...this._tsConfig.options,
          types
        };

        const resolvedFileName = optional(() => program.getSourceFile(moduleName)!.fileName) ||
          optional(() => ts.resolveTypeReferenceDirective(moduleName, filePath, options, ts.sys).resolvedTypeReferenceDirective!.resolvedFileName) ||
          optional(() => ts.resolveTypeReferenceDirective(moduleName.split("/")[0], filePath, options, ts.sys).resolvedTypeReferenceDirective!.resolvedFileName) ||
          optional(() => ts.nodeModuleNameResolver(moduleName, filePath, options, ts.sys).resolvedModule!.resolvedFileName) ||
          optional(() => ts.resolveModuleName(moduleName, filePath, options, ts.sys).resolvedModule!.resolvedFileName);

        if (moduleName === "url") {
          console.log(ts.nodeModuleNameResolver(moduleName, filePath, options, ts.sys));
        }

        if (resolvedFileName && !result.includes(resolvedFileName)) {
          result.push(resolvedFileName);
        }
      }

      const scssRegex = /(scss\()?\/\* *language=SCSS *\*\/ *[`"'](((?!['"`]\)?[\],][,;]?[\r\n\\])(.|\r|\n))*)['"`]\)?/;
      const matches = sourceFile.getFullText().match(new RegExp(scssRegex, "gi"));
      if (matches) {
        for (const match of matches) {
          const scssDeps = this._getScssDependencies(filePath, match);
          for (const scssDep of scssDeps) {
            if (!result.includes(scssDep)) {
              result.push(scssDep);
            }
          }
        }
      }
    }

    return result;
  }

  private _getScssDependencies(fileName: string, content: string): string[] {
    const result: string[] = [];

    const regex = /@import "(.*)";/;
    const matches = content.match(new RegExp(regex, "gi"));
    if (matches) {
      for (const match of matches) {
        const importFilePath = path.resolve(path.dirname(fileName), match.match(regex)![1]);

        if (fs.pathExistsSync(importFilePath)) {
          if (!result.includes(importFilePath)) {
            result.push(importFilePath);
          }
        }
        else if (fs.pathExistsSync(importFilePath + ".scss")) {
          if (!result.includes(importFilePath + ".scss")) {
            result.push(importFilePath + ".scss");
          }
        }
        else if (fs.pathExistsSync("_" + importFilePath + ".scss")) {
          if (!result.includes("_" + importFilePath + ".scss")) {
            result.push("_" + importFilePath + ".scss");
          }
        }
      }
    }

    return result;
  }

  private _collectDeepNodes<T extends ts.Node>(node: ts.Node, kind: ts.SyntaxKind[]): T[] {
    const kinds = Array.isArray(kind) ? kind : [kind];
    const nodes: T[] = [];
    const helper = (child: ts.Node) => {
      if (kinds.includes(child.kind)) {
        nodes.push(child as T);
      }
      ts.forEachChild(child, helper);
    };
    ts.forEachChild(node, helper);

    return nodes;
  }

  private _getReverseDependencies(filePaths: string[]): string[] {
    const result: string[] = Object.clone(filePaths);

    const doing = (currFilePath: string) => {
      const currResult = this._fileInfos
        .filter(item => item.dependencies.includes(currFilePath) && !result.some(item1 => item1 === item.filePath))
        .map(item => item.filePath);

      result.push(...currResult);

      for (const item of currResult) {
        doing(item);
      }
    };

    for (const filePath of filePaths) {
      doing(filePath);
    }

    return result
      .filter(item => !filePaths.includes(item))
      .filter(item => this._fileInfos.some(item1 => item1.filePath === item));
  }

  private _isMyFile(filePath: string): boolean {
    return filePath.endsWith(".ts") && path.normalize(filePath).startsWith(path.normalize(this.rootDir));
  }
}

interface IFileInfo {
  filePath: string;
  version: number;
  dependencies: string[];
}

interface ITsFileChangeInfo {
  type: TsFileChangeInfoType;
  filePath: string;
}

type TsFileChangeInfoType = FileChangeInfoType | "dependency" | "dependency-scss";
