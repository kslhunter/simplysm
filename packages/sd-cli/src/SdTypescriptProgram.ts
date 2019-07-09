import * as ts from "typescript";
import * as fs from "fs-extra";
import * as path from "path";
import * as sass from "node-sass";
import * as glob from "glob";
import * as os from "os";
import * as tslint from "tslint";
import {FileChangeInfoType, FileWatcher, IFileChangeInfo, optional} from "@simplysm/sd-core";
import {MetadataCollector} from "@angular/compiler-cli";

export class SdTypescriptProgram {
  private readonly _fileInfoMap = new Map<string, {
    version: number;
    invalid: boolean;
    sourceFile: ts.SourceFile;
    text: string;
    embeddedDependencies: string[];
    output: {
      transpile: {
        js: string;
        map: string;
        messages: string[];
        invalid: boolean;
      };
      emitDeclaration: {
        declaration: string;
        invalid: boolean;
      };
      lint: {
        messages: string[];
        invalid: boolean;
      };
      emitMetadata: {
        metadata: string;
        messages: string[];
        invalid: boolean;
      };
      getDependencies: {
        dependencies: string[];
        invalid: boolean;
      };
    };
    syncVersions: {
      getSourceFile: number;
      transpile: number;
      emitDeclaration: number;
      lint: number;
      emitMetadata: number;
      getDependencies: number;
    };
  }>();

  private _compilerOptions!: ts.CompilerOptions;

  public rootDirPath!: string;
  public outDirPath!: string;

  private _host!: ts.CompilerHost;
  private _program!: ts.Program;

  public constructor(private readonly _tsConfigFilePath: string,
                     private readonly _options: { replaceScssToCss?: boolean }) {
    this._reloadCompilerOptions();
    this._reloadCompilerHost();
    this._reloadProgram();
  }

  public async watch(callback: (changeInfos: IFileChangeInfo[]) => void, options: { withBeImportedFiles?: boolean; millisecond?: number }): Promise<void> {
    // Watch 경로 설정
    let watchPaths = [path.resolve(this.rootDirPath, "**", "*.ts")];

    if (this._options.replaceScssToCss) {
      watchPaths.push(...Array.from(this._fileInfoMap.entries()).mapMany(entry => entry[1].embeddedDependencies));
    }

    if (options.withBeImportedFiles) {
      watchPaths.push(...this._getMyTypescriptFiles().mapMany(item => this._getDependencies(item)));
    }

    const watcher = await FileWatcher.watch(watchPaths.distinct(), ["add", "change", "unlink"], fileChangeInfos => {
      const myTypescriptFiles = this._getMyTypescriptFiles();
      const fileInfoEntries = Array.from(this._fileInfoMap.entries());

      // 내 소스만 포함
      let reloadedFileChangeInfos = fileChangeInfos.filter(item => myTypescriptFiles.includes(item.filePath));

      if (this._options.replaceScssToCss) {
        // 임베디드파일의 임베드한 소스들 추가 포함
        if (reloadedFileChangeInfos.length !== fileChangeInfos.length) {
          for (const fileChangeInfo of fileChangeInfos.filter(item => !myTypescriptFiles.includes(item.filePath))) {
            const embeddingFileInfoEntries = fileInfoEntries.filter(entry => entry[1].embeddedDependencies.includes(fileChangeInfo.filePath));
            const embeddingFilePaths = embeddingFileInfoEntries.map(entry => entry[0]);
            for (const embeddingFilePath of embeddingFilePaths) {
              if (reloadedFileChangeInfos.some(item => item.filePath === embeddingFilePath)) {
                continue;
              }

              reloadedFileChangeInfos.push({
                filePath: embeddingFilePath,
                type: "change"
              });
            }
          }
        }
      }
      else {
        // 모든변경파일 포함
        reloadedFileChangeInfos = fileChangeInfos;
      }

      // 변경된 파일을 사용(import)하고있는 내 소스 파일들을 모두 추가 포함
      if (options.withBeImportedFiles) {
        for (const fileChangeInfo of fileChangeInfos) {
          const beImportedFileInfoEntries = fileInfoEntries.filter(entry => this._getDependencies(entry[0]).includes(fileChangeInfo.filePath));

          const beImportedFilePaths = beImportedFileInfoEntries.map(entry => entry[0]);
          for (const beImportedFilePath of beImportedFilePaths) {
            if (reloadedFileChangeInfos.some(item => item.filePath === beImportedFilePath)) {
              continue;
            }

            reloadedFileChangeInfos.push({
              filePath: beImportedFilePath,
              type: "change"
            });
          }
        }
      }

      // 변경파일은 아니지만, 이전에 오류났던 소스들 추가 포함
      reloadedFileChangeInfos.push(
        ...fileInfoEntries
          .filter(entry => !reloadedFileChangeInfos.some(item => item.filePath === entry[0]))
          .filter(entry =>
            entry[1].invalid ||
            entry[1].output.transpile.invalid ||
            entry[1].output.emitDeclaration.invalid ||
            entry[1].output.lint.invalid ||
            entry[1].output.emitMetadata.invalid
          )
          .map(entry => ({
            filePath: entry[0],
            type: "change" as FileChangeInfoType
          }))
      );

      // 파일정보 맵의 버전정보 변경
      for (const reloadedFileChangeInfo of reloadedFileChangeInfos) {
        if (reloadedFileChangeInfo.type === "unlink") {
          this._fileInfoMap.delete(reloadedFileChangeInfo.filePath);
        }
        else if (this._fileInfoMap.has(reloadedFileChangeInfo.filePath)) {
          this._fileInfoMap.get(reloadedFileChangeInfo.filePath)!.version++;
        }
      }

      // 프로그램 다시 로드
      this._reloadProgram();

      // 콜백수행 (사용자 코드 수행)
      callback(reloadedFileChangeInfos);

      // Watch 경로 재설정
      watcher.unwatch(watchPaths);

      watchPaths = [path.resolve(this.rootDirPath, "**", "*.ts")];
      if (this._options.replaceScssToCss) {
        watchPaths.push(...Array.from(this._fileInfoMap.entries()).mapMany(entry => entry[1].embeddedDependencies));
      }

      if (options.withBeImportedFiles) {
        watchPaths.push(...this._getMyTypescriptFiles().mapMany(item => this._getDependencies(item)));
      }

      watcher.add(watchPaths.distinct());
    }, options.millisecond);
  }

  public transpile(filePaths: string[] = this._getMyTypescriptFiles()): string[] {
    const result: string[] = [];
    for (const filePath of filePaths.distinct()) {
      const fileInfo = this._fileInfoMap.get(path.normalize(filePath));

      const relativePath = path.relative(this.rootDirPath, filePath);
      const outJsFilePath = path.resolve(this.outDirPath, relativePath).replace(/\.ts$/, ".js");
      const outMapFilePath = outJsFilePath + ".map";

      if (!fileInfo) {
        fs.removeSync(outJsFilePath);
        fs.removeSync(outMapFilePath);
        continue;
      }

      if (fileInfo.syncVersions.transpile !== fileInfo.version) {
        const transpileResult = ts.transpileModule(fileInfo.text, {
          fileName: filePath,
          compilerOptions: this._compilerOptions,
          reportDiagnostics: false
        });

        if (!transpileResult.outputText) {
          fs.removeSync(outJsFilePath);
          fileInfo.output.transpile.js = "";
        }
        else if (transpileResult.outputText !== fileInfo.output.transpile.js) {
          this._writeFile(outJsFilePath, transpileResult.outputText);
          fileInfo.output.transpile.js = transpileResult.outputText;
        }

        if (!transpileResult.sourceMapText) {
          fs.removeSync(outMapFilePath);
          fileInfo.output.transpile.map = "";
        }
        else if (transpileResult.sourceMapText && transpileResult.sourceMapText !== fileInfo.output.transpile.map) {
          this._writeFile(outMapFilePath, transpileResult.sourceMapText);
          fileInfo.output.transpile.map = transpileResult.sourceMapText;
        }

        fileInfo.output.transpile.messages = transpileResult.diagnostics
          ? this._diagnosticsToMessages(transpileResult.diagnostics)
          : [];

        fileInfo.syncVersions.transpile = fileInfo.version;
      }

      fileInfo.output.transpile.invalid = fileInfo.output.transpile.messages.length > 0;
      result.push(...fileInfo.output.transpile.messages);
    }

    return result.distinct();
  }

  public emitDeclaration(filePaths: string[] = this._getMyTypescriptFiles()): string[] {
    const result: string[] = [];
    for (const filePath of filePaths.distinct()) {
      const fileInfo = this._fileInfoMap.get(path.normalize(filePath));

      const relativePath = path.relative(this.rootDirPath, filePath);
      const outFilePath = path.resolve(this.outDirPath, relativePath).replace(/\.ts$/, ".d.ts");

      if (!fileInfo) {
        fs.removeSync(outFilePath);
        continue;
      }

      if (!this._compilerOptions.declaration || fileInfo.syncVersions.emitDeclaration === fileInfo.version) {
        // NOTE: 파일이 변경되지 않았더라도, 타입체크는 해야함. (다른 파일의 변경에 따른 오류발생 가능성이 있음)
        result.push(...this._diagnosticsToMessages(
          this._program.getSemanticDiagnostics(fileInfo.sourceFile).concat(this._program.getSyntacticDiagnostics(fileInfo.sourceFile))
        ));
      }
      else {
        const preEmitDiagnostics = ts.getPreEmitDiagnostics(this._program, fileInfo.sourceFile);

        let declarationText = "";
        const emitResult = this._program.emit(
          fileInfo.sourceFile,
          (emitFilePath, data) => {
            declarationText = data;
          },
          undefined,
          true
        );

        if (emitResult.emitSkipped) {
          fs.removeSync(outFilePath);
          fileInfo.output.emitDeclaration.declaration = "";
        }
        else if (fileInfo.output.emitDeclaration.declaration !== declarationText) {
          this._writeFile(outFilePath, declarationText);
          fileInfo.output.emitDeclaration.declaration = declarationText;
        }

        fileInfo.syncVersions.emitDeclaration = fileInfo.version;

        const messages = this._diagnosticsToMessages(preEmitDiagnostics.concat(emitResult.diagnostics));
        fileInfo.output.emitDeclaration.invalid = messages.length > 0;
        result.push(...messages);
      }
    }
    return result.distinct();
  }

  public lint(filePaths: string[] = this._getMyTypescriptFiles()): string[] {
    const lintConfigPath = path.resolve(path.dirname(this._tsConfigFilePath), "tslint.json");
    const config = tslint.Configuration.findConfiguration(path.resolve(path.dirname(this._tsConfigFilePath), "tslint.json")).results;
    if (!config) {
      throw new Error("'" + lintConfigPath + "'파일을 찾을 수 없습니다.");
    }

    const linter = new tslint.Linter({formatter: "json", fix: false}, this._program);

    const result: string[] = [];
    for (const filePath of filePaths.distinct()) {
      const fileInfo = this._fileInfoMap.get(path.normalize(filePath));
      if (!fileInfo) {
        continue;
      }

      if (fileInfo.syncVersions.lint !== fileInfo.version) {
        linter.lint(filePath, fileInfo.text, config);
      }
    }

    const failures = linter.getResult().failures;

    const failureDiagnostics = failures.map(item => ({
      file: optional(() => this._fileInfoMap.get(path.normalize(item.getFileName()))!.sourceFile),
      start: item.getStartPosition().getPosition(),
      messageText: item.getFailure(),
      category: ts.DiagnosticCategory.Warning,
      code: 0,
      length: undefined,
      rule: item.getRuleName()
    }));

    for (const filePath of filePaths.distinct()) {
      const fileInfo = this._fileInfoMap.get(path.normalize(filePath));
      if (!fileInfo) {
        continue;
      }

      if (fileInfo.syncVersions.lint !== fileInfo.version) {
        fileInfo.output.lint.messages = this._diagnosticsToMessages(
          failureDiagnostics.filter(item => item.file && path.normalize(item.file.fileName) === path.normalize(filePath))
        );

        fileInfo.syncVersions.lint = fileInfo.version;

        fileInfo.output.lint.invalid = fileInfo.output.lint.messages.length > 0;
      }

      result.push(...fileInfo.output.lint.messages);
    }

    return result.distinct();
  }

  public emitMetadata(filePaths: string[] = this._getMyTypescriptFiles()): string[] {
    const result: string[] = [];
    for (const filePath of filePaths.distinct()) {
      const fileInfo = this._fileInfoMap.get(path.normalize(filePath));

      const relativePath = path.relative(this.rootDirPath, filePath);
      const outFilePath = path.resolve(this.outDirPath, relativePath).replace(/\.ts$/, ".metadata.json");

      if (!fileInfo) {
        fs.removeSync(outFilePath);
        continue;
      }

      if (fileInfo.syncVersions.emitMetadata !== fileInfo.version) {
        const diagnostics: ts.Diagnostic[] = [];

        const metadata = new MetadataCollector().getMetadata(
          fileInfo.sourceFile,
          false,
          (value, tsNode) => {
            if (value && value["__symbolic"] && value["__symbolic"] === "error") {
              diagnostics.push({
                file: fileInfo.sourceFile,
                start: tsNode.parent ? tsNode.getStart() : tsNode.pos,
                messageText: value["message"],
                category: ts.DiagnosticCategory.Error,
                code: 0,
                length: undefined
              });
            }

            return value;
          }
        );

        if (diagnostics.length > 0) {
          fs.removeSync(outFilePath);
          fileInfo.output.emitMetadata.metadata = "";
        }
        else {
          const metadataJsonString = JSON.stringify(metadata);
          this._writeFile(outFilePath, metadataJsonString);
          fileInfo.output.emitMetadata.metadata = metadataJsonString;
        }

        fileInfo.output.emitMetadata.messages = this._diagnosticsToMessages(diagnostics);

        fileInfo.syncVersions.emitMetadata = fileInfo.version;

        fileInfo.output.emitMetadata.invalid = fileInfo.output.emitMetadata.messages.length > 0;
      }

      result.push(...fileInfo.output.emitMetadata.messages);
    }

    return result.distinct();
  }

  private _getDependencies(filePath: string): string[] {
    const result: string[] = [];
    let invalid = false;

    const doing = (currFilePath: string) => {
      const currFileInfo = this._fileInfoMap.get(currFilePath);
      if (!currFileInfo || !currFileInfo.sourceFile["imports"]) {
        return [];
      }

      if (currFileInfo.syncVersions.getDependencies !== currFileInfo.version) {
        const checker = this._program.getTypeChecker();

        for (const importNode of currFileInfo.sourceFile["imports"]) {

          const symbol = checker.getSymbolAtLocation(importNode);

          if (!symbol || !symbol.declarations) {
            continue;
          }

          for (const decl of symbol.declarations) {
            let node = decl as ts.Node;
            while (node && node.kind !== ts.SyntaxKind.SourceFile) {
              node = node.parent;
            }

            if (!node) {
              console.error(new Error(`'${symbol.name}'소스코드를 찾을 수 없습니다.`));
              invalid = true;
            }

            const beImportedFilePath = path.normalize((node as ts.SourceFile).fileName);

            if (!result.includes(beImportedFilePath) && beImportedFilePath !== filePath) {
              result.push(beImportedFilePath);
              doing(beImportedFilePath);
            }
          }
        }
      }
      else {
        result.push(...currFileInfo.output.getDependencies.dependencies);
      }
    };

    const fileInfo = this._fileInfoMap.get(filePath);
    if (!fileInfo) {
      return [];
    }

    if (fileInfo.syncVersions.getDependencies !== fileInfo.version) {
      doing(filePath);

      fileInfo.output.getDependencies.dependencies = result.distinct();
      fileInfo.syncVersions.getDependencies = fileInfo.version;
      fileInfo.output.getDependencies.invalid = invalid;
    }

    return fileInfo.output.getDependencies.dependencies;
  }

  private _diagnosticsToMessages(diagnostics: ts.Diagnostic[]): string[] {
    const result: string[] = [];

    for (const diagnostic of diagnostics) {
      let message = "";
      if (diagnostic.file) {
        message += diagnostic.file.fileName;

        if (diagnostic.start) {
          const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
          message += `(${position.line + 1},${position.character + 1})`;
        }

        message += ": ";
      }

      message += diagnostic.category.toString().toLowerCase() + ": ";

      message += ts.flattenDiagnosticMessageText(diagnostic.messageText, os.EOL);

      if (diagnostic["rule"]) {
        message += `(${diagnostic["rule"]})`;
      }


      result.push(message);
    }

    return result.distinct();
  }

  private _reloadCompilerOptions(): void {
    if (!fs.pathExistsSync(this._tsConfigFilePath)) {
      throw new Error("'" + this._tsConfigFilePath + "'파일을 찾을 수 없습니다.");
    }

    const tsConfigContents = fs.readFileSync(this._tsConfigFilePath, "utf-8");

    const tsConfig = JSON.parse(tsConfigContents);
    const contextPath = path.dirname(this._tsConfigFilePath);
    const parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig, ts.sys, contextPath);
    this._compilerOptions = parsedTsConfig.options;
    this.rootDirPath = parsedTsConfig.options.rootDir || path.resolve(contextPath, "src");
    this.outDirPath = parsedTsConfig.options.outDir || path.resolve(contextPath, "dist");
  }

  private _reloadCompilerHost(): void {
    this._host = ts.createCompilerHost(this._compilerOptions);

    this._host.getSourceFile = (filePath, languageVersion) => {
      let fileInfo = this._fileInfoMap.get(path.normalize(filePath));

      if (!fileInfo || fileInfo.version !== fileInfo.syncVersions.getSourceFile || fileInfo.invalid) {
        let content = this._host.readFile(filePath);
        if (!content) {
          return undefined;
        }

        let invalid = false;
        let embeddedDependencies: string[] = [];
        if (this._options.replaceScssToCss) {
          if (filePath.endsWith("\.ts") && !filePath.endsWith("\.d\.ts")) {
            try {
              const converted = this._replaceScssToCss(filePath, content);
              content = converted.content;
              embeddedDependencies = converted.dependencies.map(item => path.normalize(item));
            }
            catch (err) {
              console.error(err);
              invalid = true;
            }
          }
        }

        const sourceFile = ts.createSourceFile(filePath, content, languageVersion);

        // 첫 생성된 파일일때
        if (!fileInfo) {
          fileInfo = {
            version: 1,
            invalid,
            text: content,
            sourceFile,
            embeddedDependencies,
            output: {
              transpile: {
                js: "",
                map: "",
                messages: [],
                invalid: false
              },
              emitDeclaration: {
                declaration: "",
                invalid: false
              },
              lint: {
                messages: [],
                invalid: false
              },
              emitMetadata: {
                metadata: "",
                messages: [],
                invalid: false
              },
              getDependencies: {
                dependencies: [],
                invalid: false
              }
            },
            syncVersions: {
              getSourceFile: 1,
              transpile: 0,
              emitDeclaration: 0,
              lint: 0,
              emitMetadata: 0,
              getDependencies: 0
            }
          };

          this._fileInfoMap.set(path.normalize(filePath), fileInfo);
        }
        // 현재파일과 버전이 다를때
        else {
          fileInfo.invalid = invalid;
          fileInfo.text = content;
          fileInfo.sourceFile = sourceFile;
          fileInfo.embeddedDependencies = embeddedDependencies;
          fileInfo.syncVersions.getSourceFile = fileInfo.version;
        }
      }

      return fileInfo.sourceFile;
    };
  }

  private _reloadProgram(): void {
    const myTypescriptFiles = this._getMyTypescriptFiles();
    this._program = ts.createProgram(
      myTypescriptFiles,
      this._compilerOptions,
      this._host,
      this._program
    );
  }

  private _replaceScssToCss(filePath: string, content: string): { content: string; dependencies: string[] } {
    const scssRegex = /(scss\()?\/\* *language=SCSS *\*\/ *[`"'](((?!['"`]\)?[\],][,;]?[\r\n\\])(.|\r|\n))*)['"`]\)?/;
    const matches = content.match(new RegExp(scssRegex, "gi"));
    if (!matches) {
      return {content, dependencies: []};
    }

    const results = matches.map(match => sass.renderSync({
      file: filePath,
      data: match.match(scssRegex)![2],
      sourceMapEmbed: false,
      sourceMap: false,
      outputStyle: "compact"
    }));

    const deps = results.mapMany(result => result.stats.includedFiles).map(item => path.normalize(item));

    let i = 0;
    const newContent = content.replace(new RegExp(scssRegex, "gi"), () => {
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

    return {content: newContent, dependencies: deps};
  }

  private _getMyTypescriptFiles(): string[] {
    return glob.sync(path.resolve(this.rootDirPath, "**", "*.ts")).map(item => path.normalize(item));
  }

  private _writeFile(filePath: string, content: string): void {
    fs.mkdirsSync(path.dirname(filePath));
    fs.writeFileSync(filePath, content, {encoding: "utf-8"});
  }
}
