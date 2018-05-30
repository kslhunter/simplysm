import * as webpack from "webpack";
import * as tslint from "tslint";
import * as path from "path";
import {Logger} from "@simplism/core";

export class TsLintPlugin implements webpack.Plugin {
  private readonly _startTime = Date.now();
  private _prevTimestamps = new Map<string, number>();

  public constructor(private readonly _options: { packageName: string; logger: Logger }) {
  }

  public apply(compiler: webpack.Compiler): void {
    const tsconfigFile = path.resolve(process.cwd(), "packages", this._options.packageName, "tsconfig.json");
    const configFile = path.resolve(process.cwd(), "packages", this._options.packageName, "tslint.json");

    compiler.hooks.make.tapAsync("TsLintPlugin", (compilation: webpack.compilation.Compilation, callback: () => void) => {
      callback();

      const fileTimestamps = compilation["fileTimestamps"] as Map<string, number>;
      const changedFiles = Array.from(fileTimestamps.keys())
        .filter(watchFile => (this._prevTimestamps.get(watchFile) || this._startTime) < (fileTimestamps.get(watchFile) || Infinity));
      this._prevTimestamps = fileTimestamps;

      const program = tslint.Linter.createProgram(tsconfigFile, path.dirname(tsconfigFile));
      const linter = new tslint.Linter({formatter: "json", fix: false}, program);

      const sourceFiles = changedFiles.length > 0
        ? changedFiles.map(file => program.getSourceFile(file)).filterExists().distinct()
        : program.getSourceFiles();

      for (const sourceFile of sourceFiles) {
        if (/\.d\.ts$/.test(sourceFile.fileName)) continue;

        const config = tslint.Configuration.findConfiguration(configFile, sourceFile.fileName);
        linter.lint(sourceFile.fileName, sourceFile.getFullText(), config.results);

        const result = linter.getResult();

        for (const failure of result.failures) {
          if (failure.getFileName() !== sourceFile.fileName) {
            continue;
          }

          const severity = failure.getRuleSeverity();
          const message = failure.getFailure();
          const rule = failure.getRuleName();
          const fileName = failure.getFileName();
          const lineNumber = failure.getStartPosition().getLineAndCharacter().line + 1;
          const charNumber = failure.getStartPosition().getLineAndCharacter().character + 1;

          const resultMessage = `${fileName}(${lineNumber},${charNumber}): ${severity}: ${message} (${rule})`;
          this._options.logger.warn(`${this._options.packageName} ${sourceFile.fileName} (lint)\r\n${resultMessage}`);
        }
      }
    });
  }
}