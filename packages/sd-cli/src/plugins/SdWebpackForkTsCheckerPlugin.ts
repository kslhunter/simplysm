import * as ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import {NormalizedMessage} from "fork-ts-checker-webpack-plugin/lib/NormalizedMessage";

export class SdWebpackForkTsCheckerPlugin extends ForkTsCheckerWebpackPlugin {
  public constructor(private readonly _options: { tsConfigPath: string; error: (messages: string[]) => void }) {
    super({
      tsconfig: _options.tsConfigPath,
      async: true,
      silent: true
    });
  }

  public apply(compiler: any): void {
    super.apply(compiler);

    const tsCheckerHooks = ForkTsCheckerWebpackPlugin.getCompilerHooks(compiler);
    tsCheckerHooks.receive.tap("SdWebpackForkTsCheckerPlugin", (diagnostics: NormalizedMessage[]) => {
      if (diagnostics.length > 0) {
        this._options.error(diagnostics.map(item => {
          if (!item.file) return undefined;

          let result = item.file.replace(/\//g, "\\");
          result += `(${item.line! + 1},${item.character! + 1})`;
          result += ": ";
          result += item.severity.toLowerCase() + ": ";
          result += "TS" + item.code + ": ";
          result += item.content;

          return result;
        }).filterExists());
      }
    });
  }
}