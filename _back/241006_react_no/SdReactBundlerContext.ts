import esbuild from "esbuild";
import path from "path";
import { ISdCliPackageBuildResult } from "../commons";
import { Logger } from "@simplysm/sd-core-node";

export class SdReactBundlerContext {
  readonly #logger = Logger.get(["simplysm", "sd-cli", "SdReactBundlerContext"]);

  private _context?: esbuild.BuildContext;

  public constructor(
    private readonly _pkgPath: string,
    private readonly _esbuildOptions: esbuild.BuildOptions,
  ) {}

  public async bundleAsync() {
    if (this._context == null) {
      this._context = await esbuild.context(this._esbuildOptions);
    }

    let buildResult: esbuild.BuildResult;

    try {
      this.#debug(`rebuild...`);
      buildResult = await this._context.rebuild();
      this.#debug(`rebuild completed`);
    } catch (err) {
      if ("warnings" in err || "errors" in err) {
        buildResult = err;
      } else {
        throw err;
      }
    }

    this.#debug(`convert results...`);

    const results = [
      ...buildResult.warnings.map((warn) => ({
        filePath: warn.location?.file !== undefined ? path.resolve(this._pkgPath, warn.location.file) : undefined,
        line: warn.location?.line,
        char: warn.location?.column,
        code: warn.text.slice(0, warn.text.indexOf(":")),
        severity: "warning",
        message: `${warn.pluginName ? `(${warn.pluginName}) ` : ""} ${warn.text.slice(warn.text.indexOf(":") + 1)}`,
        type: "build",
      })),
      ...buildResult.errors.map((err) => ({
        filePath: err.location?.file !== undefined ? path.resolve(this._pkgPath, err.location.file) : undefined,
        line: err.location?.line,
        char: err.location?.column !== undefined ? err.location.column + 1 : undefined,
        code: err.text.slice(0, err.text.indexOf(":")),
        severity: "error",
        message: `${err.pluginName ? `(${err.pluginName}) ` : ""} ${err.text.slice(err.text.indexOf(":") + 1)}`,
        type: "build",
      })),
    ] as ISdCliPackageBuildResult[];

    return {
      results,
      outputFiles: buildResult.outputFiles,
      metafile: buildResult.metafile,
    };
  }

  #debug(...msg: any[]): void {
    this.#logger.debug(
      `[${path.basename(this._pkgPath)}] (${Object.keys(this._esbuildOptions.entryPoints as Record<string, any>).join(", ")})`,
      ...msg,
    );
  }
}
