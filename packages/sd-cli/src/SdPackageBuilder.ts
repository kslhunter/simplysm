import "@simplysm/sd-core";
import * as os from "os";
import * as events from "events";
import * as webpack from "webpack";
import * as ts from "typescript";
import * as fs from "fs-extra";
import * as path from "path";
import * as webpackNodeExternals from "webpack-node-externals";
import {SdWebpackTimeFixPlugin} from "./plugins/SdWebpackTimeFixPlugin";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import * as WebpackDevMiddleware from "webpack-dev-middleware";
import * as WebpackHotMiddleware from "webpack-hot-middleware";
import {NextHandleFunction} from "@simplysm/sd-service";
import {SdWebpackWriteFilePlugin} from "./plugins/SdWebpackWriteFilePlugin";
import {SdCliUtil} from "./commons/SdCliUtil";
import {ISdPackageConfig} from "./commons/interfaces";
import * as UglifyJsPlugin from "uglifyjs-webpack-plugin";
import * as WorkboxPlugin from "workbox-webpack-plugin";

export class SdPackageBuilder extends events.EventEmitter {
  private readonly _projectNpmConfig: any;
  private readonly _contextPath: string;
  private readonly _npmConfig: any;
  private readonly _tsConfig: any;
  private readonly _parsedTsConfig: ts.ParsedCommandLine;
  private readonly _distPath: string;

  public constructor(private readonly _packageKey: string,
                     private readonly _options?: string[]) {
    super();

    this._projectNpmConfig = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));
    this._contextPath = path.resolve(process.cwd(), "packages", this._packageKey);
    this._npmConfig = fs.readJsonSync(path.resolve(this._contextPath, "package.json"));
    this._tsConfig = fs.readJsonSync(path.resolve(this._contextPath, "tsconfig.build.json"));
    this._parsedTsConfig = ts.parseJsonConfigFileContent(this._tsConfig, ts.sys, this._contextPath);
    this._distPath = this._parsedTsConfig.options.outDir ? path.resolve(this._parsedTsConfig.options.outDir) : path.resolve(this._contextPath, "dist");
  }

  private _getAlias(): { [key: string]: string } {
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

    return alias;
  }

  private _getEntry(): { [key: string]: string } {
    if (!this._tsConfig.files || this._tsConfig.files.length < 1) {
      throw new Error("'tsconfig'에 'files'옵션을 반드시 등록해야 합니다.");
    }
    const entry: { [key: string]: string } = {};
    for (const filePath of this._parsedTsConfig.fileNames) {
      const basename = path.basename(filePath, path.extname(filePath));
      entry[basename] = filePath;
    }

    return entry;
  }

  private _getWebpackCommonConfig(config: ISdPackageConfig): webpack.Configuration {
    const alias = this._getAlias();

    const webpackConfig: webpack.Configuration = {
      output: {
        path: this._distPath,
        filename: "[name].js",
        chunkFilename: "[name].chunk.js"
      },
      optimization: {},
      resolve: {
        extensions: [".ts", ".js", ".json"],
        alias
      },
      module: {
        rules: [
          {
            enforce: "pre",
            test: /\.js$/,
            use: ["source-map-loader"],
            exclude: /node_modules[\\/](?!@simplysm)/
          },
          {
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx)$/,
            loader: "file-loader",
            options: {
              name: "assets/[name].[ext]?[hash]"
            }
          }
        ]
      },
      plugins: [
        new webpack.DefinePlugin({
          "process.env.VERSION": `"${this._projectNpmConfig.version}"`
        })
      ],
      externals: []
    };

    // 빌드 타입별, 기본 설정 수정
    if (config.type === undefined || config.type === "server") {
      webpackConfig.target = "node";
      webpackConfig.node = {
        __dirname: false
      };
      webpackConfig.output!.libraryTarget = "umd";
      webpackConfig.optimization!.nodeEnv = false;
      webpackConfig.module!.rules!.pushRange([
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          loader: eval(`require.resolve("./ts-build-loader")`) //tslint:disable-line:no-eval
        }
      ]);

      if (this._npmConfig["bin"]) {
        webpackConfig.plugins!.push(new webpack.BannerPlugin({
          banner: "#!/usr/bin/env node" + os.EOL + "require(\"source-map-support/register\");",
          raw: true,
          entryOnly: true,
          include: Object.keys(this._npmConfig["bin"])
            .map(key => path.relative(this._distPath, path.resolve(this._contextPath, this._npmConfig["bin"][key])))
        }));
      }
    }
    else {
      if (this._parsedTsConfig.fileNames.length < 1) {
        throw new Error("'tsconfig.json'의 'files' 설정이 잘못되었습니다. (첫번째 파일이 모듈로 설정되어있어야함.)");
      }

      webpackConfig.output!.publicPath = `/${this._packageKey}/`;
      webpackConfig.resolve!.alias!["SIMPLYSM_CLIENT_APP_MODULE"] = this._parsedTsConfig.fileNames[0];
      webpackConfig.module!.rules!.pushRange([
        {
          test: /\.js$/,
          parser: {system: true}
        },
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          loaders: [
            eval(`require.resolve("./ts-build-loader")`), //tslint:disable-line:no-eval
            "angular-router-loader"
          ]
        },
        {
          test: /\.scss$/,
          use: [
            "style-loader",
            "css-loader",
            "resolve-url-loader",
            {
              loader: "sass-loader",
              options: {
                sourceMap: true,
                sourceMapContents: false
              }
            }
          ]
        },
        {
          test: /\.css$/,
          use: [
            "style-loader",
            "css-loader"
          ]
        }
      ]);

      webpackConfig.plugins!.pushRange([
        new webpack.ContextReplacementPlugin(/\@angular(\\|\/)core(\\|\/)/),
        /*new webpack.ContextReplacementPlugin(
          /angular[\\/]core[\\/]fesm5/,
          path.resolve(this._contextPath, "src"),
          {}
        ),*/
        new HtmlWebpackPlugin({
          template: path.resolve(__dirname, "../lib/index.ejs"),
          BASE_HREF: `/${this._packageKey}/`
        })
      ]);
    }

    // 빌드 타입별, external 설정
    if (config.type === undefined) {
      const externals = (webpackConfig.externals as webpack.ExternalsElement[]);
      externals.push(
        (context, request, callback) => {
          if (alias[request]) {
            callback(undefined, `commonjs ${request}`);
            return;
          }

          callback(undefined, undefined);
        }
      );
      externals.push(webpackNodeExternals());
    }
    else if (config.type === "server") {
      const externals = (webpackConfig.externals as webpack.ExternalsElement[]);
      externals.push(
        (context, request, callback) => {
          if (["fsevents"].includes(request)) {
            callback(undefined, `""`);
            return;
          }

          callback(undefined, undefined);
        }
      );
    }
    else {
      const externals = (webpackConfig.externals as webpack.ExternalsElement[]);
      externals.push(
        (context, request, callback) => {
          if (["tedious", "chokidar", "nodemailer", "fs-extra", "fs", "child_process", "net", "tls"].includes(request)) {
            callback(undefined, `""`);
            return;
          }

          if (request === "ws") {
            callback(undefined, `WebSocket`);
            return;
          }

          callback(undefined, undefined);
        }
      );
    }

    return webpackConfig;
  }

  public async runAsync(): Promise<void> {
    const projectConfig = await SdCliUtil.getConfigObjAsync("production", this._options);
    const config = projectConfig.packages[this._packageKey];

    const webpackConfig = this._getWebpackCommonConfig(config);
    webpackConfig.mode = "production";
    webpackConfig.devtool = "source-map";
    webpackConfig.optimization!.noEmitOnErrors = true;

    if (config.type === undefined || config.type === "server") {
      webpackConfig.entry = this._getEntry();
    }
    else {
      webpackConfig.entry = path.resolve(__dirname, "../lib/main.js");
      webpackConfig.plugins!.push(new WorkboxPlugin.GenerateSW({
        clientsClaim: true,
        skipWaiting: true
      }));
      /*
      webpackConfig.optimization!.splitChunks = {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/](?!@simplysm)/,
            name: "vendor",
            chunks: "initial",
            enforce: true
          },
          simplysm: {
            test: /[\\/]node_modules[\\/]@simplysm/,
            name: "simplysm",
            chunks: "initial",
            enforce: true
          }
        }
      };
      */
    }

    // '.configs.json'파일 생성
    if (config.type !== undefined) {
      webpackConfig.optimization!.splitChunks = {
        chunks: "all"
      };
      webpackConfig.optimization!.minimizer = [
        new UglifyJsPlugin({
          sourceMap: false,
          cache: true,
          parallel: true
        })
      ];
      webpackConfig.plugins!.push(
        new SdWebpackWriteFilePlugin([
          {
            path: path.resolve(this._distPath, ".configs.json"),
            content: async () => {
              const currProjectConfig = await SdCliUtil.getConfigObjAsync("production", this._options);
              const currConfig = currProjectConfig.packages[this._packageKey];
              return JSON.stringify(currConfig.configs, undefined, 2);
            }
          }
        ])
      );
    }

    // 서버일때, 'pm2.json' 파일 생성
    if (config.type === "server") {
      webpackConfig.plugins!.push(
        new SdWebpackWriteFilePlugin([
          {
            path: path.resolve(this._distPath, "pm2.json"),
            content: JSON.stringify({
              name: "@" + this._projectNpmConfig.name + "/" + this._packageKey,
              script: "app.js",
              watch: ["./*"],
              env: {
                "NODE_ENV": "production"
              }
            }, undefined, 2)
          }
        ])
      );
    }

    const compiler = webpack(webpackConfig);

    compiler.hooks.run.tap("SdPackageBuilder", () => {
      this.emit("run");
    });

    await new Promise<void>((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) {
          reject(err);
          return;
        }

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
        resolve();
      });
    });
  }

  public async watchAsync(): Promise<NextHandleFunction[]> {
    const projectConfig = await SdCliUtil.getConfigObjAsync("development", this._options);
    const config = projectConfig.packages[this._packageKey];

    const webpackConfig = this._getWebpackCommonConfig(config);
    webpackConfig.mode = "development";
    webpackConfig.devtool = "cheap-module-source-map";
    webpackConfig.output!.pathinfo = false;
    webpackConfig.plugins!.push(new SdWebpackTimeFixPlugin());
    webpackConfig.optimization!.removeAvailableModules = false;
    webpackConfig.optimization!.removeEmptyChunks = false;
    webpackConfig.optimization!.splitChunks = false;

    if (config.type === undefined || config.type === "server") {
      webpackConfig.entry = this._getEntry();
    }
    else {
      webpackConfig.entry = {
        main: [
          `webpack-hot-middleware/client?path=/${this._packageKey}/__webpack_hmr&timeout=20000&reload=true`,
          path.resolve(__dirname, "../lib/main.js")
        ]
      };
      webpackConfig.plugins!.push(new webpack.HotModuleReplacementPlugin());
    }

    // 빌드 타입이 서버일 때, '.configs.json'파일 생성
    if (config.type === "server") {
      webpackConfig.plugins!.push(
        new SdWebpackWriteFilePlugin([
          {
            path: path.resolve(this._distPath, ".configs.json"),
            content: JSON.stringify(config.configs, undefined, 2)
          }
        ])
      );
    }

    const compiler = webpack(webpackConfig);

    compiler.hooks.watchRun.tap("SdPackageBuilder", () => {
      this.emit("run");
    });

    if (config.type !== undefined && config.type !== "server") {
      return await new Promise<NextHandleFunction[]>((resolve, reject) => {
        const devMiddleware = WebpackDevMiddleware(compiler, {
          publicPath: webpackConfig.output!.publicPath!,
          logLevel: "silent"
        });

        const hotMiddleware = WebpackHotMiddleware(compiler, {
          path: `/${this._packageKey}/__webpack_hmr`,
          log: false
        });

        compiler.hooks.failed.tap("SdPackageBuilder", err => {
          this.emit("error", err);
          reject(err);
        });

        compiler.hooks.done.tap("SdPackageBuilder", stats => {
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
          resolve([devMiddleware, hotMiddleware]);
        });
      });
    }
    else {
      await new Promise<void>((resolve, reject) => {
        compiler.watch({}, (err, stats) => {
          if (err) {
            reject(err);
            return;
          }

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
          resolve();
        });
      });

      return [];
    }
  }
}