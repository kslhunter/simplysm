import esbuild from "esbuild";
import path from "path";
import type { TNormPath } from "@simplysm/sd-core-node";
import { FsUtils, HashUtils, PathUtils, SdLogger } from "@simplysm/sd-core-node";
import { SdCliConvertMessageUtils } from "../../utils/SdCliConvertMessageUtils";
import { createSdServerPlugin } from "./createSdServerPlugin";
import type { BuildOutputFile } from "@angular/build/src/tools/esbuild/bundler-context";
import { BuildOutputFileType } from "@angular/build/src/tools/esbuild/bundler-context";
import { convertOutputFile } from "@angular/build/src/tools/esbuild/utils";
import { resolveAssets } from "@angular/build/src/utils/resolve-assets";
import type { ISdCliServerPluginResultCache } from "../../types/plugin/ISdCliServerPluginResultCache";
import type { ISdBuildResult } from "../../types/build/ISdBuildResult";
import type { ISdTsCompilerOptions } from "../../types/build/ISdTsCompilerOptions";
import { SdWorkerPathPlugin } from "../commons/SdWorkerPathPlugin";

export class SdServerBundler {
  private readonly _logger = SdLogger.get(["simplysm", "sd-cli", "SdServerBundler"]);

  private _context?: esbuild.BuildContext;

  private readonly _modifiedFileSet = new Set<TNormPath>();
  private readonly _resultCache: ISdCliServerPluginResultCache = {};

  private readonly _outputHashCache = new Map<TNormPath, string>();

  private readonly _esbuildOptions: esbuild.BuildOptions;

  constructor(
    private readonly _opt: ISdTsCompilerOptions,
    private readonly _conf: { external: string[] },
  ) {
    this._esbuildOptions = {
      entryPoints: [
        path.resolve(this._opt.pkgPath, "src/main.ts"),
        // ...FsUtils.glob(path.resolve(this._opt.pkgPath, "src/workers/*.ts")),
      ],
      keepNames: true,
      bundle: true,
      sourcemap: !!this._opt.watch?.dev,
      target: "node18",
      mainFields: ["es2020", "es2015", "module", "main"],
      conditions: ["es2020", "es2015", "module"],
      tsconfig: path.resolve(this._opt.pkgPath, "tsconfig.json"),
      write: false,
      metafile: true,
      legalComments: this._opt.watch?.dev ? "eof" : "none",
      minifyIdentifiers: !this._opt.watch?.dev,
      minifySyntax: !this._opt.watch?.dev,
      minifyWhitespace: !this._opt.watch?.dev,
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
      external: this._conf.external,
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
        createSdServerPlugin(this._opt, this._modifiedFileSet, this._resultCache),
        SdWorkerPathPlugin(path.resolve(this._opt.pkgPath, "dist")),
      ],
    };
  }

  async bundleAsync(modifiedFileSet?: Set<TNormPath>): Promise<ISdBuildResult> {
    this._modifiedFileSet.clear();
    if (modifiedFileSet) {
      this._modifiedFileSet.adds(...modifiedFileSet);
    }

    let esbuildResult: esbuild.BuildResult;
    if (this._opt.watch) {
      if (this._context == null) {
        this._context = await esbuild.context(this._esbuildOptions);
      }

      try {
        esbuildResult = await this._context.rebuild();
      } catch (err) {
        if (err != null && typeof err === "object" && ("warnings" in err || "errors" in err)) {
          esbuildResult = err as esbuild.BuildResult;
        } else {
          throw err;
        }
      }
    } else {
      try {
        esbuildResult = await esbuild.build(this._esbuildOptions);
      } catch (err) {
        if (err != null && typeof err === "object" && ("warnings" in err || "errors" in err)) {
          esbuildResult = err as esbuild.BuildResult;
        } else {
          throw err;
        }
      }
    }

    if (this._opt.watch?.noEmit) {
      return {
        buildMessages: SdCliConvertMessageUtils.convertToBuildMessagesFromEsbuild(
          esbuildResult,
          this._opt.pkgPath,
        ),

        watchFileSet: this._resultCache.watchFileSet!,
        affectedFileSet: this._resultCache.affectedFileSet!,
        emitFileSet: new Set<TNormPath>(),
      };
    } else {
      const emitFileSet = new Set<TNormPath>();

      try {
        const outputFiles: BuildOutputFile[] =
          esbuildResult.outputFiles?.map((file) =>
            convertOutputFile(file, BuildOutputFileType.Root),
          ) ?? [];

        for (const outputFile of outputFiles) {
          const distFilePath = PathUtils.norm(this._opt.pkgPath, outputFile.path);
          const prevHash = this._outputHashCache.get(distFilePath);
          const currHash = HashUtils.get(Buffer.from(outputFile.contents));
          if (prevHash !== currHash) {
            FsUtils.writeFile(distFilePath, outputFile.contents);
            this._outputHashCache.set(distFilePath, currHash);
            emitFileSet.add(distFilePath);
          }
        }

        //-- copy assets
        const assetFiles = await resolveAssets(
          [
            { input: "public", glob: "**/*", output: "." },
            ...(this._opt.watch?.dev ? [{ input: "public-dev", glob: "**/*", output: "." }] : []),
          ],
          this._opt.pkgPath,
        );

        for (const assetFile of assetFiles) {
          const prevHash = this._outputHashCache.get(PathUtils.norm(assetFile.source));
          const currHash = HashUtils.get(FsUtils.readFileBuffer(assetFile.source));
          if (prevHash !== currHash) {
            FsUtils.copy(
              assetFile.source,
              path.resolve(this._opt.pkgPath, "dist", assetFile.destination),
            );
            this._outputHashCache.set(PathUtils.norm(assetFile.source), currHash);
            emitFileSet.add(PathUtils.norm(this._opt.pkgPath, "dist", assetFile.destination));
          }
        }
      } catch (err) {
        if (err != null && typeof err === "object" && "errors" in err) {
          esbuildResult = err as esbuild.BuildResult;
          for (const e of (err as esbuild.BuildFailure).errors) {
            if (e.detail != null) {
              this._logger.error(e.detail);
            }
          }
        } else {
          throw err;
        }
      }

      return {
        buildMessages: SdCliConvertMessageUtils.convertToBuildMessagesFromEsbuild(
          esbuildResult,
          this._opt.pkgPath,
        ),

        watchFileSet: this._resultCache.watchFileSet!,
        affectedFileSet: this._resultCache.affectedFileSet!,
        emitFileSet: emitFileSet,
      };
    }
  }
}
