import {EventEmitter} from "events";
import {FsUtil, Logger, PathUtil, SdFsWatcher} from "@simplysm/sd-core-node";
import {ISdCliBuilderResult, ISdCliClientPackageConfig, ISdCliConfig, ISdCliPackageBuildResult} from "../commons";
import {FunctionQueue, NotImplementError} from "@simplysm/sd-core-common";
import path from "path";
import esbuild from "esbuild";
import {createVirtualModulePlugin} from "@angular-devkit/build-angular/src/tools/esbuild/virtual-module-plugin";
import {
  createSourcemapIgnorelistPlugin
} from "@angular-devkit/build-angular/src/tools/esbuild/sourcemap-ignorelist-plugin";
import {
  createCompilerPlugin,
  SourceFileCache
} from "@angular-devkit/build-angular/src/tools/esbuild/angular/compiler-plugin";
import {createCompilerPluginOptions} from "@angular-devkit/build-angular/src/tools/esbuild/compiler-plugin-options";
import {CrossOrigin} from "@angular-devkit/build-angular/src/builders/application/schema";

import nodeStdLibBrowserPlugin from "node-stdlib-browser/helpers/esbuild/plugin";
import nodeStdLibBrowser from "node-stdlib-browser";
import {fileURLToPath} from "url";
import {SdTsIncrementalBuilder} from "../build-tools/SdTsIncrementalBuilder";
import {SdLinter} from "../build-tools/SdLinter";

export class SdCliClientBuilder extends EventEmitter {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", "SdCliClientBuilder"]);
  private readonly _pkgConf: ISdCliClientPackageConfig;

  public constructor(private readonly _projConf: ISdCliConfig,
                     private readonly _pkgPath: string) {
    super();
    this._pkgConf = this._projConf.packages[path.basename(_pkgPath)] as ISdCliClientPackageConfig;
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (result: ISdCliBuilderResult) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  public async watchAsync(): Promise<void> {
    this._debug("빌드 준비...");
    const sdTsProgram = await SdTsIncrementalBuilder.createAsync(this._pkgPath, () => ({emitJs: false}));

    this._debug("dist 초기화...");
    await FsUtil.removeAsync(path.resolve(this._pkgPath, "dist"));

    this.emit("change");

    if (this._pkgConf.server !== undefined) {
      this._debug("GEN .config...");
      const confDistPath = path.resolve(this._pkgPath, "../../packages", this._pkgConf.server, "dist/www", path.basename(this._pkgPath), ".config.json");
      await FsUtil.writeFileAsync(confDistPath, JSON.stringify(this._pkgConf.configs ?? {}, undefined, 2));
    }

    this._debug("BUILD...");
    const builderTypes = (Object.keys(this._pkgConf.builder ?? {web: {}}) as ("web")[]);
    const cache = new SourceFileCache();
    const options = await Promise.all(builderTypes.map((builderType) => this._getEsBuildOptionsAsync({
      dev: true,
      builderType,
      cache
    })));
    const contexts = await Promise.all(options.map((esbuildOption) => esbuild.context(esbuildOption)));
    const results = await Promise.all(contexts.map(async (ctx) => {
      try {
        return await ctx.rebuild();
      }
      catch (err) {
        if (typeof err === "object" && "errors" in err && "warnings" in err) {
          return {
            errors: err.errors,
            warnings: err.warnings
          };
        }
        throw new err;
      }
    }));

    const buildResults: ISdCliPackageBuildResult[] = results.mapMany((esbuildResult) => [
      ...esbuildResult.warnings.map((warn) => ({
        filePath: warn.location?.file !== undefined ? path.resolve(warn.location.file) : undefined,
        line: warn.location?.line,
        char: warn.location?.column,
        code: undefined,
        severity: "warning" as const,
        message: warn.text,
        type: "build" as const
      })),
      ...esbuildResult.errors.map((err) => ({
        filePath: err.location?.file !== undefined ? path.resolve(err.location.file) : undefined,
        line: err.location?.line,
        char: err.location?.column !== undefined ? err.location.column + 1 : undefined,
        code: undefined,
        severity: "warning" as const,
        message: err.text,
        type: "build" as const
      }))
    ]);

    this._debug("CHECK...");
    const checkResult = await sdTsProgram.buildAsync();

    this._debug("LINT...");
    const lintResults = await SdLinter.lintAsync(checkResult.affectedFilePaths, sdTsProgram.builderProgram!.getProgram());

    this._debug(`빌드 완료`);
    this.emit("complete", {
      affectedFilePaths: checkResult.affectedFilePaths,
      buildResults: [...buildResults, ...checkResult.results, ...lintResults]
    });

    this._debug("WATCH...");
    const fnQ = new FunctionQueue();
    SdFsWatcher
      .watch([
        ...sdTsProgram.builderProgram!.getSourceFiles().map((item) => item.fileName),
        path.resolve(this._pkgPath, "src/**/*.{ts,tsx}")
      ])
      .onChange({
        delay: 100
      }, (changeInfos) => {
        for (const changeInfo of changeInfos) {
          cache.delete(PathUtil.posix(changeInfo.path));
        }

        fnQ.runLast(async () => {
          this.emit("change");

          this._debug(`BUILD...`);
          const watchResults = await Promise.all(contexts.map(async (ctx) => {
            try {
              return await ctx.rebuild();
            }
            catch (err) {
              if (typeof err === "object" && "errors" in err && "warnings" in err) {
                return {
                  errors: err.errors,
                  warnings: err.warnings
                };
              }
              throw new err;
            }
          }));

          const watchBuildResults: ISdCliPackageBuildResult[] = watchResults.mapMany((esbuildResult) => [
            ...esbuildResult.warnings.map((warn) => ({
              filePath: warn.location?.file !== undefined ? path.resolve(warn.location.file) : undefined,
              line: warn.location?.line,
              char: warn.location?.column,
              code: undefined,
              severity: "warning" as const,
              message: warn.text,
              type: "build" as const
            })),
            ...esbuildResult.errors.map((err) => ({
              filePath: err.location?.file !== undefined ? path.resolve(err.location.file) : undefined,
              line: err.location?.line,
              char: err.location?.column !== undefined ? err.location.column + 1 : undefined,
              code: undefined,
              severity: "warning" as const,
              message: err.text,
              type: "build" as const
            }))
          ]);

          this._debug("CHECK...");
          const watchCheckResult = await sdTsProgram.buildAsync();

          this._debug(`LINT...`);
          const watchLintResults = await SdLinter.lintAsync(watchCheckResult.affectedFilePaths, sdTsProgram.builderProgram!.getProgram());

          this._debug(`빌드 완료`);
          this.emit("complete", {
            affectedFilePaths: watchCheckResult.affectedFilePaths,
            buildResults: [...watchBuildResults, ...watchCheckResult.results, ...watchLintResults]
          });
        });
      });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async buildAsync(): Promise<ISdCliBuilderResult> {
    throw new NotImplementError();
  }

  private async _getEsBuildOptionsAsync(opt: {
    dev: boolean;
    builderType: "web",
    cache: SourceFileCache
  }): Promise<esbuild.BuildOptions> {
    // const projPath = path.resolve(this._pkgPath, "../../");
    const tsconfigFilePath = path.resolve(this._pkgPath, "tsconfig.json");
    const mainFilePath = path.resolve(this._pkgPath, "src/main.ts");
    const indexHtmlFilePath = path.resolve(this._pkgPath, "src/index.html");

    const cacheBasePath = path.resolve(this._pkgPath, ".cache");
    const distBasePath = path.resolve(this._pkgPath, "dist");

    const {pluginOptions, styleOptions} = createCompilerPluginOptions(
      {
        advancedOptimizations: true,
        allowedCommonJsDependencies: [],
        baseHref: undefined,
        cacheOptions: {
          enabled: true,
          basePath: cacheBasePath,
          path: path.resolve(cacheBasePath, opt.builderType)
        },
        crossOrigin: CrossOrigin.None,
        deleteOutputPath: true,
        externalDependencies: [],
        extractLicenses: false,
        inlineStyleLanguage: 'scss',
        jit: false,
        stats: false,
        polyfills: ["./src/polyfills.ts"],
        poll: undefined,
        progress: true,
        externalPackages: true,
        preserveSymlinks: true,
        stylePreprocessorOptions: {includePaths: []},
        subresourceIntegrity: false,
        serverEntryPoint: undefined,
        prerenderOptions: undefined,
        appShellOptions: undefined,
        ssrOptions: undefined,
        verbose: false,
        watch: true,
        workspaceRoot: this._pkgPath,
        entryPoints: {main: mainFilePath},
        optimizationOptions: {
          scripts: false,
          styles: {minify: false, inlineCritical: false},
          fonts: {inline: false}
        },
        outputPath: distBasePath,
        outExtension: undefined,
        sourcemapOptions: {vendor: false, hidden: false, scripts: true, styles: true},
        tsconfig: tsconfigFilePath,
        projectRoot: this._pkgPath,
        assets: [
          {glob: 'favicon.ico', input: 'src', output: ''},
          {glob: '**/*', input: 'src\\assets', output: 'assets'}
        ],
        outputNames: {bundles: '[name]', media: 'media/[name]'},
        fileReplacements: undefined,
        globalStyles: [{name: 'styles', files: ["src/styles.scss"], initial: true}],
        globalScripts: [],
        serviceWorker: undefined,
        indexHtmlOptions: {
          input: indexHtmlFilePath,
          output: 'index.html',
          insertionOrder: [
            ['runtime', true],
            ['polyfills', true],
            ['styles', false],
            ['vendor', true],
            ['main', true]
          ]
        },
        tailwindConfiguration: undefined
      },
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
      opt.cache,
    );

    return {
      absWorkingDir: this._pkgPath,
      bundle: true,
      format: 'esm',
      assetNames: 'media/[name]',
      conditions: ['es2020', 'es2015', 'module'],
      resolveExtensions: ['.ts', '.tsx', '.mjs', '.js'],
      metafile: true,
      legalComments: 'eof',
      logLevel: 'silent',
      minifyIdentifiers: false,
      minifySyntax: false,
      minifyWhitespace: false,
      pure: ['forwardRef'],
      outdir: distBasePath,
      outExtension: undefined,
      sourcemap: true,
      splitting: true,
      chunkNames: 'chunk-[hash]',
      tsconfig: tsconfigFilePath,
      external: [],
      write: true,
      preserveSymlinks: true,
      define: {
        ngJitMode: 'false',
        global: 'global',
        process: 'process',
        Buffer: 'Buffer'
      },
      platform: 'browser',
      mainFields: ['es2020', 'es2015', 'browser', 'module', 'main'],
      entryNames: '[name]',
      entryPoints: {
        main: mainFilePath,
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
            resolveDir: this._pkgPath
          })
        }) as esbuild.Plugin,
        createSourcemapIgnorelistPlugin() as esbuild.Plugin,
        createCompilerPlugin(
          pluginOptions,
          styleOptions
        ) as esbuild.Plugin,
        // createExternalPackagesPlugin() as esbuild.Plugin,
        nodeStdLibBrowserPlugin(nodeStdLibBrowser)
      ]
    };
  }

  private _debug(msg: string): void {
    this._logger.debug(`[${path.basename(this._pkgPath)}] ${msg}`);
  }
}