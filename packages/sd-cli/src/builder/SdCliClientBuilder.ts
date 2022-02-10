import { INpmConfig, ISdCliClientPackageConfig, ISdCliPackageBuildResult, ITsconfig } from "../commons";
import { EventEmitter } from "events";
import { FsUtil, Logger, PathUtil } from "@simplysm/sd-core-node";
import webpack from "webpack";
import path from "path";
import ts from "typescript";
import { SdCliBuildResultUtil } from "../utils/SdCliBuildResultUtil";
import { NamedChunksPlugin } from "@angular-devkit/build-angular/src/webpack/plugins/named-chunks-plugin";
import {
  AnyComponentStyleBudgetChecker,
  CommonJsUsageWarnPlugin,
  DedupeModuleResolvePlugin,
  JavaScriptOptimizerPlugin,
  SuppressExtractedTextChunksWebpackPlugin
} from "@angular-devkit/build-angular/src/webpack/plugins";
import CopyWebpackPlugin from "copy-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { AngularWebpackPlugin } from "@ngtools/webpack";
import { IndexHtmlWebpackPlugin } from "@angular-devkit/build-angular/src/webpack/plugins/index-html-webpack-plugin";
import { SassWorkerImplementation } from "@angular-devkit/build-angular/src/sass/sass-service";
import { HmrLoader } from "@angular-devkit/build-angular/src/webpack/plugins/hmr/hmr-loader";
import wdm from "webpack-dev-middleware";
import whm from "webpack-hot-middleware";
import { NextHandleFunction } from "connect";
import { LicenseWebpackPlugin } from "license-webpack-plugin";
import { Type } from "@angular-devkit/build-angular";
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";
import { createHash } from "crypto";
import ESLintWebpackPlugin from "eslint-webpack-plugin";
import os from "os";
import { ESLint } from "eslint";
import { TransferSizePlugin } from "@angular-devkit/build-angular/src/webpack/plugins/transfer-size-plugin";
import { CssOptimizerPlugin } from "@angular-devkit/build-angular/src/webpack/plugins/css-optimizer-plugin";
import browserslist from "browserslist";
import { augmentAppWithServiceWorker } from "@angular-devkit/build-angular/src/utils/service-worker";
import { StringUtil } from "@simplysm/sd-core-common";
import LintResult = ESLint.LintResult;

export class SdCliClientBuilder extends EventEmitter {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  private readonly _tsconfigFilePath: string;
  private readonly _parsedTsconfig: ts.ParsedCommandLine;
  private readonly _npmConfigMap = new Map<string, INpmConfig>();

  public constructor(private readonly _rootPath: string,
                     private readonly _config: ISdCliClientPackageConfig,
                     private readonly _workspaceRootPath: string) {
    super();

    // tsconfig
    this._tsconfigFilePath = path.resolve(this._rootPath, "tsconfig-build.json");
    const tsconfig = FsUtil.readJson(this._tsconfigFilePath) as ITsconfig;
    this._parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this._rootPath, tsconfig.angularCompilerOptions);
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (results: ISdCliPackageBuildResult[]) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public async watchAsync(): Promise<NextHandleFunction[]> {
    // DIST 비우기
    await FsUtil.removeAsync(this._parsedTsconfig.options.outDir!);

    // 빌드 준비
    const webpackConfig = this._getWebpackConfig(true);
    const compiler = webpack(webpackConfig);
    return await new Promise<NextHandleFunction[]>((resolve, reject) => {
      compiler.hooks.watchRun.tapAsync(this.constructor.name, (args, callback) => {
        this.emit("change");
        callback();

        this._logger.debug("Webpack 빌드 수행...");
      });

      compiler.hooks.failed.tap(this.constructor.name, (err) => {
        reject(err);
        return;
      });

      compiler.hooks.done.tap(this.constructor.name, async (stats) => {
        // 결과 반환
        const results = SdCliBuildResultUtil.convertFromWebpackStats(stats);
        this.emit("complete", results);

        // .config.json 파일 쓰기
        const npmConfig = this._getNpmConfig(this._rootPath)!;
        const packageKey = npmConfig.name.split("/").last()!;

        const configDistPath = !StringUtil.isNullOrEmpty(this._config.server)
          ? path.resolve(this._workspaceRootPath, "packages", this._config.server, "dist/www", packageKey, ".config.json")
          : path.resolve(this._parsedTsconfig.options.outDir!, ".config.json");
        await FsUtil.writeFileAsync(configDistPath, JSON.stringify(this._config.configs ?? {}, undefined, 2));

        // 마무리
        this._logger.debug("Webpack 빌드 완료");
        resolve([devMiddleware, hotMiddleware]);
      });

      const devMiddleware = wdm(compiler, {
        publicPath: webpackConfig.output!.publicPath as string,
        index: "index.html",
        stats: false
      });

      const hotMiddleware = whm(compiler, {
        path: `${webpackConfig.output!.publicPath as string}__webpack_hmr`,
        log: false
      });
    });
  }

  public async buildAsync(): Promise<ISdCliPackageBuildResult[]> {
    // DIST 비우기
    await FsUtil.removeAsync(this._parsedTsconfig.options.outDir!);

    // 빌드
    this._logger.debug("Webpack 빌드 수행...");
    const webpackConfig = this._getWebpackConfig(false);
    const compiler = webpack(webpackConfig);
    const buildResults = await new Promise<ISdCliPackageBuildResult[]>((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err != null || stats == null) {
          reject(err);
          return;
        }

        // 결과 반환
        const results = SdCliBuildResultUtil.convertFromWebpackStats(stats);
        resolve(results);
      });
    });

    // .config.json 파일 쓰기
    const targetPath = path.resolve(this._parsedTsconfig.options.outDir!, ".config.json");
    await FsUtil.writeFileAsync(targetPath, JSON.stringify(this._config.configs ?? {}, undefined, 2));

    // service-worker 처리
    if (FsUtil.exists(path.resolve(this._rootPath, "ngsw-config.json"))) {
      const packageKey = this._getNpmConfig(this._rootPath)!.name.split("/").last()!;
      await augmentAppWithServiceWorker(
        PathUtil.posix(path.relative(this._workspaceRootPath, this._rootPath)) as any,
        PathUtil.posix(path.relative(this._workspaceRootPath, this._parsedTsconfig.options.outDir!)) as any,
        `/${packageKey}/`,
        PathUtil.posix(path.relative(this._workspaceRootPath, path.resolve(this._rootPath, "ngsw-config.json")))
      );
    }

    // 마무리
    this._logger.debug("Webpack 빌드 완료");
    return buildResults;
  }

  private _getInternalModuleCachePaths(workspaceName: string): string[] {
    return [
      ...FsUtil.findAllParentChildDirPaths("node_modules/*/package.json", this._rootPath, this._workspaceRootPath),
      ...FsUtil.findAllParentChildDirPaths(`node_modules/!(@simplysm|@${workspaceName})/*/package.json`, this._rootPath, this._workspaceRootPath),
    ].map((p) => path.dirname(p));
  }

  private _getWebpackConfig(watch: boolean): webpack.Configuration {
    const workspaceNpmConfig = this._getNpmConfig(this._workspaceRootPath)!;
    const workspaceName = workspaceNpmConfig.name;

    const internalModuleCachePaths = watch ? this._getInternalModuleCachePaths(workspaceName) : undefined;

    const npmConfig = this._getNpmConfig(this._rootPath)!;
    const pkgVersion = npmConfig.version;
    const ngVersion = this._getNpmConfig(FsUtil.findAllParentChildDirPaths("node_modules/@angular/core", this._rootPath, this._workspaceRootPath)[0])!.version;

    const pkgKey = npmConfig.name.split("/").last()!;
    const publicPath = `/${pkgKey}/`;

    const cacheBasePath = path.resolve(this._rootPath, ".cache");
    const cachePath = path.resolve(cacheBasePath, pkgVersion);

    const distPath = this._parsedTsconfig.options.outDir;

    const sassImplementation = new SassWorkerImplementation();

    const mainFilePath = path.resolve(this._rootPath, "src/main.ts");
    const polyfillsFilePath = path.resolve(this._rootPath, "src/polyfills.ts");
    const stylesFilePath = path.resolve(this._rootPath, "src/styles.scss");

    return {
      mode: watch ? "development" : "production",
      devtool: false,
      target: ["web", "es2015"],
      profile: false,
      resolve: {
        roots: [this._rootPath],
        extensions: [".ts", ".tsx", ".mjs", ".cjs", ".js"],
        symlinks: true,
        modules: [this._workspaceRootPath, "node_modules"],
        mainFields: ["es2015", "browser", "module", "main"],
        conditionNames: ["es2015", "..."]
      },
      resolveLoader: {
        symlinks: true
      },
      context: this._workspaceRootPath,
      entry: {
        main: [
          ...watch ? [
            `webpack-hot-middleware/client?path=${publicPath}__webpack_hmr&timeout=20000&reload=true&overlay=true`
          ] : [],
          mainFilePath
        ],
        ...FsUtil.exists(polyfillsFilePath) ? { polyfills: polyfillsFilePath } : {},
        ...FsUtil.exists(stylesFilePath) ? { styles: stylesFilePath } : {}
      },
      output: {
        uniqueName: pkgKey,
        hashFunction: "xxhash64",
        clean: true,
        path: distPath,
        publicPath,
        filename: "[name].js",
        chunkFilename: "[name].js",
        libraryTarget: undefined,
        crossOriginLoading: false,
        trustedTypes: "angular#bundler",
        scriptType: "module"
      },
      watch: false,
      watchOptions: { poll: undefined, ignored: undefined },
      performance: { hints: false },
      ignoreWarnings: [
        /Failed to parse source map from/,
        /Add postcss as project dependency/,
        /"@charset" must be the first rule in the file/
      ],
      experiments: { backCompat: false, syncWebAssembly: true, asyncWebAssembly: true },
      infrastructureLogging: { level: "error" },
      stats: "errors-warnings",
      cache: {
        type: "filesystem",
        profile: watch ? undefined : false,
        cacheDirectory: path.resolve(cachePath, "angular-webpack"),
        maxMemoryGenerations: 1,
        name: createHash("sha1")
          .update(pkgVersion)
          .update(ngVersion)
          .update(JSON.stringify(this._parsedTsconfig.options))
          .update(this._workspaceRootPath)
          .update(this._rootPath)
          .update(JSON.stringify(this._config))
          .update(watch.toString())
          .digest("hex")
      },
      ...watch ? {
        snapshot: {
          immutablePaths: internalModuleCachePaths,
          managedPaths: internalModuleCachePaths
        }
      } : {},
      node: false,
      optimization: {
        minimizer: watch ? [] : [
          new JavaScriptOptimizerPlugin({
            define: {
              ngDevMode: false,
              ngI18nClosureMode: false,
              ngJitMode: false
            },
            sourcemap: false,
            target: ts.ScriptTarget.ES2017,
            keepIdentifierNames: true,
            keepNames: true,
            removeLicenses: true,
            advanced: true
          }),
          new TransferSizePlugin(),
          new CssOptimizerPlugin({
            supportedBrowsers: browserslist([
              "last 1 Chrome versions",
              "last 2 Edge major versions"
            ], { path: this._workspaceRootPath })
          })
        ] as any[],
        moduleIds: "deterministic",
        chunkIds: watch ? "named" : "deterministic",
        emitOnErrors: watch,
        runtimeChunk: "single",
        splitChunks: {
          maxAsyncRequests: Infinity,
          cacheGroups: {
            default: {
              chunks: "async",
              minChunks: 2,
              priority: 10
            },
            common: {
              name: "common",
              chunks: "async",
              minChunks: 2,
              enforce: true,
              priority: 5
            },
            vendors: false,
            defaultVendors: watch ? {
              name: "vendor",
              chunks: (chunk) => chunk.name === "main",
              enforce: true,
              test: /[\\/]node_modules[\\/]/
            } : false
          }
        }
      },
      module: {
        strictExportPresence: true,
        parser: { javascript: { url: false, worker: false } },
        rules: [
          {
            test: /\.?(svg|html)$/,
            resourceQuery: /\?ngResource/,
            type: "asset/source"
          },
          {
            test: /[/\\]rxjs[/\\]add[/\\].+\.js$/,
            sideEffects: true
          },
          {
            test: /\.[cm]?[tj]sx?$/,
            resolve: { fullySpecified: false },
            exclude: [/[/\\](?:core-js|@babel|tslib|web-animations-js|web-streams-polyfill)[/\\]/],
            use: [
              {
                loader: "@angular-devkit/build-angular/src/babel/webpack-loader",
                options: {
                  cacheDirectory: path.resolve(cachePath, "babel-webpack"),
                  scriptTarget: ts.ScriptTarget.ES2017,
                  aot: true,
                  optimize: !watch,
                  instrumentCode: undefined
                }
              }
            ]
          },
          ...watch ? [
            {
              test: /\.[cm]?jsx?$/,
              enforce: "pre" as const,
              loader: "source-map-loader",
              options: {
                filterSourceMappingUrl: (mapUri: string, resourcePath: string) => {
                  const workspaceRegex = new RegExp(`node_modules[\\\\/]@${workspaceName}[\\\\/]`);
                  return !resourcePath.includes("node_modules")
                    || (/node_modules[\\/]@simplysm[\\/]/).test(resourcePath)
                    || workspaceRegex.test(resourcePath);
                }
              }
            }
          ] : [],
          {
            test: /\.[cm]?tsx?$/,
            loader: "@ngtools/webpack",
            exclude: [/[/\\](?:css-loader|mini-css-extract-plugin|webpack-dev-server|webpack)[/\\]/]
          },
          {
            test: /\.css$/i,
            type: "asset/source"
          },
          {
            test: /\.scss$/i,
            rules: [
              {
                oneOf: [
                  {
                    use: [
                      {
                        loader: MiniCssExtractPlugin.loader
                      },
                      {
                        loader: "css-loader",
                        options: { url: false, sourceMap: watch }
                      }
                    ],
                    include: [stylesFilePath],
                    resourceQuery: { not: [/\?ngResource/] }
                  },
                  {
                    type: "asset/source",
                    resourceQuery: /\?ngResource/
                  }
                ]
              },
              {
                use: [
                  {
                    loader: "resolve-url-loader",
                    options: { sourceMap: watch }
                  },
                  {
                    loader: "sass-loader",
                    options: {
                      implementation: sassImplementation,
                      sourceMap: true,
                      sassOptions: {
                        fiber: false,
                        precision: 8,
                        includePaths: [],
                        outputStyle: "expanded",
                        quietDeps: true,
                        verbose: watch ? undefined : false
                      }
                    }
                  }
                ]
              }
            ]
          },
          ...watch ? [
            {
              loader: HmrLoader,
              include: [mainFilePath]
            }
          ] : [],
          {
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx?|pptx?|docx?|zip|pfx|pkl)$/,
            type: "asset/resource"
          }
        ]
      },
      plugins: [
        new NodePolyfillPlugin(),
        new NamedChunksPlugin(),
        new DedupeModuleResolvePlugin(),
        /*new webpack.ProgressPlugin({
          handler: (per: number, msg: string, ...args: string[]) => {
            const phaseText = msg ? ` - phase: ${msg}` : "";
            const argsText = args.length > 0 ? ` - args: [${args.join(", ")}]` : "";
            this._logger.debug(`Webpack 빌드 수행중...(${Math.round(per * 100)}%)${phaseText}${argsText}`);
          }
        }),*/
        new CommonJsUsageWarnPlugin(),
        ...watch ? [] : [
          new LicenseWebpackPlugin({
            stats: { warnings: false, errors: false },
            perChunkOutput: false,
            outputFilename: "3rdpartylicenses.txt",
            skipChildCompilers: true
          })
        ],
        new CopyWebpackPlugin({
          patterns: [
            ...["favicon.ico", "assets/", "manifest.webmanifest"].map((item) => ({
              context: this._rootPath,
              to: item,
              from: `src/${item}`,
              noErrorOnMissing: true,
              force: true,
              globOptions: {
                dot: true,
                followSymbolicLinks: false,
                ignore: [
                  ".gitkeep",
                  "**/.DS_Store",
                  "**/Thumbs.db"
                ].map((i) => PathUtil.posix(this._rootPath, i))
              },
              priority: 0
            }))
          ]
        }),
        ...watch ? [
          new webpack.SourceMapDevToolPlugin({
            filename: "[file].map",
            include: [/js$/, /css$/],
            sourceRoot: "webpack:///",
            moduleFilenameTemplate: "[resource-path]",
            append: undefined
          })
        ] : [],
        new AngularWebpackPlugin({
          tsconfig: this._tsconfigFilePath,
          compilerOptions: {
            sourceMap: watch,
            declaration: false,
            declarationMap: false,
            preserveSymlinks: false
          },
          jitMode: false,
          emitNgModuleScope: watch,
          inlineStyleFileExtension: "scss"
        }),
        new AnyComponentStyleBudgetChecker(watch ? [] : [
          { type: Type.AnyComponentStyle, maximumWarning: "2kb", maximumError: "4kb" }
        ]),
        {
          apply: (compiler: webpack.Compiler) => {
            compiler.hooks.shutdown.tap("sass-worker", () => {
              sassImplementation.close();
            });
          }
        },
        new MiniCssExtractPlugin({ filename: "[name].css" }),
        new SuppressExtractedTextChunksWebpackPlugin(),
        // NgBuildAnalyticsPlugin,
        new IndexHtmlWebpackPlugin({
          indexPath: path.resolve(this._rootPath, "src/index.html"),
          outputPath: "index.html",
          baseHref: publicPath,
          entrypoints: [
            ["runtime", true],
            ["polyfills", true],
            ["styles", false],
            ["vendor", true],
            ["main", true]
          ],
          deployUrl: undefined,
          sri: false,
          cache: {
            enabled: true,
            basePath: cacheBasePath,
            path: cachePath
          },
          postTransform: undefined,
          optimization: {
            scripts: !watch,
            styles: { minify: !watch, inlineCritical: !watch },
            fonts: { inline: !watch }
          },
          crossOrigin: "none",
          lang: undefined
        }),
        ...watch ? [
          new webpack.HotModuleReplacementPlugin()
        ] : [],
        new webpack.EnvironmentPlugin({
          SD_VERSION: this._getNpmConfig(this._rootPath)!.version,
          ...this._config.env
        }),
        new ESLintWebpackPlugin({
          context: this._rootPath,
          eslintPath: path.resolve(this._workspaceRootPath, "node_modules", "eslint"),
          exclude: ["node_modules"],
          extensions: ["ts", "js", "mjs", "cjs"],
          fix: false,
          threads: false,
          formatter: (results: LintResult[]) => {
            const resultMessages: string[] = [];
            for (const result of results) {
              for (const msg of result.messages) {
                const severity = msg.severity === 1 ? "warning" : msg.severity === 2 ? "error" : undefined;
                if (severity === undefined) continue;

                resultMessages.push(SdCliBuildResultUtil.getMessage({
                  filePath: result.filePath,
                  line: msg.line,
                  char: msg.column,
                  code: msg.ruleId?.toString(),
                  severity,
                  message: msg.message
                }));
              }
            }
            return resultMessages.join(os.EOL);
          }
        })
      ] as any[]
    };
  }

  private _getNpmConfig(pkgPath: string): INpmConfig | undefined {
    if (!this._npmConfigMap.has(pkgPath)) {
      this._npmConfigMap.set(pkgPath, FsUtil.readJson(path.resolve(pkgPath, "package.json")));
    }
    return this._npmConfigMap.get(pkgPath);
  }
}
