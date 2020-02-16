import * as webpack from "webpack";

export class SdWebpackTimeFixPlugin implements webpack.Plugin {
  public constructor(private readonly _watchOffset: number = 11000) {
  }

  public apply(compiler: webpack.Compiler): void {
    const watch = compiler.watch;
    let watching: webpack.Watching;
    compiler.watch = (...args: any) => {
      watching = watch.apply(compiler, args) as any;
      watching["startTime"] += this._watchOffset;
      return watching;
    };

    compiler.hooks.watchRun.tap("SdWebpackTimeFixPlugin", () => {
      if (watching) {
        watching["startTime"] += this._watchOffset;
      }
    });

    compiler.hooks.done.tap("SdWebpackTimeFixPlugin", stats => {
      if (watching) {
        (stats["startTime"] as any) -= this._watchOffset;
      }
    });
  }
}
