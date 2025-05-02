import path from "path";
import esbuild, { Metafile } from "esbuild";
import { FsUtils, HashUtils, PathUtils, SdLogger, TNormPath } from "@simplysm/sd-core-node";
import { fileURLToPath } from "url";
import nodeStdLibBrowser from "node-stdlib-browser";
import nodeStdLibBrowserPlugin from "node-stdlib-browser/helpers/esbuild/plugin";
import browserslist from "browserslist";
import { SdNgBundlerContext } from "./sd-ng.bundler-context";
import { MemoryLoadResultCache } from "@angular/build/src/tools/esbuild/load-result-cache";
import {
  convertOutputFile,
  createOutputFile,
  transformSupportedBrowsersToTargets,
} from "@angular/build/src/tools/esbuild/utils";
import {
  BuildOutputFile,
  BuildOutputFileType,
  InitialFileRecord,
} from "@angular/build/src/tools/esbuild/bundler-context";
import { extractLicenses } from "@angular/build/src/tools/esbuild/license-extractor";
import {
  HintMode,
  IndexHtmlGenerator,
  IndexHtmlProcessResult,
} from "@angular/build/src/utils/index-file/index-html-generator";
import { Entrypoint } from "@angular/build/src/utils/index-file/augment-index-html";
import { CrossOrigin } from "@angular/build/src/builders/application/schema";
import { augmentAppWithServiceWorkerEsbuild } from "@angular/build/src/utils/service-worker";
import {
  createSourcemapIgnorelistPlugin,
} from "@angular/build/src/tools/esbuild/sourcemap-ignorelist-plugin";
import {
  StylesheetPluginFactory,
} from "@angular/build/src/tools/esbuild/stylesheets/stylesheet-plugin-factory";
import { SassStylesheetLanguage } from "@angular/build/src/tools/esbuild/stylesheets/sass-language";
import { CssStylesheetLanguage } from "@angular/build/src/tools/esbuild/stylesheets/css-language";
import {
  createCssResourcePlugin,
} from "@angular/build/src/tools/esbuild/stylesheets/css-resource-plugin";
import { resolveAssets } from "@angular/build/src/utils/resolve-assets";
import { createSdNgPlugin } from "./sd-ng.plugin-creator";
import { SdCliPerformanceTimer } from "../../utils/sd-cli-performance-time";
import { INpmConfig } from "../../types/common-configs.types";
import { ISdClientBuilderCordovaConfig } from "../../types/config.types";
import { ISdCliNgPluginResultCache } from "../../types/build-plugin.types";
import { ISdBuildMessage } from "../../types/build.types";
import nodeModule from "node:module";

export class SdNgBundler {
  private readonly _logger = SdLogger.get(["simplysm", "sd-cli", "SdNgBundler"]);

  private readonly _modifiedFileSet = new Set<TNormPath>();
  private readonly _ngResultCache: ISdCliNgPluginResultCache = {
    affectedFileSet: new Set<TNormPath>(),
    watchFileSet: new Set<TNormPath>(),
  };
  private readonly _styleLoadResultCache = new MemoryLoadResultCache();

  private _contexts: SdNgBundlerContext[] | undefined;

  private readonly _outputHashCache = new Map<TNormPath, string>();

  private readonly _pkgNpmConf: INpmConfig;
  private readonly _mainFilePath: string;
  private readonly _tsConfigFilePath: string;
  private readonly _swConfFilePath: string;
  private readonly _browserTarget: string[];
  private readonly _indexHtmlFilePath: string;
  private readonly _pkgName: string;
  private readonly _baseHref: string;

  public constructor(
    private _opt: {
      dev: boolean;
      outputPath: TNormPath;
      pkgPath: TNormPath;
      builderType: string;
      env: Record<string, string> | undefined;
      external: string[];
      cordovaConfig: ISdClientBuilderCordovaConfig | undefined;
      watchScopePaths: TNormPath[];
    },
  ) {
    this._pkgNpmConf = FsUtils.readJson(path.resolve(this._opt.pkgPath, "package.json"));
    this._mainFilePath = path.resolve(this._opt.pkgPath, "src/main.ts");
    this._tsConfigFilePath = path.resolve(this._opt.pkgPath, "tsconfig.json");
    this._swConfFilePath = path.resolve(this._opt.pkgPath, "ngsw-config.json");
    this._browserTarget = transformSupportedBrowsersToTargets(browserslist(["Chrome > 78"]));
    this._indexHtmlFilePath = path.resolve(this._opt.pkgPath, "src/index.html");
    this._pkgName = path.basename(this._opt.pkgPath);
    this._baseHref =
      this._opt.builderType === "web"
        ? `/${this._pkgName}/`
        : this._opt.dev
          ? `/${this._pkgName}/${this._opt.builderType}/`
          : ``;
  }

  public markForChanges(filePaths: string[]): void {
    for (const filePath of filePaths) {
      this._modifiedFileSet.add(PathUtils.norm(filePath));
      this._styleLoadResultCache.invalidate(PathUtils.norm(filePath));
    }
    // this._sourceFileCache.invalidate(filePaths);
  }

  public async bundleAsync(): Promise<{
    watchFileSet: Set<TNormPath>;
    affectedFileSet: Set<TNormPath>;
    results: ISdBuildMessage[];
    emitFileSet: Set<TNormPath>;
  }> {
    const perf = new SdCliPerformanceTimer("ng bundle");

    this._debug(`get contexts...`);

    if (!this._contexts) {
      this._contexts = perf.run("get contexts", () => [
        this._getAppContext(),
        ...FsUtils.exists(path.resolve(this._opt.pkgPath, "src/styles.scss")) ? [
          this._getStyleContext(),
        ] : [],
        ...(this._opt.builderType === "electron" ? [this._getElectronMainContext()] : []),
      ]);
    }

    this._debug(`build...`);

    const bundlingResults = await perf.run("build", async () => {
      return await this._contexts!.mapAsync(async (ctx) => await ctx.bundleAsync());
    });

    //-- results
    const results = bundlingResults.mapMany((bundlingResult) => bundlingResult.results);

    this._debug(`convert result...`);

    const outputFiles: BuildOutputFile[] = bundlingResults.mapMany(
      (item) => item.outputFiles?.map((file) => convertOutputFile(file, BuildOutputFileType.Root))
        ?? [],
    );
    const initialFiles = new Map<string, InitialFileRecord>();
    const metafile: {
      inputs: Metafile["inputs"];
      outputs: Metafile["outputs"];
    } = {
      inputs: {},
      outputs: {},
    };
    for (const bundlingResult of bundlingResults) {
      bundlingResult.initialFiles.forEach((v, k) => initialFiles.set(k, v));
      metafile.inputs = { ...metafile.inputs, ...bundlingResult.metafile?.inputs };
      metafile.outputs = { ...metafile.outputs, ...bundlingResult.metafile?.outputs };
    }
    const assetFiles: { source: string; destination: string }[] = [];

    //-- cordova empty
    /*if (this._opt.builderType === "cordova" && this._opt.cordovaConfig?.plugins) {
      outputFiles.push(createOutputFile("cordova-empty.js", "export default {};", BuildOutputFileType.Root));
    }*/

    this._debug(`create index.html...`);
    await perf.run("create index.html", async () => {
      const genIndexHtmlResult = await this._genIndexHtmlAsync(outputFiles, initialFiles);
      for (const warning of genIndexHtmlResult.warnings) {
        results.push({
          filePath: undefined,
          line: undefined,
          char: undefined,
          code: undefined,
          severity: "warning",
          message: `${warning}`,
          type: "gen-index",
        });
      }
      for (const error of genIndexHtmlResult.errors) {
        results.push({
          filePath: undefined,
          line: undefined,
          char: undefined,
          code: undefined,
          severity: "error",
          message: `${error}`,
          type: "gen-index",
        });
      }
      outputFiles.push(createOutputFile(
        "index.html",
        genIndexHtmlResult.csrContent,
        BuildOutputFileType.Root,
      ));
    });

    await perf.run("assets", async () => {
      //-- copy assets
      assetFiles.push(...(await this._copyAssetsAsync()));

      //-- extract 3rdpartylicenses
      if (!this._opt.dev) {
        outputFiles.push(
          createOutputFile(
            "3rdpartylicenses.txt",
            await extractLicenses(metafile, this._opt.pkgPath),
            BuildOutputFileType.Root,
          ),
        );
      }
    });

    //-- service worker
    if (FsUtils.exists(this._swConfFilePath)) {
      this._debug(`prepare service worker...`);

      await perf.run("prepare service worker", async () => {
        try {
          const serviceWorkerResult = await this._genServiceWorkerAsync(outputFiles, assetFiles);
          outputFiles.push(createOutputFile(
            "ngsw.json",
            serviceWorkerResult.manifest,
            BuildOutputFileType.Root,
          ));
          assetFiles.push(...serviceWorkerResult.assetFiles);
        }
        catch (err) {
          results.push({
            filePath: undefined,
            line: undefined,
            char: undefined,
            code: undefined,
            severity: "error",
            message: `${err.toString()}`,
            type: "gen-sw",
          });
        }
      });
    }

    //-- write
    this._debug(`write output files...(${outputFiles.length})`);

    const emitFileSet = new Set<TNormPath>();
    perf.run("write output file", () => {
      for (const outputFile of outputFiles) {
        const distFilePath = PathUtils.norm(this._opt.outputPath, outputFile.path);
        const prevHash = this._outputHashCache.get(distFilePath);
        const currHash = HashUtils.get(outputFile.contents);
        if (prevHash !== currHash) {
          FsUtils.writeFile(distFilePath, outputFile.contents);
          this._outputHashCache.set(
            distFilePath,
            Buffer.from(outputFile.contents).toString("base64"),
          );
          emitFileSet.add(PathUtils.norm(outputFile.path));
        }
      }
      for (const assetFile of assetFiles) {
        const prevHash = this._outputHashCache.get(PathUtils.norm(assetFile.source));
        const currHash = FsUtils.hash(assetFile.source);
        if (prevHash !== currHash) {
          FsUtils.copy(assetFile.source, path.resolve(this._opt.outputPath, assetFile.destination));
          this._outputHashCache.set(PathUtils.norm(assetFile.source), currHash);
          emitFileSet.add(PathUtils.norm(assetFile.destination));
        }
      }
    });

    this._debug(perf.toString());

    return {
      watchFileSet: new Set([
        ...this._ngResultCache.watchFileSet!,
        ...this._styleLoadResultCache.watchFiles.map((item) => PathUtils.norm(item)),
        ...assetFiles.map((item) => PathUtils.norm(item.source)),
        PathUtils.norm(this._indexHtmlFilePath),
      ]),
      affectedFileSet: this._ngResultCache.affectedFileSet!,
      results,
      emitFileSet: emitFileSet,
    };
  }

  private async _genIndexHtmlAsync(
    outputFiles: esbuild.OutputFile[],
    initialFiles: Map<string, InitialFileRecord>,
  ): Promise<IndexHtmlProcessResult> {
    const readAsset = (filePath: string): Promise<string> => {
      const relFilePath = path.relative("/", filePath);
      const currFile = outputFiles.find((outputFile) => outputFile.path === relFilePath);
      if (currFile) {
        return Promise.resolve(currFile.text);
      }

      throw new Error(`Output file does not exist: ${relFilePath}`);
    };

    const indexHtmlGenerator = new IndexHtmlGenerator({
      indexPath: this._indexHtmlFilePath,
      entrypoints: [
        ["polyfills", true],
        ["styles", false],
        ["main", true],
        ...(this._opt.builderType === "cordova" ? [
          ["cordova-entry", true] as Entrypoint,
        ] : []),
      ],
      sri: false,
      optimization: {
        scripts: !this._opt.dev,
        styles: {
          minify: !this._opt.dev,
          inlineCritical: !this._opt.dev,
          removeSpecialComments: !this._opt.dev,
        },
        fonts: { inline: !this._opt.dev },
      },
      crossOrigin: CrossOrigin.None,
      generateDedicatedSSRContent: false,
    });
    indexHtmlGenerator.readAsset = readAsset;

    const modulePreloads: { url: string; mode: HintMode; depth: number }[] = [];
    const hints: { url: string; mode: HintMode; as?: string }[] = [];
    if (!this._opt.dev) {
      for (const [key, value] of initialFiles) {
        if (value.entrypoint || value.serverFile) {
          continue;
        }

        if (value.type === "script") {
          modulePreloads.push({ url: key, mode: "modulepreload" as const, depth: value.depth });
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        else if (value.type === "style") {
          hints.push({ url: key, mode: "preload" as const, as: "style" });
        }
      }
      modulePreloads.sort((a, b) => a.depth - b.depth);
      hints.push(...modulePreloads.slice(0, 10));
    }

    return await indexHtmlGenerator.process({
      baseHref: this._baseHref,
      lang: undefined,
      outputPath: "/",
      files: [...initialFiles].map(([file, record]) => ({
        name: record.name ?? "",
        file,
        extension: path.extname(file),
      })),
      hints,
    });
  }

  private async _copyAssetsAsync(): Promise<
    {
      source: string;
      destination: string;
    }[]
  > {
    return await resolveAssets(
      [
        { input: "public", glob: "**/*", output: "." },
        ...(this._opt.dev ? [{ input: "public-dev", glob: "**/*", output: "." }] : []),
        ...(this._opt.dev && this._opt.builderType === "cordova"
          ? Object.keys(this._opt.cordovaConfig?.platform ?? { browser: {} })
            .mapMany((platform) => [
              {
                input: `.cordova/platforms/${platform}/platform_www/plugins`,
                glob: "**/*",
                output: `cordova-${platform}/plugins`,
              },
              {
                input: `.cordova/platforms/${platform}/platform_www`,
                glob: "cordova.js",
                output: `cordova-${platform}`,
              },
              {
                input: `.cordova/platforms/${platform}/platform_www`,
                glob: "cordova_plugins.js",
                output: `cordova-${platform}`,
              },
              {
                input: `.cordova/platforms/${platform}/www`,
                glob: "config.xml",
                output: `cordova-${platform}`,
              },
            ])
          : []),
      ],
      this._opt.pkgPath,
    );
  }

  private async _genServiceWorkerAsync(
    outputFiles: BuildOutputFile[],
    assetFiles: {
      source: string;
      destination: string;
    }[],
  ): Promise<{
    manifest: string;
    assetFiles: {
      source: string;
      destination: string;
    }[];
  }> {
    return await augmentAppWithServiceWorkerEsbuild(
      this._opt.pkgPath,
      this._swConfFilePath,
      this._baseHref,
      "index.html",
      outputFiles,
      assetFiles,
    );
  }

  private _getAppContext() {
    const workerEntries = FsUtils.glob(path.resolve(this._opt.pkgPath, "src/workers/*.ts"))
      .toObject(
        (p) => "workers/" + path.basename(p, path.extname(p)),
      );

    return new SdNgBundlerContext(this._opt.pkgPath, {
      absWorkingDir: this._opt.pkgPath,
      bundle: true,
      keepNames: true,
      assetNames: "media/[name]",
      conditions: ["es2020", "es2015", "module"],
      resolveExtensions: [".js", ".mjs", ".cjs", ".ts"],
      metafile: true,
      legalComments: this._opt.dev ? "eof" : "none",
      logLevel: "silent",
      minifyIdentifiers: !this._opt.dev,
      minifySyntax: !this._opt.dev,
      minifyWhitespace: !this._opt.dev,
      pure: ["forwardRef"],
      outdir: this._opt.pkgPath,
      outExtension: undefined,
      sourcemap: this._opt.dev,
      chunkNames: "[name]-[hash]",
      tsconfig: this._tsConfigFilePath,
      write: false,
      preserveSymlinks: false,
      define: {
        ...(!this._opt.dev ? { ngDevMode: "false" } : {}),
        "ngJitMode": "false",
        "global": "global",
        "process": "process",
        "Buffer": "Buffer",
        "process.env.SD_VERSION": JSON.stringify(this._pkgNpmConf.version),
        "process.env.NODE_ENV": JSON.stringify(this._opt.dev ? "development" : "production"),
        ...(this._opt.env
          ? Object.keys(this._opt.env).toObject(
            (key) => `process.env.${key}`,
            (key) => JSON.stringify(this._opt.env![key]),
          )
          : {}),
      },
      mainFields: ["es2020", "es2015", "browser", "module", "main"],
      entryNames: "[dir]/[name]",
      entryPoints: {
        main: this._mainFilePath,
        ...FsUtils.exists(path.resolve(this._opt.pkgPath, "src/polyfills.ts")) ? {
          polyfills: path.resolve(this._opt.pkgPath, "src/polyfills.ts"),
        } : {},

        ...(this._opt.builderType === "cordova"
          ? {
            "cordova-entry": path.resolve(
              path.dirname(fileURLToPath(import.meta.url)),
              `../../../lib/cordova-entry.js`,
            ),
          }
          : {}),
        ...workerEntries,
      },
      supported: { "async-await": false, "object-rest-spread": false },
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
      ...(this._opt.builderType === "electron"
        ? {
          platform: "node",
          target: "node20",
          external: ["electron", ...nodeModule.builtinModules, ...this._opt.external],
        }
        : {
          platform: "browser",
          target: this._browserTarget,
          format: "esm",
          splitting: true,
          inject: [
            PathUtils.posix(fileURLToPath(import.meta.resolve(
              "node-stdlib-browser/helpers/esbuild/shim"))),
          ],
        }),
      plugins: [
        createSourcemapIgnorelistPlugin(),
        createSdNgPlugin({
          modifiedFileSet: this._modifiedFileSet,
          dev: this._opt.dev,
          pkgPath: this._opt.pkgPath,
          result: this._ngResultCache,
          watchScopePaths: this._opt.watchScopePaths,
        }),
        ...(this._opt.builderType === "electron"
          ? []
          : [nodeStdLibBrowserPlugin(nodeStdLibBrowser)]),
        // {
        //   name: "log-circular",
        //   setup(build) {
        //     build.onEnd(result => {
        //       if (result.metafile) {
        //         const analysis = esbuild.analyzeMetafile(result.metafile);
        //         console.log(analysis);
        //       }
        //     });
        //   },
        // },
      ],
    });
  }

  private _getStyleContext(): SdNgBundlerContext {
    const pluginFactory = new StylesheetPluginFactory(
      {
        sourcemap: this._opt.dev,
        includePaths: [],
      },
      this._styleLoadResultCache,
    );

    return new SdNgBundlerContext(this._opt.pkgPath, {
      absWorkingDir: this._opt.pkgPath,
      bundle: true,
      entryNames: "[name]",
      assetNames: "media/[name]",
      logLevel: "silent",
      minify: !this._opt.dev,
      metafile: true,
      sourcemap: this._opt.dev,
      outdir: this._opt.pkgPath,
      write: false,
      platform: "browser",
      target: this._browserTarget,
      preserveSymlinks: false,
      external: [],
      conditions: ["style", "sass"],
      mainFields: ["style", "sass"],
      legalComments: !this._opt.dev ? "none" : "eof",
      entryPoints: {
        styles: path.resolve(this._opt.pkgPath, "src/styles.scss"),
      },
      plugins: [
        pluginFactory.create(SassStylesheetLanguage),
        pluginFactory.create(CssStylesheetLanguage),
        createCssResourcePlugin(this._styleLoadResultCache),
      ],
    });
  }

  private _getElectronMainContext() {
    return new SdNgBundlerContext(this._opt.pkgPath, {
      absWorkingDir: this._opt.pkgPath,
      bundle: true,
      entryNames: "[name]",
      assetNames: "media/[name]",
      conditions: ["es2020", "es2015", "module"],
      resolveExtensions: [".js", ".mjs", ".cjs", ".ts"],
      metafile: true,
      legalComments: this._opt.dev ? "eof" : "none",
      logLevel: "silent",
      minify: !this._opt.dev,
      outdir: this._opt.pkgPath,
      sourcemap: this._opt.dev,
      tsconfig: this._tsConfigFilePath,
      write: false,
      preserveSymlinks: false,
      external: ["electron"],
      define: {
        ...(!this._opt.dev ? { ngDevMode: "false" } : {}),
        "process.env.SD_VERSION": JSON.stringify(this._pkgNpmConf.version),
        "process.env.NODE_ENV": JSON.stringify(this._opt.dev ? "development" : "production"),
        ...(this._opt.env
          ? Object.keys(this._opt.env).toObject(
            (key) => `process.env.${key}`,
            (key) => JSON.stringify(this._opt.env![key]),
          )
          : {}),
      },
      platform: "node",
      entryPoints: {
        "electron-main": path.resolve(this._opt.pkgPath, "src/electron-main.ts"),
      },
    });
  }

  private _debug(...msg: any[]): void {
    this._logger.debug(`[${path.basename(this._opt.pkgPath)}]`, ...msg);
  }
}
