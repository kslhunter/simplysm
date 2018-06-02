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

export class ClientPackageBuilder {
  private readonly _logger = new Logger("@simplism/pack", `ClientPackageBuilder`, `${this._config.name}:`);

  public constructor(private readonly _config: IClientPackageConfig) {
  }

  public async buildAsync(): Promise<void> {
    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.app.json"));
    fs.removeSync(this._packagePath((tsconfig.compilerOptions && tsconfig.compilerOptions.outDir) || "dist"));

    await Promise.all((this._config.platforms || ["web"]).map(platform =>
      new Promise<void>((resolve, reject) => {
        const webpackConfig: webpack.Configuration = webpackMerge(this._getCommonConfig(platform), {
          mode: "production",
          devtool: "source-map",
          entry: this._packagePath("src/main.ts"),
          output: {
            path: this._packagePath((tsconfig.compilerOptions && tsconfig.compilerOptions.outDir) || "dist"),
            publicPath: `/${this._config.name}/`,
            filename: "app.js",
            chunkFilename: "[name].chunk.js"
          },
          optimization: {
            noEmitOnErrors: true,
            minimize: false
          },
          plugins: [
            new HtmlWebpackPlugin({
              template: this._packagePath("src/index.ejs"),
              BASE_HREF: `/${this._config.name}/`
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
      })
    ));
  }

  public async watchAsync(): Promise<void> {
    if (!this._config.devServer) {
      throw new Error("'--watch'옵션을 사용하려면 설정파일에 'devServer'가 설정되어야 합니다.");
    }

    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.app.json"));
    fs.removeSync(this._packagePath((tsconfig.compilerOptions && (tsconfig.compilerOptions && tsconfig.compilerOptions.outDir)) || "dist"));

    await Promise.all((this._config.platforms || ["web"]).map(platform =>
      new Promise<void>((resolve, reject) => {
        const webpackConfig: webpack.Configuration = webpackMerge(this._getCommonConfig(platform), {
          mode: "development",
          devtool: "cheap-module-source-map",
          entry: [
            `webpack-dev-server/client?http://${this._config.devServer!.host}:${this._config.devServer!.port}/`,
            "webpack/hot/dev-server",
            this._packagePath("src/main.ts")
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
              template: this._packagePath("src/index.ejs"),
              BASE_HREF: "/"
            })
          ]
        });

        const compiler = webpack(webpackConfig);

        const server = new WebpackDevServer(compiler, {
          historyApiFallback: true,
          quiet: true,
          hot: true
        });
        server.listen(this._config.devServer!.port, this._config.devServer!.host, err => {
          if (err) {
            reject(err);
            return;
          }

          this._logger.log(`개발 서버 시작됨: http://${this._config.devServer!.host}:${this._config.devServer!.port}/`);
          resolve();
        });
      })
    ));
  }

  public async publishAsync(): Promise<void> {
    this._logger.log(`배포...`);

    if (!this._config.publish) {
      throw new Error("설정파일에 'publish'옵션이 설정되어야 합니다.");
    }

    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.app.json"));
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
    const rootPackageJson = fs.readJsonSync(this._projectPath("package.json"));
    this._logger.info(`배포 완료: v${rootPackageJson.version}`);
  }

  public getTestConfig(platform: string): webpack.Configuration {
    return {
      mode: "development",
      devtool: "inline-source-map",
      resolve: {
        extensions: [".ts", ".js", ".json"]
      },
      module: {
        rules: [
          {
            enforce: "pre",
            test: /\.js$/,
            use: ["source-map-loader"],
            include: /node_modules[\\/]@simplism/,
            exclude: [/\.ngfactory\.js$/, /\.ngstyle\.js$/]
          },
          {
            test: /\.js$/,
            parser: {system: true}
          },
          {
            test: /\.ts$/,
            exclude: /node_modules/,
            loader: this._loadersPath("ts-transpile-loader.js"),
            options: {
              logger: this._logger
            }
          },
          {
            test: /\.html$/,
            loader: "html-loader"
          },
          {
            test: /\.scss$/,
            loader: "null-loader"
          },
          {
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf)$/,
            loader: "null-loader"
          }
        ]
      },
      plugins: [
        new webpack.ContextReplacementPlugin(
          /angular[\\/]core[\\/]fesm5/,
          this._packagePath("src"),
          {}
        ),
        new FriendlyLoggerPlugin({
          packageName: this._config.name,
          logger: this._logger
        }),
        new webpack.DefinePlugin({
          "process.env": this._envStringify({
            VERSION: fs.readJsonSync(this._projectPath("package.json")).version,
            PLATFORM: platform,
            NODE_ENV: "test",
            ...this._config.env
          })
        })
      ]
    };
  }

  private _getCommonConfig(platform: string): webpack.Configuration {
    return {
      resolve: {
        extensions: [".ts", ".js", ".json"]
      },
      module: {
        rules: [
          {
            enforce: "pre",
            test: /\.js$/,
            use: ["source-map-loader"],
            include: /node_modules[\\/]@simplism/,
            exclude: [/\.ngfactory\.js$/, /\.ngstyle\.js$/]
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
              this._loadersPath("inline-sass-loader.js")
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
          tsConfigPath: this._packagePath("tsconfig.app.json"),
          packageName: this._config.name,
          logger: this._logger
        }),
        new TsLintPlugin({
          tsConfigPath: this._packagePath("tsconfig.app.json"),
          packageName: this._config.name,
          logger: this._logger
        }),
        new webpack.ContextReplacementPlugin(
          /angular[\\/]core[\\/]fesm5/,
          this._packagePath("src"),
          {}
        ),
        new FriendlyLoggerPlugin({
          packageName: this._config.name,
          logger: this._logger
        }),
        new CopyWebpackPlugin([
          {from: this._packagePath("src/favicon.ico"), to: "favicon.ico"}
        ]),
        new webpack.DefinePlugin({
          "process.env": this._envStringify({
            VERSION: fs.readJsonSync(this._projectPath("package.json")).version,
            PLATFORM: platform,
            ...this._config.env
          })
        })
      ],
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

  private _envStringify(param: { [key: string]: string | undefined }): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    for (const key of Object.keys(param)) {
      result[key] = param[key] === undefined ? "undefined" : JSON.stringify(param[key]);
    }
    return result;
  }

  private _loadersPath(...args: string[]): string {
    return fs.existsSync(this._projectPath("node_modules/@simplism/pack/loaders"))
      ? this._projectPath("node_modules/@simplism/pack/loaders", ...args)
      : path.resolve(__dirname, "../../loaders", ...args);
  }

  private _projectPath(...args: string[]): string {
    const split = process.cwd().split(/[\\/]/);
    if (split[split.length - 1] === this._config.name) {
      return path.resolve(process.cwd(), "../..", ...args);
    }
    return path.resolve(process.cwd(), ...args);
  }

  private _packagePath(...args: string[]): string {
    return this._projectPath(`packages/${this._config.name}`, ...args);
  }
}
