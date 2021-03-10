import {
  INpmConfig,
  ISdClientPackageConfig,
  ISdClientPackageConfigAndroidPlatform,
  ISdPackageBuildResult,
  TSdClientPackageConfigPlatform
} from "../commons";
import { NextHandleFunction } from "connect";
import { EventEmitter } from "events";
import * as webpack from "webpack";
import { SdWebpackUtil } from "../utils/SdWebpackUtil";
import * as path from "path";
import * as WebpackDevMiddleware from "webpack-dev-middleware";
import * as WebpackHotMiddleware from "webpack-hot-middleware";
import { SdCliPathUtil } from "../utils/SdCliPathUtil";
import { FsUtil, Logger, SdProcessManager } from "@simplysm/sd-core-node";
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
import { SdCliCordovaTool } from "./SdCliCordovaTool";
import { ObjectUtil } from "@simplysm/sd-core-common";

// const nodeExternals = require("webpack-node-externals");

export class SdCliClientCompiler extends EventEmitter {
  private readonly _logger: Logger;
  private readonly _npmConfig: INpmConfig;

  public constructor(private readonly _rootPath: string,
                     private readonly _config: ISdClientPackageConfig,
                     private readonly _platform: TSdClientPackageConfigPlatform) {
    super();

    const npmConfigFilePath = SdCliPathUtil.getNpmConfigFilePath(this._rootPath);
    this._npmConfig = FsUtil.readJson(npmConfigFilePath);

    this._logger = Logger.get(["simplysm", "sd-cli", this.constructor.name, this._npmConfig.name, this._platform.type]);
  }

  public on(event: "change", listener: () => void): this;
  public on(event: "complete", listener: (results: ISdPackageBuildResult[]) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public async compileAsync(): Promise<void> {
    if (this._platform.type === "android") {
      await new SdCliCordovaTool().initializeAsync(this._rootPath, this._platform);
      await FsUtil.removeAsync(path.resolve(this._rootPath, ".cordova", "www"));
    }

    const webpackConfig = await this._getWebpackConfigAsync(false);

    const compiler = webpack(webpackConfig);

    await new Promise<void>((resolve, reject) => {
      try {
        compiler.hooks.run.tap("SdCliClientCompiler", () => {
          this.emit("change");
        });

        compiler.run(async (err: Error | null, stats) => {
          if (err != null) {
            reject(err);
            return;
          }

          const results = SdWebpackUtil.getWebpackResults(err, stats);
          if (results.some((item) => item.severity === "error")) {
            this.emit("complete", results);
            resolve();
          }

          const distPath = SdCliPathUtil.getDistPath(this._rootPath);

          if (this._npmConfig.dependencies && "@angular/service-worker" in this._npmConfig.dependencies) {
            await FsUtil.copyAsync(
              path.resolve(process.cwd(), "node_modules", "@angular", "service-worker", "ngsw-worker.js"),
              path.resolve(distPath, "ngsw-worker.js")
            );

            const relativeDistPath = path.relative(process.cwd(), distPath);
            const ngswConfigPath = path.relative(process.cwd(), path.resolve(__dirname, "../../lib/ngsw-config.json"));
            const baseHref = `/${path.basename(this._rootPath)}/`;
            await SdProcessManager.spawnAsync(`ngsw-config ${relativeDistPath} ${ngswConfigPath} ${baseHref}`);
          }

          const androidPlatform: ISdClientPackageConfigAndroidPlatform | undefined =
            this._config.platforms?.single((item) => item.type === "android") as any;
          if (androidPlatform) {
            const cordovaProjectPath = path.resolve(this._rootPath, ".cordova");

            // TODO: 안드로이드 디버그 빌드 구현 (--debug 있을 때에 디버그버전으로 빌드, 사인 없이)
            if (androidPlatform.sign !== undefined) {
              await FsUtil.copyAsync(
                path.resolve(process.cwd(), androidPlatform.sign.keystore),
                path.resolve(cordovaProjectPath, path.basename(androidPlatform.sign.keystore))
              );
              await FsUtil.writeJsonAsync(
                path.resolve(cordovaProjectPath, "build.json"),
                {
                  android: {
                    release: {
                      keystore: path.basename(androidPlatform.sign.keystore),
                      storePassword: androidPlatform.sign.storePassword,
                      alias: androidPlatform.sign.alias,
                      password: androidPlatform.sign.password,
                      keystoreType: androidPlatform.sign.keystoreType
                    }
                  }
                }
              );
            }

            // ICON
            if (androidPlatform.icon !== undefined) {
              await FsUtil.copyAsync(androidPlatform.icon, path.resolve(cordovaProjectPath, "res", "icon", "icon.png"));
            }

            // GRADLE
            const gradleFilePath = path.resolve(cordovaProjectPath, "platforms/android/app/build.gradle");
            let gradleFileContent = await FsUtil.readFileAsync(gradleFilePath);
            gradleFileContent = gradleFileContent.replace(/lintOptions {/g, "lintOptions {\r\n      checkReleaseBuilds false;");
            await FsUtil.writeFileAsync(gradleFilePath, gradleFileContent);

            // CONFIG
            const configFilePath = path.resolve(cordovaProjectPath, "config.xml");
            let configFileContent = await FsUtil.readFileAsync(configFilePath);
            configFileContent = configFileContent.replace(/<allow-navigation href="[^"]"\s?\/>/g, "");
            configFileContent = configFileContent.replace(/version="[^"]*"/g, `version="${this._npmConfig.version}"`);
            if (androidPlatform.icon !== undefined && !configFileContent.includes("<icon")) {
              configFileContent = configFileContent.replace("</widget>", "    <icon src=\"res/icon/icon.png\" />\r\n</widget>");
            }
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
            await FsUtil.writeFileAsync(configFilePath, configFileContent);

            // RUN
            const cordovaBinPath = path.resolve(process.cwd(), "node_modules/.bin/cordova.cmd");
            await SdProcessManager.spawnAsync(`${cordovaBinPath} build android --release`, { cwd: cordovaProjectPath }, (message) => {
              this._logger.debug("CORDOVA: " + message);
            });

            // COPY
            const apkFileName = androidPlatform.sign !== undefined ? "app-release.apk" : "app-release-unsigned.apk";
            const distApkFileName = path.basename(`${this._npmConfig.name.replace(/ /g, "_")}${androidPlatform.sign !== undefined ? "" : "-unsigned"}-v${this._npmConfig.version}.apk`);

            await FsUtil.mkdirsAsync(distPath);
            await FsUtil.copyAsync(
              path.resolve(cordovaProjectPath, "platforms", "android", "app", "build", "outputs", "apk", "release", apkFileName),
              path.resolve(distPath, distApkFileName)
            );
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
    if (this._platform.type === "android") {
      await new SdCliCordovaTool().initializeAsync(this._rootPath, this._platform);
    }

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
    const distPath = this._platform.type !== "android" ?
      SdCliPathUtil.getDistPath(this._rootPath) :
      path.resolve(this._rootPath, ".cordova", "www");

    // TSCONFIG
    const tsconfigFilePath = SdCliPathUtil.getTsConfigBuildFilePath(this._rootPath, "browser");
    const tsconfig = await FsUtil.readJsonAsync(tsconfigFilePath);
    const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this._rootPath);

    // LIB 파일 경로
    const mainPath = path.resolve(__dirname, "../../lib/main." + (watch ? "dev" : "prod") + ".js");
    const indexPath = path.resolve(__dirname, `../../lib/index.ejs`);
    const polyfillsPath = path.resolve(__dirname, `../../lib/polyfills.js`);

    // publicPath
    const publicPath = (!watch && this._platform.type === "android") ? "/android_asset/www/" :
      (this._platform.type !== "browser" ? `/__${this._platform.type}__` : "") + `/${packageKey}/`;

    // DIST에 COPY할 NPM 설정 구성
    const distNpmConfig = ObjectUtil.clone(this._npmConfig);

    const loadedModuleNames: string[] = [];
    const externalModuleNames: string[] = [];
    const fn = (moduleName: string): void => {
      if (loadedModuleNames.includes(moduleName)) return;
      loadedModuleNames.push(moduleName);

      const modulePath = path.resolve(process.cwd(), "node_modules", moduleName);
      if (FsUtil.exists(path.resolve(modulePath, "binding.gyp"))) {
        externalModuleNames.push(moduleName);
      }

      if (moduleName === "typescript") {
        externalModuleNames.push(moduleName);
      }

      if (FsUtil.exists(SdCliPathUtil.getNpmConfigFilePath(modulePath))) {
        const moduleNpmConfig = FsUtil.readJson(SdCliPathUtil.getNpmConfigFilePath(modulePath));
        for (const depModuleName of Object.keys(moduleNpmConfig.dependencies ?? {})) {
          fn(depModuleName);
        }
      }
    };
    for (const key of Object.keys(distNpmConfig.dependencies ?? {})) {
      fn(key);
    }

    distNpmConfig.dependencies = {};
    for (const externalModuleName of externalModuleNames) {
      distNpmConfig.dependencies[externalModuleName] = "*";
    }
    delete distNpmConfig.devDependencies;
    delete distNpmConfig.peerDependencies;

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
            `webpack-hot-middleware/client?path=${publicPath}__webpack_hmr&timeout=20000&reload=true&overlay=true`,
            mainPath
          ]
        },
        resolve: {
          extensions: [".ts", ".js", ".json"],
          alias: { "SD_APP_MODULE": path.resolve(srcPath, "AppModule") },
          ...this._platform.type === "browser" ? {
            aliasFields: ["browser"]
          } : {}
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
      target: this._platform.type === "windows" ? "electron-renderer" : "web",
      output: {
        publicPath,
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
            test: {
              or: [
                /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx?|pptx?|docx?|zip)$/,
                /assets/
              ]
            },
            loader: "file-loader",
            options: {
              name: `assets/[name].[ext]${watch ? "?[hash]" : ""}`,
              esModule: false
            }
          },
          ...this._platform.type === "windows" ? [
            {
              test: /\.js$/,
              loader: "shebang-loader"
            }
          ] : []
        ]
      },
      plugins: [
        new HtmlWebpackPlugin({
          template: indexPath,
          BASE_HREF: publicPath,
          PLATFORM: this._platform.type
        }),
        new webpack.DefinePlugin({
          "process.env": {
            SD_VERSION: JSON.stringify(this._npmConfig.version),
            SD_PLATFORM: JSON.stringify(this._platform.type),
            ...this._getConfigEnv()
          }
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
              fullTemplateTypeCheck: false,
              strictInjectionParameters: true,
              disableTypeScriptVersionCheck: true,
              skipMetadataEmit: true,
              rootDir: undefined,
              enableIvy: false
            }
          })
        ],
        ...(this._platform.type === "android" && !watch) ? [] : [
          new SdWebpackWriteFilePlugin([
            {
              path: path.resolve(SdCliPathUtil.getDistPath(this._rootPath), ".configs.json"),
              content: JSON.stringify(this._config.configs ?? {}, undefined, 2)
            },
            ...this._platform.type !== "windows" || watch ? [] : [
              {
                path: path.resolve(distPath, "package.json"),
                content: JSON.stringify(distNpmConfig, undefined, 2)
              }
            ]
          ])
        ],
        ...FsUtil.exists(path.resolve(srcPath, "favicon.ico")) ? [
          new CopyWebpackPlugin({
            patterns: [{
              from: path.resolve(srcPath, "favicon.ico"),
              to: path.resolve(distPath, "favicon.ico")
            }]
          })
        ] : [],
        ...this._platform.type === "android" ? [
          new CopyWebpackPlugin({
            patterns: [
              {
                context: path.resolve(this._rootPath, `.cordova/platforms/browser/platform_www`),
                from: "**/*",
                to: "cordova-browser"
              },
              {
                context: path.resolve(this._rootPath, `.cordova/platforms/android/platform_www`),
                from: "**/*",
                to: "cordova-android"
              }
            ]
          })
        ] : []
      ],
      /*...this._platform.type === "windows" ? {
        externals: [
          nodeExternals({
            allowlist: [
              /^webpack-hot-middleware\//
            ]
          })
        ]
      } : {}*/
      ...this._platform.type === "windows" ? {
        externals: [
          (context, request, callback): void => {
            if (externalModuleNames.includes(request)) {
              const req = request.replace(/^.*?\/node_modules\//, "") as string;
              if (req.startsWith("@")) {
                callback(null, `commonjs ${req.split("/", 2).join("/")}`);
                return;
              }

              callback(null, `commonjs ${req.split("/")[0]}`);
              return;
            }

            if (request === "fsevents") {
              callback(null, `commonjs ${request as string}`);
              return;
            }

            callback();
          }
        ]
      } : {}
    };
  }

  // TODO: 클라이언트(코도바)프로젝트에 있는 configs가 전부 server에도 들어가야함

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

  private _getConfigEnv(): Record<string, string> {
    if (!this._config.env) return {};

    const result: Record<string, string> = {};
    const keys = Object.keys(this._config.env);
    for (const key of keys) {
      result[key] = JSON.stringify(this._config.env[key]);
    }
    return result;
  }
}