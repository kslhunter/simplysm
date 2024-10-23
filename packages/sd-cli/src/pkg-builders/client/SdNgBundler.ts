import path from "path";
import esbuild, { Metafile } from "esbuild";
import { FsUtil, Logger, PathUtil, TNormPath } from "@simplysm/sd-core-node";
import { fileURLToPath } from "url";
import nodeStdLibBrowser from "node-stdlib-browser";
import nodeStdLibBrowserPlugin from "node-stdlib-browser/helpers/esbuild/plugin";
import browserslist from "browserslist";
import { SdNgBundlerContext } from "./SdNgBundlerContext";
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
import { createSourcemapIgnorelistPlugin } from "@angular/build/src/tools/esbuild/sourcemap-ignorelist-plugin";
import { StylesheetPluginFactory } from "@angular/build/src/tools/esbuild/stylesheets/stylesheet-plugin-factory";
import { SassStylesheetLanguage } from "@angular/build/src/tools/esbuild/stylesheets/sass-language";
import { CssStylesheetLanguage } from "@angular/build/src/tools/esbuild/stylesheets/css-language";
import { createCssResourcePlugin } from "@angular/build/src/tools/esbuild/stylesheets/css-resource-plugin";
import { resolveAssets } from "@angular/build/src/utils/resolve-assets";
import { createSdNgPlugin } from "./createSdNgPlugin";
import { SdCliPerformanceTimer } from "../../utils/SdCliPerformanceTime";
import { INpmConfig } from "../../types/common-configs.type";
import { ISdClientBuilderCordovaConfig } from "../../types/sd-configs.type";
import { ISdCliNgPluginResultCache } from "../../types/build-plugin.type";
import { ISdBuildMessage } from "../../types/build.type";
import nodeModule from "node:module";

export class SdNgBundler {
  readonly #logger = Logger.get(["simplysm", "sd-cli", "SdNgBundler"]);

  readonly #modifiedFileSet = new Set<TNormPath>();
  readonly #ngResultCache: ISdCliNgPluginResultCache = {
    affectedFileSet: new Set<TNormPath>(),
    watchFileSet: new Set<TNormPath>(),
  };
  readonly #styleLoadResultCache = new MemoryLoadResultCache();

  #contexts: SdNgBundlerContext[] | undefined;

  readonly #outputCache = new Map<TNormPath, string | number>();

  readonly #pkgNpmConf: INpmConfig;
  readonly #mainFilePath: string;
  readonly #tsConfigFilePath: string;
  readonly #swConfFilePath: string;
  readonly #browserTarget: string[];
  readonly #indexHtmlFilePath: string;
  readonly #pkgName: string;
  readonly #baseHref: string;

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
    this.#pkgNpmConf = FsUtil.readJson(path.resolve(this._opt.pkgPath, "package.json"));
    this.#mainFilePath = path.resolve(this._opt.pkgPath, "src/main.ts");
    this.#tsConfigFilePath = path.resolve(this._opt.pkgPath, "tsconfig.json");
    this.#swConfFilePath = path.resolve(this._opt.pkgPath, "ngsw-config.json");
    this.#browserTarget = transformSupportedBrowsersToTargets(browserslist(["Chrome > 78"]));
    this.#indexHtmlFilePath = path.resolve(this._opt.pkgPath, "src/index.html");
    this.#pkgName = path.basename(this._opt.pkgPath);
    this.#baseHref =
      this._opt.builderType === "web"
        ? `/${this.#pkgName}/`
        : this._opt.dev
          ? `/${this.#pkgName}/${this._opt.builderType}/`
          : ``;
  }

  public markForChanges(filePaths: string[]): void {
    for (const filePath of filePaths) {
      this.#modifiedFileSet.add(PathUtil.norm(filePath));
      this.#styleLoadResultCache.invalidate(PathUtil.norm(filePath));
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

    this.#debug(`get contexts...`);

    if (!this.#contexts) {
      this.#contexts = perf.run("get contexts", () => [
        this._getAppContext(),
        this._getStyleContext(),
        ...(this._opt.builderType === "electron" ? [this._getElectronMainContext()] : []),
      ]);
    }

    this.#debug(`build...`);

    const bundlingResults = await perf.run("build", async () => {
      return await this.#contexts!.mapAsync(async (ctx) => await ctx.bundleAsync());
    });

    //-- results
    const results = bundlingResults.mapMany((bundlingResult) => bundlingResult.results);

    this.#debug(`convert result...`);

    const outputFiles: BuildOutputFile[] = bundlingResults.mapMany(
      (item) => item.outputFiles?.map((file) => convertOutputFile(file, BuildOutputFileType.Root)) ?? [],
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

    this.#debug(`create index.html...`);
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
      outputFiles.push(createOutputFile("index.html", genIndexHtmlResult.csrContent, BuildOutputFileType.Root));
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
    if (FsUtil.exists(this.#swConfFilePath)) {
      this.#debug(`prepare service worker...`);

      await perf.run("prepare service worker", async () => {
        try {
          const serviceWorkerResult = await this._genServiceWorkerAsync(outputFiles, assetFiles);
          outputFiles.push(createOutputFile("ngsw.json", serviceWorkerResult.manifest, BuildOutputFileType.Root));
          assetFiles.push(...serviceWorkerResult.assetFiles);
        } catch (err) {
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
    this.#debug(`write output files...(${outputFiles.length})`);

    const emitFileSet = new Set<TNormPath>();
    perf.run("write output file", () => {
      for (const outputFile of outputFiles) {
        const distFilePath = PathUtil.norm(this._opt.outputPath, outputFile.path);
        const prev = this.#outputCache.get(distFilePath);
        if (prev !== Buffer.from(outputFile.contents).toString("base64")) {
          FsUtil.writeFile(distFilePath, outputFile.contents);
          this.#outputCache.set(distFilePath, Buffer.from(outputFile.contents).toString("base64"));
          emitFileSet.add(PathUtil.norm(outputFile.path));
        }
      }
      for (const assetFile of assetFiles) {
        const prev = this.#outputCache.get(PathUtil.norm(assetFile.source));
        const curr = FsUtil.lstat(assetFile.source).mtime.getTime();
        if (prev !== curr) {
          FsUtil.copy(assetFile.source, path.resolve(this._opt.outputPath, assetFile.destination));
          this.#outputCache.set(PathUtil.norm(assetFile.source), curr);
          emitFileSet.add(PathUtil.norm(assetFile.destination));
        }
      }
    });

    this.#debug(perf.toString());

    return {
      watchFileSet: new Set([
        ...this.#ngResultCache.watchFileSet!,
        ...this.#styleLoadResultCache.watchFiles.map((item) => PathUtil.norm(item)),
        ...assetFiles.map((item) => PathUtil.norm(item.source)),
        PathUtil.norm(this.#indexHtmlFilePath),
      ]),
      affectedFileSet: this.#ngResultCache.affectedFileSet!,
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
      indexPath: this.#indexHtmlFilePath,
      entrypoints: [
        ["polyfills", true],
        ["styles", false],
        ["main", true],
        ...(this._opt.builderType === "cordova" ? [["cordova-entry", true] as Entrypoint] : []),
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
      baseHref: this.#baseHref,
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
          ? Object.keys(this._opt.cordovaConfig?.platform ?? { browser: {} }).mapMany((platform) => [
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
      this.#swConfFilePath,
      this.#baseHref,
      "index.html",
      outputFiles,
      assetFiles,
    );
  }

  private _getAppContext() {
    const workerEntries = FsUtil.glob(path.resolve(this._opt.pkgPath, "src/workers/*.ts")).toObject(
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
      tsconfig: this.#tsConfigFilePath,
      write: false,
      preserveSymlinks: false,
      define: {
        ...(!this._opt.dev ? { ngDevMode: "false" } : {}),
        "ngJitMode": "false",
        "global": "global",
        "process": "process",
        "Buffer": "Buffer",
        "process.env.SD_VERSION": JSON.stringify(this.#pkgNpmConf.version),
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
        main: this.#mainFilePath,
        // polyfills: 'angular:polyfills',
        // TODO: Polyfills Bundler 분리
        polyfills: path.resolve(this._opt.pkgPath, "src/polyfills.ts"),
        ...(this._opt.builderType === "cordova"
          ? {
              "cordova-entry": path.resolve(
                path.dirname(fileURLToPath(import.meta.url)),
                `../../../lib/cordova-entry.js`,
              ),
            }
          : {}),

        // TODO: Workers Bundler 분리
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
            target: this.#browserTarget,
            format: "esm",
            splitting: true,
            inject: [PathUtil.posix(fileURLToPath(import.meta.resolve("node-stdlib-browser/helpers/esbuild/shim")))],
          }),
      plugins: [
        /*...(this._opt.builderType === "cordova" && this._opt.cordovaConfig?.plugins
          ? [
              {
                name: "cordova:plugin-empty",
                setup: ({ onResolve }) => {
                  onResolve({ filter: new RegExp("(" + this._opt.cordovaConfig!.plugins!.join("|") + ")") }, () => {
                    return {
                      path: `./cordova-empty.js`,
                      external: true,
                    };
                  });
                },
              },
            ]
          : []),*/
        // createVirtualModulePlugin({
        //   namespace: "angular:polyfills",
        //   loadContent: () => ({
        //     contents: `import "./src/polyfills.ts";`,
        //     loader: 'js',
        //     resolveDir: this._opt.pkgPath
        //   })
        // }) as esbuild.Plugin,
        createSourcemapIgnorelistPlugin(),
        createSdNgPlugin({
          modifiedFileSet: this.#modifiedFileSet,
          dev: this._opt.dev,
          pkgPath: this._opt.pkgPath,
          result: this.#ngResultCache,
          watchScopePaths: this._opt.watchScopePaths,
        }),
        // createCompilerPlugin({
        //   sourcemap: this._opt.dev,
        //   tsconfig: this._tsConfigFilePath,
        //   jit: false,
        //   advancedOptimizations: true,
        //   thirdPartySourcemaps: false,
        //   fileReplacements: undefined,
        //   sourceFileCache: this._sourceFileCache,
        //   loadResultCache: this._sourceFileCache.loadResultCache,
        //   incremental: this._opt.dev
        // }, {
        //   workspaceRoot: this._opt.pkgPath,
        //   optimization: !this._opt.dev,
        //   sourcemap: this._opt.dev ? 'inline' : false,
        //   outputNames: {bundles: '[name]', media: 'media/[name]'},
        //   includePaths: [],
        //   externalDependencies: [],
        //   target: this._browserTarget,
        //   inlineStyleLanguage: 'scss',
        //   preserveSymlinks: false,
        //   tailwindConfiguration: undefined
        // }) as esbuild.Plugin,
        ...(this._opt.builderType === "electron" ? [] : [nodeStdLibBrowserPlugin(nodeStdLibBrowser)]),
        // {
        //   name: "sd-load-file",
        //   setup: ({onLoad}) => {
        //     onLoad({filter: /.*/}, (args) => {
        //       this.#loadFilePathSet.add(args.path);
        //       return null;
        //     });
        //   }
        // }
      ],
    });
  }

  private _getStyleContext(): SdNgBundlerContext {
    const pluginFactory = new StylesheetPluginFactory(
      {
        sourcemap: this._opt.dev,
        includePaths: [],
      },
      this.#styleLoadResultCache,
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
      target: this.#browserTarget,
      preserveSymlinks: false,
      external: [],
      conditions: ["style", "sass"],
      mainFields: ["style", "sass"],
      legalComments: !this._opt.dev ? "none" : "eof",
      entryPoints: {
        // styles: 'angular:styles/global;styles'
        styles: path.resolve(this._opt.pkgPath, "src/styles.scss"),
      },
      plugins: [
        // createVirtualModulePlugin({
        //   namespace: "angular:styles/global",
        //   transformPath: (currPath) => currPath.split(';', 2)[1],
        //   loadContent: () => ({
        //     contents: `@import 'src/styles.scss';`,
        //     loader: 'css',
        //     resolveDir: this._opt.pkgPath
        //   }),
        // }) as esbuild.Plugin,
        pluginFactory.create(SassStylesheetLanguage) as esbuild.Plugin,
        pluginFactory.create(CssStylesheetLanguage) as esbuild.Plugin,
        createCssResourcePlugin(this.#styleLoadResultCache) as esbuild.Plugin,
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
      tsconfig: this.#tsConfigFilePath,
      write: false,
      preserveSymlinks: false,
      external: ["electron"],
      define: {
        ...(!this._opt.dev ? { ngDevMode: "false" } : {}),
        "process.env.SD_VERSION": JSON.stringify(this.#pkgNpmConf.version),
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

  #debug(...msg: any[]): void {
    this.#logger.debug(`[${path.basename(this._opt.pkgPath)}]`, ...msg);
  }
}
