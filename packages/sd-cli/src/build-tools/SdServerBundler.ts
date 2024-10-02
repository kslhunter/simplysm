import { ISdCliPackageBuildResult } from "../commons";
import esbuild from "esbuild";
import path from "path";
import { IServerPluginResultCache, sdServerPlugin } from "../bundle-plugins/sdServerPlugin";
import ts from "typescript";
import { Logger } from "@simplysm/sd-core-node";

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
    program: ts.Program;
    watchFileSet: Set<string>;
    affectedFileSet: Set<string>;
    results: ISdCliPackageBuildResult[];
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
      program: this.#resultCache.program!,
      watchFileSet: this.#resultCache.watchFileSet!,
      affectedFileSet: this.#resultCache.affectedFileSet!,
      results: [
        ...result.warnings.map((warn) => ({
          type: "build" as const,
          filePath: warn.location?.file !== undefined ? path.resolve(warn.location.file) : undefined,
          line: warn.location?.line,
          char: warn.location?.column,
          code: warn.text.slice(0, warn.text.indexOf(":")),
          severity: "warning" as const,
          message: `(${warn.pluginName}) ${warn.text.slice(warn.text.indexOf(":") + 1)}`,
        })),
        ...result.errors.map((err) => ({
          type: "build" as const,
          filePath: err.location?.file !== undefined ? path.resolve(err.location.file) : undefined,
          line: err.location?.line,
          char: err.location?.column !== undefined ? err.location.column + 1 : undefined,
          code: err.text.slice(0, err.text.indexOf(":")),
          severity: "error" as const,
          message: `(${err.pluginName}) ${err.text.slice(err.text.indexOf(":") + 1)}`,
        })),
      ],
    };
  }
}
