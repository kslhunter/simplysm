import * as path from "path";
import * as webpack from "webpack";
import * as glob from "glob";
import * as fs from "fs-extra";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import * as CopyWebpackPlugin from "copy-webpack-plugin";
import {Logger} from "@simplism/core";
import {IClientPackageConfig} from "../commons/IProjectConfig";
import {FriendlyLoggerPlugin} from "../plugins/FriendlyLoggerPlugin";
import {FtpStorage} from "@simplism/storage";
import * as webpackMerge from "webpack-merge";
import * as WebpackDevServer from "webpack-dev-server";
import {TsLintPlugin} from "../plugins/TsLintPlugin";
import {TsCheckAndDeclarationPlugin} from "../plugins/TsCheckAndDeclarationPlugin";
import {CliHelper} from "../commons/CliHelper";
import * as childProcess from "child_process";

export class ClientPackageBuilder {
  private readonly _logger = new Logger("@simplism/cli", `${this._config.name}:`);

  private get _packageName(): string {
    return this._config.name.includes(":") ? this._config.name.slice(0, this._config.name.indexOf(":")) : this._config.name;
  }

  public constructor(private readonly _config: IClientPackageConfig) {
  }

  public async buildAsync(): Promise<void> {
    CliHelper.rewritePackageVersion(this._packageName, false);

    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.json"));
    const distPath = this._packagePath((tsconfig.compilerOptions && tsconfig.compilerOptions.outDir) || "dist");
    fs.removeSync(distPath);

    await Promise.all((this._config.platforms || ["web"]).map(async platform => {
      if (this._config.cordova) {
        this._initializeCordova(platform);
      }

      const clientDistPath = this._config.cordova
        ? this._packagePath(".cordova", "www")
        : distPath;

      fs.removeSync(clientDistPath);

      await new Promise<void>((resolve, reject) => {
        const webpackConfig: webpack.Configuration = webpackMerge(this._getCommonConfig(platform), {
          mode: "production",
          devtool: "source-map",
          entry: this._loadersPath("client-main.js"),
          output: {
            path: clientDistPath,
            publicPath: this._config.cordova ? "/android_asset/www/" : `/${this._packageName}/`,
            filename: "app.js",
            chunkFilename: "[name].chunk.js"
          },
          optimization: {
            noEmitOnErrors: true,
            minimize: false
          },
          plugins: [
            new HtmlWebpackPlugin({
              template: this._loadersPath("index.ejs"),
              BASE_HREF: platform === "android" ? "/android_assets/www/" : `/${this._packageName}/`,
              PLATFORM: platform,
              HAS_FAVICON: fs.existsSync(this._packagePath("src/favicon.ico"))
            }),
            new webpack.DefinePlugin({
              "process.env": this._envStringify({
                VERSION: fs.readJsonSync(this._packagePath("package.json")).version,
                PLATFORM: platform,
                PACKAGE_NAME: this._packageName,
                ...this._config.env,
                ...this._config["env.production"]
              })
            })
          ]
        });

        webpack(webpackConfig, err => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });

      if (this._config.cordova) {
        this._logger.log(`CORDOVA 빌드`);

        const cordovaProjectPath = this._packagePath(".cordova");

        if (platform === "android" && this._config.cordova.sign) {
          fs.copySync(
            path.resolve(process.cwd(), ".sign", this._config.cordova.sign, "release-signing.jks"),
            path.resolve(cordovaProjectPath, "platforms", "android", "release-signing.jks")
          );
          fs.copySync(
            path.resolve(process.cwd(), ".sign", this._config.cordova.sign, "release-signing.properties"),
            path.resolve(cordovaProjectPath, "platforms", "android", "release-signing.properties")
          );
        }

        if (this._config.cordova.icon) {
          fs.copySync(this._config.cordova.icon, path.resolve(cordovaProjectPath, "res", "icon", "icon.png"));
        }

        const version = fs.readJsonSync(this._packagePath("package.json")).version;
        let configFileContent = fs.readFileSync(path.resolve(this._packagePath(), ".cordova", "config.xml"), "utf-8");
        configFileContent = configFileContent.replace(/<allow-navigation href="[^"]"\s?\/>/g, "");
        configFileContent = configFileContent.replace(/version="[^"]*"/g, `version="${version}"`);
        if (this._config.cordova.icon && !configFileContent.includes("<icon")) {
          configFileContent = configFileContent.replace("</widget>", "    <icon src=\"res/icon/icon.png\" />\r\n</widget>");
        }
        fs.writeFileSync(path.resolve(cordovaProjectPath, "config.xml"), configFileContent, "utf-8");

        const cordovaBinPath = this._projectPath("node_modules", ".bin", "cordova.cmd");
        childProcess.spawnSync(
          cordovaBinPath,
          [
            "build",
            platform,
            "--release"
          ],
          {
            shell: true,
            stdio: "inherit",
            cwd: cordovaProjectPath
          }
        );

        if (platform === "android") {
          const packageVersion = fs.readJsonSync(this._packagePath("package.json")).version;
          const apkFileName = this._config.cordova.sign ? "app-release.apk" : "app-release-unsigned.apk";
          const distApkFileName = `${this._config.name.replace(/ /g, "_")}${this._config.cordova.sign ? "" : "-unsigned"}-v${packageVersion}.apk`;

          fs.mkdirsSync(distPath);
          fs.copyFileSync(
            path.resolve(cordovaProjectPath, "platforms", "android", "app", "build", "outputs", "apk", "release", apkFileName),
            path.resolve(distPath, distApkFileName)
          );
        }
      }
    }));
  }

  public async watchAsync(): Promise<void> {
    if (!this._config.devServer) {
      throw new Error("'--watch'옵션을 사용하려면 설정파일에 'devServer'가 설정되어야 합니다.");
    }

    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.json"));
    fs.removeSync(this._packagePath((tsconfig.compilerOptions && (tsconfig.compilerOptions && tsconfig.compilerOptions.outDir)) || "dist"));

    await Promise.all((this._config.platforms || ["web"]).map(async platform => {
      if (this._config.cordova) {
        this._initializeCordova(platform);
      }

      await new Promise<void>((resolve, reject) => {
        const host = CliHelper.getCurrentIP([this._config.devServer!.host]);

        const webpackConfig: webpack.Configuration = webpackMerge(this._getCommonConfig(platform), {
          mode: "development",
          devtool: "cheap-module-source-map",
          entry: [
            `webpack-dev-server/client?http://${host}:${this._config.devServer!.port}/`,
            "webpack/hot/dev-server",
            this._loadersPath("client-main.js")
          ],
          output: {
            path: this._packagePath((tsconfig.compilerOptions && tsconfig.compilerOptions.outDir) || "dist"),
            publicPath: "/",
            filename: "app.js",
            chunkFilename: "[name].chunk.js"
          },
          plugins: [
            new webpack.HotModuleReplacementPlugin(),
            new HtmlWebpackPlugin({
              template: this._loadersPath("index.ejs"),
              BASE_HREF: "/",
              PLATFORM: platform,
              HAS_FAVICON: fs.existsSync(this._packagePath("src/favicon.ico"))
            }),
            new webpack.DefinePlugin({
              "process.env": this._envStringify({
                VERSION: fs.readJsonSync(this._packagePath("package.json")).version,
                PLATFORM: platform,
                PACKAGE_NAME: this._packageName,
                ...this._config.env,
                ...this._config["env.development"]
              })
            })
          ]
        });

        //-- CORDOVA
        if (this._config.cordova) {
          webpackConfig.plugins!.push(
            new CopyWebpackPlugin([{
              context: path.resolve(this._packagePath(), `.cordova/platforms/${platform}/platform_www`),
              from: "**/*"
            }])
          );
        }

        const compiler = webpack(webpackConfig);

        const server = new WebpackDevServer(compiler, {
          historyApiFallback: true,
          quiet: true,
          hot: true,
          disableHostCheck: true
        });
        server.listen(this._config.devServer!.port, err => {
          if (err) {
            reject(err);
            return;
          }

          this._logger.log(`개발 서버 시작됨: http://${host}:${this._config.devServer!.port}/`);
          resolve();
        });
      });
    }));
  }

  public async publishAsync(): Promise<void> {
    this._logger.log(`배포...`);

    if (!this._config.publish) {
      throw new Error("설정파일에 'publish'옵션이 설정되어야 합니다.");
    }

    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.json"));
    const distPath = this._packagePath((tsconfig.compilerOptions && tsconfig.compilerOptions.outDir) || "dist");

    // 배포
    const storage = new FtpStorage();
    await storage.connectAsync({
      host: this._config.publish.host,
      port: this._config.publish.port,
      user: this._config.publish.username,
      password: this._config.publish.password
    });

    // 루트 디렉토리 생성
    await storage.mkdirAsync(this._config.publish.path);

    // 로컬 파일 전송
    const filePaths = glob.sync(path.resolve(distPath, "**/*"));
    for (const filePath of filePaths) {
      const ftpFilePath = `${this._config.publish.path}/${path.relative(distPath, filePath).replace(/\\/g, "/")}`;
      if (fs.lstatSync(filePath).isDirectory()) {
        await storage.mkdirAsync(ftpFilePath);
      }
      else {
        if (/[\\/]/.test(ftpFilePath)) {
          let cumDir = "";
          for (const ftpDir of ftpFilePath.split(/[\\/]/).slice(0, -1)) {
            cumDir += ftpDir + "/";
            await storage.mkdirAsync(cumDir);
          }
        }

        await storage.putAsync(filePath, ftpFilePath);
      }
    }

    await storage.closeAsync();

    // 완료
    const packageJson = fs.readJsonSync(this._packagePath("package.json"));
    this._logger.info(`배포 완료: v${packageJson.version}`);
  }

  private _getCommonConfig(platform: string): webpack.Configuration {
    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.json"));
    const alias = {};
    if (tsconfig.compilerOptions.paths) {
      for (const key of Object.keys(tsconfig.compilerOptions.paths)) {
        alias[key] = this._packagePath(tsconfig.compilerOptions.paths[key][0].replace(/[\\/]src[\\/]([^\\/.]*)\.ts$/, ""));
      }
    }

    alias["SIMPLISM_CLIENT_APP_MODULE"] = this._packagePath("src/AppModule");

    return {
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
            exclude: /node_modules[\\/](?!@simplism)/
          },
          {
            test: /\.js$/,
            parser: {system: true}
          },
          {
            test: /\.ts$/,
            exclude: /node_modules/,
            loaders: [
              {
                loader: this._loadersPath("ts-transpile-loader.js"),
                options: {
                  logger: this._logger
                }
              },
              this._loadersPath("inline-sass-loader.js"),
              "angular-router-loader"
            ]
          },
          {
            test: /\.html$/,
            loader: "html-loader"
          },
          {
            test: /\.scss$/,
            loaders: [
              "style-loader",
              "css-loader",
              "sass-loader"
            ]
          },
          {
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf)$/,
            loader: "file-loader",
            options: {
              name: "assets/[name].[ext]?[hash]"
            }
          }
        ]
      },
      plugins: [
        new TsCheckAndDeclarationPlugin({
          tsConfigPath: this._packagePath("tsconfig.json"),
          packageName: this._packageName,
          logger: this._logger
        }),
        new TsLintPlugin({
          tsConfigPath: this._packagePath("tsconfig.json"),
          packageName: this._packageName,
          logger: this._logger
        }),
        new webpack.ContextReplacementPlugin(
          /angular[\\/]core[\\/]fesm5/,
          this._packagePath("src"),
          {}
        ),
        new FriendlyLoggerPlugin({
          packageName: this._packageName,
          logger: this._logger
        }),
        fs.existsSync(this._packagePath("src/favicon.ico"))
          ? new CopyWebpackPlugin([
            {from: this._packagePath("src/favicon.ico"), to: "favicon.ico"}
          ])
          : undefined
      ].filterExists(),
      optimization: {
        splitChunks: {
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/](?!@simplism)/,
              name: "vendor",
              chunks: "initial",
              enforce: true
            },
            simplism: {
              test: /[\\/]node_modules[\\/]@simplism/,
              name: "simplism",
              chunks: "initial",
              enforce: true
            }
          }
        }
      }
    };
  }

  private _initializeCordova(platform: string): void {
    if (!this._config.cordova) return;

    const cordovaProjectPath = this._packagePath(".cordova");
    const cordovaBinPath = this._projectPath("node_modules", ".bin", "cordova.cmd");

    if (!fs.existsSync(cordovaProjectPath)) {
      this._logger.log(`CORDOVA 프로젝트 생성`);

      childProcess.spawnSync(
        cordovaBinPath,
        [
          "create",
          `.cordova`,
          this._config.cordova.appId,
          `"${this._config.name}"`
        ],
        {
          shell: true,
          stdio: "inherit",
          cwd: this._packagePath()
        }
      );
    }

    fs.mkdirsSync(path.resolve(cordovaProjectPath, "www"));

    if (!fs.existsSync(path.resolve(cordovaProjectPath, "platforms", platform))) {
      this._logger.log(`CORDOVA 플랫폼 생성: ${platform}`);
      childProcess.spawnSync(
        cordovaBinPath,
        [
          "platform",
          "add",
          platform
        ],
        {
          shell: true,
          stdio: "inherit",
          cwd: cordovaProjectPath
        }
      );
    }


    const prevPlugins = Object.values(fs.readJsonSync(path.resolve(cordovaProjectPath, "plugins", "fetch.json"))).map(item => item["source"].id ? item["source"].id.replace(/@.*$/, "") : item["source"].url);

    // 에러 수정을 위한 플러그인 설치
    if (!prevPlugins.includes("cordova-android-support-gradle-release")) {
      this._logger.log(`CORDOVA 플러그인 설치: cordova-android-support-gradle-release`);
      childProcess.spawnSync(
        cordovaBinPath,
        [
          "plugin",
          "add",
          "cordova-android-support-gradle-release"
        ],
        {
          shell: true,
          stdio: "inherit",
          cwd: cordovaProjectPath
        }
      );
    }

    if (this._config.cordova!.plugins) {
      for (const plugin of this._config.cordova!.plugins!) {
        if (!prevPlugins.includes(plugin)) {
          this._logger.log(`CORDOVA 플러그인 설치  : ${plugin}`);
          childProcess.spawnSync(
            cordovaBinPath, [
              "plugin",
              "add",
              plugin
            ],
            {
              shell: true,
              stdio: "inherit",
              cwd: cordovaProjectPath
            }
          );
        }
      }
    }
  }

  private _envStringify(param: { [key: string]: string | undefined }): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    for (const key of Object.keys(param)) {
      result[key] = param[key] === undefined ? "undefined" : JSON.stringify(param[key]);
    }
    return result;
  }

  private _loadersPath(...args: string[]): string {
    return fs.existsSync(this._projectPath("node_modules/@simplism/cli/loaders"))
      ? this._projectPath("node_modules/@simplism/cli/loaders", ...args)
      : path.resolve(__dirname, "../../loaders", ...args);
  }

  private _projectPath(...args: string[]): string {
    const split = process.cwd().split(/[\\/]/);
    if (split[split.length - 1] === this._packageName) {
      return path.resolve(process.cwd(), "../..", ...args);
    }
    return path.resolve(process.cwd(), ...args);
  }

  private _packagePath(...args: string[]): string {
    return this._projectPath(`packages/${this._packageName}`, ...args);
  }
}
