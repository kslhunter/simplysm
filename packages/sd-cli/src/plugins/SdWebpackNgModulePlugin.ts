import * as webpack from "webpack";
import {SdWebpackAngularFileSystem} from "./SdWebpackAngularFileSystem";

export class SdWebpackNgModulePlugin implements webpack.Plugin {
  public constructor(private readonly _options: { tsConfigPath: string }) {
  }

  public apply(compiler: webpack.Compiler): void {
    compiler.hooks.afterEnvironment.tap("SdWebpackNgModulePlugin", () => {
      const prevWatchFileSystem = compiler["watchFileSystem"];

      compiler["watchFileSystem"] = new SdWebpackAngularFileSystem(
        prevWatchFileSystem._virtualInputFileSystem,
        prevWatchFileSystem._replacements,
        this._options.tsConfigPath
      );
    });
  }
}
