import * as webpack from "webpack";
import {SdVirtualWatchFileSystemDecorator} from "./SdVirtualWatchFilesystemDecorator";

export class SdWebpackNgModulePlugin implements webpack.Plugin {
  public constructor(private readonly _options: { tsConfigPath: string }) {
  }

  public apply(compiler: webpack.Compiler): void {
    compiler.hooks.afterEnvironment.tap("SdWebpackNgModulePlugin", () => {
      compiler["watchFileSystem"] = new SdVirtualWatchFileSystemDecorator(
        compiler["watchFileSystem"]._virtualInputFileSystem,
        compiler["watchFileSystem"]._replacements,
        this._options.tsConfigPath
      );
    });
  }
}
