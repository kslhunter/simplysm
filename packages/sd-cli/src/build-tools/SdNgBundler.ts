import {createCompilerPlugin} from "@angular-devkit/build-angular/src/tools/esbuild/angular/compiler-plugin";
import path from "path";
import {BundlerContext, InitialFileRecord} from "@angular-devkit/build-angular/src/tools/esbuild/bundler-context";
import esbuild from "esbuild";
import {FsUtil, PathUtil} from "@simplysm/sd-core-node";
import {fileURLToPath} from "url";
import {createVirtualModulePlugin} from "@angular-devkit/build-angular/src/tools/esbuild/virtual-module-plugin";
import {
  createSourcemapIgnorelistPlugin
} from "@angular-devkit/build-angular/src/tools/esbuild/sourcemap-ignorelist-plugin";
import nodeStdLibBrowser from "node-stdlib-browser";
import nodeStdLibBrowserPlugin from "node-stdlib-browser/helpers/esbuild/plugin";
import {ExecutionResult} from "@angular-devkit/build-angular/src/tools/esbuild/bundler-execution-result";
import {INpmConfig, ISdCliPackageBuildResult} from "../commons";
import {copyAssets} from "@angular-devkit/build-angular/src/utils/copy-assets";
import {extractLicenses} from "@angular-devkit/build-angular/src/tools/esbuild/license-extractor";
import {augmentAppWithServiceWorkerEsbuild} from "@angular-devkit/build-angular/src/utils/service-worker";
import browserslist from "browserslist";
import {transformSupportedBrowsersToTargets} from "@angular-devkit/build-angular/src/tools/esbuild/utils";
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
import {SdSourceFileCache} from "../utils/SdSourceFileCache";

export class SdNgBundler {
  private readonly _sourceFileCache = new SdSourceFileCache();

  private _contexts: BundlerContext[] | undefined;

  private readonly _outputCache = new Map<string, string | number>();

  private readonly _pkgNpmConf: INpmConfig;
  private readonly _mainFilePath: string;
  private readonly _tsConfigFilePath: string;
  private readonly _swConfFilePath: string;
  private readonly _browserTarget: string[];
  private readonly _indexHtmlFilePath: string;
  private readonly _pkgName: string;
  private readonly _baseHref: string;

  private _depsMap?: Map<string, Set<string>>;

  public constructor(private readonly _opt: {
    dev: boolean;
    outputPath: string;
    pkgPath: string;
    builderType: string;
    cordovaPlatforms: string[] | undefined;
    env: Record<string, string> | undefined;
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

  public removeCache(filePaths: string[]): void {
    this._sourceFileCache.invalidate(filePaths);
  }

  public async bundleAsync(): Promise<{
    filePaths: string[],
    affectedFilePaths: string[],
    results: ISdCliPackageBuildResult[]
  }> {
    if (!this._contexts) {
      this._contexts = [];
      this._contexts.push(await this._getAppContextAsync());
      this._contexts.push(this._getStyleContext());
    }

    //-- build
    const bundlingResult = await BundlerContext.bundleAll(this._contexts);

    const results = [
      ...bundlingResult.warnings.map((warn) => ({
        filePath: warn.location?.file !== undefined ? path.resolve(this._opt.pkgPath, warn.location.file) : undefined,
        line: warn.location?.line,
        char: warn.location?.column,
        code: undefined,
        severity: "warning",
        message: warn.text.replace(/^(NG|TS)[0-9]+: /, ""),
        type: "build"
      })),
      ...bundlingResult.errors?.map((err) => ({
        filePath: err.location?.file !== undefined ? path.resolve(this._opt.pkgPath, err.location.file) : undefined,
        line: err.location?.line,
        char: err.location?.column !== undefined ? err.location.column + 1 : undefined,
        code: undefined,
        severity: "error",
        message: err.text.replace(/^[^:]*: /, ""),
        type: "build"
      })) ?? []
    ] as ISdCliPackageBuildResult[];
    const watchFilePaths = [
      ...this._sourceFileCache.keys(),
      ...this._sourceFileCache.babelFileCache.keys(),
      ...this._sourceFileCache.loadResultCache.fileDependencies.keys()
    ].map((item) => path.resolve(item)).distinct();

    let affectedSourceFilePaths = watchFilePaths.filter((item) => PathUtil.isChildPath(item, this._opt.pkgPath));

    if (bundlingResult.errors) {
      // TODO: 제대로 deps를 적용해야함.. 코드 분석 필요
      this._depsMap = this._depsMap ?? new Map<string, Set<string>>();
    }
    else {
      this._depsMap = new Map<string, Set<string>>();
      for (const entry of Object.entries(bundlingResult.metafile.inputs)) {
        for (const imp of entry[1].imports) {
          const deps = this._depsMap.getOrCreate(path.resolve(this._opt.pkgPath, imp.path), new Set<string>());
          deps.add(path.resolve(this._opt.pkgPath, entry[0]));
        }
      }
    }

    const searchAffectedFiles = (filePath: string, prev?: Set<string>): Set<string> => {
      const result = new Set<string>(prev);

      const importerPaths = this._depsMap!.get(filePath);
      if (!importerPaths) return result;

      for (const importerPath of importerPaths) {
        if (result.has(importerPath)) continue;
        result.adds(importerPath);
        result.adds(...searchAffectedFiles(importerPath, result));
      }

      return result;
    };

    if (this._sourceFileCache.modifiedFiles.size > 0) {
      const affectedFilePathSet = new Set<string>();
      for (const modFile of this._sourceFileCache.modifiedFiles) {
        affectedFilePathSet.add(path.resolve(modFile));
        affectedFilePathSet.adds(...searchAffectedFiles(path.resolve(modFile)));
      }
      affectedSourceFilePaths = Array.from(affectedFilePathSet.values()).filter((item) => PathUtil.isChildPath(item, this._opt.pkgPath));
    }

    if (bundlingResult.errors) {
      return {
        filePaths: watchFilePaths,
        affectedFilePaths: affectedSourceFilePaths,
        results
      };
    }

    const executionResult = new ExecutionResult(this._contexts, this._sourceFileCache);
    executionResult.outputFiles.push(...bundlingResult.outputFiles);

    //-- Check commonjs
    // if (!this._opt.dev) {
    //   const messages = checkCommonJSModules(bundlingResult.metafile, []);
    //   for (const msg of messages) {
    //     results.push({
    //       filePath: msg.location?.file,
    //       line: msg.location?.line,
    //       char: msg.location?.column,
    //       code: msg.pluginName,
    //       severity: "warning",
    //       message: msg.text ?? "",
    //       type: "build"
    //     });
    //   }
    // }

    //-- index
    const genIndexHtmlResult = await this._genIndexHtmlAsync(
      bundlingResult.outputFiles,
      bundlingResult.initialFiles
    );
    for (const warning of genIndexHtmlResult.warnings) {
      results.push({
        filePath: undefined,
        line: undefined,
        char: undefined,
        code: undefined,
        severity: "warning",
        message: warning,
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
        message: error,
        type: "build",
      });
    }
    executionResult.addOutputFile("index.html", genIndexHtmlResult.content);

    //-- copy assets
    executionResult.assetFiles.push(...(await this._copyAssetsAsync()));

    //-- extract 3rdpartylicenses
    if (!this._opt.dev) {
      executionResult.addOutputFile('3rdpartylicenses.txt', await extractLicenses(bundlingResult.metafile, this._opt.pkgPath));
    }

    //-- service worker
    if (FsUtil.exists(this._swConfFilePath)) {
      try {
        const serviceWorkerResult = await this._genServiceWorkerAsync(
          executionResult.outputFiles,
          executionResult.assetFiles
        );
        executionResult.addOutputFile('ngsw.json', serviceWorkerResult.manifest);
        executionResult.assetFiles.push(...serviceWorkerResult.assetFiles);
      }
      catch (err) {
        results.push({
          filePath: undefined,
          line: undefined,
          char: undefined,
          code: undefined,
          severity: "error",
          message: err.toString(),
          type: "build",
        });
      }
    }

    //-- write
    for (const outputFile of executionResult.outputFiles) {
      const distFilePath = path.resolve(this._opt.outputPath, outputFile.path);

      const prev = this._outputCache.get(distFilePath);
      if (prev !== Buffer.from(outputFile.contents).toString("base64")) {
        await FsUtil.writeFileAsync(distFilePath, outputFile.contents);
        this._outputCache.set(distFilePath, Buffer.from(outputFile.contents).toString("base64"));
      }
    }
    for (const assetFile of executionResult.assetFiles) {
      const prev = this._outputCache.get(assetFile.source);
      const curr = FsUtil.lstat(assetFile.source).mtime.getTime();
      if (prev !== curr) {
        await FsUtil.copyAsync(assetFile.source, path.resolve(this._opt.outputPath, assetFile.destination));
        this._outputCache.set(assetFile.source, curr);
      }
    }

    return {
      filePaths: watchFilePaths,
      affectedFilePaths: affectedSourceFilePaths,
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
      ...this._opt.dev && this._opt.cordovaPlatforms ? this._opt.cordovaPlatforms.mapMany((platform) => [
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
    outputFiles: esbuild.OutputFile[],
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

  private async _getAppContextAsync(): Promise<BundlerContext> {
    return new BundlerContext(
      this._opt.pkgPath,
      true,
      {
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
        external: [],
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
          createVirtualModulePlugin({
            namespace: "angular:polyfills",
            loadContent: () => ({
              contents: `import "./src/polyfills.ts";`,
              loader: 'js',
              resolveDir: this._opt.pkgPath
            })
          }) as esbuild.Plugin,
          createSourcemapIgnorelistPlugin(),
          createCompilerPlugin({
            sourcemap: this._opt.dev,
            thirdPartySourcemaps: false,
            tsconfig: this._tsConfigFilePath,
            jit: false,
            advancedOptimizations: true,
            fileReplacements: undefined,
            sourceFileCache: this._sourceFileCache,
            loadResultCache: this._sourceFileCache.loadResultCache
          }, {
            workspaceRoot: this._opt.pkgPath,
            optimization: !this._opt.dev,
            sourcemap: this._opt.dev ? 'inline' : false,
            outputNames: {bundles: '[name]', media: 'media/[name]'},
            includePaths: [],
            externalDependencies: [],
            target: this._browserTarget,
            inlineStyleLanguage: 'scss',
            preserveSymlinks: false,
            tailwindConfiguration: undefined
          }) as esbuild.Plugin,
          nodeStdLibBrowserPlugin(nodeStdLibBrowser)
        ]
      }
    );
  }

  private _getStyleContext(): BundlerContext {
    const browserTarget = transformSupportedBrowsersToTargets(browserslist("defaults and fully supports es6-module"));

    const pluginFactory = new StylesheetPluginFactory(
      {
        sourcemap: this._opt.dev,
        includePaths: []
      },
      this._sourceFileCache.loadResultCache,
    );

    return new BundlerContext(
      this._opt.pkgPath,
      true,
      {
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
        target: browserTarget,
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
          }),
          pluginFactory.create(SassStylesheetLanguage),
          pluginFactory.create(CssStylesheetLanguage),
          createCssResourcePlugin(this._sourceFileCache.loadResultCache),
        ],
      },
      () => true
    );
  }
}