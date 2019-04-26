import * as webpack from "webpack";
import { Logger } from "@simplysm/sd-common";

export class SdWebpackLoggerPlugin implements webpack.Plugin {
  public constructor(private readonly _options: { logger: Logger }) {}

  public apply(compiler: webpack.Compiler): void {
    let isWatchStarted = false;

    compiler.hooks.run.tap("SdWebpackLoggerPlugin", () => {
      this._options.logger.log(`빌드를 시작합니다...`);
    });

    compiler.hooks.watchRun.tap("SdWebpackLoggerPlugin", () => {
      if (isWatchStarted) {
        this._options.logger.log(`변경이 감지되었습니다. 빌드를 시작합니다...`);
      } else {
        this._options.logger.log(`빌드 및 변경감지를 시작합니다...`);
      }
      isWatchStarted = true;
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

      this._options.logger.log(`빌드가 완료되었습니다.`);
    });
  }
}
