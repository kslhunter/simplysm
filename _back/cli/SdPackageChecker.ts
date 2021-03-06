import * as ts from "typescript";
import * as events from "events";
import * as path from "path";
import * as os from "os";
import {SdCliUtil} from "../commons/SdCliUtil";
import {SdCompilerHostFactory} from "../compiler/SdCompilerHostFactory";
import * as tslint from "tslint";
import * as fs from "fs-extra";
import {MetadataCollector, ModuleMetadata} from "@angular/compiler-cli";
import {MetadataBundler} from "@angular/compiler-cli/src/metadata/bundler";

export class SdPackageChecker extends events.EventEmitter {
  private readonly _contextPath: string;
  private readonly _tsConfigPath: string;
  private readonly _tsLintConfigPath: string;

  private _npmConfig_: any;

  private get _npmConfig(): any {
    if (!this._npmConfig_) {
      this._npmConfig_ = fs.readJsonSync(path.resolve(this._contextPath, "package.json"));
    }
    return this._npmConfig_;
  }

  private _tsConfig_: any;

  private get _tsConfig(): any {
    if (!this._tsConfig_) {
      this._tsConfig_ = fs.readJsonSync(this._tsConfigPath);
    }
    return this._tsConfig_;
  }

  private _tsLintConfig_?: tslint.Configuration.IConfigurationFile;

  private get _tsLintConfig(): tslint.Configuration.IConfigurationFile {
    if (!this._tsLintConfig_) {
      this._tsLintConfig_ = tslint.Configuration.findConfiguration(this._tsLintConfigPath).results!;
    }
    return this._tsLintConfig_;
  }

  private _parsedTsConfig_?: ts.ParsedCommandLine;

  private get _parsedTsConfig(): ts.ParsedCommandLine {
    if (!this._parsedTsConfig_) {
      this._parsedTsConfig_ = ts.parseJsonConfigFileContent(this._tsConfig, ts.sys, this._contextPath);
    }
    return this._parsedTsConfig_;
  }

  private _distPath_?: string;

  private get _distPath(): string {
    if (!this._distPath_) {
      this._distPath_ = this._parsedTsConfig.options.outDir ? path.resolve(this._parsedTsConfig.options.outDir) : path.resolve(this._contextPath, "dist");
    }
    return this._distPath_;
  }

  public constructor(private readonly _packageKey: string,
                     private readonly _options?: string[]) {
    super();

    this._contextPath = path.resolve(process.cwd(), "packages", this._packageKey);
    this._tsConfigPath = path.resolve(this._contextPath, "tsconfig.build.json");
    this._tsLintConfigPath = path.resolve(this._contextPath, "tslint.json");
  }

  public async runAsync(): Promise<void> {
    this.emit("run");

    const projectConfig = await SdCliUtil.getConfigObjAsync("production", this._options);
    const config = projectConfig.packages[this._packageKey];

    const options = {
      ...this._parsedTsConfig.options,
      outDir: this._distPath,
      sourceMap: false,
      noEmit: !this._parsedTsConfig.options.declaration,
      emitDeclarationOnly: this._parsedTsConfig.options.declaration
    };


    const host = SdCompilerHostFactory.createCompilerHost(options);

    const program = ts.createProgram(
      this._parsedTsConfig.fileNames,
      options,
      host
    );

    let diagnostics = this._parsedTsConfig.options.declaration
      ? ts.getPreEmitDiagnostics(program)
      : program.getSemanticDiagnostics();

    if (config.framework === "angular" && config.type === "library") {
      diagnostics = diagnostics.concat(
        this._emitMetadata(this._npmConfig.name, this._parsedTsConfig.fileNames[0], this._distPath)
      );
    }

    if (this._parsedTsConfig.options.declaration) {
      diagnostics = diagnostics.concat(program.emit(undefined, undefined, undefined, true).diagnostics);
    }
    else {
      diagnostics = diagnostics.concat(program.getSyntacticDiagnostics());
    }

    const messages: string[] = [];
    for (const diagnostic of diagnostics) {
      const message = this._diagnosticToMessage(diagnostic);
      if (message) {
        messages.push(message);
      }
    }

    if (messages.length > 0) {
      this.emit("error", messages.distinct().join(os.EOL));
    }

    const lintMessages = await this._lintAsync(program);
    if (lintMessages.length > 0) {
      this.emit("error", lintMessages.distinct().join(os.EOL));
    }

    this.emit("done");
  }

  public async watchAsync(): Promise<void> {
    const projectConfig = await SdCliUtil.getConfigObjAsync("development", this._options);
    const config = projectConfig.packages[this._packageKey];

    const options = {
      ...this._parsedTsConfig.options,
      outDir: this._distPath,
      sourceMap: false,
      noEmit: !this._parsedTsConfig.options.declaration,
      emitDeclarationOnly: this._parsedTsConfig.options.declaration
    };

    let watchProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram;
    let lintFilePaths: string[] = [];
    let messages: string[] = [];
    const host = SdCompilerHostFactory.createWatchCompilerHost(
      config.framework === "vue",
      this._parsedTsConfig.fileNames,
      options,
      this._contextPath,
      () => {
        this.emit("run");
        messages = [];
        lintFilePaths = [];
      },
      diagnostic => {
        const message = this._diagnosticToMessage(diagnostic);
        if (message) {
          messages.push(message);
        }
      },
      async () => {
        if (messages.length > 0) {
          this.emit("error", messages.join(os.EOL));
        }

        if (config.framework === "angular" && config.type === "library") {
          const emitMetadataResult = this._emitMetadata(this._npmConfig.name, this._parsedTsConfig.fileNames[0], this._distPath);
          const emitMetadataMessages = emitMetadataResult.map(item => this._diagnosticToMessage(item)).filterExists().distinct();

          if (emitMetadataMessages.length > 0) {
            this.emit("warning", emitMetadataMessages.join(os.EOL));
          }
        }

        const lintMessages1 = await this._lintAsync(watchProgram.getProgram(), lintFilePaths.distinct());
        if (lintMessages1.length > 0) {
          this.emit("warning", lintMessages1.join(os.EOL));
        }

        this.emit("done");
      },
      (filePath, content) => {
        if (content && !lintFilePaths.includes(filePath)) {
          lintFilePaths.push(filePath);
        }
      }
    );

    const prevAfterProgramCreate = host.afterProgramCreate;
    host.afterProgramCreate = program => {
      watchProgram = program;

      if (prevAfterProgramCreate) {
        prevAfterProgramCreate(program);
      }
    };

    ts.createWatchProgram(host);
  }

  private _diagnosticToMessage(diagnostic: ts.Diagnostic): string | undefined {
    if (diagnostic.file) {
      if (diagnostic.file.fileName.startsWith(this._contextPath.replace(/\\/g, "/"))) {
        const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
        const tsMessage = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        return `${diagnostic.file.fileName}(${position.line + 1},${position.character + 1}): error: ${tsMessage}`;
      }
    }
    else {
      return `error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`;
    }
  }

  private async _lintAsync(program: ts.Program, filePaths?: string[]): Promise<string[]> {
    const linter = new tslint.Linter({formatter: "json", fix: false}, program);

    const sourceFiles = (filePaths ? filePaths : tslint.Linter.getFileNames(program))
      .filter(item => path.resolve(item).startsWith(path.resolve(this._contextPath, "src")))
      .map(item => program.getSourceFile(item))
      .filterExists();

    const messages: string[] = [];
    for (const sourceFile of sourceFiles) {
      linter.lint(sourceFile.fileName, sourceFile.getFullText(), this._tsLintConfig);
    }

    messages.pushRange(linter.getResult().failures.map(item => this._lintFailureToMessage(item)));
    return messages.distinct();
  }

  private _lintFailureToMessage(failure: tslint.RuleFailure): string {
    const severity = failure.getRuleSeverity();
    const message = failure.getFailure();
    const rule = failure.getRuleName();
    const fileName = failure.getFileName();
    const lineNumber = failure.getStartPosition().getLineAndCharacter().line + 1;
    const charNumber = failure.getStartPosition().getLineAndCharacter().character + 1;

    return `${fileName}(${lineNumber},${charNumber}): ${severity}: ${message} (${rule})`;
  }

  private _emitMetadata(packageName: string, rootFilePath: string, distPath: string): ts.Diagnostic[] {
    const result: ts.Diagnostic[] = [];

    const metadataCollector = new MetadataCollector();
    const metadataBundler = new MetadataBundler(
      rootFilePath.replace(/\.ts$/, ""),
      packageName,
      {
        getMetadataFor: (moduleName: string): ModuleMetadata | undefined => {
          const sourceText = fs.readFileSync(moduleName + ".ts").toString();
          const sourceFile = ts.createSourceFile(moduleName + ".ts", sourceText, ts.ScriptTarget.Latest);
          return metadataCollector.getMetadata(sourceFile, false, (value, tsNode) => {
            if (value && value["__symbolic"] && value["__symbolic"] === "error") {
              result.push({
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
    );

    fs.mkdirsSync(distPath);
    fs.writeJsonSync(path.resolve(distPath, path.basename(rootFilePath, path.extname(rootFilePath)) + ".metadata.json"), metadataBundler.getMetadataBundle().metadata);

    return result;
  }
}
