import esbuild from "esbuild";
import path from "path";
import { FsUtil, Logger, PathUtil, type TNormPath } from "@simplysm/sd-core-node";
import { SdCliConvertMessageUtil } from "../../utils/SdCliConvertMessageUtil";
import { type ISdCliServerPluginResultCache } from "../../types/build-plugin.type";
import { type ISdBuildMessage } from "../../types/build.type";
import { createSdServerPlugin } from "./createSdServerPlugin";
import { type BuildOutputFile, BuildOutputFileType } from "@angular/build/src/tools/esbuild/bundler-context";
import { convertOutputFile } from "@angular/build/src/tools/esbuild/utils";
import { resolveAssets } from "@angular/build/src/utils/resolve-assets";

export class SdServerBundler {
  readonly #logger = Logger.get(["simplysm", "sd-cli", "SdServerBundler"]);

  #context?: esbuild.BuildContext;

  readonly #modifiedFileSet = new Set<TNormPath>();
  readonly #resultCache: ISdCliServerPluginResultCache = {};

  readonly #outputCache = new Map<TNormPath, string | number>();

  constructor(
    private readonly _opt: {
      dev: boolean;
      pkgPath: TNormPath;
      entryPoints: string[];
      external?: string[];
      watchScopePaths: TNormPath[];
    },
  ) {
  }

  async bundleAsync(modifiedFileSet?: Set<TNormPath>): Promise<{
    watchFileSet: Set<TNormPath>;
    affectedFileSet: Set<TNormPath>;
    results: ISdBuildMessage[];
    emitFileSet: Set<TNormPath>;
  }> {
    this.#modifiedFileSet.clear();
    if (modifiedFileSet) {
      this.#modifiedFileSet.adds(...modifiedFileSet);
    }

    if (!this.#context) {
      this.#context = await esbuild.context({
        entryPoints: this._opt.entryPoints,
        keepNames: true,
        bundle: true,
        sourcemap: this._opt.dev,
        target: "node18",
        mainFields: ["es2020", "es2015", "module", "main"],
        conditions: ["es2020", "es2015", "module"],
        tsconfig: path.resolve(this._opt.pkgPath, "tsconfig.json"),
        write: false,
        metafile: true,
        legalComments: this._opt.dev ? "eof" : "none",
        minifyIdentifiers: !this._opt.dev,
        minifySyntax: !this._opt.dev,
        minifyWhitespace: !this._opt.dev,
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
          createSdServerPlugin({
            modifiedFileSet: this.#modifiedFileSet,
            dev: this._opt.dev,
            pkgPath: this._opt.pkgPath,
            result: this.#resultCache,
            watchScopePaths: this._opt.watchScopePaths,
          }),
        ],
      });
    }

    const emitFileSet = new Set<TNormPath>();
    let result: esbuild.BuildResult | esbuild.BuildFailure;
    try {
      result = await this.#context.rebuild();

      const outputFiles: BuildOutputFile[] =
        result.outputFiles?.map((file) => convertOutputFile(file, BuildOutputFileType.Root)) ?? [];

      for (const outputFile of outputFiles) {
        const distFilePath = PathUtil.norm(this._opt.pkgPath, outputFile.path);
        const prev = this.#outputCache.get(distFilePath);
        if (prev !== Buffer.from(outputFile.contents).toString("base64")) {
          FsUtil.writeFile(distFilePath, outputFile.contents);
          this.#outputCache.set(distFilePath, Buffer.from(outputFile.contents).toString("base64"));
          emitFileSet.add(distFilePath);
        }
      }

      //-- copy assets
      const assetFiles = await resolveAssets(
        [
          { input: "public", glob: "**/*", output: "." },
          ...(this._opt.dev ? [{ input: "public-dev", glob: "**/*", output: "." }] : []),
        ],
        this._opt.pkgPath,
      );

      for (const assetFile of assetFiles) {
        const prev = this.#outputCache.get(PathUtil.norm(assetFile.source));
        const curr = FsUtil.lstat(assetFile.source).mtime.getTime();
        if (prev !== curr) {
          FsUtil.copy(assetFile.source, path.resolve(this._opt.pkgPath, "dist", assetFile.destination));
          this.#outputCache.set(PathUtil.norm(assetFile.source), curr);
          emitFileSet.add(PathUtil.norm(assetFile.destination));
        }
      }
    }
    catch (err) {
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
      results: SdCliConvertMessageUtil.convertToBuildMessagesFromEsbuild(result, this._opt.pkgPath),
      emitFileSet: emitFileSet,
    };
  }
}
