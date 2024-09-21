import path from "path";
import esbuild, {Metafile} from "esbuild";
import {FsUtil, Logger, PathUtil} from "@simplysm/sd-core-node";
import {fileURLToPath} from "url";
import nodeStdLibBrowser from "node-stdlib-browser";
import nodeStdLibBrowserPlugin from "node-stdlib-browser/helpers/esbuild/plugin";
import {INpmConfig, ISdCliClientBuilderCordovaConfig, ISdCliPackageBuildResult} from "../commons";
import browserslist from "browserslist";
import {SdNgBundlerContext} from "./SdNgBundlerContext";
import {INgPluginResultCache, sdNgPlugin} from "../bundle-plugins/sdNgPlugin";
import ts from "typescript";
import {MemoryLoadResultCache} from "@angular/build/src/tools/esbuild/load-result-cache";
import {
  convertOutputFile,
  createOutputFile,
  transformSupportedBrowsersToTargets
} from "@angular/build/src/tools/esbuild/utils";
import {
  BuildOutputFile,
  BuildOutputFileType,
  InitialFileRecord
} from "@angular/build/src/tools/esbuild/bundler-context";
import {extractLicenses} from "@angular/build/src/tools/esbuild/license-extractor";
import {
  HintMode,
  IndexHtmlGenerator,
  IndexHtmlProcessResult
} from "@angular/build/src/utils/index-file/index-html-generator";
import {Entrypoint} from "@angular/build/src/utils/index-file/augment-index-html";
import {CrossOrigin} from "@angular/build/src/builders/application/schema";
import {InlineCriticalCssProcessor} from "@angular/build/src/utils/index-file/inline-critical-css";
import {augmentAppWithServiceWorkerEsbuild} from "@angular/build/src/utils/service-worker";
import {createSourcemapIgnorelistPlugin} from "@angular/build/src/tools/esbuild/sourcemap-ignorelist-plugin";
import {StylesheetPluginFactory} from "@angular/build/src/tools/esbuild/stylesheets/stylesheet-plugin-factory";
import {SassStylesheetLanguage} from "@angular/build/src/tools/esbuild/stylesheets/sass-language";
import {CssStylesheetLanguage} from "@angular/build/src/tools/esbuild/stylesheets/css-language";
import {createCssResourcePlugin} from "@angular/build/src/tools/esbuild/stylesheets/css-resource-plugin";
import {resolveAssets} from "@angular/build/src/utils/resolve-assets";

export class SdNgBundler {
  readonly #logger = Logger.get(["simplysm", "sd-cli", "SdNgBundler"]);

  // private readonly _sourceFileCache = new SourceFileCache(
  //   path.resolve(this.#opt.pkgPath, ".cache")
  // );

  readonly #modifiedFileSet = new Set<string>();
  readonly #ngResultCache: INgPluginResultCache = {
    affectedFileSet: new Set<string>(),
    watchFileSet: new Set<string>()
  };
  readonly #styleLoadResultCache = new MemoryLoadResultCache();

  #contexts: SdNgBundlerContext[] | undefined;

  readonly #outputCache = new Map<string, string | number>();

  readonly #opt: IOptions;

  readonly #pkgNpmConf: INpmConfig;
  readonly #mainFilePath: string;
  readonly #tsConfigFilePath: string;
  readonly #swConfFilePath: string;
  readonly #browserTarget: string[];
  readonly #indexHtmlFilePath: string;
  readonly #pkgName: string;
  readonly #baseHref: string;

  // #loadFilePathSet = new Set<string>();

  public constructor(opt: IOptions) {
    this.#opt = opt;
    this.#pkgNpmConf = FsUtil.readJson(path.resolve(opt.pkgPath, "package.json"));
    this.#mainFilePath = path.resolve(opt.pkgPath, "src/main.ts");
    this.#tsConfigFilePath = path.resolve(opt.pkgPath, "tsconfig.json");
    this.#swConfFilePath = path.resolve(opt.pkgPath, "ngsw-config.json");
    this.#browserTarget = transformSupportedBrowsersToTargets(browserslist(["Chrome > 78"]));
    this.#indexHtmlFilePath = path.resolve(opt.pkgPath, "src/index.html");
    this.#pkgName = path.basename(opt.pkgPath);
    this.#baseHref = opt.builderType === "web" ? `/${this.#pkgName}/` : opt.dev ? `/${this.#pkgName}/${opt.builderType}/` : ``;
  }

  public markForChanges(filePaths: string[]): void {
    for (const filePath of filePaths) {
      this.#modifiedFileSet.add(path.normalize(filePath));
      this.#styleLoadResultCache.invalidate(path.normalize(filePath));
    }
    // this._sourceFileCache.invalidate(filePaths);
  }

  public async bundleAsync(): Promise<{
    program?: ts.Program;
    watchFileSet: Set<string>,
    affectedFileSet: Set<string>,
    results: ISdCliPackageBuildResult[]
  }> {
    this.#debug(`get contexts...`);

    if (!this.#contexts) {
      this.#contexts = [
        this._getAppContext(),
        this._getStyleContext(),
        ...this.#opt.builderType === "electron" ? [
          this._getElectronMainContext()
        ] : []
      ];
    }

    this.#debug(`build...`);

    const bundlingResults = await this.#contexts.mapAsync(async (ctx, i) => await ctx.bundleAsync());

    //-- results
    const results = bundlingResults.mapMany(bundlingResult => bundlingResult.results);

    this.#debug(`convert result...`);

    const outputFiles: BuildOutputFile[] = bundlingResults.mapMany(item => item.outputFiles?.map(file => convertOutputFile(file, BuildOutputFileType.Root)) ?? []);
    const initialFiles = new Map<string, InitialFileRecord>();
    const metafile: {
      inputs: Metafile["inputs"],
      outputs: Metafile["outputs"]
    } = {
      inputs: {},
      outputs: {}
    };
    for (const bundlingResult of bundlingResults) {
      bundlingResult.initialFiles.forEach((v, k) => initialFiles.set(k, v));
      metafile.inputs = {...metafile.inputs, ...bundlingResult.metafile?.inputs};
      metafile.outputs = {...metafile.outputs, ...bundlingResult.metafile?.outputs};
    }
    const assetFiles: { source: string; destination: string }[] = [];

    //-- cordova empty
    if (this.#opt.builderType === "cordova" && this.#opt.cordovaConfig?.plugins) {
      outputFiles.push(createOutputFile("cordova-empty.js", "export default {};", BuildOutputFileType.Root));
    }

    this.#debug(`create index.html...`);

    const genIndexHtmlResult = await this._genIndexHtmlAsync(outputFiles, initialFiles);
    for (const warning of genIndexHtmlResult.warnings) {
      results.push({
        filePath: undefined,
        line: undefined,
        char: undefined,
        code: undefined,
        severity: "warning",
        message: `(gen-index) ${warning}`,
        type: "build",
      });
    }
    for (const error of genIndexHtmlResult.errors) {
      results.push({
        filePath: undefined,
        line: undefined,
        char: undefined,
        code: undefined,
        severity: "error",
        message: `(gen-index) ${error}`,
        type: "build",
      });
    }
    outputFiles.push(createOutputFile("index.html", genIndexHtmlResult.csrContent, BuildOutputFileType.Root));

    //-- copy assets
    assetFiles.push(...(await this._copyAssetsAsync()));

    //-- extract 3rdpartylicenses
    if (!this.#opt.dev) {
      outputFiles.push(createOutputFile('3rdpartylicenses.txt', await extractLicenses(metafile, this.#opt.pkgPath), BuildOutputFileType.Root));
    }

    //-- service worker
    if (FsUtil.exists(this.#swConfFilePath)) {
      this.#debug(`prepare service worker...`);

      try {
        const serviceWorkerResult = await this._genServiceWorkerAsync(outputFiles, assetFiles);
        outputFiles.push(createOutputFile('ngsw.json', serviceWorkerResult.manifest, BuildOutputFileType.Root));
        assetFiles.push(...serviceWorkerResult.assetFiles);
      }
      catch (err) {
        results.push({
          filePath: undefined,
          line: undefined,
          char: undefined,
          code: undefined,
          severity: "error",
          message: `(gen-sw) ${err.toString()}`,
          type: "build",
        });
      }
    }

    //-- write
    this.#debug(`write output files...(${outputFiles.length})`);

    for (const outputFile of outputFiles) {
      const distFilePath = path.resolve(this.#opt.outputPath, outputFile.path);
      const prev = this.#outputCache.get(distFilePath);
      if (prev !== Buffer.from(outputFile.contents).toString("base64")) {
        await FsUtil.writeFileAsync(distFilePath, outputFile.contents);
        this.#outputCache.set(distFilePath, Buffer.from(outputFile.contents).toString("base64"));
      }
    }
    for (const assetFile of assetFiles) {
      const prev = this.#outputCache.get(assetFile.source);
      const curr = FsUtil.lstat(assetFile.source).mtime.getTime();
      if (prev !== curr) {
        await FsUtil.copyAsync(assetFile.source, path.resolve(this.#opt.outputPath, assetFile.destination));
        this.#outputCache.set(assetFile.source, curr);
      }
    }

    this.#debug(`번들링중 영향받은 파일`, Array.from(this.#ngResultCache.affectedFileSet!));

    return {
      program: this.#ngResultCache.program,
      watchFileSet: new Set([
        ...this.#ngResultCache.watchFileSet!,
        ...this.#styleLoadResultCache.watchFiles,
        this.#indexHtmlFilePath
      ]),
      affectedFileSet: this.#ngResultCache.affectedFileSet!,
      results
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
        ['runtime', true],
        ['polyfills', true],
        ['styles', false],
        ['vendor', true],
        ['main', true],
        ...this.#opt.builderType === "cordova" ? [
          ["cordova-entry", true] as Entrypoint
        ] : []
      ],
      optimization: {
        scripts: !this.#opt.dev,
        fonts: {inline: !this.#opt.dev},
        styles: {
          minify: !this.#opt.dev,
          inlineCritical: false
        },
      },
      crossOrigin: CrossOrigin.None,
    });
    indexHtmlGenerator.readAsset = readAsset;

    const hints: { url: string; mode: HintMode; as?: string; }[] = [];
    if (!this.#opt.dev) {
      for (const [key, value] of initialFiles) {
        if (value.entrypoint) {
          continue;
        }

        if (value.type === 'script') {
          hints.push({url: key, mode: 'modulepreload' as const});
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        else if (value.type === 'style') {
          hints.push({url: key, mode: 'preload' as const, as: 'style'});
        }
      }
    }

    const transformResult = await indexHtmlGenerator.process({
      baseHref: this.#baseHref,
      lang: undefined,
      outputPath: "/",
      files: [...initialFiles].map(([file, record]) => ({
        name: record.name ?? '',
        file,
        extension: path.extname(file),
      })),
      hints,
    });

    if (this.#opt.dev) {
      return transformResult;
    }
    else {
      const inlineCriticalCssProcessor = new InlineCriticalCssProcessor({
        minify: false,
        readAsset,
      });
      const {content, errors, warnings} = await inlineCriticalCssProcessor.process(
        transformResult.csrContent,
        {outputPath: "/",},
      );

      return {
        warnings: [...transformResult.warnings, ...warnings],
        errors: [...transformResult.errors, ...errors],
        csrContent: content
      };
    }
  }

  //TODO: index.html  파일에 manifest.json 정보 추가? manifest.webmanifest ? PWA?
  private async _copyAssetsAsync(): Promise<{
    source: string;
    destination: string;
  }[]> {
    return await resolveAssets([
      {input: 'src', glob: 'favicon.ico', output: ''},
      {input: 'src', glob: 'manifest.webmanifest', output: ''},
      {input: 'src', glob: 'manifest.json', output: ''},
      {input: 'src/assets', glob: '**/*', output: 'assets'},
      ...this.#opt.dev && this.#opt.builderType === "cordova" ? Object.keys(this.#opt.cordovaConfig?.platform ?? {browser: {}}).mapMany((platform) => [
        {
          input: `.cordova/platforms/${platform}/platform_www/plugins`,
          glob: '**/*',
          output: `cordova-${platform}/plugins`
        },
        {
          input: `.cordova/platforms/${platform}/platform_www`,
          glob: 'cordova.js',
          output: `cordova-${platform}`
        },
        {
          input: `.cordova/platforms/${platform}/platform_www`,
          glob: 'cordova_plugins.js',
          output: `cordova-${platform}`
        },
        {
          input: `.cordova/platforms/${platform}/www`,
          glob: 'config.xml',
          output: `cordova-${platform}`
        },
      ]) : []
    ], this.#opt.pkgPath);
  }

  private async _genServiceWorkerAsync(
    outputFiles: BuildOutputFile[],
    assetFiles: {
      source: string;
      destination: string;
    }[]
  ): Promise<{
    manifest: string;
    assetFiles: {
      source: string;
      destination: string;
    }[];
  }> {
    return await augmentAppWithServiceWorkerEsbuild(
      this.#opt.pkgPath,
      this.#swConfFilePath,
      this.#baseHref,
      "index.html",
      outputFiles,
      assetFiles
    );
  }

  private _getAppContext() {
    return new SdNgBundlerContext(this.#opt.pkgPath, {
      absWorkingDir: this.#opt.pkgPath,
      bundle: true,
      keepNames: true,
      format: 'esm',
      assetNames: 'media/[name]',
      conditions: ['es2020', 'es2015', 'module'],
      resolveExtensions: [".js", ".mjs", ".cjs", ".ts"],
      metafile: true,
      legalComments: this.#opt.dev ? 'eof' : 'none',
      logLevel: 'silent',
      minifyIdentifiers: !this.#opt.dev,
      minifySyntax: !this.#opt.dev,
      minifyWhitespace: !this.#opt.dev,
      pure: ['forwardRef'],
      outdir: this.#opt.pkgPath,
      outExtension: undefined,
      sourcemap: true, //this.#opt.dev,
      splitting: true,
      chunkNames: '[name]-[hash]',
      tsconfig: this.#tsConfigFilePath,
      write: false,
      preserveSymlinks: false,
      define: {
        ...!this.#opt.dev ? {ngDevMode: "false"} : {},
        ngJitMode: 'false',
        global: 'global',
        process: 'process',
        Buffer: 'Buffer',
        'process.env.SD_VERSION': JSON.stringify(this.#pkgNpmConf.version),
        "process.env.NODE_ENV": JSON.stringify(this.#opt.dev ? "development" : "production"),
        ...this.#opt.env ? Object.keys(this.#opt.env).toObject(
          key => `process.env.${key}`,
          key => JSON.stringify(this.#opt.env![key])
        ) : {}
      },
      platform: 'browser',
      mainFields: ['es2020', 'es2015', 'browser', 'module', 'main'],
      entryNames: '[name]',
      entryPoints: {
        main: this.#mainFilePath,
        // polyfills: 'angular:polyfills',
        polyfills: path.resolve(this.#opt.pkgPath, "src/polyfills.ts"),
        ...this.#opt.builderType === "cordova" ? {
          "cordova-entry": path.resolve(path.dirname(fileURLToPath(import.meta.url)), `../../lib/cordova-entry.js`)
        } : {}
      },
      external: ["electron"],
      target: this.#browserTarget,
      supported: {'async-await': false, 'object-rest-spread': false},
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
        ".ogg": "file"
      },
      inject: [PathUtil.posix(fileURLToPath(import.meta.resolve("node-stdlib-browser/helpers/esbuild/shim")))],
      plugins: [
        ...this.#opt.builderType === "cordova" && this.#opt.cordovaConfig?.plugins ? [{
          name: "cordova:plugin-empty",
          setup: ({onResolve}) => {
            onResolve({filter: new RegExp("(" + this.#opt.cordovaConfig!.plugins!.join("|") + ")")}, () => {
              return {
                path: `./cordova-empty.js`,
                external: true
              };
            });
          }
        }] : [],
        // createVirtualModulePlugin({
        //   namespace: "angular:polyfills",
        //   loadContent: () => ({
        //     contents: `import "./src/polyfills.ts";`,
        //     loader: 'js',
        //     resolveDir: this.#opt.pkgPath
        //   })
        // }) as esbuild.Plugin,
        createSourcemapIgnorelistPlugin(),
        sdNgPlugin({
          modifiedFileSet: this.#modifiedFileSet,
          dev: this.#opt.dev,
          pkgPath: this.#opt.pkgPath,
          result: this.#ngResultCache
        }),
        // createCompilerPlugin({
        //   sourcemap: this.#opt.dev,
        //   tsconfig: this._tsConfigFilePath,
        //   jit: false,
        //   advancedOptimizations: true,
        //   thirdPartySourcemaps: false,
        //   fileReplacements: undefined,
        //   sourceFileCache: this._sourceFileCache,
        //   loadResultCache: this._sourceFileCache.loadResultCache,
        //   incremental: this.#opt.dev
        // }, {
        //   workspaceRoot: this.#opt.pkgPath,
        //   optimization: !this.#opt.dev,
        //   sourcemap: this.#opt.dev ? 'inline' : false,
        //   outputNames: {bundles: '[name]', media: 'media/[name]'},
        //   includePaths: [],
        //   externalDependencies: [],
        //   target: this._browserTarget,
        //   inlineStyleLanguage: 'scss',
        //   preserveSymlinks: false,
        //   tailwindConfiguration: undefined
        // }) as esbuild.Plugin,
        nodeStdLibBrowserPlugin(nodeStdLibBrowser)
        // {
        //   name: "sd-load-file",
        //   setup: ({onLoad}) => {
        //     onLoad({filter: /.*/}, (args) => {
        //       this.#loadFilePathSet.add(args.path);
        //       return null;
        //     });
        //   }
        // }
      ]
    });
  }

  private _getStyleContext(): SdNgBundlerContext {
    const pluginFactory = new StylesheetPluginFactory(
      {
        sourcemap: true, //this.#opt.dev,
        includePaths: []
      },
      this.#styleLoadResultCache,
    );

    return new SdNgBundlerContext(this.#opt.pkgPath, {
      absWorkingDir: this.#opt.pkgPath,
      bundle: true,
      entryNames: '[name]',
      assetNames: 'media/[name]',
      logLevel: 'silent',
      minify: !this.#opt.dev,
      metafile: true,
      sourcemap: true, //this.#opt.dev,
      outdir: this.#opt.pkgPath,
      write: false,
      platform: 'browser',
      target: this.#browserTarget,
      preserveSymlinks: false,
      external: [],
      conditions: ['style', 'sass'],
      mainFields: ['style', 'sass'],
      legalComments: !this.#opt.dev ? "none" : "eof",
      entryPoints: {
        // styles: 'angular:styles/global;styles'
        styles: path.resolve(this.#opt.pkgPath, "src/styles.scss")
      },
      plugins: [
        // createVirtualModulePlugin({
        //   namespace: "angular:styles/global",
        //   transformPath: (currPath) => currPath.split(';', 2)[1],
        //   loadContent: () => ({
        //     contents: `@import 'src/styles.scss';`,
        //     loader: 'css',
        //     resolveDir: this.#opt.pkgPath
        //   }),
        // }) as esbuild.Plugin,
        pluginFactory.create(SassStylesheetLanguage) as esbuild.Plugin,
        pluginFactory.create(CssStylesheetLanguage) as esbuild.Plugin,
        createCssResourcePlugin(this.#styleLoadResultCache) as esbuild.Plugin,
      ],
    });
  }

  private _getElectronMainContext() {
    return new SdNgBundlerContext(this.#opt.pkgPath, {
      absWorkingDir: this.#opt.pkgPath,
      bundle: true,
      entryNames: '[name]',
      assetNames: 'media/[name]',
      conditions: ['es2020', 'es2015', 'module'],
      resolveExtensions: [".js", ".mjs", ".cjs", ".ts"],
      metafile: true,
      legalComments: this.#opt.dev ? 'eof' : 'none',
      logLevel: 'silent',
      minify: !this.#opt.dev,
      outdir: this.#opt.pkgPath,
      sourcemap: true, //this.#opt.dev,
      tsconfig: this.#tsConfigFilePath,
      write: false,
      preserveSymlinks: false,
      external: ["electron"],
      define: {
        ...!this.#opt.dev ? {ngDevMode: 'false'} : {},
        'process.env.SD_VERSION': JSON.stringify(this.#pkgNpmConf.version),
        "process.env.NODE_ENV": JSON.stringify(this.#opt.dev ? "development" : "production"),
        ...this.#opt.env ? Object.keys(this.#opt.env).toObject(
          key => `process.env.${key}`,
          key => JSON.stringify(this.#opt.env![key])
        ) : {}
      },
      platform: 'node',
      entryPoints: {
        "electron-main": path.resolve(this.#opt.pkgPath, "src/electron-main.ts"),
      }
    });
  }


  #debug(...msg: any[]): void {
    this.#logger.debug(`[${path.basename(this.#opt.pkgPath)}]`, ...msg);
  }
}

interface IOptions {
  dev: boolean;
  outputPath: string;
  pkgPath: string;
  builderType: string;
  env: Record<string, string> | undefined;
  cordovaConfig: ISdCliClientBuilderCordovaConfig | undefined;
}