import * as webpack from "webpack";

export class SdWebpackSourceStringReplacePlugin implements webpack.Plugin {
  private readonly _map = new Map<string, { search: RegExp; replace: string }[]>();

  public constructor(options: { filePath: string; search: RegExp; replace: string }[]) {
    this._map = options.groupBy((item) => item.filePath)
      .toMap((item) => item.key, (item) => item.values);
  }

  public apply(compiler: webpack.Compiler): void {
    compiler.hooks.compilation.tap("SdWebpackSourceStringReplacePlugin", (bundle) => {
      bundle.hooks.optimizeModules.tap("SdWebpackSourceStringReplacePlugin", (modules) => {
        for (const mod of modules) {
          const opts = this._map.get(mod["resource"]);
          if (opts) {
            for (const opt of opts) {
              mod._source._value = mod._source._value.replace(opt.search, opt.replace);
            }
          }
        }
      });
    });
  }
}
