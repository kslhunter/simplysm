import { EventEmitter } from "events";
import {
  INpmConfig,
  ISdClientCordovaPlatformConfig,
  ISdClientPackageConfig,
  ISdPackageBuildResult,
  ITsconfig,
  TSdClientPlatformConfig
} from "../commons";
import * as webpack from "webpack";
import * as path from "path";
import * as ts from "typescript";
import { FsUtil, Logger, PathUtil, SdProcessWorker } from "@simplysm/sd-core-node";
import { JavaScriptOptimizerPlugin } from "@angular-devkit/build-angular/src/webpack/plugins/javascript-optimizer-plugin";
import * as CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import * as esbuild from "esbuild";
import {
  CommonJsUsageWarnPlugin,
  DedupeModuleResolvePlugin,
  SuppressExtractedTextChunksWebpackPlugin
} from "@angular-devkit/build-angular/src/webpack/plugins";
import { LicenseWebpackPlugin } from "license-webpack-plugin";
import { SassWorkerImplementation } from "@angular-devkit/build-angular/src/sass/sass-service";
import * as MiniCssExtractPlugin from "mini-css-extract-plugin";
import { AngularWebpackPlugin } from "@ngtools/webpack";
import { SdWebpackUtil } from "../utils/SdWebpackUtil";
import { IndexHtmlWebpackPlugin } from "@angular-devkit/build-angular/src/webpack/plugins/index-html-webpack-plugin";
import * as CopyWebpackPlugin from "copy-webpack-plugin";
import { NextHandleFunction } from "connect";
import { HmrLoader } from "@angular-devkit/build-angular/src/webpack/plugins/hmr/hmr-loader";
import * as WebpackDevMiddleware from "webpack-dev-middleware";
import { StringUtil, Wait } from "@simplysm/sd-core-common";
import { augmentAppWithServiceWorker } from "@angular-devkit/build-angular/src/utils/service-worker";
import * as browserslist from "browserslist";
import * as WebpackHotMiddleware from "webpack-hot-middleware";
import * as os from "os";
import { LintResult } from "eslint-webpack-plugin/declarations/options";
import { SdCliCordova } from "../build-tools/SdCliCordova";

// eslint-disable-next-line @typescript-eslint/naming-convention
const ESLintWebpackPlugin = require("eslint-webpack-plugin");

export class SdCliNgClientBuilder extends EventEmitter {
  public parsedTsconfig: ts.ParsedCommandLine;
  public readonly npmConfig: INpmConfig;

  private _ngGenWorker?: SdProcessWorker;

  protected readonly _logger: Logger;

  private get _platformConfig(): TSdClientPlatformConfig {
    return this.config.platforms!.single((item) => item.type === this.platformType)!;
  }

  public constructor(public rootPath: string,
                     public tsconfigFilePath: string,
                     public projectRootPath: string,
                     public config: ISdClientPackageConfig,
                     public platformType: TSdClientPlatformConfig["type"],
                     public skipProcesses: ("lint" | "genNgModule")[]) {
    super();

    const tsconfig: ITsconfig = FsUtil.readJson(this.tsconfigFilePath);
    this.parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this.rootPath, tsconfig.angularCompilerOptions);

    this.npmConfig = FsUtil.readJson(path.resolve(this.rootPath, "package.json"));

    this._logger = Logger.get(["simplysm", "sd-cli", this.constructor.name, this.npmConfig.name]);
  }

  public on(event: "change", listener: () => void): this;
  public on(event: "complete", listener: (results: ISdPackageBuildResult[]) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public async buildAsync(): Promise<void> {
    this.emit("change");

    await FsUtil.removeAsync(this.parsedTsconfig.options.outDir!);

    const buildResult: ISdPackageBuildResult[] = [];

    // CORDOVA 초기화
    const cordova = this.platformType !== "cordova" ? undefined
      : new SdCliCordova(this.rootPath, this._platformConfig as ISdClientCordovaPlatformConfig);
    if (cordova) {
      await cordova.initializeAsync();
    }

    // GENERATOR
    if (!this.skipProcesses.includes("genNgModule")) {
      this._logger.debug("NgGen 수행");
      const genResult = await this._runNgGenWorkerAsync(false);
      buildResult.push(...genResult.result);
      this._logger.debug("NgGen 수행 결과", genResult);
    }

    // WEBPACK 빌드
    this._logger.debug("Webpack 빌드 수행");
    const webpackConfig = this._getWebpackConfig(false);
    const compiler = webpack(webpackConfig);
    const webpackBuildResults = await new Promise<ISdPackageBuildResult[]>((resolve, reject) => {
      compiler.run(async (err, stat) => {
        if (err != null) {
          reject(err);
          return;
        }

        if (cordova) {
          await cordova.buildAsync(this.parsedTsconfig.options.outDir!);
        }

        const results = SdWebpackUtil.getWebpackResults(stat!);
        resolve(results);
      });
    });
    this._logger.debug("Webpack 빌드 결과", webpackBuildResults);
    buildResult.push(...webpackBuildResults);

    // .config.json 파일 쓰기

    const targetPath = path.resolve(this.parsedTsconfig.options.outDir!, ".config.json");
    await FsUtil.writeFileAsync(targetPath, JSON.stringify(this.config.configs ?? {}, undefined, 2));

    // service-worker 처리

    if (FsUtil.exists(path.resolve(this.rootPath, "ngsw-config.json"))) {
      const packageKey = this.npmConfig.name.split("/").last()!;
      await augmentAppWithServiceWorker(
        PathUtil.posix(this.projectRootPath) as any,
        PathUtil.posix(path.relative(this.projectRootPath, this.rootPath)) as any,
        PathUtil.posix(path.relative(this.projectRootPath, this.parsedTsconfig.options.outDir!)) as any,
        `/${packageKey}/`,
        PathUtil.posix(path.relative(this.projectRootPath, path.resolve(this.rootPath, "ngsw-config.json")))
      );
    }

    this.emit("complete", buildResult.distinct());
  }

  public async watchAsync(serverPath?: string): Promise<NextHandleFunction[]> {
    await FsUtil.removeAsync(this.parsedTsconfig.options.outDir!);

    const ngGenResultsMap = new Map<string, ISdPackageBuildResult[]>();
    const addNgGenResults = (r: ISdPackageBuildResult[]): void => {
      for (const item of r) {
        const arr = ngGenResultsMap.getOrCreate(item.filePath !== undefined ? PathUtil.posix(item.filePath) : "undefined", []);
        arr.push(item);
      }
    };
    const removeNgGenResults = (filePaths: string[]): void => {
      for (const filePath of filePaths) {
        ngGenResultsMap.delete(PathUtil.posix(filePath));
      }
    };
    const getNgGenResults = (): ISdPackageBuildResult[] => {
      return Array.from(ngGenResultsMap.values()).mapMany().distinct();
    };

    // CORDOVA 초기화
    const cordova = this.platformType !== "cordova" ? undefined
      : new SdCliCordova(this.rootPath, this._platformConfig as ISdClientCordovaPlatformConfig);
    if (cordova) {
      await cordova.initializeAsync();
    }

    // WEBPACK 빌드
    let invalidFiles = new Set<string>();
    const webpackConfig = this._getWebpackConfig(true);
    const compiler = webpack(webpackConfig);
    return await new Promise<NextHandleFunction[]>((resolve, reject) => {
      compiler.hooks.invalid.tap(this.constructor.name, (fileName) => {
        if (fileName != null) {
          invalidFiles.add(fileName);
        }
      });

      compiler.hooks.watchRun.tapAsync(this.constructor.name, async (compiler1, callback) => {
        this.emit("change");

        // -- FIRST

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition,@typescript-eslint/strict-boolean-expressions
        if (invalidFiles.size === 0) {
          if (!this.skipProcesses.includes("genNgModule")) {
            this._logger.debug("첫 NgGen 수행");
            const genResult = await this._runNgGenWorkerAsync(true);
            addNgGenResults(genResult.result);
            this._logger.debug("첫 NgGen 수행 결과", genResult);
          }

          this._logger.debug("Webpack 빌드 수행");
          callback();
        }

        // -- NOT FIRST
        else {
          // 변경파일 중, 유효한 파일 추출
          const changedFiles = [...invalidFiles];
          invalidFiles = new Set<string>();

          const changedFilePaths = changedFiles
            .map((item) => PathUtil.posix(item))
            .filter((item) => path.basename(item).includes("."))
            .distinct();
          if (changedFilePaths.length === 0) {
            this._logger.debug("Webpack 빌드 수행");
            callback();
            return;
          }
          removeNgGenResults(["undefined"]);
          removeNgGenResults(changedFilePaths);

          if (!this.skipProcesses.includes("genNgModule")) {
            this._logger.debug("변경파일에 대한, NgGen 수행", changedFilePaths);

            const genResult = await this._runNgGenWorkerAsync(true, changedFilePaths);
            if (genResult.dirtyFilePaths.length === 0) {
              this._logger.debug("변경파일에 대한, NgGen 결과", genResult);
              this._logger.debug("Webpack 빌드 수행");
              callback();
              return;
            }
            removeNgGenResults(genResult.dirtyFilePaths);
            addNgGenResults(genResult.result);

            this._logger.debug("변경파일에 대한, NgGen 결과", genResult);

            const modifiedFiles = [...compiler.modifiedFiles];
            const removedFiles = [...compiler.removedFiles];
            for (const genFilePath of genResult.dirtyFilePaths.distinct()) {
              if (FsUtil.exists(genFilePath)) {
                modifiedFiles.push(genFilePath);
              }
              else {
                removedFiles.push(genFilePath);
              }
            }
            compiler.modifiedFiles = new Set(modifiedFiles.distinct());
            compiler.removedFiles = new Set(removedFiles.distinct());
          }

          this._logger.debug("Webpack 빌드 수행");
          callback();
        }
      });

      // eslint-disable-next-line prefer-const
      let devMiddleware: NextHandleFunction | undefined;
      // eslint-disable-next-line prefer-const
      let hotMiddleware: NextHandleFunction | undefined;

      compiler.hooks.failed.tap(this.constructor.name, (err) => {
        const results = SdWebpackUtil.getWebpackResults(err);
        const allResults = [...getNgGenResults(), ...results].distinct();
        this.emit("complete", allResults);
        this._logger.debug("Webpack 빌드 수행 결과", allResults);
        reject(err);
      });

      compiler.hooks.done.tap("SdCliClientCompiler", async (stats) => {
        const results = SdWebpackUtil.getWebpackResults(stats);

        // .config.json 파일 쓰기
        const packageKey = this.npmConfig.name.split("/").last()!;
        const configDistPath = !StringUtil.isNullOrEmpty(serverPath)
          ? path.resolve(serverPath, "dist/www", packageKey, ".config.json")
          : path.resolve(this.parsedTsconfig.options.outDir!, ".config.json");
        await FsUtil.writeFileAsync(configDistPath, JSON.stringify(this.config.configs ?? {}, undefined, 2));


        await Wait.true(() => devMiddleware !== undefined && hotMiddleware !== undefined);
        const allResults = [...getNgGenResults(), ...results].distinct();
        this.emit("complete", allResults);
        this._logger.debug("Webpack 빌드 수행 결과", allResults);
        resolve([devMiddleware!, hotMiddleware!]);
      });

      devMiddleware = WebpackDevMiddleware(compiler, {
        publicPath: webpackConfig.output!.publicPath as string,
        index: "index.html",
        headers: { "Access-Control-Allow-Origin": "*" },
        stats: false
      });

      hotMiddleware = WebpackHotMiddleware(compiler, {
        path: `${webpackConfig.output!.publicPath as string}__webpack_hmr`,
        log: false
      });
    });
  }

  private _getWebpackConfig(watch: boolean): webpack.Configuration {
    const nodeSass = new SassWorkerImplementation();

    const packageKey = this.npmConfig.name.split("/").last()!;

    const distPath = (this.platformType === "cordova" && !watch) ? path.resolve(this.rootPath, ".cordova", "www")
      : this.parsedTsconfig.options.outDir;

    const publicPath = (this.platformType === "cordova" && !watch) ? ""
      : (this.platformType !== "browser" ? `/__${this.platformType}` : "") + `/${packageKey}/`;

    return {
      mode: watch ? "development" : "production",
      devtool: false,
      target: ["web", "es2015"],
      profile: false,
      resolve: {
        roots: [this.rootPath],
        extensions: [".ts", ".js"],
        symlinks: true,
        // modules: allNodeModulePaths,
        mainFields: ["es2015", "browser", "module", "main"],
        fallback: this.config.resolveFallback
      },
      /*resolveLoader: {
        symlinks: true,
        modules: allNodeModulePaths
      },*/
      context: this.projectRootPath,
      entry: {
        main: [
          ...watch ? [
            `webpack-hot-middleware/client?path=${publicPath}__webpack_hmr&timeout=20000&reload=true&overlay=true`
          ] : [],
          path.resolve(this.rootPath, "src/main.ts")
        ],
        polyfills: [
          path.resolve(this.rootPath, "src/polyfills.ts")
        ],
        styles: [
          path.resolve(this.rootPath, "src/styles.scss")
        ]
      },
      output: {
        clean: true,
        path: distPath,
        publicPath,
        // filename: watch ? "[name].js" : `[name].[chunkhash:20].js`,
        // chunkFilename: watch ? "[name].js" : "[name].[chunkhash:20].js",
        filename: "[name].js",
        chunkFilename: "[name].js",
        assetModuleFilename: "resources/[name][ext][query]",
        crossOriginLoading: false,
        trustedTypes: "angular#bundler"
      },
      ...watch ? {
        watchOptions: { poll: undefined, ignored: "**/$_lazy_route_resources" }
      } : {
        watch: false
      },
      performance: { hints: false },
      ignoreWarnings: [
        /System.import\(\) is deprecated and will be removed soon/i,
        /Failed to parse source map from/,
        /Add postcss as project dependency/
      ],
      module: {
        strictExportPresence: true,
        rules: [
          ...watch ? [
            {
              loader: HmrLoader,
              include: [path.resolve(this.rootPath, "src/main.ts")]
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
          ...watch ? [
            {
              test: /\.m?js$/,
              enforce: "pre",
              loader: require.resolve("source-map-loader"),
              options: {
                filterSourceMappingUrl: (mapUri: string, resourcePath: string) => {
                  return !resourcePath.includes("node_modules") || (/@simplysm[\\/]sd/).test(resourcePath);
                }
              }
            }
          ] as any : [],
          {
            test: /\.scss$/i,
            rules: [
              {
                oneOf: [
                  {
                    include: path.resolve(this.rootPath, "src/styles.scss"),
                    use: [
                      {
                        loader: MiniCssExtractPlugin.loader
                      },
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
                    exclude: path.resolve(this.rootPath, "src/styles.scss"),
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
                      sourceMap: watch,
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
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx?|pptx?|docx?|zip|pfx|pkl)$/,
            type: "asset/resource"
          }
        ]
      },
      experiments: { syncWebAssembly: true, asyncWebAssembly: true },
      ...watch ? {
        cache: { type: "memory", maxGenerations: 1 },
        snapshot: {
          immutablePaths: this._findAllInternalModuleCachePaths(),
          managedPaths: this._findAllInternalModuleCachePaths()
        }
      } : {
        cache: false
      },
      optimization: {
        minimizer: watch ? [] : [
          new JavaScriptOptimizerPlugin({
            define: { ngDevMode: false, ngI18nClosureMode: false, ngJitMode: false },
            sourcemap: false,
            target: this.parsedTsconfig.options.target,
            keepNames: true,
            removeLicenses: true,
            advanced: true
          }) as any,
          new CssMinimizerPlugin({
            test: /\.(css|scss)$/,
            exclude: "styles.css",
            parallel: false,
            minify: async (data: string) => {
              const [[sourcefile, input]] = Object.entries(data);
              const { code, warnings } = await esbuild.transform(input, {
                loader: "css",
                minify: true,
                sourcefile,
                target: this.platformType === "cordova" ? [
                  ...(this._platformConfig as ISdClientCordovaPlatformConfig).targets.mapMany((target) => [
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    ...target === "android" ? ["android 90"] : []
                  ])
                ] : browserslist([
                  "last 1 Chrome versions",
                  "last 2 Edge major versions"
                ]).map((item) => item.replace(/ /g, ""))
              });

              return {
                code,
                warnings:
                  warnings.length > 0
                    ? await esbuild.formatMessages(warnings, { kind: "warning" })
                    : []
              };
            }
          }),
          new CssMinimizerPlugin({
            test: /\.css$/,
            include: "styles.css",
            parallel: 4,
            minify: [CssMinimizerPlugin.cssnanoMinify],
            minimizerOptions: {
              preset: [
                "default",
                {
                  svgo: false,
                  calc: false,
                  cssDeclarationSorter: false,
                  minifyParams: false
                }
              ]
            }
          })
        ],
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
      plugins: [
        new webpack.ContextReplacementPlugin(
          /@angular[\\/]core[\\/]/,
          path.join(this.rootPath, "$_lazy_route_resources"),
          {}
        ),
        new DedupeModuleResolvePlugin({ verbose: false }) as any,
        new CopyWebpackPlugin({
          patterns: [
            ...["favicon.ico", "assets/", "manifest.webmanifest"].map((item) => ({
              context: this.rootPath,
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
                ].map((i) => PathUtil.posix(this.rootPath, i))
              },
              priority: 0
            })),
            ...this.platformType === "cordova" ? [
              ...(this._platformConfig as ISdClientCordovaPlatformConfig).targets.map((target) => ({
                context: this.rootPath,
                to: `cordova-${target}`,
                from: `.cordova/platforms/${target}/platform_www`
              })),
              ...watch ? [{
                context: this.rootPath,
                to: `cordova-browser`,
                from: `.cordova/platforms/browser/platform_www`
              }] : []
            ] : []
          ]
        }),
        ...watch ? [] : [
          new LicenseWebpackPlugin({
            stats: { warnings: false, errors: false },
            perChunkOutput: false,
            outputFilename: "3rdpartylicenses.txt",
            skipChildCompilers: true
          })
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
        /*new AnyComponentStyleBudgetChecker(watch ? [] : [
          {
            type: Type.Any,
            maximumWarning: "2kb",
            maximumError: "4kb"
          }
        ]),*/
        {
          apply(compiler) {
            compiler.hooks.shutdown.tap("sass-worker", () => {
              nodeSass.close();
            });
          }
        },
        new MiniCssExtractPlugin({
          // filename: watch ? "[name].css" : `[name].[contenthash:20].css`
          filename: "[name].css"
        }),
        ...watch ? [] : [
          new SuppressExtractedTextChunksWebpackPlugin()
        ],
        new AngularWebpackPlugin({
          tsconfig: this.tsconfigFilePath,
          compilerOptions: this.parsedTsconfig.options,
          jitMode: false,
          emitNgModuleScope: watch,
          inlineStyleFileExtension: "scss"
        }),
        new IndexHtmlWebpackPlugin({
          indexPath: path.resolve(this.rootPath, "src/index.html"),
          outputPath: "index.html",
          baseHref: publicPath,
          entrypoints: [
            "runtime",
            "polyfills",
            "sw-register",
            "styles",
            "vendor",
            "main"
          ],
          moduleEntrypoints: [],
          noModuleEntrypoints: [],
          deployUrl: undefined,
          sri: false,
          postTransform: undefined,
          optimization: {
            scripts: !watch,
            styles: { minify: !watch, inlineCritical: !watch },
            fonts: { inline: !watch }
          },
          WOFFSupportNeeded: false,
          crossOrigin: "none",
          lang: undefined
        }),
        new webpack.ProvidePlugin({
          "Buffer": ["buffer", "Buffer"]
        }),
        new webpack.EnvironmentPlugin({
          SD_VERSION: this.npmConfig.version,
          ...this.config.env
        }),
        ...!this.skipProcesses.includes("lint") ? [
          new ESLintWebpackPlugin({
            context: this.rootPath,
            eslintPath: path.resolve(this.projectRootPath, "node_modules", "eslint"),
            extensions: ["js", "ts"],
            exclude: ["node_modules"],
            fix: false,
            threads: false,
            formatter: (results: LintResult[]) => {
              const resultMessages: string[] = [];
              for (const result of results) {
                for (const msg of result.messages) {
                  resultMessages.push(`${result.filePath}(${msg.line}, ${msg.column}): ${msg.ruleId ?? ""}: ${msg.severity === 1 ? "warning" : msg.severity === 2 ? "error" : ""} ${msg.message}`);
                }
              }
              return resultMessages.join(os.EOL);
            }
          })
        ] : [],
        ...watch ? [
          new webpack.HotModuleReplacementPlugin()
        ] : [],
        /*...watch ? [
          new webpack.WatchIgnorePlugin({
            paths: [
              path.resolve(this.rootPath, "src/_modules/"),
              path.resolve(this.rootPath, "src/_routes.ts")
            ]
          })
        ] : [],*/
        new webpack.ProgressPlugin({
          handler: (per: number, msg: string, ...args: string[]) => {
            const phaseText = msg ? ` - phase: ${msg}` : "";
            const argsText = args.length > 0 ? ` - args: [${args.join(", ")}]` : "";
            this._logger.debug(`Webpack 빌드 수행중...(${Math.round(per * 100)}%)${phaseText}${argsText}`);
          }
        })
      ],
      node: false,
      stats: "errors-warnings"
    };
  }

  private _findAllInternalModuleCachePaths(): string[] {
    return this._findAllNodeModules(this.rootPath, this.projectRootPath)
      .mapMany((item) => (
        FsUtil.readdir(item)
          .filter((item1) => item1 !== "@simplysm")
          .map((item1) => path.resolve(item, item1))
      ));
  }

  private _findAllNodeModules(from: string, root: string): string[] {
    const nodeModules: string[] = [];

    let current = from;
    while (current) {
      const potential = path.join(current, "node_modules");
      if (FsUtil.exists(potential) && FsUtil.isDirectory(potential)) {
        nodeModules.push(potential);
      }

      if (current === root) break;

      const next = path.dirname(current);
      if (next === current) break;
      current = next;
    }

    return nodeModules;
  }

  private async _runNgGenWorkerAsync(watch: boolean, changedFilePaths?: string[]): Promise<{ dirtyFilePaths: string[]; result: ISdPackageBuildResult[] }> {
    if (!this._ngGenWorker) {
      this._ngGenWorker = await SdProcessWorker.createAsync(path.resolve(__dirname, `../workers/client-ng-gen-worker`), []);
    }

    const sender = this._ngGenWorker.createWorkSender();
    return await new Promise<{ dirtyFilePaths: string[]; result: ISdPackageBuildResult[] }>(async (resolve) => {
      await sender
        .on("complete", (result) => {
          resolve(result);
        })
        .sendAsync(this.rootPath, watch, changedFilePaths);
    });
  }
}
