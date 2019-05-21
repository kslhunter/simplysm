import * as ts from "typescript";
import * as events from "events";
import * as path from "path";
import * as fs from "fs-extra";
import * as os from "os";

export class SdPackageChecker extends events.EventEmitter {
  private readonly _contextPath: string;
  private readonly _tsConfig: any;
  private readonly _parsedTsConfig: ts.ParsedCommandLine;
  private readonly _distPath: string;

  public constructor(private readonly _packageKey: string) {
    super();

    this._contextPath = path.resolve(process.cwd(), "packages", this._packageKey);
    this._tsConfig = fs.readJsonSync(path.resolve(this._contextPath, "tsconfig.build.json"));
    this._parsedTsConfig = ts.parseJsonConfigFileContent(this._tsConfig, ts.sys, this._contextPath);
    this._distPath = this._parsedTsConfig.options.outDir ? path.resolve(this._parsedTsConfig.options.outDir) : path.resolve(this._contextPath, "dist");
  }

  public async runAsync(): Promise<void> {
    if (!this._tsConfig.files || this._tsConfig.files.length < 1) {
      throw new Error("'tsconfig'에 'files'옵션을 반드시 등록해야 합니다.");
    }

    this.emit("run");

    const host = ts.createCompilerHost(this._parsedTsConfig.options);

    const program = ts.createProgram(
      this._parsedTsConfig.fileNames,
      {
        ...this._parsedTsConfig.options,
        outDir: this._distPath,
        sourceMap: false,
        noEmit: !this._parsedTsConfig.options.declaration,
        emitDeclarationOnly: this._parsedTsConfig.options.declaration
      },
      host
    );

    let diagnostics = this._parsedTsConfig.options.declaration
      ? ts.getPreEmitDiagnostics(program)
      : program.getSemanticDiagnostics();

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
      this.emit("error", messages.join(os.EOL));
    }

    this.emit("done");
  }

  public async watchAsync(): Promise<void> {
    let messages: string[] = [];
    const host = ts.createWatchCompilerHost(
      this._parsedTsConfig.fileNames,
      {
        ...this._parsedTsConfig.options,
        outDir: this._distPath,
        sourceMap: false,
        noEmit: !this._parsedTsConfig.options.declaration,
        emitDeclarationOnly: this._parsedTsConfig.options.declaration
      },
      ts.sys,
      ts.createEmitAndSemanticDiagnosticsBuilderProgram,
      diagnostic => {
        const message = this._diagnosticToMessage(diagnostic);
        if (message) {
          messages.push(message);
        }
      },
      diagnostic => {
        const messageText = diagnostic.messageText.toString();
        if (
          messageText.includes("Starting compilation in watch mode") ||
          messageText.includes("File change detected. Starting incremental compilation")
        ) {
          this.emit("run");
          messages = [];
        }
        else if (messageText.includes("Watching for file changes")) {
          if (messages.length > 0) {
            this.emit("error", messages.join(os.EOL));
          }

          this.emit("done");
        }
      }
    );

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
}