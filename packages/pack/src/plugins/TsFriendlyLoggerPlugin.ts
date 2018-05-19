import * as webpack from "webpack";
import {NormalizedMessage, NormalizedMessageJson} from "fork-ts-checker-webpack-plugin";

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

      this._logger.log("build complete");
    });

    compiler.hooks["forkTsCheckerReceive"].tap("TsFriendlyLoggerPlugin", (diagnostics: NormalizedMessageJson[], lints: NormalizedMessageJson[]) => {
      const messages = diagnostics.concat(lints).map(item => new NormalizedMessage(item));
      if (messages.length > 0) {
        for (const message of messages) {
          process.stderr.write(`${message.getFile()}(${message.getLine()},${message.getCharacter()}): ${message.getSeverity()}: ${message.getContent()} (${message.getFormattedCode()})\r\n`);
        }
      }
      process.stdout.write("check complete");
    });
  }
}