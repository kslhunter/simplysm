import * as path from "path";
import * as webpack from "webpack";
import * as glob from "glob";
import * as fs from "fs-extra";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import * as CopyWebpackPlugin from "copy-webpack-plugin";
import * as ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import {Logger} from "@simplism/core";
import {IClientPackageConfig} from "../commons/IProjectConfig";
import {AngularCompilerPlugin} from "@ngtools/webpack";
import {TsFriendlyLoggerPlugin} from "../plugins/TsFriendlyLoggerPlugin";
import {FtpStorage} from "@simplism/storage";
import * as webpackMerge from "webpack-merge";
import * as WebpackDevServer from "webpack-dev-server";

export class ClientPackageBuilder {
  private readonly _logger = new Logger("@simplism/pack", `ClientPackageBuilder`);

  public constructor(private readonly _config: IClientPackageConfig) {
  }

  public async buildAsync(): Promise<void> {
    this._logger.log(`${this._config.name} building...`);

    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.json"));
    fs.removeSync(this._packagePath(tsconfig.compilerOptions.outDir || "dist"));

    await Promise.all((this._config.platforms || ["web"]).map(platform =>
      new Promise<void>((resolve, reject) => {
        const webpackConfig: webpack.Configuration = webpackMerge(this._getCommonConfig(platform), {
          mode: "production",
          devtool: "source-map",
          entry: this._packagePath("src/main.ts"),
          output: {
            path: this._packagePath(tsconfig.compilerOptions.outDir || "dist"),
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
    this._logger.log(`${this._config.name} watching...`);

    if (!this._config.devServer) {
      throw new Error("'--watch'옵션을 사용하려면 설정파일에 'devServer'가 설정되어야 합니다.");
    }

    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.json"));
    fs.removeSync(this._packagePath(tsconfig.compilerOptions.outDir || "dist"));

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
            path: this._packagePath(tsconfig.compilerOptions.outDir || "dist"),
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

          this._logger.log(`${this._config.name} dev server: http://${this._config.devServer!.host}:${this._config.devServer!.port}/`);
          resolve();
        });
      })
    ));
  }

  public async publishAsync(): Promise<void> {
    this._logger.log(`${this._config.name} publishing...`);

    if (!this._config.publish) {
      throw new Error("설정파일에 'publish'옵션이 설정되어야 합니다.");
    }

    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.json"));
    const distPath = this._packagePath(tsconfig.compilerOptions.outDir || "dist");

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
    this._logger.info(`${this._config.name} publish complete: v${rootPackageJson.version}`);
  }

  private _getCommonConfig(platform: string): webpack.Configuration {
    return {
      resolve: {
        extensions: [".ts", ".js"]
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
            test: /\.(js|ts)$/,
            loader: path.join(__dirname, "../../loaders/inline-sass-loader.js")
          },
          {
            test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
            exclude: /node_modules/,
            loader: "@ngtools/webpack"
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
        new AngularCompilerPlugin({
          tsConfigPath: this._packagePath("tsconfig.json"),
          skipCodeGeneration: true,
          sourceMap: true
        }),
        new ForkTsCheckerWebpackPlugin({
          tsconfig: this._packagePath("tsconfig.json"),
          tslint: this._packagePath("tslint.json"),
          silent: true,
          checkSyntacticErrors: true
        }),
        new TsFriendlyLoggerPlugin({
          error: message => this._logger.error(this._config.name + " " + message),
          warn: message => this._logger.warn(this._config.name + " " + message),
          info: message => this._logger.info(this._config.name + " " + message),
          log: message => this._logger.log(this._config.name + " " + message)
        }),
        new CopyWebpackPlugin([
          {from: this._packagePath("src/favicon.ico"), to: "favicon.ico"}
        ]),
        new webpack.DefinePlugin({
          "process.env": this._envStringify({
            TARGET: "browser",
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
      },
      externals: [
        (context, request, callback) => {
          const currRequest = request.split("!").last();
          const requestPath = path.resolve(context, currRequest);
          const requestRelativePath = path.relative(this._packagePath(), requestPath);

          if (requestRelativePath.split("..").length === 2) {
            const className = path.basename(currRequest, path.extname(currRequest));
            callback(undefined, `{${className}: {name: '${className}'}}`);
            return;
          }

          if (["fs", "fs-extra", "path", "socket.io"].includes(currRequest)) {
            callback(undefined, `"${currRequest}"`);
            return;
          }

          callback(undefined, undefined);
        }
      ]
    };
  }

  private _envStringify(param: { [key: string]: string | undefined }): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    for (const key of Object.keys(param)) {
      result[key] = param[key] === undefined ? "undefined" : JSON.stringify(param[key]);
    }
    return result;
  }

  private _projectPath(...args: string[]): string {
    return path.resolve(process.cwd(), ...args);
  }

  private _packagePath(...args: string[]): string {
    return path.resolve(process.cwd(), `packages/${this._config.name}`, ...args);
  }
}
