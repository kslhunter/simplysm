import * as webpack from "webpack";
import * as fs from "fs-extra";
import * as ts from "typescript";
import * as path from "path";

export class TsDeclarationPlugin implements webpack.Plugin {
  private readonly _startTime = Date.now();
  private _prevTimestamps = new Map<string, number>();

  public constructor(private readonly _options: { configFile: string }) {
  }

  public apply(compiler: webpack.Compiler): void {
    compiler.hooks.make.tapAsync("TsDeclarationPlugin", (compilation: webpack.compilation.Compilation, callback: () => void) => {

      const tsconfig = fs.readJsonSync(this._options.configFile);
      tsconfig.compilerOptions.outDir = tsconfig.compilerOptions.outDir || "dist";
      if (tsconfig.compilerOptions.paths) {
        for (const key of Object.keys(tsconfig.compilerOptions.paths)) {
          for (let i = 0; i < tsconfig.compilerOptions.paths[key].length; i++) {
            tsconfig.compilerOptions.paths[key][i] = tsconfig.compilerOptions.paths[key][i].replace(/[\\/]src[\\/]([^\\/.]*)\.ts$/, "");
          }
        }
      }

      const parsed = ts.parseJsonConfigFileContent(tsconfig, ts.sys, path.dirname(this._options.configFile));

      if (!parsed.options.declaration) {
        callback();
        return;
      }

      const tsProgram = ts.createProgram(
        parsed.fileNames,
        parsed.options
      );

      let diagnostics: ts.Diagnostic[] = [];

      const fileTimestamps = compilation["fileTimestamps"] as Map<string, number>;
      const changedFiles = Array.from(fileTimestamps.keys()).filter(watchFile => (this._prevTimestamps.get(watchFile) || this._startTime) < (fileTimestamps.get(watchFile) || Infinity));
      this._prevTimestamps = fileTimestamps;
      const sourceFiles = changedFiles.length > 0
        ? changedFiles.map(file => tsProgram.getSourceFile(file)).filter(item => item).distinct()
        : tsProgram.getSourceFiles();

      for (const sourceFile of sourceFiles) {
        diagnostics = diagnostics.concat(tsProgram.emit(sourceFile, undefined, undefined, true).diagnostics);
      }

      const result: string[] = [];
      for (const diagnostic of diagnostics) {
        if (diagnostic.file) {
          const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
          result.push(`${diagnostic.file.fileName}(${position.line + 1},${position.character + 1}): error: ${message}`);
        }
        else {
          result.push(`error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`);
        }
      }

      if (result.length > 0) {
        throw new Error(result[0]);
      }

      callback();
    });
  }
}