import * as webpack from "webpack";
import {NormalizedMessage} from "fork-ts-checker-webpack-plugin";

export class TsFriendlyLoggerPlugin implements webpack.Plugin {
  public constructor(private readonly _logger: {
    error(message: string): void;
    warn(message: string): void;
    info(message: string): void;
    log(message: string): void;
  }) {
  }

  public apply(compiler: webpack.Compiler): void {
    compiler.hooks.watchRun.tap("TsFriendlyLoggerPlugin", () => {
      this._logger.log("building...");
    });

    compiler.hooks.done.tap("TsFriendlyLoggerPlugin", stats => {
      const info = stats.toJson();

      if (stats.hasWarnings()) {
        for (const warning of info.warnings) {
          this._logger.warn(warning + "\r\n");
        }
      }

      if (stats.hasErrors()) {
        for (const error of info.errors) {
          this._logger.error(error);
        }
      }

      this._logger.info("build complete");
    });

    if (compiler.hooks["forkTsCheckerReceive"]) {
      compiler.hooks["forkTsCheckerReceive"].tap("TsFriendlyLoggerPlugin", (diagnostics: NormalizedMessage[], lints: NormalizedMessage[]) => {
        if (lints.length > 0) {
          for (const lint of lints) {
            this._logger.warn(`lint error occurred (checker)\r\n${lint.getFile()}(${lint.getLine()},${lint.getCharacter()}): ${lint.getSeverity()}: ${lint.getContent()} (${lint.getFormattedCode()})\r\n`);
          }
        }
        this._logger.info("check complete");
      });
    }
  }
}