import * as webpack from "webpack";
import * as fs from "fs-extra";
import * as ts from "typescript";
import * as path from "path";
import {Logger} from "@simplism/core";

export class TsCheckAndDeclarationPlugin implements webpack.Plugin {
  private readonly _contextPath: string;
  private readonly _configPath: string;
  private readonly _parsedConfig: ts.ParsedCommandLine;
  private readonly _outDir: string;

  public constructor(private readonly _options: { packageName: string; logger: Logger }) {
    this._contextPath = path.resolve(process.cwd(), "packages", this._options.packageName).replace(/\\/g, "/");
    this._configPath = path.resolve(this._contextPath, "tsconfig.json").replace(/\\/g, "/");
    this._parsedConfig = ts.parseJsonConfigFileContent(fs.readJsonSync(this._configPath), ts.sys, this._contextPath);
    this._outDir = this._parsedConfig.options.outDir || path.resolve(this._contextPath, "dist");
  }

  public apply(compiler: webpack.Compiler): void {
    let watch: ts.Watch<any>;
    compiler.hooks.watchRun.tap("TsCheckAndDeclarationPlugin", () => {
      if (!watch) {
        const host = ts.createWatchCompilerHost(
          this._configPath,
          {
            outDir: this._outDir,
            sourceMap: false,
            noEmit: !this._parsedConfig.options.declaration,
            emitDeclarationOnly: this._parsedConfig.options.declaration
          },
          {
            ...ts.sys,
            writeFile: (filePath, content) => {
              this._writeFile(filePath, content);
            },
            createDirectory: () => {
            }
          },
          ts.createEmitAndSemanticDiagnosticsBuilderProgram,
          diagnostic => {
            this._printDiagnostic(diagnostic);
          },
          () => {
          }
        );

        watch = ts.createWatchProgram(host);
      }
    });

    compiler.hooks.run.tap("TsCheckAndDeclarationPlugin", () => {
      const host = ts.createCompilerHost(this._parsedConfig.options);
      host.writeFile = (filePath, content) => {
        this._writeFile(filePath, content);
      };

      const tsProgram = ts.createProgram(
        this._parsedConfig.fileNames,
        {
          ...this._parsedConfig.options,
          outDir: this._outDir,
          sourceMap: false,
          noEmit: !this._parsedConfig.options.declaration,
          emitDeclarationOnly: this._parsedConfig.options.declaration
        },
        host
      );

      let diagnostics = this._parsedConfig.options.declaration
        ? ts.getPreEmitDiagnostics(tsProgram)
        : tsProgram.getSemanticDiagnostics();

      if (this._parsedConfig.options.declaration) {
        diagnostics = diagnostics.concat(tsProgram.emit(undefined, undefined, undefined, true).diagnostics);
      }
      else {
        diagnostics = diagnostics.concat(tsProgram.getSyntacticDiagnostics());
      }

      for (const diagnostic of diagnostics) {
        this._printDiagnostic(diagnostic);
      }
    });
  }

  private _writeFile(filePath: string, content: string): void {
    if (!this._parsedConfig.options.declaration) return;

    let newFilePath = filePath.replace(/\\/g, "/");
    if (newFilePath.includes("src")) {
      const prevOutDir = path.resolve(this._outDir, this._options.packageName, "src").replace(/\\/g, "/");

      if (!newFilePath.startsWith(prevOutDir)) {
        return;
      }

      newFilePath = path.resolve(this._outDir, path.relative(prevOutDir, filePath));
    }

    fs.mkdirsSync(path.dirname(newFilePath));
    fs.writeFileSync(newFilePath, content);
  }

  private _printDiagnostic(diagnostic: ts.Diagnostic): void {
    if (diagnostic.file) {
      if (diagnostic.file.fileName.startsWith(this._contextPath.replace(/\\/g, "/"))) {
        const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
        const tsMessage = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        const message = `${diagnostic.file.fileName}(${position.line + 1},${position.character + 1}): error: ${tsMessage}`;
        this._options.logger.error(`${this._options.packageName} declaration:\r\n${message}`);
      }
    }
    else {
      const message = `error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`;
      this._options.logger.error(`${this._options.packageName} declaration:\r\n${message}`);
    }
  }
}