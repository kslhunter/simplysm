import {ISdCliPackageBuildResult} from "../commons";
import esbuild from "esbuild";
import path from "path";
import esbuildPluginTsc from "esbuild-plugin-tsc";

export class SdTsBundler {
  private _context?: esbuild.BuildContext;

  public constructor(private readonly _opt: {
    dev: boolean;
    pkgPath: string;
    entryPoints: string[];
    // external?: string[];
  }) {
  }

  public async bundleAsync(): Promise<ISdCliPackageBuildResult[]> {
    if (!this._context) {
      const options = this.getOptions();
      this._context = await esbuild.context(options);
    }
    const results = await this._context.rebuild();
    return this._convertResults(results);
  }

  public getOptions(): esbuild.BuildOptions {
    return {
      entryPoints: this._opt.entryPoints,
      keepNames: true,
      bundle: true,
      sourcemap: this._opt.dev,
      target: "node16",
      mainFields: ['es2020', 'es2015', 'module', 'main'],
      conditions: ["es2020", "es2015", "module"],
      tsconfig: path.resolve(this._opt.pkgPath, "tsconfig.json"),
      write: true,
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
        ".pkl": "file"
      },
      platform: "node",
      logLevel: "silent",
      packages: "external",
      // external: this._opt.external,
      banner: {
        js: `
import __path__ from 'path';
import { fileURLToPath as __fileURLToPath__ } from 'url';
// import { createRequire as __createRequire__ } from 'module';
//
// const require = __createRequire__(import.meta.url);
const __filename = __fileURLToPath__(import.meta.url);
const __dirname = __path__.dirname(__filename);`.trim()
      },
      plugins: [
        esbuildPluginTsc()
      ]
    };
  }

  private _convertResults(result: esbuild.BuildResult): ISdCliPackageBuildResult[] {
    return [
      ...result.warnings.map((warn) => ({
        type: "build" as const,
        filePath: warn.location?.file !== undefined ? path.resolve(warn.location.file) : undefined,
        line: warn.location?.line,
        char: warn.location?.column,
        code: undefined,
        severity: "warning" as const,
        message: warn.text
      })),
      ...result.errors.map((err) => ({
        type: "build" as const,
        filePath: err.location?.file !== undefined ? path.resolve(err.location.file) : undefined,
        line: err.location?.line,
        char: err.location?.column !== undefined ? err.location.column + 1 : undefined,
        code: undefined,
        severity: "error" as const,
        message: err.text
      }))
    ];
  }
}