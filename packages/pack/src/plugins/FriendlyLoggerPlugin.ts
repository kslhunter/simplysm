import * as webpack from "webpack";
import {Logger} from "@simplism/core";

export class FriendlyLoggerPlugin implements webpack.Plugin {
  public constructor(private readonly _options: {
    logger: Logger;
    packageName: string;
  }) {
  }

  public apply(compiler: webpack.Compiler): void {
    compiler.hooks.run.tap("FriendlyLoggerPlugin", () => {
      this._options.logger.log(`빌드...`);
    });

    compiler.hooks.watchRun.tap("FriendlyLoggerPlugin", () => {
      this._options.logger.log(`빌드...`);
    });

    compiler.hooks.done.tap("FriendlyLoggerPlugin", stats => {
      const info = stats.toJson();

      if (stats.hasWarnings()) {
        for (const warning of info.warnings) {
          this._options.logger.warn(`${warning}`);
        }
      }

      if (stats.hasErrors()) {
        for (const error of info.errors) {
          this._options.logger.error(`${error}`);
        }
      }

      this._options.logger.info(`빌드 완료`);
    });
  }
}