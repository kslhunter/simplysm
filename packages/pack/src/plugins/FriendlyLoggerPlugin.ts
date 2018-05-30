import * as webpack from "webpack";
import {Logger} from "@simplism/core";

export class FriendlyLoggerPlugin implements webpack.Plugin {
  public constructor(private readonly _options: {
    logger: Logger;
    packageName: string;
  }) {
  }

  public apply(compiler: webpack.Compiler): void {
    compiler.hooks.watchRun.tap("FriendlyLoggerPlugin", () => {
      this._options.logger.log(`${this._options.packageName} 빌드...`);
    });

    compiler.hooks.done.tap("FriendlyLoggerPlugin", stats => {
      const info = stats.toJson();

      if (stats.hasWarnings()) {
        for (const warning of info.warnings) {
          this._options.logger.warn(`${this._options.packageName} ${warning}`);
        }
      }

      if (stats.hasErrors()) {
        for (const error of info.errors) {
          this._options.logger.error(`${this._options.packageName} ${error}`);
        }
      }

      this._options.logger.info(`${this._options.packageName} 빌드 완료`);
    });
  }
}