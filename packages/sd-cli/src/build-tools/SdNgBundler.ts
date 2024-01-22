import path from "path";
import {
  BuildOutputFile,
  BuildOutputFileType,
  InitialFileRecord
} from "@angular-devkit/build-angular/src/tools/esbuild/bundler-context";
import esbuild, {Metafile} from "esbuild";
import {FsUtil, Logger, PathUtil} from "@simplysm/sd-core-node";
import {fileURLToPath} from "url";
import {createVirtualModulePlugin} from "@angular-devkit/build-angular/src/tools/esbuild/virtual-module-plugin";
import {
  createSourcemapIgnorelistPlugin
} from "@angular-devkit/build-angular/src/tools/esbuild/sourcemap-ignorelist-plugin";
import nodeStdLibBrowser from "node-stdlib-browser";
import nodeStdLibBrowserPlugin from "node-stdlib-browser/helpers/esbuild/plugin";
import {INpmConfig, ISdCliClientBuilderCordovaConfig, ISdCliPackageBuildResult} from "../commons";
import {copyAssets} from "@angular-devkit/build-angular/src/utils/copy-assets";
import {extractLicenses} from "@angular-devkit/build-angular/src/tools/esbuild/license-extractor";
import {augmentAppWithServiceWorkerEsbuild} from "@angular-devkit/build-angular/src/utils/service-worker";
import browserslist from "browserslist";
import {
  convertOutputFile,
  createOutputFileFromText,
  transformSupportedBrowsersToTargets
} from "@angular-devkit/build-angular/src/tools/esbuild/utils";
import {createCssResourcePlugin} from "@angular-devkit/build-angular/src/tools/esbuild/stylesheets/css-resource-plugin";
import {CssStylesheetLanguage} from "@angular-devkit/build-angular/src/tools/esbuild/stylesheets/css-language";
import {SassStylesheetLanguage} from "@angular-devkit/build-angular/src/tools/esbuild/stylesheets/sass-language";
import {
  StylesheetPluginFactory
} from "@angular-devkit/build-angular/src/tools/esbuild/stylesheets/stylesheet-plugin-factory";
import {
  HintMode,
  IndexHtmlGenerator,
  IndexHtmlTransformResult
} from "@angular-devkit/build-angular/src/utils/index-file/index-html-generator";
import {Entrypoint} from "@angular-devkit/build-angular/src/utils/index-file/augment-index-html";
import {CrossOrigin} from "@angular-devkit/build-angular";
import {InlineCriticalCssProcessor} from "@angular-devkit/build-angular/src/utils/index-file/inline-critical-css";
import {SdNgBundlerContext} from "./SdNgBundlerContext";
import {INgResultCache, sdNgPlugin} from "../bundle-plugins/sdNgPlugin";
import {MemoryLoadResultCache} from "@angular-devkit/build-angular/src/tools/esbuild/load-result-cache";
import ts from "typescript";

export class SdNgBundler {
  // private readonly _sourceFileCache = new SourceFileCache(
  //   path.resolve(this._opt.pkgPath, ".cache")
  // );

  #modifiedFileSet = new Set<string>();
  #ngResultCache: Partial<INgResultCache> = {};
  #styleLoadResultCache = new MemoryLoadResultCache();

  private _contexts: SdNgBundlerContext[] | undefined;

  private readonly _outputCache = new Map<string, string | number>();

  private readonly _pkgNpmConf: INpmConfig;
  private readonly _mainFilePath: string;
  private readonly _tsConfigFilePath: string;
  private readonly _swConfFilePath: string;
  private readonly _browserTarget: string[];
  private readonly _indexHtmlFilePath: string;
  private readonly _pkgName: string;
  private readonly _baseHref: string;

  // #loadFilePathSet = new Set<string>();

  public constructor(private readonly _opt: {
    dev: boolean;
    outputPath: string;
    pkgPath: string;
    builderType: string;
    env: Record<string, string> | undefined;
    cordovaConfig: ISdCliClientBuilderCordovaConfig | undefined;
  }) {
    this._pkgNpmConf = FsUtil.readJson(path.resolve(this._opt.pkgPath, "package.json"));
    this._mainFilePath = path.resolve(this._opt.pkgPath, "src/main.ts");
    this._tsConfigFilePath = path.resolve(this._opt.pkgPath, "tsconfig.json");
    this._swConfFilePath = path.resolve(this._opt.pkgPath, "ngsw-config.json");
    this._browserTarget = transformSupportedBrowsersToTargets(browserslist("defaults and fully supports es6-module"));
    this._indexHtmlFilePath = path.resolve(this._opt.pkgPath, "src/index.html");
    this._pkgName = path.basename(this._opt.pkgPath);
    this._baseHref = this._opt.builderType === "web" ? `/${this._pkgName}/` : this._opt.dev ? `/${this._pkgName}/${this._opt.builderType}/` : ``;
  }

  public markForChanges(filePaths: string[]): void {
    for (const filePath of filePaths) {
      this.#modifiedFileSet.add(path.normalize(filePath));
    }
    // this._sourceFileCache.invalidate(filePaths);
  }

  public async bundleAsync(): Promise<{
    program: ts.Program;
    watchFileSet: Set<string>,
    affectedFileSet: Set<string>,
    results: ISdCliPackageBuildResult[]
  }> {
    const logger = Logger.get(["simplysm", "sd-cli", "SdNgBundler", "bundleAsync"]);

    if (!this._contexts) {
      this._contexts = [
        await this._getAppContextAsync(),
        this._getStyleContext()
      ];
    }

    //-- build
    const bundlingResults = await this._contexts.mapAsync(async ctx => await ctx.bundleAsync());

    //-- results
    const results = bundlingResults.mapMany(bundlingResult => bundlingResult.results);

    //-- executionResult
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
    if (this._opt.cordovaConfig?.plugins) {
      outputFiles.push(createOutputFileFromText("cordova-empty.js", "export default {};", BuildOutputFileType.Root));
    }

    //-- index

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
    outputFiles.push(createOutputFileFromText("index.html", genIndexHtmlResult.content, BuildOutputFileType.Root));

    //-- copy assets
    assetFiles.push(...(await this._copyAssetsAsync()));

    //-- extract 3rdpartylicenses
    if (!this._opt.dev) {
      outputFiles.push(createOutputFileFromText('3rdpartylicenses.txt', await extractLicenses(metafile, this._opt.pkgPath), BuildOutputFileType.Root));
    }

    //-- service worker
    if (FsUtil.exists(this._swConfFilePath)) {
      try {
        const serviceWorkerResult = await this._genServiceWorkerAsync(outputFiles, assetFiles);
        outputFiles.push(createOutputFileFromText('ngsw.json', serviceWorkerResult.manifest, BuildOutputFileType.Root));
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
    for (const outputFile of outputFiles) {
      const distFilePath = path.resolve(this._opt.outputPath, outputFile.path);
      const prev = this._outputCache.get(distFilePath);
      if (prev !== Buffer.from(outputFile.contents).toString("base64")) {
        await FsUtil.writeFileAsync(distFilePath, outputFile.contents);
        this._outputCache.set(distFilePath, Buffer.from(outputFile.contents).toString("base64"));
      }
    }
    for (const assetFile of assetFiles) {
      const prev = this._outputCache.get(assetFile.source);
      const curr = FsUtil.lstat(assetFile.source).mtime.getTime();
      if (prev !== curr) {
        await FsUtil.copyAsync(assetFile.source, path.resolve(this._opt.outputPath, assetFile.destination));
        this._outputCache.set(assetFile.source, curr);
      }
    }

    logger.debug(`[${path.basename(this._opt.pkgPath)}] 번들링중 영향받은 파일`, Array.from(this.#ngResultCache.affectedFileSet!));

    return {
      program: this.#ngResultCache.program!,
      watchFileSet: this.#ngResultCache.watchFileSet!,
      affectedFileSet: this.#ngResultCache.affectedFileSet!,
      results
    };
  }

  private async _genIndexHtmlAsync(
    outputFiles: esbuild.OutputFile[],
    initialFiles: Map<string, InitialFileRecord>,
  ): Promise<IndexHtmlTransformResult> {
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
        ['runtime', true],
        ['polyfills', true],
        ['styles', false],
        ['vendor', true],
        ['main', true],
        ...this._opt.builderType === "cordova" ? [
          ["cordova-entry", true] as Entrypoint
        ] : []
      ],
      optimization: {
        scripts: !this._opt.dev,
        fonts: {inline: !this._opt.dev},
        styles: {
          minify: !this._opt.dev,
          inlineCritical: false
        },
      },
      crossOrigin: CrossOrigin.None,
    });
    indexHtmlGenerator.readAsset = readAsset;

    const hints: { url: string; mode: HintMode; as?: string; }[] = [];
    if (!this._opt.dev) {
      for (const [key, value] of initialFiles) {
        if (value.entrypoint) {
          continue;
        }

        if (value.type === 'script') {
          hints.push({url: key, mode: 'modulepreload' as const});
        }
        else if (value.type === 'style') {
          hints.push({url: key, mode: 'preload' as const, as: 'style'});
        }
      }
    }

    const transformResult = await indexHtmlGenerator.process({
      baseHref: this._baseHref,
      lang: undefined,
      outputPath: "/",
      files: [...initialFiles].map(([file, record]) => ({
        name: record.name ?? '',
        file,
        extension: path.extname(file),
      })),
      hints,
    });

    if (this._opt.dev) {
      return transformResult;
    }
    else {
      const inlineCriticalCssProcessor = new InlineCriticalCssProcessor({
        minify: false,
        readAsset,
      });
      const {content, errors, warnings} = await inlineCriticalCssProcessor.process(
        transformResult.content,
        {outputPath: "/",},
      );

      return {
        warnings: [...transformResult.warnings, ...warnings],
        errors: [...transformResult.errors, ...errors],
        content
      };
    }
  }

  private async _copyAssetsAsync(): Promise<{
    source: string;
    destination: string;
  }[]> {
    return await copyAssets([
      {input: 'src', glob: 'favicon.ico', output: ''},
      {input: 'src', glob: 'manifest.webmanifest', output: ''},
      {input: 'src/assets', glob: '**/*', output: 'assets'},
      ...this._opt.dev && this._opt.builderType === "cordova" ? Object.keys(this._opt.cordovaConfig?.platform ?? {browser: {}}).mapMany((platform) => [
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
    ], [], this._opt.pkgPath);
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
      this._opt.pkgPath,
      this._swConfFilePath,
      this._baseHref,
      outputFiles,
      assetFiles
    );
  }

  private async _getAppContextAsync(): Promise<SdNgBundlerContext> {
    return new SdNgBundlerContext(this._opt.pkgPath, {
      absWorkingDir: this._opt.pkgPath,
      bundle: true,
      keepNames: true,
      format: 'esm',
      assetNames: 'media/[name]',
      conditions: ['es2020', 'es2015', 'module'],
      resolveExtensions: ['.ts', '.tsx', '.mjs', '.js'],
      metafile: true,
      legalComments: this._opt.dev ? 'eof' : 'none',
      logLevel: 'silent',
      minifyIdentifiers: !this._opt.dev,
      minifySyntax: !this._opt.dev,
      minifyWhitespace: !this._opt.dev,
      pure: ['forwardRef'],
      outdir: this._opt.pkgPath,
      outExtension: undefined,
      sourcemap: this._opt.dev,
      splitting: true,
      chunkNames: 'chunk-[hash]',
      tsconfig: this._tsConfigFilePath,
      write: false,
      preserveSymlinks: false,
      define: {
        ...!this._opt.dev ? {ngDevMode: 'false'} : {},
        ngJitMode: 'false',
        global: 'global',
        process: 'process',
        Buffer: 'Buffer',
        'process.env.SD_VERSION': JSON.stringify(this._pkgNpmConf.version),
        "process.env.NODE_ENV": JSON.stringify(this._opt.dev ? "development" : "production"),
        ...this._opt.env ? Object.keys(this._opt.env).toObject(
          key => `process.env.${key}`,
          key => JSON.stringify(this._opt.env![key])
        ) : {}
      },
      platform: 'browser',
      mainFields: ['es2020', 'es2015', 'browser', 'module', 'main'],
      entryNames: '[name]',
      entryPoints: {
        main: this._mainFilePath,
        polyfills: 'angular:polyfills',
        ...this._opt.builderType === "cordova" ? {
          "cordova-entry": path.resolve(path.dirname(fileURLToPath(import.meta.url)), `../../lib/cordova-entry.js`)
        } : {}
      },
      target: this._browserTarget,
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
      inject: [PathUtil.posix(fileURLToPath(await import.meta.resolve!("node-stdlib-browser/helpers/esbuild/shim")))],
      plugins: [
        ...this._opt.cordovaConfig?.plugins ? [{
          name: "cordova:plugin-empty",
          setup: ({onResolve}) => {
            onResolve({filter: new RegExp("(" + this._opt.cordovaConfig!.plugins!.join("|") + ")")}, () => {
              return {
                path: `./cordova-empty.js`,
                external: true
              };
            });
          }
        }] : [],
        createVirtualModulePlugin({
          namespace: "angular:polyfills",
          loadContent: () => ({
            contents: `import "./src/polyfills.ts";`,
            loader: 'js',
            resolveDir: this._opt.pkgPath
          })
        }) as esbuild.Plugin,
        createSourcemapIgnorelistPlugin(),
        sdNgPlugin({
          modifiedFileSet: this.#modifiedFileSet,
          dev: this._opt.dev,
          pkgPath: this._opt.pkgPath,
          result: this.#ngResultCache
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
        nodeStdLibBrowserPlugin(nodeStdLibBrowser),
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
        sourcemap: this._opt.dev,
        includePaths: []
      },
      this.#styleLoadResultCache,
    );

    return new SdNgBundlerContext(this._opt.pkgPath, {
      absWorkingDir: this._opt.pkgPath,
      bundle: true,
      entryNames: '[name]',
      assetNames: 'media/[name]',
      logLevel: 'silent',
      minify: !this._opt.dev,
      metafile: true,
      sourcemap: this._opt.dev,
      outdir: this._opt.pkgPath,
      write: false,
      platform: 'browser',
      target: this._browserTarget,
      preserveSymlinks: false,
      external: [],
      conditions: ['style', 'sass'],
      mainFields: ['style', 'sass'],
      legalComments: !this._opt.dev ? "none" : "eof",
      entryPoints: {styles: 'angular:styles/global;styles'},
      plugins: [
        createVirtualModulePlugin({
          namespace: "angular:styles/global",
          transformPath: (currPath) => currPath.split(';', 2)[1],
          loadContent: () => ({
            contents: `@import 'src/styles.scss';`,
            loader: 'css',
            resolveDir: this._opt.pkgPath
          }),
        }) as esbuild.Plugin,
        pluginFactory.create(SassStylesheetLanguage) as esbuild.Plugin,
        pluginFactory.create(CssStylesheetLanguage) as esbuild.Plugin,
        createCssResourcePlugin(this.#styleLoadResultCache) as esbuild.Plugin,
      ],
    });
  }
}