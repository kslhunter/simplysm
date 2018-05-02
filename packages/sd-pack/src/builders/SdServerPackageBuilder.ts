import {Logger} from "../../../sd-core/src";
import * as path from "path";
import * as fs from "fs-extra";
import * as webpack from "webpack";
import * as webpackMerge from "webpack-merge";
import * as child_process from "child_process";
import * as glob from "glob";
import {helpers} from "../commons/helpers";
import {FtpStorage} from "../../../sd-storage/src";

const HappyPack = require("happypack"); // tslint:disable-line:variable-name
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin"); // tslint:disable-line:variable-name

export class SdServerPackageBuilder {
  private readonly _logger: Logger;

  public constructor(private _packageName: string) {
    this._logger = new Logger("@simplism/sd-pack", `${new.target.name} :: ${this._packageName}`);
  }

  public async buildAsync(env: { [key: string]: string }): Promise<void> {
    this._logger.log("building...");

    for (const dir of fs.readdirSync(this._distPath())) {
      if (dir !== "www") {
        fs.removeSync(this._distPath(dir));
      }
    }

    const webpackConfig: webpack.Configuration = webpackMerge(this._getCommonConfig(env), {
      mode: "production",
      optimization: {
        noEmitOnErrors: true
      }
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

    for (const dir of fs.readdirSync(this._distPath())) {
      if (dir !== "www") {
        fs.removeSync(this._distPath(dir));
      }
    }

    const webpackConfig: webpack.Configuration = webpackMerge(this._getCommonConfig(env), {
      mode: "development"
    });
    return await new Promise<void>((resolve, reject) => {
      const compiler = webpack(webpackConfig);

      let worker: child_process.ChildProcess;
      compiler.watch({}, (err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        this._writeStatsToConsole(stats);

        if (worker) worker.kill();
        worker = child_process.fork(this._distPath("app.js"), [], {
          cwd: this._distPath()
        });

        this._logger.info("build completed");
        resolve();
      });

      compiler.hooks.watchRun.tap(this._packageName, () => {
        this._logger.log("building...");
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
    const filePaths = glob.sync(this._distPath("**/*"), {ignore: ["www"]});
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

    //-- pm2.json 전송
    await storage.put(
      Buffer.from(
        JSON.stringify({
          apps: [{
            name: argv.root,
            script: "./app.js",
            watch: [
              "app.js",
              "pm2.json"
            ]
          }]
        }, undefined, 2)
      ),
      `/${argv.root}/pm2.json`
    );

    await storage.close();

    //-- 완료
    const rootPackageJson = fs.readJsonSync(this._rootPath("package.json"));
    this._logger.log(`publish complete: v${rootPackageJson.version}`);
  }

  private _getCommonConfig(env: { [key: string]: string }): webpack.Configuration {
    return {
      target: "node",
      devtool: "inline-source-map",
      entry: this._packagePath("src/main.ts"),
      output: {
        path: this._distPath(),
        filename: "app.js"
      },
      resolve: {
        extensions: [".ts", ".js", ".json", ".node"]
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
                configFile: this._packagePath("tsconfig.json")
              }
            }
          ]
        }),
        new HappyPack({
          id: "node",
          verbose: false,
          loaders: [
            {
              loader: path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/node-loader.js")
            }
          ]
        }),
        new ForkTsCheckerWebpackPlugin({
          checkSyntacticErrors: true,
          tsconfig: this._packagePath("tsconfig.json"),
          tslint: this._packagePath("tslint.json"),
          silent: true
        }),
        new webpack.DefinePlugin({
          "process.env": helpers.stringifyEnv({
            SD_PACK_VERSION: fs.readJsonSync(path.resolve(process.cwd(), "package.json")).version,
            ...env
          })
        }),

        new webpack.NormalModuleReplacementPlugin(
          /^socket.io$/,
          path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/socket.io.js")
        ),

        new webpack.NormalModuleReplacementPlugin(
          /^bindings$/,
          path.resolve(process.cwd(), "node_modules/@simplism/sd-pack/assets/bindings.js")
        )
      ],
      externals: ["uws"]
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
    return path.resolve(process.cwd(), `dist`, ...args);
  }
}