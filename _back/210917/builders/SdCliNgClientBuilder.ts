import { EventEmitter } from "events";
import { INpmConfig, ISdClientPackageConfig, ISdPackageBuildResult, ITsconfig } from "../commons";
import * as webpack from "webpack";
import * as path from "path";
import * as ts from "typescript";
import { FsUtil, PathUtil } from "@simplysm/sd-core-node";
import { JavaScriptOptimizerPlugin } from "@angular-devkit/build-angular/src/webpack/plugins/javascript-optimizer-plugin";
import * as CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import * as esbuild from "esbuild";
import {
  AnyComponentStyleBudgetChecker,
  CommonJsUsageWarnPlugin,
  DedupeModuleResolvePlugin
} from "@angular-devkit/build-angular/src/webpack/plugins";
import { LicenseWebpackPlugin } from "license-webpack-plugin";
import { Type } from "@angular-devkit/build-angular";
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
import { SdCliNgLibraryBuilder } from "./SdCliNgLibraryBuilder";
import * as os from "os";
import { LintResult } from "eslint-webpack-plugin/declarations/options";

// eslint-disable-next-line @typescript-eslint/naming-convention
const ESLintWebpackPlugin = require("eslint-webpack-plugin");

export class SdCliNgClientBuilder extends EventEmitter {
  public parsedTsconfig: ts.ParsedCommandLine;
  public readonly npmConfig: INpmConfig;

  public constructor(public rootPath: string,
                     public tsconfigFilePath: string,
                     public projectRootPath: string,
                     public config: ISdClientPackageConfig) {
    super();

    const tsconfig: ITsconfig = FsUtil.readJson(this.tsconfigFilePath);
    const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this.rootPath);
    this.parsedTsconfig = {
      ...parsedTsconfig,
      options: {
        ...parsedTsconfig.options,
        ...tsconfig.angularCompilerOptions
      }
    };

    this.npmConfig = FsUtil.readJson(path.resolve(this.rootPath, "package.json"));
  }

  public on(event: "change", listener: () => void): this;
  public on(event: "complete", listener: (results: ISdPackageBuildResult[]) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public async buildAsync(): Promise<void> {
    this.emit("change");

    await FsUtil.removeAsync(this.parsedTsconfig.options.outDir!);

    // GenIndex / GenNgModule
    const ngGenerator = new SdCliNgLibraryBuilder(this.rootPath, this.tsconfigFilePath, ["emit", "check", "lint"], undefined);
    let buildFilePaths = await ngGenerator.reloadProgramAsync(false);
    const buildGenResult = await ngGenerator.generateAdditionalFilesAsync(buildFilePaths, false);
    buildFilePaths = buildGenResult.dirtyFilePaths;
    const buildDoAllResult = await ngGenerator.doAllAsync(buildFilePaths);

    const buildResults1 = [...buildGenResult.result, ...buildDoAllResult.result].distinct();

    // WEBPACK 빌드
    const webpackConfig = this._getWebpackConfig(false);
    const compiler = webpack(webpackConfig);
    const buildResults2 = await new Promise<ISdPackageBuildResult[]>((resolve, reject) => {
      compiler.run((err, stat) => {
        if (err != null) {
          reject(err);
          return;
        }

        const results = SdWebpackUtil.getWebpackResults(stat!);
        resolve(results);
      });
    });

    // .config.json 파일 쓰기

    const targetPath = path.resolve(this.parsedTsconfig.options.outDir!, ".config.json");
    await FsUtil.writeFileAsync(targetPath, JSON.stringify(this.config.configs ?? {}, undefined, 2));

    // CopyWebpackPlugin 대신 직접 카피

    for (const item of ["favicon.ico", "assets/", "manifest.webmanifest"]) {
      await FsUtil.copyAsync(path.resolve(this.rootPath, "src", item), path.resolve(this.parsedTsconfig.options.outDir!, item));
    }

    // service-worker 처리

    const packageKey = this.npmConfig.name.split("/").last()!;
    await augmentAppWithServiceWorker(
      PathUtil.posix(this.projectRootPath) as any,
      PathUtil.posix(path.relative(this.projectRootPath, this.rootPath)) as any,
      PathUtil.posix(path.relative(this.projectRootPath, this.parsedTsconfig.options.outDir!)) as any,
      `/${packageKey}/`,
      PathUtil.posix(path.relative(this.projectRootPath, path.resolve(this.rootPath, "ngsw-config.json")))
    );

    this.emit("complete", [
      ...buildResults1,
      ...buildResults2
    ]);
  }

  public async watchAsync(serverPath?: string): Promise<NextHandleFunction[]> {
    await FsUtil.removeAsync(this.parsedTsconfig.options.outDir!);

    // GenIndex / GenNgModule
    const ngGenerator = new SdCliNgLibraryBuilder(this.rootPath, this.tsconfigFilePath, ["emit", "check", "lint"], undefined);
    let buildFilePaths = await ngGenerator.reloadProgramAsync(true);
    const buildGenResult = await ngGenerator.generateAdditionalFilesAsync(buildFilePaths, true);
    buildFilePaths = buildGenResult.dirtyFilePaths;
    const buildDoAllResult = await ngGenerator.doAllAsync(buildFilePaths);

    let currentResults = [...buildGenResult.result, ...buildDoAllResult.result].distinct();

    // WEBPACK 빌드
    const webpackConfig = this._getWebpackConfig(true);
    const compiler = webpack(webpackConfig);
    return await new Promise<NextHandleFunction[]>((resolve, reject) => {
      compiler.hooks.watchRun.tapAsync(this.constructor.name, async (compiler1, callback) => {
        this.emit("change");

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition,@typescript-eslint/strict-boolean-expressions
        if (!compiler.modifiedFiles || !compiler.removedFiles) {
          callback();
          return;
        }

        const changedFiles = [...compiler.modifiedFiles, ...compiler.removedFiles];

        const dirtyFilePaths = changedFiles
          .map((item) => PathUtil.posix(item))
          .filter((item) => path.basename(item).includes("."))
          .distinct();
        if (dirtyFilePaths.length === 0) {
          callback();
          return;
        }

        const watchReloadProgramResult = await ngGenerator.reloadChangedProgramAsync(dirtyFilePaths, [], true);
        if (!watchReloadProgramResult.changed) {
          callback();
          return;
        }

        let watchFilePaths = watchReloadProgramResult.dirtyFilePaths;
        const watchGenResult = await ngGenerator.generateAdditionalFilesAsync(watchFilePaths, true);
        watchFilePaths = watchGenResult.dirtyFilePaths;
        const watchDoAllResult = await ngGenerator.doAllAsync(watchFilePaths);

        currentResults = [...watchGenResult.result, ...watchDoAllResult.result].distinct();

        const modifiedFiles = [...compiler.modifiedFiles];
        const removedFiles = [...compiler.removedFiles];
        for (const watchDoAllDirtyFilePath of watchDoAllResult.dirtyFilePaths) {
          if (FsUtil.exists(watchDoAllDirtyFilePath)) {
            modifiedFiles.push(watchDoAllDirtyFilePath);
          }
          else {
            removedFiles.push(watchDoAllDirtyFilePath);
          }
        }
        compiler.modifiedFiles = new Set(modifiedFiles.distinct());
        compiler.removedFiles = new Set(removedFiles.distinct());

        callback();
      });

      // eslint-disable-next-line prefer-const
      let devMiddleware: NextHandleFunction | undefined;
      // eslint-disable-next-line prefer-const
      let hotMiddleware: NextHandleFunction | undefined;

      compiler.hooks.failed.tap(this.constructor.name, (err) => {
        const results = SdWebpackUtil.getWebpackResults(err);
        this.emit("complete", [...currentResults, ...results].distinct());
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
        this.emit("complete", [...currentResults, ...results].distinct());
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

    return {
      mode: watch ? "development" : "production",
      devtool: false,
      target: ["web", "es2015"],
      profile: false,
      resolve: {
        roots: [this.rootPath],
        extensions: [".ts", ".tsx", ".mjs", ".js"],
        symlinks: true,
        modules: [this.projectRootPath, "node_modules"],
        mainFields: ["es2015", "browser", "module", "main"],
        fallback: this.config.resolveFallback
      },
      resolveLoader: {
        symlinks: true,
        modules: [
          "node_modules",
          ...this._findAllNodeModules(__dirname, this.projectRootPath)
        ]
      },
      context: this.projectRootPath,
      entry: {
        main: [
          ...watch ? [
            `webpack-hot-middleware/client?path=/${packageKey}/__webpack_hmr&timeout=20000&reload=true&overlay=true`
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
        path: this.parsedTsconfig.options.outDir,
        publicPath: `/${packageKey}/`,
        // filename: watch ? "[name].js" : `[name].[chunkhash:20].js`,
        // chunkFilename: watch ? "[name].js" : "[name].[chunkhash:20].js",
        filename: "[name].js",
        chunkFilename: "[name].js",
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
                  return !resourcePath.includes("node_modules");
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
          }
        ]
      },
      experiments: { syncWebAssembly: true, asyncWebAssembly: true },
      cache: watch ? { type: "memory", maxGenerations: 1 } : false,
      optimization: {
        minimizer: watch ? [] : [
          new JavaScriptOptimizerPlugin({
            define: { ngDevMode: false, ngI18nClosureMode: false, ngJitMode: false },
            sourcemap: false,
            target: this.parsedTsconfig.options.target,
            keepNames: false,
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
                target: browserslist([
                  "last 2 Chrome versions",
                  "last 2 Edge major versions"
                ])
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
        emitOnErrors: false,
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
        ...watch ? [
          new CopyWebpackPlugin({
            patterns: ["favicon.ico", "assets/", "manifest.webmanifest"].map((item) => ({
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
            }))
          })
        ] : [],
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
        new AnyComponentStyleBudgetChecker(watch ? [] : [
          {
            type: Type.Any,
            maximumWarning: "2kb",
            maximumError: "4kb"
          }
        ]),
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
        // NgBuildAnalyticsPlugin
        new AngularWebpackPlugin({
          tsconfig: this.tsconfigFilePath,
          compilerOptions: this.parsedTsconfig.options,
          jitMode: false,
          emitNgModuleScope: watch,
          inlineStyleFileExtension: "scss"
        }),
        ...watch ? [
          new IndexHtmlWebpackPlugin({
            indexPath: path.resolve(this.rootPath, "src/index.html"),
            outputPath: "index.html",
            baseHref: `/${packageKey}/`,
            entrypoints: [
              "runtime",
              "polyfills",
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
              scripts: false,
              styles: { minify: false, inlineCritical: false },
              fonts: { inline: false }
            },
            WOFFSupportNeeded: false,
            crossOrigin: "none",
            lang: undefined
          })
        ] : [],
        new webpack.ProvidePlugin({
          "Buffer": ["buffer", "Buffer"]
        }),
        new webpack.EnvironmentPlugin({
          SD_VERSION: this.npmConfig.version,
          ...this.config.env
        }),
        new ESLintWebpackPlugin({
          context: this.rootPath,
          eslintPath: path.resolve(this.projectRootPath, "node_modules", "eslint"),
          extensions: ["js", "ts"],
          exclude: ["node_modules"],
          fix: false,
          threads: true,
          formatter: (results: LintResult[]) => {
            const resultMessages: string[] = [];
            for (const result of results) {
              for (const msg of result.messages) {
                resultMessages.push(`${result.filePath}(${msg.line}, ${msg.column}): ${msg.ruleId ?? ""}: ${msg.severity === 1 ? "warning" : msg.severity === 2 ? "error" : ""} ${msg.message}`);
              }
            }
            return resultMessages.join(os.EOL);
          }
        }),
        ...watch ? [
          new webpack.HotModuleReplacementPlugin()
        ] : []
      ],
      node: false,
      stats: "errors-warnings"
    };
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
}
