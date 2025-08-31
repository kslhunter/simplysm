import esbuild from "esbuild";
import path from "path";
import { FsUtils, HashUtils, PathUtils, SdLogger, TNormPath } from "@simplysm/sd-core-node";
import { SdCliConvertMessageUtils } from "../../utils/sd-cli-convert-message.utils";
import { ISdCliServerPluginResultCache } from "../../types/build-plugin.types";
import { ISdBuildMessage } from "../../types/build.types";
import { createSdServerPlugin } from "./sd-server.plugin-creator";
import {
  BuildOutputFile,
  BuildOutputFileType,
} from "@angular/build/src/tools/esbuild/bundler-context";
import { convertOutputFile } from "@angular/build/src/tools/esbuild/utils";
import { resolveAssets } from "@angular/build/src/utils/resolve-assets";
import { ScopePathSet } from "../commons/scope-path";

export class SdServerBundler {
  #logger = SdLogger.get(["simplysm", "sd-cli", "SdServerBundler"]);

  #context?: esbuild.BuildContext;

  #modifiedFileSet = new Set<TNormPath>();
  #resultCache: ISdCliServerPluginResultCache = {};

  #outputHashCache = new Map<TNormPath, string>();

  constructor(
    private readonly _opt: {
      dev: boolean;
      emitOnly: boolean;
      noEmit: boolean;
      pkgPath: TNormPath;
      entryPoints: string[];
      external?: string[];
      watchScopePathSet: ScopePathSet;
    },
  ) {}

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
            emitOnly: this._opt.emitOnly,
            noEmit: this._opt.noEmit,
            pkgPath: this._opt.pkgPath,
            result: this.#resultCache,
            watchScopePathSet: this._opt.watchScopePathSet,
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
        const distFilePath = PathUtils.norm(this._opt.pkgPath, outputFile.path);
        const prevHash = this.#outputHashCache.get(distFilePath);
        const currHash = HashUtils.get(Buffer.from(outputFile.contents));
        if (prevHash !== currHash) {
          FsUtils.writeFile(distFilePath, outputFile.contents);
          this.#outputHashCache.set(distFilePath, currHash);
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
        const prevHash = this.#outputHashCache.get(PathUtils.norm(assetFile.source));
        const currHash = HashUtils.get(FsUtils.readFileBuffer(assetFile.source));
        if (prevHash !== currHash) {
          FsUtils.copy(
            assetFile.source,
            path.resolve(this._opt.pkgPath, "dist", assetFile.destination),
          );
          this.#outputHashCache.set(PathUtils.norm(assetFile.source), currHash);
          emitFileSet.add(PathUtils.norm(this._opt.pkgPath, "dist", assetFile.destination));
        }
      }
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
      results: SdCliConvertMessageUtils.convertToBuildMessagesFromEsbuild(
        result,
        this._opt.pkgPath,
      ),
      emitFileSet: emitFileSet,
    };
  }
}
