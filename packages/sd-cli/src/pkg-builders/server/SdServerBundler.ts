import esbuild from "esbuild";
import path from "path";
import { Logger } from "@simplysm/sd-core-node";
import { IServerPluginResultCache, sdServerPlugin } from "./sdServerPlugin";
import { SdCliConvertMessageUtil } from "../../utils/SdCliConvertMessageUtil";
import { ISdBuildMessage } from "../../commons";

export class SdServerBundler {
  readonly #logger = Logger.get(["simplysm", "sd-cli", "SdServerBundler"]);

  #context?: esbuild.BuildContext;

  #modifiedFileSet = new Set<string>();
  #resultCache: IServerPluginResultCache = {};

  constructor(
    private readonly _opt: {
      dev: boolean;
      pkgPath: string;
      entryPoints: string[];
      external?: string[];
      watchScopePaths: string[];
    },
  ) {}

  public markForChanges(filePaths: string[]): void {
    for (const filePath of filePaths) {
      this.#modifiedFileSet.add(path.normalize(filePath));
    }
  }

  async bundleAsync(): Promise<{
    watchFileSet: Set<string>;
    affectedFileSet: Set<string>;
    results: ISdBuildMessage[];
  }> {
    if (!this.#context) {
      this.#context = await esbuild.context({
        entryPoints: this._opt.entryPoints,
        keepNames: true,
        bundle: true,
        sourcemap: true, //this._opt.dev,
        target: "node18",
        mainFields: ["es2020", "es2015", "module", "main"],
        conditions: ["es2020", "es2015", "module"],
        tsconfig: path.resolve(this._opt.pkgPath, "tsconfig.json"),
        write: true,
        metafile: true,
        outdir: path.resolve(this._opt.pkgPath, "dist"),
        format: "esm",
        resolveExtensions: [".js", ".mjs", ".cjs", ".ts"],
        preserveSymlinks: false,
        loader: {
          ".png": "file",
          ".jpeg": "file",
          ".jpg": "file",
          ".jfif": "file",
          ".gif": "file",
          ".svg": "file",
          ".woff": "file",
          ".woff2": "file",
          ".ttf": "file",
          ".ttc": "file",
          ".eot": "file",
          ".ico": "file",
          ".otf": "file",
          ".csv": "file",
          ".xlsx": "file",
          ".xls": "file",
          ".pptx": "file",
          ".ppt": "file",
          ".docx": "file",
          ".doc": "file",
          ".zip": "file",
          ".pfx": "file",
          ".pkl": "file",
          ".mp3": "file",
          ".ogg": "file",
        },
        platform: "node",
        logLevel: "silent",
        external: this._opt.external,
        banner: {
          js: `
import __path__ from 'path';
import { fileURLToPath as __fileURLToPath__ } from 'url';
import { createRequire as __createRequire__ } from 'module';

const require = __createRequire__(import.meta.url);
const __filename = __fileURLToPath__(import.meta.url);
const __dirname = __path__.dirname(__filename);`.trim(),
        },
        plugins: [
          sdServerPlugin({
            modifiedFileSet: this.#modifiedFileSet,
            dev: this._opt.dev,
            pkgPath: this._opt.pkgPath,
            result: this.#resultCache,
            watchScopePaths: this._opt.watchScopePaths,
          }),
        ],
      });
    }

    let result: esbuild.BuildResult | esbuild.BuildFailure;
    try {
      result = await this.#context.rebuild();
    } catch (err) {
      result = err;
      for (const e of err.errors) {
        if (e.detail != null) {
          this.#logger.error(e.detail);
        }
      }
    }

    return {
      watchFileSet: this.#resultCache.watchFileSet!,
      affectedFileSet: this.#resultCache.affectedFileSet!,
      results: SdCliConvertMessageUtil.convertToBuildMessagesFromEsbuild(result),
    };
  }
}
