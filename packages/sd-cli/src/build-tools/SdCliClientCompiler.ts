import { INpmConfig, ISdClientPackageConfig, ISdPackageBuildResult } from "../commons";
import { NextHandleFunction } from "connect";
import { EventEmitter } from "events";
import * as webpack from "webpack";
import { SdWebpackUtil } from "../utils/SdWebpackUtil";
import * as path from "path";
import * as WebpackDevMiddleware from "webpack-dev-middleware";
import * as WebpackHotMiddleware from "webpack-hot-middleware";
import { SdCliPathUtil } from "../utils/SdCliPathUtil";
import { FsUtil, SdProcessManager } from "@simplysm/sd-core-node";
import * as ts from "typescript";
import * as fs from "fs";
import { SdWebpackWriteFilePlugin } from "../utils/SdWebpackWriteFilePlugin";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import * as OptimizeCSSAssetsPlugin from "optimize-css-assets-webpack-plugin";
import { AngularCompilerPlugin, PLATFORM } from "@ngtools/webpack";
import { getSystemPath, virtualFs } from "@angular-devkit/core";
import { createWebpackInputHost } from "@ngtools/webpack/src/webpack-input-host";
import { Observable } from "rxjs";
import { SdAngularUtil } from "../utils/SdAngularUtil";
import * as CopyWebpackPlugin from "copy-webpack-plugin";

export class SdCliClientCompiler extends EventEmitter {
  private readonly _npmConfig: INpmConfig;

  public constructor(private readonly _rootPath: string,
                     private readonly _config: ISdClientPackageConfig) {
    super();

    const npmConfigFilePath = SdCliPathUtil.getNpmConfigFilePath(this._rootPath);
    this._npmConfig = FsUtil.readJson(npmConfigFilePath);
  }

  public on(event: "change", listener: () => void): this;
  public on(event: "complete", listener: (results: ISdPackageBuildResult[]) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public async compileAsync(): Promise<void> {
    const webpackConfig = await this._getWebpackConfigAsync(false);

    const compiler = webpack(webpackConfig);

    await new Promise<void>((resolve, reject) => {
      try {
        compiler.hooks.run.tap("SdCliClientCompiler", () => {
          this.emit("change");
        });

        compiler.run(async (err, stats) => {
          const results = SdWebpackUtil.getWebpackResults(err, stats);

          if (this._npmConfig.dependencies && "@angular/service-worker" in this._npmConfig.dependencies) {
            const distPath = SdCliPathUtil.getDistPath(this._rootPath);

            await FsUtil.copyAsync(
              path.resolve(process.cwd(), "node_modules", "@angular", "service-worker", "ngsw-worker.js"),
              path.resolve(distPath, "ngsw-worker.js")
            );

            const relativeDistPath = path.relative(process.cwd(), distPath);
            const ngswConfigPath = path.relative(process.cwd(), path.resolve(__dirname, "../../lib/ngsw-config.json"));
            const baseHref = `/${path.basename(this._rootPath)}/`;
            await SdProcessManager.spawnAsync(`ngsw-config ${relativeDistPath} ${ngswConfigPath} ${baseHref}`);
          }

          this.emit("complete", results);
          resolve();
        });
      }
      catch (err) {
        reject(err);
      }
    });
  }

  public async watchAsync(): Promise<NextHandleFunction[]> {
    const webpackConfig = await this._getWebpackConfigAsync(true);

    const compiler = webpack(webpackConfig);

    return await new Promise<NextHandleFunction[]>((resolve, reject) => {
      try {
        compiler.hooks.watchRun.tap("SdCliClientCompiler", () => {
          this.emit("change");
        });

        // eslint-disable-next-line prefer-const
        let devMiddleware: NextHandleFunction | undefined;
        // eslint-disable-next-line prefer-const
        let hotMiddleware: NextHandleFunction | undefined;

        compiler.hooks.failed.tap("SdCliClientCompiler", (err) => {
          const results = SdWebpackUtil.getWebpackResults(err);
          this.emit("complete", results);
          reject(err);
        });

        compiler.hooks.done.tap("SdCliClientCompiler", (stats) => {
          const results = SdWebpackUtil.getWebpackResults(null, stats);
          this.emit("complete", results);
          resolve([devMiddleware, hotMiddleware].filterExists());
        });

        devMiddleware = WebpackDevMiddleware(compiler, {
          publicPath: webpackConfig.output!.publicPath!,
          logLevel: "silent",
          watchOptions: {
            aggregateTimeout: 1000,
            poll: 1000
          }
        });

        hotMiddleware = WebpackHotMiddleware(compiler, {
          path: `${webpackConfig.output!.publicPath!}__webpack_hmr`,
          log: false
        });
      }
      catch (err) {
        reject(err);
      }
    });
  }

  private async _getWebpackConfigAsync(watch: boolean): Promise<webpack.Configuration> {
    // 패키지 이름 (SCOPE 제외)
    const packageKey = this._npmConfig.name.split("/").last()!;

    // 각종 경로
    const srcPath = SdCliPathUtil.getSourcePath(this._rootPath);
    const distPath = SdCliPathUtil.getDistPath(this._rootPath);

    // TSCONFIG
    const tsconfigFilePath = SdCliPathUtil.getTsConfigBuildFilePath(this._rootPath, "browser");
    const tsconfig = await FsUtil.readJsonAsync(tsconfigFilePath);
    const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this._rootPath);

    // LIB 파일 경로
    const mainPath = path.resolve(__dirname, "../../lib/main." + (watch ? "dev" : "prod") + ".js");
    const indexPath = path.resolve(__dirname, `../../lib/index.ejs`);
    const polyfillsPath = path.resolve(__dirname, `../../lib/polyfills.js`);

    return {
      ...watch ? {
        mode: "development",
        devtool: "cheap-module-source-map",
        optimization: {
          minimize: false
        },
        entry: {
          main: [
            polyfillsPath,
            `webpack-hot-middleware/client?path=/${packageKey}/__webpack_hmr&timeout=20000&reload=true&overlay=true`,
            mainPath
          ]
        },
        resolve: {
          extensions: [".ts", ".js", ".json"],
          alias: { "SD_APP_MODULE": path.resolve(srcPath, "AppModule") },
          aliasFields: ["browser"]
        }
      } : {
        mode: "production",
        devtool: "source-map",
        profile: false,
        performance: { hints: false },
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
                name: (module: any): string => {
                  const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1] as string;
                  return `libs/${packageName.replace("@", "")}`;
                }
              }
            }
          },
          minimizer: [
            new webpack.HashedModuleIdsPlugin(),
            new OptimizeCSSAssetsPlugin()
          ]
        },
        entry: {
          main: [
            polyfillsPath,
            mainPath
          ]
        },
        resolve: {
          extensions: [".ts", ".js", ".json"],
          alias: {
            "SD_APP_MODULE_FACTORY": path.resolve(srcPath, "AppModule.ngfactory")
          },
          aliasFields: ["browser"]
        }
      },
      target: "web",
      output: {
        publicPath: `/${packageKey}/`,
        path: distPath,
        filename: "[name].js",
        chunkFilename: "[name].chunk.js"
      },
      module: {
        strictExportPresence: true,
        rules: [
          ...watch ? [
            {
              test: /(?:main\.prod\.js|main\.dev\.js)$/,
              loader: "ts-loader",
              options: {
                configFile: tsconfigFilePath,
                transpileOnly: true
              }
            },
            {
              test: /\.ts$/,
              exclude: /node_modules/,
              loaders: [
                {
                  loader: "ts-loader",
                  options: {
                    configFile: tsconfigFilePath,
                    transpileOnly: true
                  }
                },
                require.resolve("../loaders/inline-sass-loader"),
                require.resolve("angular-router-loader")
              ]
            }
          ] : [
            {
              test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
              loaders: [
                {
                  loader: "@angular-devkit/build-optimizer/webpack-loader",
                  options: {
                    sourceMap: parsedTsconfig.options.sourceMap
                  }
                },
                require.resolve("angular-router-loader") + "?aot=true",
                "@ngtools/webpack"
              ]
            }
          ],
          {
            test: /[\\/]@angular[\\/]core[\\/].+\.js$/,
            parser: { system: true }
          },
          {
            test: /\.js$/,
            enforce: "pre",
            loader: "source-map-loader",
            exclude: [
              /node_modules[\\/](?!@simplysm)/,
              /(ngfactory|ngstyle)\.js$/
            ]
          },
          {
            test: /\.scss$/,
            use: [
              "style-loader",
              "css-loader",
              "resolve-url-loader",
              "sass-loader"
            ]
          },
          {
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx?|pptx?|docx?|zip)$/,
            loader: "file-loader",
            options: {
              name: `assets/[name].[ext]${watch ? "?[hash]" : ""}`,
              esModule: false
            }
          }
        ]
      },
      plugins: [
        new HtmlWebpackPlugin({
          template: indexPath,
          BASE_HREF: `/${packageKey}/`
        }),
        new webpack.DefinePlugin({
          "process.env.SD_VERSION": `"${this._npmConfig.version}"`
        }),
        new webpack.ContextReplacementPlugin(
          /(.+)?angular[\\/]core(.+)?/,
          srcPath,
          {}
        ),
        ...watch ? [new webpack.HotModuleReplacementPlugin()] : [],
        ...watch ? [] : [
          new AngularCompilerPlugin({
            mainPath,
            entryModule: path.resolve(srcPath, "AppModule") + "#AppModule",
            platform: PLATFORM.Browser,
            sourceMap: parsedTsconfig.options.sourceMap,
            nameLazyFiles: false,
            forkTypeChecker: false,
            directTemplateLoading: true,
            tsConfigPath: tsconfigFilePath,
            skipCodeGeneration: false,
            host: this._createWebpackInputHost(fs),
            compilerOptions: {
              fullTemplateTypeCheck: false, // TODO
              strictInjectionParameters: true,
              disableTypeScriptVersionCheck: true,
              skipMetadataEmit: true,
              rootDir: undefined,
              enableIvy: false
            }
          })
        ],
        new SdWebpackWriteFilePlugin([
          {
            path: path.resolve(distPath, ".configs.json"),
            content: JSON.stringify(this._config.configs ?? {}, undefined, 2)
          }
        ]),
        ...FsUtil.exists(path.resolve(srcPath, "favicon.ico")) ? [
          new CopyWebpackPlugin({
            patterns: [{
              from: path.resolve(srcPath, "favicon.ico"),
              to: path.resolve(distPath, "favicon.ico")
            }]
          })
        ] : []
      ]
    };
  }

  private _createWebpackInputHost(inputFileSystem: webpack.InputFileSystem): virtualFs.Host<fs.Stats> {
    const host = createWebpackInputHost(inputFileSystem);
    host.read = (path1) => new Observable((obs) => {
      try {
        const filePath = getSystemPath(path1);
        let data = inputFileSystem.readFileSync(filePath);
        if (filePath.endsWith(".ts") && !filePath.endsWith(".d.ts")) {
          let newContent = SdAngularUtil.replaceScssToCss(filePath, data.toString()).content;
          newContent = newContent.replace(
            /ServiceWorkerModule\.register\("(.*)", { ?enabled: .* ?}\)/,
            "ServiceWorkerModule.register(\"$1\", { enabled: true })"
          );

          data = Buffer.from(newContent);
        }
        obs.next(new Uint8Array(data).buffer as ArrayBuffer);
        obs.complete();
      }
      catch (e) {
        obs.error(e);
      }
    });

    return host;
  }
}