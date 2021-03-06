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
import {Generator} from "@angular/service-worker/config";
import {JsonConvert, ProcessManager} from "@simplysm/sd-core";
import {NodeFilesystem} from "./service-worker/filesystem";
import {AngularCompilerPlugin, PLATFORM} from "@ngtools/webpack";
import * as MiniCssExtractPlugin from "mini-css-extract-plugin";
import * as OptimizeCSSAssetsPlugin from "optimize-css-assets-webpack-plugin";
import * as CopyWebpackPlugin from "copy-webpack-plugin";
import {SdCliUtils} from "./commons/SdCliUtils";
import * as webpackMerge from "webpack-merge";
import {SdWebpackTimeFixPlugin} from "./plugins/SdWebpackTimeFixPlugin";
import {SdWebpackInputHostWithScss} from "./plugins/SdWebpackInputHostWithScss";
import {SdWebpackNgModulePlugin} from "./plugins/SdWebpackNgModulePlugin";
import {SdWebpackForkTsCheckerPlugin} from "./plugins/SdWebpackForkTsCheckerPlugin";
import * as CircularDependencyPlugin from "circular-dependency-plugin";
import * as glob from "glob";
import * as os from "os";

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
                     private readonly _options?: string[],
                     private readonly _serverPort?: number) {
    super();

    this._contextPath = path.resolve(process.cwd(), "packages", this._packageKey);
    this._tsConfigPath = path.resolve(this._contextPath, "tsconfig.build.json");
  }

  private _styleConfigs(opt: { sourceMap: boolean; extract: boolean }): webpack.Configuration {
    const styleLoader = opt.extract
      ? MiniCssExtractPlugin.loader
      : {
        loader: "style-loader"/*,
        options: {sourceMap: opt.sourceMap}*/
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
                  sourceMap: false
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

  private _sourceCompileConfigs(opt: { prod: boolean; sourceMap: boolean; jit: boolean }): webpack.Configuration {
    if (opt.jit && !opt.prod) {
      return {
        module: {
          rules: [
            {
              test: /[\/\\]@angular[\/\\]core[\/\\].+\.js$/,
              parser: {system: true}
            },
            {
              test: /\.ts$/,
              loaders: [
                require.resolve("./loaders/ts-transpile-loader"),
                require.resolve("./loaders/inline-sass-loader"),
                require.resolve("angular-router-loader")
              ]
            }
          ]
        },
        plugins: [
          new SdWebpackNgModulePlugin({tsConfigPath: this._tsConfigPath, jit: true}),
          new webpack.ContextReplacementPlugin(/@angular([\\/])core([\\/])/),
          new SdWebpackForkTsCheckerPlugin({
            tsConfigPath: this._tsConfigPath,
            error: messages => {
              this.emit("error", ...messages);
            }
          }),
          new CircularDependencyPlugin({
            exclude: /[\\\/]node_modules[\\\/]/,
            include: new RegExp("^" + this._contextPath.replace(/\\/g, "\\\\"))
          } as any)
        ]
      };
    }
    else {
      const loaders: webpack.RuleSetUse = ["@ngtools/webpack"];

      if (opt.prod) {
        loaders.unshift({
          loader: "@angular-devkit/build-optimizer/webpack-loader",
          options: {
            sourceMap: opt.sourceMap
          }
        });
      }

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
            ...opt.prod ? [] : [
              {
                test: /\.ts$/,
                loader: require.resolve("./loaders/inline-sass-dependency-loader")
              }
            ]
          ]
        },
        plugins: [
          /*new SuppressExtractedTextChunksWebpackPlugin(),*/
          new CircularDependencyPlugin({
            exclude: /([\\\/]node_modules[\\\/])|(ngfactory\.js$)/,
            include: new RegExp("^" + this._contextPath.replace(/\\/g, "\\\\"))
          } as any),
          new AngularCompilerPlugin({
            // mainPath: path.resolve(this._contextPath, "src/main.ts"),
            mainPath: path.resolve(__dirname, "../lib/main." + (opt.prod ? "prod" : "dev") + ".js"),
            entryModule: path.resolve(this._contextPath, "src/AppModule") + "#AppModule",
            platform: PLATFORM.Browser,
            sourceMap: opt.sourceMap,
            nameLazyFiles: !opt.prod,
            forkTypeChecker: true,
            // contextElementDependencyConstructor: require("webpack/lib/dependencies/ContextElementDependency"), //tslint:disable-line:no-require-imports
            directTemplateLoading: true,
            tsConfigPath: this._tsConfigPath,
            skipCodeGeneration: !opt.prod,
            // basePath: process.cwd(),
            host: new SdWebpackInputHostWithScss(fs),
            compilerOptions: {
              // ...this._parsedTsConfig.options,
              // declaration: false,
              // removeComments: true,
              // skipLibCheck: false,
              // skipTemplateCodegen: false,
              // strictMetadataEmit: true,
              fullTemplateTypeCheck: true,
              strictInjectionParameters: true,
              // enableResourceInlining: true,
              rootDir: undefined
              // enableIvy: true
            }
          }),
          new SdWebpackNgModulePlugin({tsConfigPath: this._tsConfigPath, jit: false}),
          new webpack.ContextReplacementPlugin(/@angular([\\/])core([\\/])/)
        ]
      };
    }
  }

  private _assetsFileConfigs(opt: { hash: boolean }): webpack.Configuration {
    return {
      module: {
        rules: [
          {
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx?|pptx?|docx?|zip)$/,
            loader: "file-loader",
            options: {
              name: `assets/[name].[ext]${opt.hash ? "?[hash]" : ""}`
            }
          }
        ]
      }
    };
  }

  private _entryConfigs(opt: { prod: boolean }): webpack.Configuration {
    return opt.prod
      ? {
        entry: {
          main: path.resolve(__dirname, "../lib/main.prod.js")
        },
        resolve: {
          alias: {
            "SD_APP_MODULE_FACTORY": path.resolve(this._contextPath, "src/AppModule.ngfactory")
          }
        }
      }
      : {
        entry: {
          main: [
            `webpack-hot-middleware/client?path=/${this._packageKey}/__webpack_hmr&timeout=20000&reload=true`,
            path.resolve(__dirname, "../lib/main.dev.js")
          ]
        },
        resolve: {
          alias: {
            "SD_APP_MODULE": path.resolve(this._contextPath, "src/AppModule")
          }
        },
        plugins: [
          new webpack.HotModuleReplacementPlugin()
        ]
      };
  }

  private _getWebpackCommonConfig(platform?: "android" | "browser", env?: { [key: string]: string }): webpack.Configuration {
    const faviconPath = path.resolve(this._contextPath, "src", "favicon.ico");

    const indexEjsPath = path.resolve(this._contextPath, "src", "index.ejs");
    return {
      target: /*platform === "android" ? "node" :*/ "web",
      output: {
        publicPath: platform === "android" ? "/android_asset/www/" : `/${this._packageKey}/`,
        path: platform === "android" ? path.resolve(this._contextPath, ".cordova", "www") : this._distPath,
        filename: "[name].js",
        chunkFilename: "[name].chunk.js"
      },
      resolve: {
        extensions: [".ts", ".js", ".json"],
        alias: this._alias,
        aliasFields: ["browser"]
      },
      module: {
        strictExportPresence: true,
        rules: []
      },
      plugins: [
        new HtmlWebpackPlugin({
          template: fs.existsSync(indexEjsPath) ? indexEjsPath : path.resolve(__dirname, `../lib/index.ejs`),
          BASE_HREF: platform === "android" ? "/android_asset/www/" : `/${this._packageKey}/`,
          ...platform ? {
            PLATFORM: platform
          } : {}
          // chunksSortMode: "none",
          // inject: true
        }),
        ...fs.pathExistsSync(faviconPath)
          ? [
            new CopyWebpackPlugin([
              path.resolve(this._contextPath, "src", "favicon.ico")
            ])
          ]
          : [],
        new webpack.DefinePlugin({
          "process.env.SD_VERSION": `"${this._projectNpmConfig.version}"`,
          "process.env.SD_BASE_HREF": `"/${this._packageKey}/"`,
          ...env ? this._convertEnvObject(env) : {},
          ...platform ? {
            "process.env.SD_PLATFORM": `"${platform}"`
          } : {}
        })
      ],
      externals: [
        (context, request, callback) => {
          if (["fsevents", "fs", "fs-extra", "child_process", "net", "tls", "tedious", "chokidar", "nodemailer", "iconv"].includes(request)) {
            // tslint:disable-next-line: no-null-keyword
            callback(null, `{}`);
            return;
          }

          if (request === "ws") {
            // tslint:disable-next-line: no-null-keyword
            callback(null, `WebSocket`);
            return;
          }

          callback();
        }
      ]
    };
  }

  public async runAsync(): Promise<void> {
    const projectConfig = SdCliUtils.getConfigObj("production", this._options);
    const config = projectConfig.packages[this._packageKey];

    //-- 모바일
    if (config.type === "mobile") {
      if (!config.mobile) {
        throw new Error("모바일 설정이 되어있지 않습니다.");
      }

      await this._initializeCordovaAsync();
    }

    const webpackConfig = webpackMerge(this._getWebpackCommonConfig(config.type === "mobile" ? "android" : undefined, config.env),
      {
        mode: "production",
        devtool: false,
        profile: false,
        performance: {
          hints: false
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
            new webpack.HashedModuleIdsPlugin(),
            new OptimizeCSSAssetsPlugin()/*,
            new TerserPlugin({
              extractComments: false,
              sourceMap: false,
              parallel: true,
              cache: true,
              terserOptions: {
                ecma: 5,
                warnings: false,
                safari10: true,
                output: {
                  ascii_only: true,
                  comments: false,
                  webkit: true
                },
                compress: {
                  pure_getters: true,
                  passes: 3,
                  global_defs: {
                    ngDevMode: false,
                    ngI18nClosureMode: false
                  }
                }
              }
            })*/
          ]
        },
        plugins: [
          new SdWebpackWriteFilePlugin([{
            path: path.resolve(config.type === "mobile" ? path.resolve(this._contextPath, ".cordova", "www") : this._distPath, ".configs.json"),
            content: JSON.stringify({env: "production", ...config.configs}, undefined, 2)
          }])
        ]
      },
      this._entryConfigs({prod: true}),
      this._assetsFileConfigs({hash: false}),
      this._sourceCompileConfigs({prod: true, sourceMap: false, jit: false}),
      this._styleConfigs({sourceMap: false, extract: true})
    );

    const compiler = webpack(webpackConfig);

    compiler.hooks.run.tap("SdAngularCompiler", () => {
      this.emit("run");
    });

    await new Promise<boolean>((resolve, reject) => {
      compiler.run(async (err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        const isSuccess = this._emitWebpackCompilerStats(stats);
        if (!isSuccess) {
          this.emit("done");
          resolve();
          return;
        }

        if (config.type !== "mobile") {
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

        if (config.type === "mobile") {
          console.log(`CORDOVA 빌드`);
          const cordovaProjectPath = path.resolve(this._contextPath, ".cordova");
          const mobileConfig = config.mobile!;

          const buildType = mobileConfig.debug ? "debug" : "release";

          fs.removeSync(path.resolve(cordovaProjectPath, "platforms", "android", `${buildType}-signing.jks`));
          fs.removeSync(path.resolve(cordovaProjectPath, "platforms", "android", `${buildType}-signing.properties`));
          if (mobileConfig.sign) {
            fs.copySync(
              path.resolve(this._contextPath, mobileConfig.sign, `${buildType}-signing.jks`),
              path.resolve(cordovaProjectPath, "platforms", "android", `${buildType}-signing.jks`)
            );
            fs.copySync(
              path.resolve(this._contextPath, mobileConfig.sign, `${buildType}-signing.properties`),
              path.resolve(cordovaProjectPath, "platforms", "android", `${buildType}-signing.properties`)
            );
          }

          if (mobileConfig.icon) {
            fs.copySync(
              path.resolve(this._contextPath, mobileConfig.icon),
              path.resolve(cordovaProjectPath, "res", "icon", "icon.png")
            );
          }

          const version = fs.readJsonSync(path.resolve(this._contextPath, "package.json")).version;
          let configFileContent = fs.readFileSync(path.resolve(cordovaProjectPath, "config.xml"), "utf-8");
          configFileContent = configFileContent.replace(/<allow-navigation href="[^"]"\s?\/>/g, "");
          configFileContent = configFileContent.replace(/version="[^"]*"/g, `version="${version}"`);

          if (!configFileContent.includes("xmlns:android=\"http://schemas.android.com/apk/res/android\"")) {
            configFileContent = configFileContent.replace(
              "xmlns=\"http://www.w3.org/ns/widgets\"",
              `xmlns="http://www.w3.org/ns/widgets" xmlns:android="http://schemas.android.com/apk/res/android"`
            );
          }
          if (!configFileContent.includes("application android:usesCleartextTraffic=\"true\" />")) {
            configFileContent = configFileContent.replace("<platform name=\"android\">", `<platform name="android">
        <edit-config file="app/src/main/AndroidManifest.xml" mode="merge" target="/manifest/application">
            <application android:usesCleartextTraffic="true" />
        </edit-config>`);
          }

          if (mobileConfig.icon && !configFileContent.includes("<icon")) {
            configFileContent = configFileContent.replace("</widget>", "    <icon src=\"res/icon/icon.png\" />\r\n</widget>");
          }
          configFileContent = configFileContent.replace("</widget>", "    <preference name=\"Orientation\" value=\"portrait\" />\r\n</widget>");
          fs.writeFileSync(path.resolve(cordovaProjectPath, "config.xml"), configFileContent, "utf-8");

          const cordovaBinPath = path.resolve(process.cwd(), "node_modules", ".bin", "cordova.cmd");

          if (mobileConfig.device) {
            await ProcessManager.spawnAsync(`${cordovaBinPath} run android --${buildType} --device`, {cwd: cordovaProjectPath});
          }
          else {
            await ProcessManager.spawnAsync(`${cordovaBinPath} build android --${buildType}`, {cwd: cordovaProjectPath});

            const apkFileName = `app-${buildType}.apk`;
            const distApkFileName = `${mobileConfig.name.replace(/ /g, "_")}${mobileConfig.debug ? "-debug" : ""}${mobileConfig.sign ? "" : "-unsigned"}-v${version}.apk`;

            fs.mkdirsSync(this._distPath);
            fs.copyFileSync(
              path.resolve(cordovaProjectPath, "platforms", "android", "app", "build", "outputs", "apk", buildType, apkFileName),
              path.resolve(this._distPath, distApkFileName)
            );
          }
        }

        this.emit("done");
        resolve();
      });
    });
  }

  public async watchAsync(): Promise<NextHandleFunction[]> {
    const projectConfig = SdCliUtils.getConfigObj("development", this._options);
    const config = projectConfig.packages[this._packageKey];

    //-- 모바일
    if (config.type === "mobile") {
      if (!config.mobile) {
        throw new Error("모바일 설정이 되어있지 않습니다.");
      }

      await this._initializeCordovaAsync();
    }

    // const modulePath = path.resolve(this._parsedTsConfig.options.rootDir!, "AppModule");
    const webpackConfig = webpackMerge(this._getWebpackCommonConfig(config.type === "mobile" ? "browser" : undefined, config.env),
      {
        mode: "development",
        devtool: "cheap-module-source-map",
        /*resolve: {
          alias: {
            "SIMPLYSM_CLIENT_APP_MODULE": modulePath
          }
        },*/
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
                /(ngfactory|ngstyle)\.js$/
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
      this._entryConfigs({prod: false}),
      this._assetsFileConfigs({hash: true}),
      this._sourceCompileConfigs({prod: false, sourceMap: true, jit: config.framework === "angular-jit"}),
      this._styleConfigs({sourceMap: false, extract: false})
    );

    //-- 모바일
    if (config.type === "mobile") {
      webpackConfig.plugins!.push(
        new CopyWebpackPlugin([{
          context: path.resolve(this._contextPath, `.cordova/platforms/${config.mobile!.device ? "android" : "browser"}/platform_www`),
          from: "**/*"
        }])
      );
    }

    this.emit("run");

    const compiler = webpack(webpackConfig);

    let isFirstInvalid = true;
    compiler.hooks.invalid.tap("SdAngularCompiler", () => {
      if (isFirstInvalid) {
        isFirstInvalid = false;
        this.emit("run");
      }
    });

    /*compiler.hooks.watchRun.tapAsync("SdAngularCompiler", async (compiler1, callback) => {
      this.emit("run");
      callback();
    });*/

    return await new Promise<NextHandleFunction[]>((resolve, reject) => {
      const devMiddleware = WebpackDevMiddleware(compiler, {
        publicPath: webpackConfig.output!.publicPath!,
        logLevel: "silent"
      });

      const hotMiddleware = WebpackHotMiddleware(compiler, {
        path: `/${this._packageKey}/__webpack_hmr`,
        log: false
      });

      compiler.hooks.failed.tap("SdAngularCompiler", err => {
        this.emit("error", err);
        reject(err);
      });

      let hasDeviceSetting = false;
      compiler.hooks.done.tap("SdAngularCompiler", async stats => {
        isFirstInvalid = true;
        this._emitWebpackCompilerStats(stats);

        if (config.type === "mobile" && !hasDeviceSetting) {
          hasDeviceSetting = true;

          const cordovaProjectPath = path.resolve(this._contextPath, ".cordova");
          const mobileConfig = config.mobile!;
          const serverUrl = `http://${await this._getCurrentIPAsync()}:${this._serverPort}`;

          fs.removeSync(path.resolve(cordovaProjectPath, "www"));
          fs.mkdirsSync(path.resolve(cordovaProjectPath, "www"));
          fs.writeFileSync(path.resolve(cordovaProjectPath, "www/index.html"), `'${serverUrl}/${this._packageKey}/'로 이동중... <script>setTimeout(function () {window.location.href = "${serverUrl}/${this._packageKey}/"}, 3000);</script>`.trim(), "utf-8");

          if (mobileConfig.icon) {
            fs.copySync(
              path.resolve(this._contextPath, mobileConfig.icon),
              path.resolve(cordovaProjectPath, "res", "icon", "icon.png")
            );
          }

          let configFileContent = fs.readFileSync(path.resolve(cordovaProjectPath, "config.xml"), "utf-8");
          configFileContent = configFileContent.replace(/    <allow-navigation href="[^"]*"\s?\/>\n/g, "");
          configFileContent = configFileContent.replace("</widget>", `    <allow-navigation href="${serverUrl}" />\n</widget>`);
          configFileContent = configFileContent.replace("</widget>", `    <allow-navigation href="${serverUrl}/*" />\n</widget>`);
          if (!configFileContent.includes("xmlns:android=\"http://schemas.android.com/apk/res/android\"")) {
            configFileContent = configFileContent.replace(
              "xmlns=\"http://www.w3.org/ns/widgets\"",
              `xmlns="http://www.w3.org/ns/widgets" xmlns:android="http://schemas.android.com/apk/res/android"`
            );
          }
          if (!configFileContent.includes("application android:usesCleartextTraffic=\"true\" />")) {
            configFileContent = configFileContent.replace("<platform name=\"android\">", `<platform name="android">
        <edit-config file="app/src/main/AndroidManifest.xml" mode="merge" target="/manifest/application">
            <application android:usesCleartextTraffic="true" />
        </edit-config>`);
          }

          if (mobileConfig.icon && !configFileContent.includes("<icon")) {
            configFileContent = configFileContent.replace("</widget>", "    <icon src=\"res/icon/icon.png\" />\r\n</widget>");
          }

          configFileContent = configFileContent.replace("</widget>", "    <preference name=\"Orientation\" value=\"portrait\" />\r\n</widget>");

          fs.writeFileSync(path.resolve(cordovaProjectPath, "config.xml"), configFileContent, "utf-8");

          if (config.mobile!.device) {
            const cordovaBinPath = path.resolve(process.cwd(), "node_modules", ".bin", "cordova.cmd");
            await ProcessManager.spawnAsync(`${cordovaBinPath} run android --device`, {cwd: cordovaProjectPath});
          }
        }

        this.emit("done");

        resolve([devMiddleware, hotMiddleware]);
      });
    });
  }

  private async _getCurrentIPAsync(): Promise<string> {
    /*return await new Promise<string>(resolve => {
      https.request({
        hostname: "api.ipify.org",
        path: "/",
        method: "GET"
      }, res => {
        res.on("data", chunk => {
          resolve(chunk.toString());
          res.destroy();
        });
      }).end();
    });*/

    const ifaces = os.networkInterfaces();
    const result = Object.keys(ifaces)
      .map(key => ifaces[key] ? ifaces[key]!.filter(item => item.family === "IPv4" && !item.internal) : undefined)
      .filterExists()
      .filter(item => item.length > 0).mapMany(item => item.map(item1 => item1.address));
    // console.log(result);
    return result[0];
  }

  private _emitWebpackCompilerStats(stats: webpack.Stats): boolean {
    const info = stats.toJson({all: false, assets: true, warnings: true, errors: true, errorDetails: false});

    const hasWarning = stats.hasWarnings();
    const hasErrors = stats.hasErrors();

    if (hasWarning) {
      for (const warning of info.warnings) {
        this.emit("warning", warning);
      }
    }

    if (hasErrors) {
      for (const error of info.errors) {
        this.emit("error", error);
      }
    }

    return !(hasWarning || hasErrors);
  }

  private async _initializeCordovaAsync(): Promise<void> {
    const projectConfig = SdCliUtils.getConfigObj("development", this._options);
    const config = projectConfig.packages[this._packageKey];
    const mobileConfig = config.mobile!;

    const cordovaProjectPath = path.resolve(this._contextPath, ".cordova");
    const cordovaBinPath = path.resolve(process.cwd(), "node_modules", ".bin", "cordova.cmd");

    await ProcessManager.spawnAsync(`${cordovaBinPath} telemetry on`);

    if (!fs.existsSync(cordovaProjectPath)) {
      console.log(`CORDOVA 프로젝트 생성`);
      await ProcessManager.spawnAsync(`${cordovaBinPath} create "${cordovaProjectPath}" "${mobileConfig.id}" "${mobileConfig.name}"`, {cwd: process.cwd()});
    }

    fs.mkdirsSync(path.resolve(cordovaProjectPath, "www"));

    if (!fs.existsSync(path.resolve(cordovaProjectPath, "platforms", "android"))) {
      console.log(`CORDOVA 플랫폼 생성: android`);
      await ProcessManager.spawnAsync(`${cordovaBinPath} platform add android`, {cwd: cordovaProjectPath});
    }

    if (!fs.existsSync(path.resolve(cordovaProjectPath, "platforms", "browser"))) {
      console.log(`CORDOVA 플랫폼 생성: browser`);
      await ProcessManager.spawnAsync(`${cordovaBinPath} platform add browser`, {cwd: cordovaProjectPath});
    }

    const prevPlugins = Object.values(fs.readJsonSync(path.resolve(cordovaProjectPath, "plugins", "fetch.json"))).map((item: any) => item["source"].id ? item["source"].id.replace(/@.*$/, "") : item["source"].url);

    /*if (!prevPlugins.includes("cordova-android-support-gradle-release")) {
      console.log(`CORDOVA 플러그인 설치: cordova-android-support-gradle-release`);
      await ProcessManager.spawnAsync(`${cordovaBinPath} plugin add cordova-android-support-gradle-release`, {cwd: cordovaProjectPath});
    }*/

    /*if (!prevPlugins.includes("phonegap-plugin-mobile-accessibility")) {
      console.log(`CORDOVA 플러그인 설치: phonegap-plugin-mobile-accessibility`);
      await ProcessManager.spawnAsync(`${cordovaBinPath} plugin add https://github.com/phonegap/phonegap-mobile-accessibility.git`, {cwd: cordovaProjectPath});
    }*/

    const mainActivityFilePath = glob.sync(path.resolve(cordovaProjectPath, "platforms", "android", "app", "src", "main", "java", "**", "MainActivity.java")).single();
    if (!mainActivityFilePath) {
      throw new Error("MainActivity.java 파일을 찾을 수 없습니다.");
    }
    let mainActivityFileContent = fs.readFileSync(mainActivityFilePath).toString();
    if (!mainActivityFileContent.includes("Solve web view font-size problem")) {
      mainActivityFileContent = mainActivityFileContent.replace(/import org\.apache\.cordova\.\*;/, `import org.apache.cordova.*;
import android.webkit.WebView;
import android.webkit.WebSettings;`);

      mainActivityFileContent = mainActivityFileContent.replace(/loadUrl\(launchUrl\);/, `loadUrl(launchUrl);

        // Solve web view font-size problem
        WebView webView = (WebView)appView.getEngine().getView();
        WebSettings settings = webView.getSettings();
        settings.setTextSize(WebSettings.TextSize.NORMAL);`);

      fs.writeFileSync(mainActivityFilePath, mainActivityFileContent);
    }

    if (mobileConfig.plugins) {
      for (const plugin of mobileConfig.plugins) {
        if (!prevPlugins.includes(plugin)) {
          console.log(`CORDOVA 플러그인 설치  : ${plugin}`);
          await ProcessManager.spawnAsync(`${cordovaBinPath} plugin add ${plugin}`, {cwd: cordovaProjectPath});
        }
      }
    }
  }

  private _convertEnvObject(env: { [key: string]: string }): { [key: string]: string } {
    const cloneEnv = Object.clone(env);
    for (const key of Object.keys(cloneEnv)) {
      cloneEnv[key] = `"${cloneEnv[key]}"`;
    }
    return cloneEnv;
  }
}
