import esbuild from "esbuild";
import path from "path";
import esbuildPluginTsc from "esbuild-plugin-tsc";
import {ISdCliPackageBuildResult} from "../commons";
import {FsUtil} from "@simplysm/sd-core-node";
import {
  createCompilerPlugin,
  SourceFileCache
} from "@angular-devkit/build-angular/src/tools/esbuild/angular/compiler-plugin";

export interface ISdTsEsBuilderOption {
  pkgPath: string;
  bundle: boolean;
  external?: string[];
}

export class SdTsEsBuilder {
  private readonly _ngCache: SourceFileCache;
  private _context?: esbuild.BuildContext;

  public constructor(private readonly _opt: ISdTsEsBuilderOption) {
    this._ngCache = new SourceFileCache(path.resolve(this._opt.pkgPath, ".cache"));
  }

  public markChanges(fileChanges: string[]): void {
    this._ngCache.invalidate(fileChanges);
  }

  public async rebuildAsync(): Promise<ISdCliPackageBuildResult[]> {
    const options = this.getOptions(true);
    if (!this._context) {
      this._context = await esbuild.context(options);
    }
    const results = await this._context.rebuild();
    return this._convertResults(results);
  }

  public async buildAsync(): Promise<ISdCliPackageBuildResult[]> {
    const options = this.getOptions(false);
    const results = await esbuild.build(options);
    return this._convertResults(results);
  }

  public getOptions(dev: boolean): esbuild.BuildOptions {
    const tsConfig = FsUtil.readJson(path.resolve(this._opt.pkgPath, "tsconfig.json")) as {
      files?: string[],
      compilerOptions: { lib: string[] };
      angularCompilerOptions?: {};
    };
    const entryPoints = this._opt.bundle ? (
      tsConfig.files?.map((relPath) => path.resolve(this._opt.pkgPath, relPath))
      ?? [path.resolve(this._opt.pkgPath, "src", "main.ts")]
    ) : FsUtil.glob(path.resolve(this._opt.pkgPath, "**/*.ts")).filter((item) => !item.endsWith(".d.ts"));

    const platform = !tsConfig.compilerOptions.lib.map((item) => item.toUpperCase()).includes("DOM") ? "node" as const
      : tsConfig.angularCompilerOptions ? "browser" as const
        : "neutral" as const;

    return {
      absWorkingDir: this._opt.pkgPath,
      entryPoints,
      assetNames: 'media/[name]',
      keepNames: true,
      bundle: this._opt.bundle,
      sourcemap: dev,
      target: platform === "node" ? "node16" : "es2020",
      mainFields: ['es2020', 'es2015', 'module', 'main'],
      conditions: ["es2020", "es2015", "module"],
      tsconfig: path.resolve(this._opt.pkgPath, "tsconfig.json"),
      write: true,
      metafile: Boolean(tsConfig.angularCompilerOptions),
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
      platform,
      logLevel: "silent",
      external: this._opt.external,
      banner: {
        js: `
import __path__ from 'path';
import { fileURLToPath as __fileURLToPath__ } from 'url';
import { createRequire as __createRequire__ } from 'module';

const require = __createRequire__(import.meta.url);
const __filename = __fileURLToPath__(import.meta.url);
const __dirname = __path__.dirname(__filename);`.trim()
      },
      plugins: [
        ...tsConfig.angularCompilerOptions ? [
          createCompilerPlugin(
            {
              sourcemap: dev,
              thirdPartySourcemaps: false,
              tsconfig: path.resolve(this._opt.pkgPath, "tsconfig.json"),
              jit: false,
              advancedOptimizations: true,
              fileReplacements: undefined,
              sourceFileCache: this._ngCache,
              loadResultCache: this._ngCache.loadResultCache,
            },
            {
              workspaceRoot: this._opt.pkgPath,
              optimization: !dev,
              sourcemap: dev ? 'inline' : false,
              outputNames: {bundles: '[name]', media: 'media/[name]'},
              includePaths: [],
              externalDependencies: [],
              target: [
                'chrome117.0', 'chrome116.0',
                'edge117.0', 'edge116.0',
                'firefox118.0', 'firefox115.0',
                'ios17.0', 'ios16.6',
                'ios16.5', 'ios16.4',
                'ios16.3', 'ios16.2',
                'ios16.1', 'ios16.0',
                'safari17.0', 'safari16.6',
                'safari16.5', 'safari16.4',
                'safari16.3', 'safari16.2',
                'safari16.1', 'safari16.0'
              ],
              inlineStyleLanguage: 'scss',
              preserveSymlinks: false,
              tailwindConfiguration: undefined
            }
          )
        ] : [
          esbuildPluginTsc()
        ]
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