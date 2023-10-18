import {
  createCompilerPlugin,
  SourceFileCache
} from "@angular-devkit/build-angular/src/tools/esbuild/angular/compiler-plugin";
import {NormalizedApplicationBuildOptions} from "@angular-devkit/build-angular/src/builders/application/options";
import path from "path";
import {CrossOrigin} from "@angular-devkit/build-angular/src/builders/application/schema";
import {BundlerContext} from "@angular-devkit/build-angular/src/tools/esbuild/bundler-context";
import esbuild from "esbuild";
import {createCompilerPluginOptions} from "@angular-devkit/build-angular/src/tools/esbuild/compiler-plugin-options";
import {FsUtil, Logger, PathUtil} from "@simplysm/sd-core-node";
import {fileURLToPath} from "url";
import {createVirtualModulePlugin} from "@angular-devkit/build-angular/src/tools/esbuild/virtual-module-plugin";
import {
  createSourcemapIgnorelistPlugin
} from "@angular-devkit/build-angular/src/tools/esbuild/sourcemap-ignorelist-plugin";
import nodeStdLibBrowser from "node-stdlib-browser";
import nodeStdLibBrowserPlugin from "node-stdlib-browser/helpers/esbuild/plugin";
import {ExecutionResult} from "@angular-devkit/build-angular/src/tools/esbuild/bundler-execution-result";
import {INpmConfig, ISdCliClientPackageConfig, ISdCliPackageBuildResult} from "../commons";
import {generateIndexHtml} from "@angular-devkit/build-angular/src/tools/esbuild/index-html-generator";
import {copyAssets} from "@angular-devkit/build-angular/src/utils/copy-assets";
import {extractLicenses} from "@angular-devkit/build-angular/src/tools/esbuild/license-extractor";
import {augmentAppWithServiceWorkerEsbuild} from "@angular-devkit/build-angular/src/utils/service-worker";
import {createGlobalStylesBundleOptions} from "@angular-devkit/build-angular/src/tools/esbuild/global-styles";
import {Entrypoint} from "@angular-devkit/build-angular/src/utils/index-file/augment-index-html";

export class SdNgBundler {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", "SdNgEsbuildBuilder"]);

  private readonly _sourceFileCache = new SourceFileCache();
  private readonly _options: NormalizedApplicationBuildOptions;

  private _contexts: BundlerContext[] | undefined;

  private readonly _outputCache = new Map<string, string | number>();

  public constructor(opt: {
    dev: boolean,
    builderType: keyof ISdCliClientPackageConfig["builder"],
    pkgPath: string,
    cordovaPlatforms: string[] | undefined,
    outputPath: string
  }) {
    this._options = this._getOptions(opt);
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
        filePath: warn.location?.file !== undefined ? path.resolve(this._options.workspaceRoot, warn.location.file) : undefined,
        line: warn.location?.line,
        char: warn.location?.column,
        code: undefined,
        severity: "warning" as const,
        message: warn.text.replace(/^(NG|TS)[0-9]+: /, ""),
        type: "build" as const
      })),
      ...bundlingResult.errors?.map((err) => ({
        filePath: err.location?.file !== undefined ? path.resolve(this._options.workspaceRoot, err.location.file) : undefined,
        line: err.location?.line,
        char: err.location?.column !== undefined ? err.location.column + 1 : undefined,
        code: undefined,
        severity: "error" as const,
        message: err.text.replace(/^[^:]*: /, ""),
        type: "build" as const
      })) ?? []
    ];
    const watchFilePaths = [
      ...this._sourceFileCache.keys(),
      ...this._sourceFileCache.babelFileCache.keys()
    ].map((item) => path.resolve(item));
    let affectedSourceFilePaths = watchFilePaths.filter((item) => PathUtil.isChildPath(item, this._options.workspaceRoot));
    if (bundlingResult.errors) {
      return {
        filePaths: watchFilePaths,
        affectedFilePaths: affectedSourceFilePaths,
        results
      };
    }

    const depsMap = new Map<string, Set<string>>();
    for (const entry of Object.entries(bundlingResult.metafile.inputs)) {
      for (const imp of entry[1].imports) {
        const deps = depsMap.getOrCreate(path.resolve(this._options.workspaceRoot, imp.path), new Set<string>());
        deps.add(path.resolve(this._options.workspaceRoot, entry[0]));
      }
    }

    const searchAffectedFiles = (filePath: string, prev?: Set<string>): Set<string> => {
      const result = new Set<string>(prev);

      const importerPaths = depsMap.get(filePath);
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
      affectedSourceFilePaths = Array.from(affectedFilePathSet.values()).filter((item) => PathUtil.isChildPath(item, this._options.workspaceRoot));
    }

    const executionResult = new ExecutionResult(this._contexts, this._sourceFileCache);
    executionResult.outputFiles.push(...bundlingResult.outputFiles);

    //-- index
    if (this._options.indexHtmlOptions) {
      const genIndexHtmlResult = await generateIndexHtml(
        bundlingResult.initialFiles,
        executionResult,
        this._options
      );
      if (genIndexHtmlResult.warnings.length > 0) {
        this._logger.warn(...genIndexHtmlResult.warnings);
      }
      if (genIndexHtmlResult.errors.length > 0) {
        this._logger.warn(...genIndexHtmlResult.errors);
      }

      executionResult.addOutputFile(this._options.indexHtmlOptions!.output, genIndexHtmlResult.content);
    }

    //-- copy assets
    if (this._options.assets) {
      executionResult.assetFiles.push(...(await copyAssets(this._options.assets!, [], this._options.workspaceRoot)));
    }

    //-- extract 3rdpartylicenses
    if (this._options.extractLicenses) {
      executionResult.addOutputFile('3rdpartylicenses.txt', await extractLicenses(bundlingResult.metafile, this._options.workspaceRoot));
    }

    //-- service worker
    if (this._options.serviceWorker !== undefined) {
      try {
        const serviceWorkerResult = await augmentAppWithServiceWorkerEsbuild(
          this._options.workspaceRoot,
          this._options.serviceWorker,
          this._options.baseHref ?? '/',
          executionResult.outputFiles,
          executionResult.assetFiles
        );
        executionResult.addOutputFile('ngsw.json', serviceWorkerResult.manifest);
        executionResult.assetFiles.push(...serviceWorkerResult.assetFiles);
      }
      catch (error) {
        this._logger.error(error instanceof Error ? error.message : `${error}`);

        return {
          filePaths: watchFilePaths,
          affectedFilePaths: affectedSourceFilePaths,
          results
        };
      }
    }

    //-- write

    for (const outputFile of executionResult.outputFiles) {
      const distFilePath = path.resolve(this._options.outputPath, outputFile.path);

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
        await FsUtil.copyAsync(assetFile.source, path.resolve(this._options.outputPath, assetFile.destination));
        this._outputCache.set(assetFile.source, curr);
      }
    }

    return {
      filePaths: watchFilePaths,
      affectedFilePaths: affectedSourceFilePaths,
      results
    };
  }

  private async _getAppContextAsync(): Promise<BundlerContext> {
    const esbuildOption = await this._getEsBuildOptionsAsync();

    return new BundlerContext(
      this._options.workspaceRoot,
      true,
      esbuildOption
    );
  }

  private _getStyleContext(): BundlerContext {
    const esbuildOptions = createGlobalStylesBundleOptions(
      this._options,
      [
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
      true,
      this._sourceFileCache.loadResultCache
    );

    return new BundlerContext(
      this._options.workspaceRoot,
      true,
      esbuildOptions!,
      () => true
    );
  }

  private async _getEsBuildOptionsAsync(): Promise<esbuild.BuildOptions> {
    const pkgNpmConf: INpmConfig = FsUtil.readJson(path.resolve(this._options.workspaceRoot, "package.json"));

    const {pluginOptions, styleOptions} = createCompilerPluginOptions(
      this._options,
      [
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
      this._sourceFileCache,
    );

    return {
      absWorkingDir: this._options.workspaceRoot,
      bundle: true,
      keepNames: true,
      format: 'esm',
      assetNames: 'media/[name]',
      conditions: ['es2020', 'es2015', 'module'],
      resolveExtensions: ['.ts', '.tsx', '.mjs', '.js'],
      metafile: true,
      legalComments: this._options.watch ? 'eof' : 'none',
      logLevel: 'silent',
      minifyIdentifiers: !this._options.watch,
      minifySyntax: !this._options.watch,
      minifyWhitespace: !this._options.watch,
      pure: ['forwardRef'],
      outdir: this._options.workspaceRoot,
      outExtension: undefined,
      sourcemap: this._options.watch,
      splitting: true,
      chunkNames: 'chunk-[hash]',
      tsconfig: this._options.tsconfig,
      external: [],
      write: false,
      preserveSymlinks: false,
      define: {
        ...!this._options.watch ? {ngDevMode: 'false'} : {},
        ngJitMode: 'false',
        global: 'global',
        process: 'process',
        Buffer: 'Buffer',
        'process.env.SD_VERSION': JSON.stringify(pkgNpmConf.version),
        "process.env.NODE_ENV": JSON.stringify(this._options.watch ? "development" : "production")
      },
      platform: 'browser',
      mainFields: ['es2020', 'es2015', 'browser', 'module', 'main'],
      entryNames: '[name]',
      entryPoints: {
        ...this._options.entryPoints,
        polyfills: 'angular:polyfills'
      },
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
            resolveDir: this._options.workspaceRoot
          })
        }) as esbuild.Plugin,
        createSourcemapIgnorelistPlugin(),
        createCompilerPlugin(
          pluginOptions,
          styleOptions
        ) as esbuild.Plugin,
        nodeStdLibBrowserPlugin(nodeStdLibBrowser)
      ]
    };
  }

  private _getOptions(opt: {
    dev: boolean,
    builderType: keyof ISdCliClientPackageConfig["builder"],
    pkgPath: string,
    cordovaPlatforms: string[] | undefined,
    outputPath: string,
  }): NormalizedApplicationBuildOptions {
    const mainFilePath = path.resolve(opt.pkgPath, "src/main.ts");
    const tsconfigFilePath = path.resolve(opt.pkgPath, "tsconfig.json");
    const indexHtmlFilePath = path.resolve(opt.pkgPath, "src/index.html");
    const swFilePath = path.resolve(opt.pkgPath, "ngsw-config.json");

    const cacheBasePath = path.resolve(opt.pkgPath, ".cache");

    const pkgName = path.basename(opt.pkgPath);

    return {
      advancedOptimizations: true,
      allowedCommonJsDependencies: [],
      baseHref: `/${pkgName}/`,
      cacheOptions: {
        enabled: true,
        basePath: cacheBasePath,
        path: path.resolve(cacheBasePath, opt.builderType)
      },
      crossOrigin: CrossOrigin.None,
      deleteOutputPath: true,
      externalDependencies: [],
      extractLicenses: !opt.dev,
      inlineStyleLanguage: 'scss',
      jit: false,
      stats: false,
      polyfills: ["./src/polyfills.ts"],
      poll: undefined,
      progress: true,
      externalPackages: opt.dev ? true : undefined,
      preserveSymlinks: false,
      stylePreprocessorOptions: {includePaths: []},
      subresourceIntegrity: false,
      serverEntryPoint: undefined,
      prerenderOptions: undefined,
      appShellOptions: undefined,
      ssrOptions: undefined,
      verbose: false,
      watch: opt.dev,
      workspaceRoot: opt.pkgPath,
      entryPoints: {
        main: mainFilePath,
        ...opt.builderType === "cordova" ? {
          "cordova-entry": path.resolve(path.dirname(fileURLToPath(import.meta.url)), `../../lib/cordova-entry.js`)
        } : {}
      },
      optimizationOptions: {
        scripts: !opt.dev,
        styles: {minify: !opt.dev, inlineCritical: !opt.dev},
        fonts: {inline: !opt.dev}
      },
      outputPath: opt.outputPath,
      outExtension: undefined,
      sourcemapOptions: {vendor: false, hidden: false, scripts: opt.dev, styles: opt.dev},
      tsconfig: tsconfigFilePath,
      projectRoot: opt.pkgPath,
      assets: [
        {input: 'src', glob: 'favicon.ico', output: ''},
        {input: 'src\\assets', glob: '**/*', output: 'assets'},
        ...opt.dev && opt.cordovaPlatforms ? opt.cordovaPlatforms.mapMany((platform) => [
          {
            input: `.cache\\cordova\\platforms\\${platform}\\platform_www\\plugins`,
            glob: '**/*',
            output: `cordova-${platform}/plugins`
          },
          {
            input: `.cache\\cordova\\platforms\\${platform}\\platform_www`,
            glob: 'cordova.js',
            output: `cordova-${platform}`
          },
          {
            input: `.cache\\cordova\\platforms\\${platform}\\platform_www`,
            glob: 'cordova_plugins.js',
            output: `cordova-${platform}`
          },
          {
            input: `.cache\\cordova\\platforms\\${platform}\\www`,
            glob: 'config.xml',
            output: `cordova-${platform}`
          },
        ]) : []
      ],
      outputNames: {bundles: '[name]', media: 'media/[name]'},
      fileReplacements: undefined,
      globalStyles: [{name: 'styles', files: ["src/styles.scss"], initial: true}],
      globalScripts: [],
      serviceWorker: FsUtil.exists(swFilePath) ? swFilePath : undefined,
      indexHtmlOptions: {
        input: indexHtmlFilePath,
        output: 'index.html',
        insertionOrder: [
          ['runtime', true],
          ['polyfills', true],
          ['styles', false],
          ['vendor', true],
          ['main', true],
          ...opt.builderType === "cordova" ? [
            ["cordova-entry", true] as Entrypoint
          ] : []
        ]
      },
      tailwindConfiguration: undefined
    };
  }
}