import * as webpack from "webpack";
import {SdWebpackAngularWatchFileSystem} from "./SdWebpackAngularWatchFileSystem";
import {SdWebpackAngularJitWatchFileSystem} from "./SdWebpackAngularJitWatchFileSystem";

export class SdWebpackNgModulePlugin implements webpack.Plugin {
  public constructor(private readonly _options: { tsConfigPath: string; jit: boolean }) {
  }

  public apply(compiler: webpack.Compiler): void {
    if (this._options.jit) {
      compiler.hooks.afterEnvironment.tap("SdWebpackNgModulePlugin", () => {
        const prevWatchFileSystem = compiler["watchFileSystem"];

        compiler["watchFileSystem"] = new SdWebpackAngularJitWatchFileSystem(
          prevWatchFileSystem._inputfileSystem,
          this._options.tsConfigPath
        );
      });
    }
    else {
      compiler.hooks.afterEnvironment.tap("SdWebpackNgModulePlugin", () => {
        const prevWatchFileSystem = compiler["watchFileSystem"];

        compiler["watchFileSystem"] = new SdWebpackAngularWatchFileSystem(
          prevWatchFileSystem._virtualInputFileSystem,
          prevWatchFileSystem._replacements,
          this._options.tsConfigPath
        );
      });
    }
  }
}
