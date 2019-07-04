import * as events from "events";
import * as webpack from "webpack";
import * as fs from "fs-extra";
import * as path from "path";
import * as ts from "typescript";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import * as WebpackDevMiddleware from "webpack-dev-middleware";
import * as WebpackHotMiddleware from "webpack-hot-middleware";
import {NextHandleFunction} from "@simplysm/sd-service";
import {SdWebpackWriteFilePlugin} from "./plugins/SdWebpackWriteFilePlugin";
import * as TerserPlugin from "terser-webpack-plugin";
import {Generator} from "@angular/service-worker/config";
import {JsonConvert} from "@simplysm/sd-core";
import {NodeFilesystem} from "./service-worker/filesystem";
import {AngularCompilerPlugin, PLATFORM} from "@ngtools/webpack";
import * as MiniCssExtractPlugin from "mini-css-extract-plugin";
import * as OptimizeCSSAssetsPlugin from "optimize-css-assets-webpack-plugin";
import * as CopyWebpackPlugin from "copy-webpack-plugin";
import {SdCliUtils} from "./commons/SdCliUtils";
import * as webpackMerge from "webpack-merge";
import {SdWebpackNgModulePlugin} from "./plugins/SdWebpackNgModulePlugin";
import {SdWebpackTimeFixPlugin} from "./plugins/SdWebpackTimeFixPlugin";
import {SdWebpackInputHostWithScss} from "./commons/SdWebpackInputHostWithScss";

export class SdAngularCompiler extends events.EventEmitter {
  private readonly _contextPath: string;
  private readonly _tsConfigPath: string;

  private _projectNpmConfig_: any;

  private get _projectNpmConfig(): any {
    if (!this._projectNpmConfig_) {
      this._projectNpmConfig_ = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));
    }
    return this._projectNpmConfig_;
  }

  private _tsConfig_: any;

  private get _tsConfig(): any {
    if (!this._tsConfig_) {
      this._tsConfig_ = fs.readJsonSync(this._tsConfigPath);
    }
    return this._tsConfig_;
  }

  private _parsedTsConfig_?: ts.ParsedCommandLine;

  private get _parsedTsConfig(): ts.ParsedCommandLine {
    if (!this._parsedTsConfig_) {
      this._parsedTsConfig_ = ts.parseJsonConfigFileContent(this._tsConfig, ts.sys, this._contextPath);
    }
    return this._parsedTsConfig_;
  }

  private _distPath_?: string;

  private get _distPath(): string {
    if (!this._distPath_) {
      this._distPath_ = this._parsedTsConfig.options.outDir ? path.resolve(this._parsedTsConfig.options.outDir) : path.resolve(this._contextPath, "dist");
    }
    return this._distPath_;
  }

  private _alias_?: { [key: string]: string };

  private get _alias(): { [key: string]: string } {
    if (!this._alias_) {
      const tsOptions = this._parsedTsConfig.options;
      const alias = {};
      if (tsOptions && tsOptions.paths) {
        for (const tsPathKey of Object.keys(tsOptions.paths)) {
          if (tsOptions.paths[tsPathKey].length !== 1) {
            throw new Error("'tsconfig'의 'paths'옵션에서, 하나의 명칭에 반드시 하나의 목적지를 지정해야 합니다.");
          }
          alias[tsPathKey] = path.resolve(this._contextPath, tsOptions.paths[tsPathKey][0]);
        }
      }
      this._alias_ = alias;
    }
    return this._alias_;
  }

  public constructor(private readonly _packageKey: string,
                     private readonly _options?: string[]) {
    super();

    this._contextPath = path.resolve(process.cwd(), "packages", this._packageKey);
    this._tsConfigPath = path.resolve(this._contextPath, "tsconfig.build.json");
  }

  private _styleConfigs(opt: { sourceMap: boolean; extract: boolean }): webpack.Configuration {
    const styleLoader = opt.extract
      ? MiniCssExtractPlugin.loader
      : {
        loader: "style-loader",
        options: {sourceMap: opt.sourceMap}
      };

    return {
      module: {
        rules: [
          {
            test: /\.scss$/,
            use: [
              styleLoader,
              {
                loader: "css-loader",
                options: {sourceMap: opt.sourceMap}
              },
              {
                loader: "resolve-url-loader",
                options: {sourceMap: opt.sourceMap}
              },
              {
                loader: "sass-loader",
                options: {
                  sourceMap: false,
                  sourceMapContents: false
                }
              }
            ]
          },
          {
            test: /\.css$/,
            use: [
              styleLoader,
              {
                loader: "css-loader",
                options: {sourceMap: opt.sourceMap}
              }
            ]
          }
        ]
      },
      ...opt.extract ? {plugins: [new MiniCssExtractPlugin()]} : {}
    };
  }

  private _sourceCompileConfigs(opt: { aot: boolean; sourceMap: boolean }): webpack.Configuration {
    const loaders: webpack.RuleSetUse = ["@ngtools/webpack"];

    if (opt.aot) {
      loaders.unshift({
        loader: "@angular-devkit/build-optimizer/webpack-loader",
        options: {
          sourceMap: opt.sourceMap
        }
      });
    }

    const mainPath = opt.aot ? path.resolve(__dirname, "../lib/main.aot.js") : path.resolve(__dirname, "../lib/main.js");
    const modulePath = path.resolve(this._parsedTsConfig.options.rootDir!, "AppModule");
    const moduleName = path.basename(modulePath);

    return {
      module: {
        rules: [
          {
            test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
            loaders
          },
          {
            test: /[\/\\]@angular[\/\\]core[\/\\].+\.js$/,
            parser: {system: true}
          },
          ...opt.aot ? [] : [
            {
              test: /\.ts$/,
              loader: require.resolve("./inline-sass-dependency-loader")
            }
          ]
        ]
      },
      plugins: [
        new AngularCompilerPlugin({
          mainPath,
          platform: PLATFORM.Browser,
          sourceMap: opt.sourceMap,
          directTemplateLoading: true,
          tsConfigPath: this._tsConfigPath,
          entryModule: `${modulePath}#${moduleName}`,
          basePath: process.cwd(),
          forkTypeChecker: true,
          host: new SdWebpackInputHostWithScss(fs),
          skipCodeGeneration: !opt.aot,
          compilerOptions: {
            ...this._parsedTsConfig.options,
            rootDir: undefined,
            declaration: false,
            removeComments: true,
            skipLibCheck: false,
            skipTemplateCodegen: false,
            strictMetadataEmit: true,
            fullTemplateTypeCheck: true,
            strictInjectionParameters: true,
            enableResourceInlining: true
          }
        }),
        new SdWebpackNgModulePlugin({tsConfigPath: this._tsConfigPath}),
        new webpack.ContextReplacementPlugin(
          /angular[\\/]core[\\/]fesm5/,
          this._parsedTsConfig.options.rootDir!,
          {}
        )
      ]
    };
  }

  private _assetsFileConfigs(opt: { hash: boolean }): webpack.Configuration {
    return {
      module: {
        rules: [
          {
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx?|pptx?|docx?)$/,
            loader: "file-loader",
            options: {
              name: `assets/[name].[ext]${opt.hash ? "?[hash]" : ""}`
            }
          }
        ]
      }
    };
  }

  private _entryConfigs(opt: { aot: boolean }): webpack.Configuration {
    return opt.aot
      ? {
        entry: {
          main: path.resolve(__dirname, "../lib/main.aot.js")
        }
      }
      : {
        entry: {
          main: [
            `webpack-hot-middleware/client?path=/${this._packageKey}/__webpack_hmr&timeout=20000&reload=true`,
            path.resolve(__dirname, "../lib/main.js")
          ]
        },
        plugins: [
          new webpack.HotModuleReplacementPlugin()
        ]
      };
  }

  private _getWebpackCommonConfig(): webpack.Configuration {
    const faviconPath = path.resolve(this._contextPath, "src", "favicon.ico");

    return {
      output: {
        publicPath: `/${this._packageKey}/`,
        path: this._distPath,
        filename: "[name].js",
        chunkFilename: "[name].chunk.js"
      },
      resolve: {
        extensions: [".ts", ".js", ".json"],
        alias: this._alias
      },
      module: {
        strictExportPresence: true,
        rules: []
      },
      plugins: [
        new HtmlWebpackPlugin({
          template: path.resolve(__dirname, `../lib/index.ejs`),
          chunksSortMode: "none",
          BASE_HREF: `/${this._packageKey}/`,
          inject: true
        }),
        ...fs.pathExistsSync(faviconPath)
          ? [
            new CopyWebpackPlugin([
              path.resolve(this._contextPath, "src", "favicon.ico")
            ])
          ]
          : [],
        new webpack.DefinePlugin({
          "process.env.VERSION": `"${this._projectNpmConfig.version}"`,
          "process.env.BASE_HREF": `"/${this._packageKey}/"`
        })
      ],
      externals: [
        (context, request, callback) => {
          if (["fsevents", "fs", "fs-extra", "child_process", "net", "tls", "tedious", "chokidar", "nodemailer"].includes(request)) {
            callback(undefined, `{}`);
            return;
          }

          if (request === "ws") {
            callback(undefined, `WebSocket`);
            return;
          }

          callback(undefined, undefined);
        }
      ]
    };
  }

  public async runAsync(): Promise<void> {
    const projectConfig = SdCliUtils.getConfigObj("production", this._options);
    const config = projectConfig.packages[this._packageKey];

    const modulePath = path.resolve(this._parsedTsConfig.options.rootDir!, "AppModule");

    const webpackConfig = webpackMerge(this._getWebpackCommonConfig(),
      {
        mode: "production",
        devtool: false,
        resolve: {
          alias: {
            "SIMPLYSM_CLIENT_APP_MODULE_NGFACTORY": modulePath + ".ngfactory"
          }
        },
        optimization: {
          noEmitOnErrors: true,
          runtimeChunk: "single",
          splitChunks: {
            chunks: "all",
            maxInitialRequests: Infinity,
            minSize: 0,
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: (module: any) => {
                  const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
                  return `libs/${packageName.replace("@", "")}`;
                }
              }
            }
          },
          minimizer: [
            new TerserPlugin({
              sourceMap: false,
              cache: true,
              parallel: true,
              terserOptions: {
                keep_fnames: true/*,
            ecma: 5,
            warnings: false,
            output: {
              ascii_only: true,
              comments: false,
              webkit: true
            },
            compress: {
              pure_getters: true,
              passes: 3,
              global_defs: config.framework === "angular" ? GLOBAL_DEFS_FOR_TERSER : {
                ngDevMode: false,
                ngI18nClosureMode: false
              }
            }*/
              }
            }),
            new webpack.HashedModuleIdsPlugin(),
            new OptimizeCSSAssetsPlugin()
          ]
        },
        performance: {
          hints: false
        },
        plugins: [
          new SdWebpackWriteFilePlugin([{
            path: path.resolve(this._distPath, ".configs.json"),
            content: JSON.stringify({env: "production", ...config.configs}, undefined, 2)
          }])
        ]
      },
      this._entryConfigs({aot: true}),
      this._assetsFileConfigs({hash: false}),
      this._sourceCompileConfigs({aot: true, sourceMap: false}),
      this._styleConfigs({sourceMap: false, extract: true})
    );

    const compiler = webpack(webpackConfig);

    compiler.hooks.run.tap("SdPackageCompiler", () => {
      this.emit("run");
    });

    await new Promise<void>((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        this._emitWebpackCompilerStats(stats);
        resolve();
      });
    });

    // ngsw 구성
    const gen = new Generator(new NodeFilesystem(this._distPath), `/${this._packageKey}/`);

    const control = await gen.process({
      index: "/index.html",
      assetGroups: [
        {
          "name": "app",
          "installMode": "prefetch",
          "resources": {
            "files": [
              "/favicon.ico",
              "/index.html",
              "/libs/*.js",
              "/*.css",
              "/*.js"
            ]
          }
        },
        {
          "name": "assets",
          "installMode": "lazy",
          "updateMode": "prefetch",
          "resources": {
            "files": [
              "/assets/**"
            ]
          }
        }
      ]
    });

    await fs.writeFile(path.resolve(this._distPath, "ngsw.json"), JsonConvert.stringify(control, {space: 2}));

    await fs.copyFile(
      path.resolve(process.cwd(), "node_modules", "@angular", "service-worker", "ngsw-worker.js"),
      path.resolve(this._distPath, "ngsw-worker.js")
    );
  }

  public async watchAsync(): Promise<NextHandleFunction[]> {
    const modulePath = path.resolve(this._parsedTsConfig.options.rootDir!, "AppModule");
    const webpackConfig = webpackMerge(this._getWebpackCommonConfig(),
      {
        mode: "development",
        devtool: "cheap-module-source-map",
        resolve: {
          alias: {
            "SIMPLYSM_CLIENT_APP_MODULE": modulePath
          }
        },
        output: {
          pathinfo: false
        },
        optimization: {
          removeAvailableModules: true,
          removeEmptyChunks: false,
          splitChunks: false
        },
        module: {
          rules: [
            {
              test: /\.js$/,
              enforce: "pre",
              loader: "source-map-loader",
              exclude: [
                /node_modules[\\/](?!@simplysm)/,
                /(ngfactory|ngstyle).js$/
              ]
            }
          ]
        },
        plugins: [
          new SdWebpackTimeFixPlugin(),
          new SdWebpackWriteFilePlugin([
            {
              path: path.resolve(this._distPath, ".configs.json"),
              content: async () => {
                const currProjectConfig = SdCliUtils.getConfigObj("development", this._options);
                const currConfig = currProjectConfig.packages[this._packageKey];
                return JSON.stringify({env: "development", ...currConfig.configs}, undefined, 2);
              }
            }
          ])
        ]
      },
      this._entryConfigs({aot: false}),
      this._assetsFileConfigs({hash: true}),
      this._sourceCompileConfigs({aot: false, sourceMap: true}),
      this._styleConfigs({sourceMap: false, extract: false})
    );

    const compiler = webpack(webpackConfig);

    compiler.hooks.watchRun.tapAsync("SdPackageCompiler", async (compiler1, callback) => {
      this.emit("run");
      callback();
    });

    return await new Promise<NextHandleFunction[]>((resolve, reject) => {
      const devMiddleware = WebpackDevMiddleware(compiler, {
        publicPath: webpackConfig.output!.publicPath!,
        logLevel: "silent"
      });

      const hotMiddleware = WebpackHotMiddleware(compiler, {
        path: `/${this._packageKey}/__webpack_hmr`,
        log: false
      });

      compiler.hooks.failed.tap("SdPackageCompiler", err => {
        this.emit("error", err);
        reject(err);
      });

      compiler.hooks.done.tap("SdPackageCompiler", stats => {
        this._emitWebpackCompilerStats(stats);
        resolve([devMiddleware, hotMiddleware]);
      });
    });
  }

  private _emitWebpackCompilerStats(stats: webpack.Stats): void {
    const info = stats.toJson({all: false, assets: true, warnings: true, errors: true, errorDetails: false});

    if (stats.hasWarnings()) {
      for (const warning of info.warnings) {
        this.emit("warning", warning);
      }
    }

    if (stats.hasErrors()) {
      for (const error of info.errors) {
        this.emit("error", error);
      }
    }

    this.emit("done");
  }
}
