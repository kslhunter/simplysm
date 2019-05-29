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
import * as TerserPlugin from "terser-webpack-plugin";
import {Generator} from "@angular/service-worker/config";
import {JsonConvert} from "@simplysm/sd-core";
import {NodeFilesystem} from "./service-worker/filesystem";
import {AngularCompilerPlugin} from "@ngtools/webpack";

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
            test: /\.(pfx|crt|pem)$/,
            loader: "file-loader",
            options: {
              name: "ssl/[name].[ext]"
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
      webpackConfig.module!.rules!.pushRange([
        {
          test: /[\/\\]@angular[\/\\]core[\/\\].+\.js$/,
          parser: {system: true}
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
        new webpack.ContextReplacementPlugin(/@angular([\\/])core([\\/])/),
        new HtmlWebpackPlugin({
          template: path.resolve(__dirname, "../lib/index.ejs"),
          chunksSortMode: "none",
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
    webpackConfig.module!.rules.pushRange([
      {
        test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx?|pptx?|docx?)$/,
        loader: "file-loader",
        options: {
          name: "assets/[name].[ext]"
        }
      }
    ]);

    webpackConfig.optimization!.noEmitOnErrors = true;

    if (config.type === undefined || config.type === "server") {
      webpackConfig.entry = this._getEntry();
    }
    else {
      webpackConfig.entry = {
        main: path.resolve(__dirname, "../lib/main.prod.js"),
        styles: path.resolve(this._contextPath, "src", "styles.scss")
      };
    }

    // optimization: library
    if (config.type === undefined) {
      webpackConfig.devtool = "source-map";
      webpackConfig.module!.rules.push(
        {
          enforce: "pre",
          test: /\.js$/,
          use: ["source-map-loader"],
          exclude: /node_modules[\\/](?!@simplysm|rxjs|@angular|zone\.js)/
        }
      );
      webpackConfig.optimization!.minimizer = [
        new TerserPlugin({
          sourceMap: true,
          cache: true,
          parallel: true,
          terserOptions: {
            keep_fnames: true
          }
        })
      ];
    }
    // optimization: client/server
    else {
      webpackConfig.devtool = false;
      webpackConfig.optimization!.minimizer = [
        new TerserPlugin({
          sourceMap: false,
          cache: true,
          parallel: true,
          terserOptions: {
            keep_fnames: true
          }
        })
      ];
    }

    // optimization: client
    if (config.type !== undefined && config.type !== "server") {
      webpackConfig.optimization!.runtimeChunk = "single";
      webpackConfig.optimization!.splitChunks = {
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
      };
      webpackConfig.optimization!.minimizer.push(
        new webpack.HashedModuleIdsPlugin()
      );

      webpackConfig.performance = {
        hints: false
      };
    }

    // rules
    if (config.type !== undefined && config.type !== "server") {
      webpackConfig.module!.rules.pushRange([
        {
          test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
          loader: [
            "@angular-devkit/build-optimizer/webpack-loader",
            "@ngtools/webpack"
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
        }
      ]);

      const modulePath = this._parsedTsConfig.fileNames[0].replace(/\.ts$/, "");
      webpackConfig.resolve!.alias!["SIMPLYSM_CLIENT_APP_MODULE_NGFACTORY"] = modulePath + ".ngfactory";
      webpackConfig.plugins!.pushRange([
        new AngularCompilerPlugin({
          tsConfigPath: path.resolve(this._contextPath, "tsconfig.build.json"),
          entryModule: modulePath + "#" + path.basename(modulePath),
          mainPath: path.resolve(__dirname, "../lib/main.prod.js"),
          basePath: process.cwd(),
          sourceMap: false,
          forkTypeChecker: false,
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
            enableResourceInlining: true,
            disableTypeScriptVersionCheck: true
          }
        })
      ]);
    }

    // '.configs.json'파일 생성
    if (config.type !== undefined) {
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
              watch: ["./app.js"],
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

    if (config.type !== undefined && config.type !== "server") {
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
  }

  public async watchAsync(): Promise<NextHandleFunction[]> {
    const projectConfig = await SdCliUtil.getConfigObjAsync("development", this._options);
    const config = projectConfig.packages[this._packageKey];

    const webpackConfig = this._getWebpackCommonConfig(config);
    webpackConfig.mode = "development";
    webpackConfig.devtool = "cheap-module-source-map";
    webpackConfig.module!.rules.pushRange([
      {
        enforce: "pre",
        test: /\.js$/,
        use: ["source-map-loader"],
        exclude: [
          /node_modules[\\/](?!@simplysm|rxjs|@angular|zone\.js)/,
          /\.ngfactory\.js$/,
          /\.ngstyle\.js$/
        ]
      },
      {
        test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx?|pptx?|docx?)$/,
        loader: "file-loader",
        options: {
          name: "assets/[name].[ext]?[hash]"
        }
      }
    ]);

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
        ],
        styles: path.resolve(this._contextPath, "src", "styles.scss")
      };

      webpackConfig.module!.rules.pushRange([
        {
          test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
          loader: "@ngtools/webpack"
        },
        {
          test: /\.scss$/,
          use: [
            {
              loader: "style-loader",
              options: {
                sourceMap: true
              }
            },
            {
              loader: "css-loader",
              options: {
                sourceMap: true
              }
            },
            {
              loader: "resolve-url-loader",
              options: {
                sourceMap: true
              }
            },
            {
              loader: "sass-loader",
              options: {
                sourceMap: true,
                sourceMapContents: false
              }
            }
          ]
        }
      ]);

      const modulePath = this._parsedTsConfig.fileNames[0].replace(/\.ts$/, "");
      webpackConfig.resolve!.alias!["SIMPLYSM_CLIENT_APP_MODULE"] = modulePath;
      webpackConfig.plugins!.pushRange([
        new AngularCompilerPlugin({
          tsConfigPath: path.resolve(this._contextPath, "tsconfig.build.json"),
          entryModule: modulePath + "#" + path.basename(modulePath),
          mainPath: path.resolve(__dirname, "../lib/main.js"),
          basePath: process.cwd(),
          sourceMap: true,
          skipCodeGeneration: true,
          forkTypeChecker: false,
          compilerOptions: {
            ...this._parsedTsConfig.options,
            rootDir: undefined,
            declaration: false,
            skipLibCheck: false,
            skipTemplateCodegen: false,
            strictMetadataEmit: true,
            fullTemplateTypeCheck: true,
            strictInjectionParameters: true,
            enableResourceInlining: true,
            disableTypeScriptVersionCheck: true
          }
        }),
        new webpack.HotModuleReplacementPlugin()
      ]);
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
