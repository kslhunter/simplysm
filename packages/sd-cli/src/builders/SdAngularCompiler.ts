import {Logger} from "@simplysm/sd-core-node";
import * as path from "path";
import * as fs from "fs-extra";
import * as ts from "typescript";
import * as webpack from "webpack";
import * as os from "os";
import {EventEmitter} from "events";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import {AngularCompilerPlugin, PLATFORM} from "@ngtools/webpack";
import * as WebpackDevMiddleware from "webpack-dev-middleware";
import * as WebpackHotMiddleware from "webpack-hot-middleware";
import {NextHandleFunction} from "connect";
import {SdWebpackTimeFixPlugin} from "../plugins/SdWebpackTimeFixPlugin";
import {TSdFramework} from "../commons";
import {SdWebpackInputHostWithScss} from "../plugins/SdWebpackInputHostWithScss";

export class SdAngularCompiler extends EventEmitter {
  private constructor(private readonly _mode: "development" | "production",
                      private readonly _tsConfigPath: string,
                      private readonly _distPath: string,
                      private readonly _packagePath: string,
                      private readonly _framework: TSdFramework | undefined,
                      private readonly _logger: Logger) {
    super();
  }

  public static async createAsync(argv: {
    tsConfigPath: string;
    framework?: TSdFramework;
    mode: "development" | "production";
  }): Promise<SdAngularCompiler> {
    const tsConfigPath = argv.tsConfigPath;
    const mode = argv.mode;
    const framework = argv.framework;

    const packagePath = path.dirname(argv.tsConfigPath);

    const tsConfig = await fs.readJson(tsConfigPath);
    const parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig, ts.sys, path.dirname(tsConfigPath));

    if (tsConfig.files) {
      throw new Error("앵귤라 클라이언트 패키지의 'tsConfig.json'에는 'files'가 정의되어 있지 않아야 합니다.");
    }

    const distPath = parsedTsConfig.options.outDir
      ? path.resolve(parsedTsConfig.options.outDir)
      : path.resolve(packagePath, "dist");

    const logger = Logger.get(
      [
        "simplysm",
        "sd-cli",
        path.basename(packagePath),
        "angular",
        "compile"
      ]
    );

    return new SdAngularCompiler(
      mode,
      tsConfigPath,
      distPath,
      packagePath,
      framework,
      logger
    );
  }

  public async runAsync(watch: boolean): Promise<NextHandleFunction[]> {
    if (watch) {
      this._logger.log("컴파일 및 변경감지를 시작합니다.");
    }
    else {
      this._logger.log("컴파일를 시작합니다.");
    }

    const webpackConfig = await this._getWebpackConfigAsync(watch);

    const compiler = webpack(webpackConfig);

    if (watch) {
      compiler.hooks.invalid.tap("SdServerCompiler", () => {
        this.emit("change");
        this._logger.log("컴파일에 대한 변경사항이 감지되었습니다.");
      });
    }

    return await new Promise<NextHandleFunction[]>(async (resolve, reject) => {
      let devMiddleware: NextHandleFunction | undefined;
      let hotMiddleware: NextHandleFunction | undefined;

      const callback = (err: Error | undefined, stats?: webpack.Stats) => {
        if (err) {
          reject(err);
          return;
        }

        if (stats) {
          const info = stats.toJson("errors-warnings");

          if (stats.hasWarnings()) {
            const warnings = info.warnings.filter((item) => !item.includes("Emitted no files."));
            if (warnings.length > 0) {
              this._logger.warn(
                "컴파일 경고\n",
                warnings
                  .map((item) => item.startsWith("(undefined)") ? item.split("\n").slice(1).join("\n") : item)
                  .join(os.EOL)
              );
            }
          }

          if (stats.hasErrors()) {
            this._logger.error(
              "컴파일 오류\n",
              info.errors
                .map((item) => item.startsWith("(undefined)") ? item.split("\n").slice(1).join("\n") : item)
                .join(os.EOL)
            );
          }
        }

        this._logger.log("컴파일이 완료되었습니다.");
        this.emit("complete");
        resolve([devMiddleware, hotMiddleware].filterExists());
      };

      if (watch) {
        devMiddleware = WebpackDevMiddleware(compiler, {
          publicPath: webpackConfig.output!.publicPath!,
          logLevel: "silent",
          watchOptions: {
            aggregateTimeout: 300,
            poll: 1000
          }
        });

        hotMiddleware = WebpackHotMiddleware(compiler, {
          path: `/${path.basename(this._packagePath)}/__webpack_hmr`,
          log: false,
          overlay: true
        });

        compiler.hooks.failed.tap("SdAngularCompiler", (err) => {
          callback(err);
        });

        compiler.hooks.done.tap("SdAngularCompiler", (stats) => {
          callback(undefined, stats);
        });
      }
      else {
        compiler.run(callback);
      }
    });
  }

  private async _getWebpackConfigAsync(watch: boolean): Promise<webpack.Configuration> {
    const isJit = this._framework?.endsWith("-jit");

    const packageKey = path.basename(this._packagePath);
    const mainPath = path.resolve(__dirname, "../../lib/main." + (watch ? (isJit ? "dev.jit" : "dev") : "prod") + ".js");
    const indexPath = path.resolve(__dirname, `../../lib/index.ejs`);

    const tsConfig = await fs.readJson(this._tsConfigPath);
    const parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig, ts.sys, path.dirname(this._tsConfigPath));

    const loaders: webpack.RuleSetUse = ["@ngtools/webpack"];

    if (!isJit) {
      loaders.unshift({
        loader: "@angular-devkit/build-optimizer/webpack-loader",
        options: {
          sourceMap: parsedTsConfig.options.sourceMap
        }
      });
    }

    return {
      mode: this._mode,
      devtool: this._mode === "development" ? "cheap-module-source-map" : "source-map",
      target: "web",
      resolve: {
        extensions: [".ts", ".js"],
        alias: isJit
          ? {
            "SD_APP_MODULE": path.resolve(this._packagePath, "src/AppModule")
          }
          : {
            "SD_APP_MODULE_FACTORY": path.resolve(this._packagePath, "src/AppModule.ngfactory")
          }
      },
      optimization: {
        minimize: false
      },
      entry: {
        main: watch
          ? [
            "eventsource-polyfill",
            `webpack-hot-middleware/client?path=/${packageKey}/__webpack_hmr&timeout=20000&reload=true`,
            mainPath
          ]
          : mainPath
      },
      output: {
        publicPath: `/${packageKey}/`,
        path: this._distPath,
        filename: "[name].js"
      },
      module: {
        rules: [
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
            test: /(?:main\.dev\.jit\.js|main\.prod\.js|main\.dev\.js)$/,
            loader: "ts-loader",
            options: {
              configFile: this._tsConfigPath,
              transpileOnly: true
            }
          },
          {
            test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
            loaders
          },
          {
            test: /(\\|\/)@angular(\\|\/)core(\\|\/).+\.js$/,
            parser: {system: true}
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
              name: `assets/[name].[ext]${watch ? "?[hash]" : ""}`
            }
          }
        ]
      },
      plugins: [
        ...watch ? [
          new SdWebpackTimeFixPlugin(),
          new webpack.HotModuleReplacementPlugin()
        ] : [],
        new HtmlWebpackPlugin({
          template: indexPath,
          BASE_HREF: `/${packageKey}/`
        }),
        new AngularCompilerPlugin({
          mainPath,
          entryModule: path.resolve(this._packagePath, "src/AppModule") + "#AppModule",
          platform: PLATFORM.Browser,
          sourceMap: parsedTsConfig.options.sourceMap,
          nameLazyFiles: false, //watch,
          forkTypeChecker: true,
          directTemplateLoading: true,
          tsConfigPath: this._tsConfigPath,
          skipCodeGeneration: isJit,
          host: new SdWebpackInputHostWithScss(fs),
          compilerOptions: {
            fullTemplateTypeCheck: true,
            strictInjectionParameters: true,
            disableTypeScriptVersionCheck: true
          }
        }),
        new webpack.ContextReplacementPlugin(
          /(.+)?angular(\\|\/)core(.+)?/,
          path.join(this._packagePath, "src"),
          {}
        )
      ]
    };
  }
}
