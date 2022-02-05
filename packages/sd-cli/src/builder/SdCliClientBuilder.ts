import { INpmConfig, ISdCliPackageBuildResult, ISdCliServerPackageConfig } from "../commons";
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
  SuppressExtractedTextChunksWebpackPlugin
} from "@angular-devkit/build-angular/src/webpack/plugins";
import CopyWebpackPlugin from "copy-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { AngularWebpackPlugin } from "@ngtools/webpack";
import { IndexHtmlWebpackPlugin } from "@angular-devkit/build-angular/src/webpack/plugins/index-html-webpack-plugin";
import { createHash } from "crypto";
import { SassWorkerImplementation } from "@angular-devkit/build-angular/src/sass/sass-service";
import { HmrLoader } from "@angular-devkit/build-angular/src/webpack/plugins/hmr/hmr-loader";
import wdm from "webpack-dev-middleware";
import whm from "webpack-hot-middleware";
import { NextHandleFunction } from "connect";

export class SdCliClientBuilder extends EventEmitter {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  private readonly _tsconfigFilePath: string;
  private readonly _parsedTsconfig: ts.ParsedCommandLine;
  private readonly _npmConfigMap = new Map<string, INpmConfig>();

  public constructor(private readonly _rootPath: string,
                     private readonly _config: ISdCliServerPackageConfig,
                     private readonly _workspaceRootPath: string) {
    super();

    // tsconfig
    this._tsconfigFilePath = path.resolve(this._rootPath, "tsconfig-build.json");
    const tsconfig = FsUtil.readJson(this._tsconfigFilePath);
    this._parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this._rootPath);
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
    const webpackConfig = this._getWebpackCommonConfig(true);
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

      compiler.hooks.done.tap(this.constructor.name, (stats) => {
        // 결과 반환
        const results = SdCliBuildResultUtil.convertFromWebpackStats(stats);
        this.emit("complete", results);

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
    const webpackConfig = this._getWebpackCommonConfig(false);
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

    // 마무리
    this._logger.debug("Webpack 빌드 완료");
    return buildResults;
  }

  private _getWebpackCommonConfig(watch: boolean): webpack.Configuration {
    console.log(watch);

    const npmConfig = this._getNpmConfig(this._rootPath)!;
    const pkgVersion = npmConfig.version;

    const pkgKey = npmConfig.name.split("/").last()!;
    const publicPath = `/${pkgKey}/`;

    const cacheBasePath = path.resolve(this._rootPath, ".angular");
    const cachePath = path.resolve(cacheBasePath, pkgVersion);

    const distPath = this._parsedTsconfig.options.outDir;

    const sassImplementation = new SassWorkerImplementation();

    return {
      plugins: [
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
        new webpack.SourceMapDevToolPlugin({
          filename: "[file].map",
          include: [/js$/, /css$/],
          sourceRoot: "webpack:///",
          moduleFilenameTemplate: "[resource-path]",
          append: undefined,
        }),
        new AngularWebpackPlugin({
          tsconfig: this._tsconfigFilePath,
          compilerOptions: {
            sourceMap: true,
            declaration: false,
            declarationMap: false,
            preserveSymlinks: false
          },
          jitMode: false,
          emitNgModuleScope: true,
          inlineStyleFileExtension: "scss"
        }),
        new AnyComponentStyleBudgetChecker([]),
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
            scripts: false,
            styles: { minify: false, inlineCritical: false },
            fonts: { inline: false }
          },
          crossOrigin: "none",
          lang: undefined
        }),
        new webpack.HotModuleReplacementPlugin()
      ],
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
            sideEffects: true,
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
                  optimize: false,
                  instrumentCode: undefined
                }
              }
            ],
          },
          {
            test: /\.[cm]?jsx?$/,
            enforce: "pre",
            loader: "source-map-loader",
            options: {
              filterSourceMappingUrl: (_mapUri: string, resourcePath: string) => {
                return !resourcePath.includes("node_modules") || (/@simplysm[\\/]sd/).test(resourcePath);
              }
            }
          },
          {
            test: /\.[cm]?tsx?$/,
            loader: "@ngtools/webpack",
            exclude: [/[/\\](?:css-loader|mini-css-extract-plugin|webpack-dev-server|webpack)[/\\]/],
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
                        options: { url: false, sourceMap: true }
                      }
                    ],
                    include: path.resolve(this._rootPath, "src/styles.scss"),
                    resourceQuery: { not: [/\?ngResource/] }
                  },
                  {
                    type: "asset/source"
                  }
                ]
              },
              {
                use: [
                  {
                    loader: "resource-url-loader",
                    options: { sourceMap: true }
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
                        verbose: undefined
                      }
                    }
                  }
                ]
              }
            ]
          },
          {
            loader: HmrLoader,
            include: [path.resolve(this._rootPath, "src/main.ts")]
          }
        ]
      },
      mode: "development",
      devtool: false,
      target: ["web", "es2015"],
      profile: false,
      resolve: {
        roots: [this._rootPath],
        extensions: [".ts", ".tsx", ".mjs", ".js"],
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
          `webpack-hot-middleware/client?path=${publicPath}__webpack_hmr&timeout=20000&reload=true&overlay=true`,
          path.resolve(this._rootPath, "src/main.ts")
        ],
        polyfills: [path.resolve(this._rootPath, "src/polyfills.ts")],
        styles: [path.resolve(this._rootPath, "src/styles.scss")]
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
        scriptType: "module",
      },
      watch: false,
      watchOptions: { poll: undefined, ignored: undefined },
      performance: { hints: false },
      ignoreWarnings: [
        /Failed to parse source map from/,
        /Add postcss as project dependency/,
        /"@charset" must be the first rule in the file/,
      ],
      experiments: { backCompat: false, syncWebAssembly: true, asyncWebAssembly: true },
      infrastructureLogging: { level: "error" },
      stats: "errors-warnings",
      cache: {
        type: "filesystem",
        profile: undefined,
        cacheDirectory: path.resolve(cachePath, "angular-webpack"),
        maxMemoryGenerations: 1,
        name: createHash("sha1").update(pkgVersion).digest("hex")
      },
      optimization: {
        minimizer: [],
        moduleIds: "deterministic",
        chunkIds: "named",
        emitOnErrors: false,
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
            defaultVendors: {
              name: "vendor",
              chunks: (chunk) => chunk.name === "main",
              enforce: true,
              test: /[\\/]node_modules[\\/]/
            }
          }
        }
      },
      node: false
    } as webpack.Configuration;
    /*const npmConfig = this._getNpmConfig(this._rootPath)!;
    const packageKey = npmConfig.name.split("/").last()!;

    const distPath = this._parsedTsconfig.options.outDir;
    const publicPath = `/${packageKey}/`;

    const nodeSass = new SassWorkerImplementation();

    const internalModuleCachePaths = watch
      ? FsUtil.findAllParentChildDirPaths("node_modules/!(@simplysm)", this._rootPath, this._workspaceRootPath)
      : undefined;

    return {
      mode: watch ? "development" : "production",
      devtool: false,
      target: ["web", "es2020"],
      profile: false,
      resolve: {
        roots: [this._rootPath],
        extensions: [".ts", ".js", ".mjs", ".cjs"],
        symlinks: true,
        mainFields: ["es2020", "default", "browser", "module", "main"]
      },
      context: this._workspaceRootPath,
      entry: {
        main: [
          ...watch ? [
            `webpack-hot-middleware/client?path=${publicPath}__webpack_hmr&timeout=20000&reload=true&overlay=true`
          ] : [],
          path.resolve(this._rootPath, "src/main.ts")
        ],
        polyfills: [
          path.resolve(this._rootPath, "src/polyfills.ts")
        ],
        styles: [
          path.resolve(this._rootPath, "src/styles.scss")
        ]
      },
      output: {
        clean: true,
        path: distPath,
        publicPath,
        filename: "[name].js",
        chunkFilename: "[name].js",
        assetModuleFilename: "res/[name][ext][query]",
        crossOriginLoading: false,
        trustedTypes: "angular#bundler"
      },
      ...watch ? {
        watchOptions: { poll: undefined, ignored: "**!/$_lazy_route_resources" }
      } : {},
      performance: { hints: false },
      ignoreWarnings: [
        /System.import\(\) is deprecated and will be removed soon/i,
        /Failed to parse source map from/,
        /Add postcss as project dependency/
      ],
      experiments: { syncWebAssembly: true, asyncWebAssembly: true },
      ...watch ? {
        cache: { type: "memory", maxGenerations: 1 },
        snapshot: {
          immutablePaths: internalModuleCachePaths,
          managedPaths: internalModuleCachePaths
        }
      } : {
        cache: false
      },
      node: false,
      stats: "errors-warnings",
      optimization: {
        ...watch ? {} : {
          minimize: true,
          minimizer: [
            new JavaScriptOptimizerPlugin({
              define: { ngDevMode: false, ngI18nClosureMode: false, ngJitMode: false },
              sourcemap: false,
              target: this._parsedTsconfig.options.target!,
              keepIdentifierNames: true,
              keepNames: true,
              removeLicenses: true,
              advanced: true
            }) as any,
            new CssOptimizerPlugin({
              supportedBrowsers: browserslist([
                "last 2 Chrome versions",
                "last 2 Edge major versions"
              ]).map((item) => item.replace(/ /g, ""))
            })
          ]
        },
        moduleIds: "deterministic",
        chunkIds: watch ? "named" : "deterministic",
        emitOnErrors: watch,
        runtimeChunk: "single",
        splitChunks: {
          maxAsyncRequests: Infinity,
          cacheGroups: {
            default: { chunks: "async", minChunks: 2, priority: 10 },
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
        rules: [
          ...watch ? [
            {
              loader: HmrLoader,
              include: [path.resolve(this._rootPath, "src/main.ts")]
            }
          ] : [],
          {
            test: /[/\\]@angular[/\\]core[/\\].+\.js$/,
            parser: { system: true }
          },
          {
            test: /[/\\]rxjs[/\\]add[/\\].+\.js$/,
            sideEffects: true
          },
          {
            test: /\.m?js/,
            resolve: {
              fullySpecified: false
            }
          },
          ...watch ? [
            {
              test: /\.m?js$/,
              enforce: "pre" as const,
              loader: "source-map-loader",
              options: {
                filterSourceMappingUrl: (mapUri: string, resourcePath: string) => {
                  return !resourcePath.includes("node_modules") || (/@simplysm[\\/]sd/).test(resourcePath);
                }
              }
            }
          ] : [],
          {
            test: /\.scss$/i,
            rules: [
              {
                oneOf: [
                  {
                    include: path.resolve(this._rootPath, "src/styles.scss"),
                    use: [
                      ...watch ? [] : [{
                        loader: MiniCssExtractPlugin.loader
                      }],
                      {
                        loader: "css-loader",
                        options: {
                          url: false,
                          sourceMap: watch
                        }
                      }
                    ]
                  },
                  {
                    exclude: path.resolve(this._rootPath, "src/styles.scss"),
                    type: "asset/source"
                  }
                ]
              },
              {
                use: [
                  {
                    loader: "resolve-url-loader",
                    options: {
                      sourceMap: watch
                    }
                  },
                  {
                    loader: "sass-loader",
                    options: {
                      implementation: nodeSass,
                      sourceMap: true,
                      sassOptions: {
                        fiber: false,
                        precision: 8,
                        includePaths: [],
                        outputStyle: "expanded",
                        quietDeps: true,
                        verbose: false
                      }
                    }
                  }
                ]
              }
            ]
          },
          {
            test: /\.[jt]sx?$/,
            loader: "@ngtools/webpack"
          },
          {
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx?|pptx?|docx?|zip)$/,
            type: "asset/resource"
          }
        ]
      },
      plugins: [
        new NodePolyfillPlugin(),
        new webpack.ContextReplacementPlugin(
          /@angular[\\/]core[\\/]/,
          path.join(this._rootPath, "$_lazy_route_resources"),
          {}
        ),
        new DedupeModuleResolvePlugin({ verbose: false }) as any,
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
                  "**!/.DS_Store",
                  "**!/Thumbs.db"
                ].map((i) => PathUtil.posix(this._rootPath, i))
              },
              priority: 0
            }))
          ]
        }),
        ...watch ? [] : [
          new LicenseWebpackPlugin({
            stats: { warnings: false, errors: false },
            perChunkOutput: false,
            outputFilename: "3rd_party_licenses.txt",
            skipChildCompilers: true
          }) as any
        ],
        new CommonJsUsageWarnPlugin(),
        ...watch ? [
          new webpack.SourceMapDevToolPlugin({
            filename: "[file].map",
            include: [/js$/, /css$/],
            sourceRoot: "webpack:///",
            moduleFilenameTemplate: "[resource-path]",
            append: undefined
          })
        ] : [],
        ...watch ? [] : [
          new MiniCssExtractPlugin({
            // filename: watch ? "[name].css" : `[name].[contenthash:20].css`
            filename: "[name].css"
          })
        ],
        {
          apply(compiler) {
            compiler.hooks.shutdown.tap("sass-worker", () => {
              nodeSass.close();
            });
          }
        },
        ...watch ? [] : [
          new SuppressExtractedTextChunksWebpackPlugin()
        ],
        new AngularWebpackPlugin({
          tsconfig: this._tsconfigFilePath,
          compilerOptions: this._parsedTsconfig.options,
          jitMode: false,
          emitNgModuleScope: watch,
          inlineStyleFileExtension: "scss"
        }),
        new IndexHtmlWebpackPlugin({
          indexPath: path.resolve(this._rootPath, "src/index.html"),
          outputPath: "index.html",
          baseHref: publicPath,
          entrypoints: [
            ["runtime", !watch],
            ["polyfills", true],
            ["styles", false],
            ["vendor", true],
            ["main", true]
          ],
          deployUrl: undefined,
          sri: false,
          cache: {},
          postTransform: undefined,
          optimization: {
            scripts: !watch,
            styles: { minify: !watch, inlineCritical: !watch },
            fonts: { inline: !watch }
          },
          crossOrigin: "none",
          lang: undefined
        }),
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
        }),
        ...watch ? [
          new webpack.HotModuleReplacementPlugin()
        ] : []/!*,
        new webpack.ProgressPlugin({
          handler: (per: number, msg: string, ...args: string[]) => {
            const phaseText = msg ? ` - phase: ${msg}` : "";
            const argsText = args.length > 0 ? ` - args: [${args.join(", ")}]` : "";
            this._logger.debug(`Webpack 빌드 수행중...(${Math.round(per * 100)}%)${phaseText}${argsText}`);
          }
        })*!/
      ]
    };*/
  }

  private _getNpmConfig(pkgPath: string): INpmConfig | undefined {
    if (!this._npmConfigMap.has(pkgPath)) {
      this._npmConfigMap.set(pkgPath, FsUtil.readJson(path.resolve(pkgPath, "package.json")));
    }
    return this._npmConfigMap.get(pkgPath);
  }
}
