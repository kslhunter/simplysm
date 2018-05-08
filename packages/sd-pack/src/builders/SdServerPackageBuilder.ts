import {JsonConvert, Logger} from "@simplism/sd-core";
import * as child_process from "child_process";
import * as fs from "fs-extra";
import * as glob from "glob";
import * as HappyPack from "happypack";
import * as path from "path";
import * as TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import * as ts from "typescript";
import * as webpack from "webpack";
import * as webpackMerge from "webpack-merge";
import {FtpStorage} from "@simplism/sd-storage";
import {ISdPackServerConfig} from "../commons/configs";
import {helpers} from "../commons/helpers";
import {ISdPackageBuilder} from "../commons/ISdPackageBuilder";
import {SdAsyncTypeCheckPlugin} from "../plugins/SdAsyncTypeCheckPlugin";

export class SdServerPackageBuilder implements ISdPackageBuilder {
  private readonly _logger: Logger;

  public constructor(private readonly _config: ISdPackServerConfig) {
    this._logger = new Logger("@simplism/sd-pack", this._config.name);
  }

  private get _tsconfig(): ts.ParsedCommandLine {
    return helpers.getTsconfig(this._contextPath());
  }

  public async buildAsync(): Promise<void> {
    this._logger.log("building...");

    const tsconfig = this._tsconfig;
    if (!tsconfig.options.outDir) {
      throw new Error("'tsconfig.json' 에 'outDir'이 반드시 설정되어야 합니다.");
    }
    fs.removeSync(tsconfig.options.outDir);

    const webpackConfig: webpack.Configuration = webpackMerge(this._getCommonConfig(), {
      mode: "production",
      optimization: {
        noEmitOnErrors: true,
        minimize: false
      }
    });

    return new Promise<void>((resolve, reject) => {
      webpack(webpackConfig, (err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        this._writeStatsToConsole(stats);

        this._logger.info("build complete");
        resolve();
      });
    });
  }

  public async watchAsync(): Promise<void> {
    this._logger.log("watching...");

    const tsconfig = this._tsconfig;
    if (!tsconfig.options.outDir) {
      throw new Error("'tsconfig.json' 에 'outDir'이 반드시 설정되어야 합니다.");
    }
    fs.removeSync(tsconfig.options.outDir);

    await new Promise<void>((resolve, reject) => {
      const webpackConfig: webpack.Configuration = webpackMerge(this._getCommonConfig(), {
        mode: "development"
      });

      const compiler = webpack(webpackConfig);

      let worker: child_process.ChildProcess;
      compiler.watch({}, (err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        this._writeStatsToConsole(stats);

        if (worker) {
          worker.kill();
        }
        worker = child_process.fork(this._contextPath("app.js"), [], {
          cwd: this._contextPath()
        });

        this._logger.info("build complete");
        resolve();
      });

      compiler.hooks.watchRun.tap(this._config.name, () => {
        this._logger.log("building...");
      });
    });
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

    // pm2.json 전송
    await storage.put(
      Buffer.from(
        JsonConvert.stringify(
          {
            apps: [{
              name: this._config.publish.root,
              script: "./app.js",
              watch: [
                "app.js",
                "pm2.json"
              ]
            }]
          },
          {space: 2}
        )
      ),
      `/${this._config.publish.root}/pm2.json`
    );

    await storage.close();

    // 완료
    const rootPackageJson = fs.readJsonSync(this._projectPath("package.json"));
    this._logger.log(`publish complete: v${rootPackageJson.version}`);
  }

  private _getCommonConfig(): webpack.Configuration {
    const tsconfig = this._tsconfig;

    return {
      target: "node",
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
      entry: this._contextPath("src/main.ts"),
      output: {
        path: path.resolve(tsconfig.options.outDir!),
        filename: "[name].js",
        chunkFilename: "[name].chunk.js"
      },
      resolve: {
        extensions: [".ts", ".js", ".json", ".node"],
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
            test: /\.ts$/,
            exclude: /node_modules/,
            loader: "happypack/loader?id=ts"
          },
          {
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf)$/,
            loader: "file-loader",
            options: {
              name: "assets/[name].[ext]?[hash]"
            }
          },
          {
            test: /\.node$/,
            loader: "happypack/loader?id=node"
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
            }
          ]
        }),
        new SdAsyncTypeCheckPlugin({packageName: this._config.name, logger: this._logger}),
        new HappyPack({
          id: "node",
          verbose: false,
          loaders: [
            {loader: path.resolve(__dirname, "../../assets/node-loader.js")}
          ]
        }),
        new webpack.DefinePlugin({
          "process.env": helpers.stringifyEnv({
            SD_PACK_VERSION: fs.readJsonSync(path.resolve(process.cwd(), "package.json")).version,
            ...this._config.env
          })
        }),

        new webpack.NormalModuleReplacementPlugin(// tslint:disable-line:deprecation
          /^socket.io$/,
          path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/socket.io.js")
        ),

        new webpack.NormalModuleReplacementPlugin(// tslint:disable-line:deprecation
          /^bindings$/,
          path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/bindings.js")
        )
      ],
      externals: ["uws"]
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
