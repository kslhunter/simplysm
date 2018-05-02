import * as path from "path";
import * as fs from "fs-extra";
import * as webpack from "webpack";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import * as CopyWebpackPlugin from "copy-webpack-plugin";
import * as webpackMerge from "webpack-merge";
import {helpers} from "../commons/helpers";
import {Logger} from "../../../sd-core/src";
import * as WebpackDevServer from "webpack-dev-server";
import * as glob from "glob";
import {FtpStorage} from "../../../sd-storage/src";

const HappyPack = require("happypack"); // tslint:disable-line:variable-name
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin"); // tslint:disable-line:variable-name

export class SdClientPackageBuilder {
  private readonly _logger: Logger;

  public constructor(private _packageName: string) {
    this._logger = new Logger("@simplism/sd-pack", `${this.constructor.name} :: ${this._packageName}`);
  }

  public async buildAsync(env: { [key: string]: string }): Promise<void> {
    this._logger.log("building...");

    fs.removeSync(this._distPath());

    const webpackConfig: webpack.Configuration = webpackMerge(this._getCommonConfig(env), {
      mode: "production",
      optimization: {
        noEmitOnErrors: true
      },
      entry: this._packagePath("src/main.ts")
    });

    return await new Promise<void>((resolve, reject) => {
      webpack(webpackConfig, (err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        this._writeStatsToConsole(stats);

        this._logger.info("build completed");
        resolve();
      });
    });
  }

  public async watchAsync(env: { [key: string]: string }): Promise<void> {
    this._logger.log("building...");

    fs.removeSync(this._distPath());

    const webpackConfig: webpack.Configuration = webpackMerge(this._getCommonConfig(env), {
      mode: "development",
      entry: [
        `webpack-dev-server/client?http://localhost:50081/`,
        `webpack/hot/dev-server`,
        this._packagePath("src/main.ts")
      ],
      plugins: [
        new webpack.HotModuleReplacementPlugin()
      ]
    });

    return await new Promise<void>((resolve, reject) => {
      const compiler = webpack(webpackConfig);

      const server = new WebpackDevServer(compiler, {
        hot: true,
        /*inline: true,*/
        quiet: true,
        contentBase: this._distPath(),
        host: "localhost",
        port: 50081
      });
      server.listen(50081, "localhost");
      compiler.hooks.watchRun.tap(this._packageName, () => {
        this._logger.log("building...");
      });
      compiler.hooks.failed.tap(this._packageName, (error) => {
        reject(error);
      });
      compiler.hooks.done.tap(this._packageName, (stats) => {
        this._writeStatsToConsole(stats);
        this._logger.info(`build completed: http://localhost:50081/`);
        resolve();
      });
    });
  }

  public async publishAsync(argv: { host: string; port: number; user: string; pass: string; root: string }): Promise<void> {
    this._logger.log(`publishing...`);

    //-- 배포
    const storage = new FtpStorage();
    await storage.connect({
      host: argv.host,
      port: argv.port,
      user: argv.user,
      password: argv.pass
    });

    //-- 루트 디렉토리 생성
    await storage.mkdir(argv.root);

    //-- 로컬 파일 전송
    const filePaths = glob.sync(this._distPath("**/*"));
    for (const filePath of filePaths) {
      const ftpFilePath = argv.root + "/" + path.relative(this._distPath(), filePath).replace(/\\/g, "/");
      if (fs.lstatSync(filePath).isDirectory()) {
        await storage.mkdir(ftpFilePath);
      }
      else {
        await
          storage.put(filePath, ftpFilePath);
      }
    }

    await storage.close();

    //-- 완료
    const rootPackageJson = fs.readJsonSync(this._rootPath("package.json"));
    this._logger.log(`publish complete: v${rootPackageJson.version}`);
  }

  private _getCommonConfig(env: { [key: string]: string }): webpack.Configuration {
    return {
      devtool: "inline-source-map",
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
      output: {
        path: this._distPath(),
        filename: "app.js"
      },
      resolve: {
        extensions: [".ts", ".js", ".json"]
      },
      module: {
        rules: [
          {
            enforce: "pre",
            test: /\.js$/,
            use: ["source-map-loader"],
            exclude: /node_modules[\\/](?!@simplism)/,
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
            test: /\.scss$/,
            loader: "happypack/loader?id=scss"
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
                configFile: this._packagePath("tsconfig.json")
              }
            },
            "angular2-template-loader"
          ]
        }),
        new HappyPack({
          id: "html",
          verbose: false,
          loaders: ["html-loader"]
        }),
        new HappyPack({
          id: "postcss",
          verbose: false,
          loaders: [
            /*"to-string-loader",*/
            {loader: "style-loader", options: {sourceMap: true}},
            {loader: "css-loader", options: {importLoaders: 1, sourceMap: true}},
            {loader: "postcss-loader", options: {sourceMap: true}}
          ]
        }),
        new HappyPack({
          id: "scss",
          verbose: false,
          loaders: [
            {loader: "style-loader", options: {sourceMap: true}},
            {loader: "css-loader", options: {sourceMap: true}},
            {loader: "sass-loader", options: {sourceMap: true}}
          ]
        }),
        new ForkTsCheckerWebpackPlugin({
          checkSyntacticErrors: true,
          tsconfig: this._packagePath("tsconfig.json"),
          tslint: this._packagePath("tslint.json"),
          silent: true
        }),
        new webpack.ContextReplacementPlugin(
          /angular[\\/]core[\\/](@angular|esm5|fesm5)/,
          this._packagePath("src"),
          {}
        ),
        new HtmlWebpackPlugin({
          template: this._packagePath("src/index.html")
        }),
        new CopyWebpackPlugin([
          {from: this._packagePath("public")}
        ]),
        new webpack.ProvidePlugin({
          $: "jquery",
          jQuery: "jquery",
          JQuery: "jquery"
        }),
        new webpack.DefinePlugin({
          "process.env": helpers.stringifyEnv({
            SD_PACK_VERSION: fs.readJsonSync(path.resolve(process.cwd(), "package.json")).version,
            ...env
          })
        })
      ],
      externals: [
        (context, request, callback) => {
          request = request.split("!").last();

          if (
            !path.resolve(context, request).startsWith(this._packagePath()) &&
            path.resolve(context, request).startsWith(this._packagePath(".."))
          ) {
            const className = path.basename(request, path.extname(request));
            return callback(undefined, `{${className}: {name: '${className}'}}`);
          }

          if (["fs", "fs-extra", "path", "socket.io"].includes(request)) {
            return callback(undefined, `"${request}"`);
          }

          callback(undefined, undefined);
        }
      ]
    };
  }

  private _writeStatsToConsole(stats: webpack.Stats): void {
    const info = stats!.toJson();

    if (stats!.hasWarnings()) {
      for (const warning of info.warnings) {
        this._logger.warn(warning);
      }
    }

    if (stats!.hasErrors()) {
      for (const error of info.errors) {
        this._logger.error(error);
      }
    }
  }

  private _rootPath(...args: string[]): string {
    return path.resolve(process.cwd(), ...args);
  }

  private _packagePath(...args: string[]): string {
    return path.resolve(process.cwd(), `packages/${this._packageName}`, ...args);
  }

  private _distPath(...args: string[]): string {
    return path.resolve(process.cwd(), `dist/www/${this._packageName}`, ...args);
  }
}