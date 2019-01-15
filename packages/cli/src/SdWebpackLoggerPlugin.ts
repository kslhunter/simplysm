import * as webpack from "webpack";
import {Logger} from "@simplysm/common";

export class SdWebpackLoggerPlugin implements webpack.Plugin {
  public constructor(private readonly _options: {
    logger: Logger;
  }) {
  }

  public apply(compiler: webpack.Compiler): void {
    compiler.hooks.watchRun.tap("SdWebpackLoggerPlugin", () => {
      this._options.logger.log(`변경이 감지되었습니다. 빌드를 시작합니다...`);
    });

    compiler.hooks.done.tap("SdWebpackLoggerPlugin", stats => {
      const info = stats.toJson();

      if (stats.hasWarnings()) {
        for (const warning of info.warnings) {
          this._options.logger.warn(warning);
        }
      }

      if (stats.hasErrors()) {
        for (const error of info.errors) {
          this._options.logger.error(error);
        }
      }
    });
  }
}
