import {Logger} from "@simplism/sd-core";
import * as CopyWebpackPlugin from "copy-webpack-plugin";
import * as fs from "fs-extra";
import * as glob from "glob";
import * as HappyPack from "happypack";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import * as path from "path";
import * as TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import * as ts from "typescript";
import * as webpack from "webpack";
import * as WebpackDevServer from "webpack-dev-server";
import * as webpackMerge from "webpack-merge";
import {FtpStorage} from "@simplism/sd-storage";
import {ISdPackClientConfig} from "../commons/configs";
import {helpers} from "../commons/helpers";
import {ISdPackageBuilder} from "../commons/ISdPackageBuilder";
import {SdAsyncTypeCheckPlugin} from "../plugins/SdAsyncTypeCheckPlugin";

export class SdClientPackageBuilder implements ISdPackageBuilder {
  private readonly _logger: Logger;

  public constructor(private readonly _config: ISdPackClientConfig) {
    this._logger = new Logger("@simplism/sd-pack", this._config.name);

    this._config.platforms = this._config.platforms || ["web"];
  }

  private get _tsconfig(): ts.ParsedCommandLine {
    const tsconfigPath = this._contextPath("tsconfig.json");
    const tsconfigJson = fs.readJsonSync(tsconfigPath);
    return ts.parseJsonConfigFileContent(tsconfigJson, ts.sys, this._contextPath());
  }

  public async buildAsync(): Promise<void> {
    this._logger.log("building...");

    const tsconfig = this._tsconfig;
    if (!tsconfig.options.outDir) {
      throw new Error("'tsconfig.json' 에 'outDir'이 반드시 설정되어야 합니다.");
    }
    fs.removeSync(tsconfig.options.outDir);

    await Promise.all(this._config.platforms!.map(platform =>
      new Promise<void>((resolve, reject) => {
        const webpackConfig: webpack.Configuration = webpackMerge(this._getCommonConfig(platform), {
          mode: "production",
          optimization: {
            noEmitOnErrors: true,
            minimize: false
          },
          entry: {
            app: this._contextPath("src/main.ts"),
            ...this._config.platforms!.includes("desktop") ? {electron: this._contextPath("src/electron.ts")} : {}
          }
        });

        webpack(webpackConfig, (err, stats) => {
          if (err) {
            reject(err);
            return;
          }

          this._writeStatsToConsole(stats);

          this._logger.info("build complete");
          resolve();
        });
      })
    ));
  }

  public async watchAsync(): Promise<void> {
    this._logger.log("watching...");

    if (!this._config.devServer) {
      throw new Error("'--watch'옵션을 사용하려면 설정파일에 'devServer'가 설정되어야 합니다.");
    }

    const tsconfig = this._tsconfig;
    if (!tsconfig.options.outDir) {
      throw new Error("'tsconfig.json' 에 'outDir'이 반드시 설정되어야 합니다.");
    }

    fs.removeSync(tsconfig.options.outDir);

    await Promise.all(this._config.platforms!.map(platform =>
      new Promise<void>((resolve, reject) => {
        const webpackConfig: webpack.Configuration = webpackMerge(this._getCommonConfig(platform), {
          mode: "development",
          entry: [
            `webpack-dev-server/client?http://${this._config.devServer!.host}:${this._config.devServer!.port}/`,
            "webpack/hot/dev-server",
            this._contextPath("src/main.ts")
          ],
          plugins: [
            new webpack.HotModuleReplacementPlugin()
          ]
        });

        const compiler = webpack(webpackConfig);

        const server = new WebpackDevServer(compiler, {
          hot: true,
          quiet: true,
          contentBase: tsconfig.options.outDir,
          host: this._config.devServer!.host,
          port: this._config.devServer!.port
        });
        server.listen(50081, "localhost");
        compiler.hooks.watchRun.tap(this._config.name, () => {
          this._logger.log("building...");
        });

        compiler.hooks.failed.tap(this._config.name, error => {
          reject(error);
        });
        compiler.hooks.done.tap(this._config.name, stats => {
          this._writeStatsToConsole(stats);
          this._logger.info(`build complete: http://${this._config.devServer!.host}:${this._config.devServer!.port}/`);
          resolve();
        });
      })
    ));
  }

  public async publishAsync(): Promise<void> {
    this._logger.log("publishing...");

    if (!this._config.publish) {
      throw new Error("설정파일에 'publish'옵션이 설정되어야 합니다.");
    }

    const distPath = this._tsconfig.options.outDir;
    if (!distPath) {
      throw new Error("'tsconfig.json' 에 'outDir'이 반드시 설정되어야 합니다.");
    }

    // 배포
    const storage = new FtpStorage();
    await storage.connect({
      host: this._config.publish.host,
      port: this._config.publish.port,
      user: this._config.publish.user,
      password: this._config.publish.pass
    });

    // 루트 디렉토리 생성
    await storage.mkdir(this._config.publish.root);

    // 로컬 파일 전송
    const filePaths = glob.sync(path.resolve(distPath, "**/*"));
    for (const filePath of filePaths) {
      const ftpFilePath = `${this._config.publish.root}/${path.relative(distPath, filePath).replace(/\\/g, "/")}`;
      if (fs.lstatSync(filePath).isDirectory()) {
        await storage.mkdir(ftpFilePath);
      }
      else {
        await
          storage.put(filePath, ftpFilePath);
      }
    }

    await storage.close();

    // 완료
    const rootPackageJson = fs.readJsonSync(this._projectPath("package.json"));
    this._logger.log(`publish complete: v${rootPackageJson.version}`);
  }

  private _getCommonConfig(platform: string): webpack.Configuration {
    const tsconfig = this._tsconfig;

    return {
      target: platform === "desktop" ? "electron-renderer" : undefined,
      devtool: "inline-source-map",
      optimization: {
        splitChunks: {
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendor",
              chunks: "all"
            }
          }
        }
      },
      output: {
        path: tsconfig.options.outDir,
        filename: "[name].js",
        chunkFilename: "[name].chunk.js"
      },
      resolve: {
        extensions: [".ts", ".js", ".json"],
        plugins: [
          new TsconfigPathsPlugin({configFile: this._contextPath("tsconfig.json")})
        ]
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
            test: /.js$/,
            parser: {
              system: true
            }
          } as any,
          {
            test: /\.ts$/,
            exclude: /node_modules/,
            loader: "happypack/loader?id=ts"
          },
          {
            test: /\.html$/,
            loader: "happypack/loader?id=html"
          },
          {
            test: /\.p?css$/,
            loader: "happypack/loader?id=postcss"
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
        new HappyPack({
          id: "ts",
          verbose: false,
          threads: 2,
          loaders: [
            {
              loader: "ts-loader",
              options: {
                silent: true,
                happyPackMode: true,
                configFile: this._contextPath("tsconfig.json")
              }
            },
            "angular2-template-loader"
          ]
        }),
        new SdAsyncTypeCheckPlugin({packageName: this._config.name, logger: this._logger}),
        new HappyPack({
          id: "html",
          verbose: false,
          loaders: ["html-loader"]
        }),
        new HappyPack({
          id: "postcss",
          verbose: false,
          loaders: [
            {loader: "style-loader", options: {sourceMap: true}},
            {loader: "css-loader", options: {importLoaders: 1, sourceMap: true}},
            {loader: "postcss-loader", options: {sourceMap: true}}
          ]
        }),
        new CopyWebpackPlugin([
          {from: this._contextPath("public")}
        ]),
        new webpack.ContextReplacementPlugin(
          /angular[\\/]core[\\/]fesm5/,
          this._contextPath("src"),
          {}
        ),
        new HtmlWebpackPlugin({
          template: this._contextPath("src/index.html")
        }),
        new webpack.DefinePlugin({
          "process.env": helpers.stringifyEnv({
            SD_PACK_VERSION: fs.readJsonSync(this._projectPath("package.json")).version,
            SD_PACK_PLATFORM: platform,
            ...this._config.env
          })
        })
      ],
      externals: [
        (context, request, callback) => {
          const currRequest = request.split("!").last();
          const requestPath = path.resolve(context, currRequest);
          const requestRelativePath = path.relative(this._contextPath(), requestPath);

          if (requestRelativePath.split("..").length === 2) {
            const className = path.basename(currRequest, path.extname(currRequest));
            callback(undefined, `{${className}: {name: '${className}'}}`);
            return;
          }

          if (platform === "web" && ["fs-extra", "path"].includes(currRequest)) {
            callback(undefined, `"${currRequest}"`);
            return;
          }

          callback(undefined, undefined);
        }
      ]
    };
  }

  private _writeStatsToConsole(stats: webpack.Stats): void {
    const info = stats.toJson();

    if (stats.hasWarnings()) {
      for (const warning of info.warnings) {
        this._logger.warn(warning);
      }
    }

    if (stats.hasErrors()) {
      for (const error of info.errors) {
        this._logger.error(error);
      }
    }
  }

  private _contextPath(...args: string[]): string {
    return path.resolve(process.cwd(), "packages", this._config.name, ...args);
  }

  private _projectPath(...args: string[]): string {
    return path.resolve(process.cwd(), ...args);
  }
}
