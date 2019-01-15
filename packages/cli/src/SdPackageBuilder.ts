import {objectMerge} from "./utils/objectMerge";
import * as fs from "fs-extra";
import * as path from "path";
import {Wait} from "@simplysm/common";
import {spawnAsync} from "./utils/spawnAsync";
import * as webpack from "webpack";
import {ISdConfigFileJson, ISdPackageBuilderConfig} from "./commons";
import * as ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import {FileWatcher} from "./utils/FileWatcher";
import * as webpackMerge from "webpack-merge";
import * as WebpackDevServer from "webpack-dev-server";
import * as http from "http";
import * as url from "url";

export class SdPackageBuilder {
  private readonly config: ISdPackageBuilderConfig = {packages: {}};

  public async buildAsync(): Promise<void> {
    await this._readConfigAsync("production");
    await this._parallelPackagesByDep(async packageKey => {
      await this._buildPackageAsync(packageKey);
    });
  }

  public async startAsync(): Promise<void> {
    await this._readConfigAsync("development");

    const server = http.createServer();
    await this._parallelPackagesByDep(async packageKey => {
      await this._watchPackageAsync(packageKey, server);
    });

    await new Promise<void>((resolve, reject) => {
      server.listen(this.config.port || 80, (err: Error) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`개발 서버 시작됨 [포트: ${this.config.port || 80}]`);
        resolve();
      });
    });
  }

  private async _readConfigAsync(env: "production" | "development"): Promise<void> {
    const orgConfig: ISdConfigFileJson = await fs.readJson(path.resolve(process.cwd(), "simplysm.json"));
    if (orgConfig[env]) {
      this.config.packages = objectMerge(orgConfig.common.packages, orgConfig[env].packages);
      this.config.port = orgConfig[env].port || orgConfig.common.port;
      this.config.virtualHosts = objectMerge(orgConfig.common.virtualHosts, orgConfig[env].virtualHosts);
      this.config.options = objectMerge(orgConfig.common.options, orgConfig[env].options);
    }
    else {
      this.config.packages = orgConfig.common.packages!;
      this.config.port = orgConfig.common.port;
      this.config.virtualHosts = orgConfig.common.virtualHosts;
      this.config.options = orgConfig.common.options;
    }
  }

  private async _parallelPackagesByDep(cb: (packageKey: string) => Promise<void>): Promise<void> {
    const promises: Promise<void>[] = [];

    const allPackageNames: string[] = [];
    for (const packageKey of Object.keys(this.config.packages)) {
      const packageConfig = await fs.readJson(path.resolve(process.cwd(), "packages", packageKey, "package.json"));
      allPackageNames.push(packageConfig.name);
    }

    const completedPackageNpmNames: string[] = [];
    for (const packageKey of Object.keys(this.config.packages)) {
      promises.push(new Promise<void>(async (resolve, reject) => {
        try {
          const packageNpmConfig = await fs.readJson(path.resolve(process.cwd(), "packages", packageKey, "package.json"));
          const packageNpmName = packageNpmConfig.name;
          const packageDeps = objectMerge(packageNpmConfig.dependencies, packageNpmConfig.devDependencies);
          for (const packageDepKey of Object.keys(packageDeps)) {
            if (allPackageNames.includes(packageDepKey)) {
              await Wait.true(() => completedPackageNpmNames.includes(packageDepKey));
            }
          }

          await cb(packageKey);

          completedPackageNpmNames.push(packageNpmName);
          resolve();
        }
        catch (err) {
          reject(err);
        }
      }));
    }

    await Promise.all(promises);
  }

  private async _watchPackageAsync(packageKey: string, server: http.Server): Promise<void> {
    const packagePath = path.resolve(process.cwd(), "packages", packageKey);
    const packageConfig = this.config.packages[packageKey];

    if (packageConfig.platform === "library") {
      await Promise.all([
        spawnAsync(["tslint", "--project", "tsconfig.json"], {cwd: packagePath}),
        FileWatcher.watch(path.resolve(packagePath, "src/**/*.ts"), ["add", "change"], async files => {
          for (const filePath of files.map(item => item.filePath)) {
            await spawnAsync(["tslint", "--project", "tsconfig.json", filePath], {cwd: packagePath});
          }
        }),
        spawnAsync(["tsc", "--watch"], {cwd: packagePath}, log => log.includes("Watching for file changes."))
      ]);
    }
    else {
      const webpackConfig: webpack.Configuration = await this._getWebpackConfigAsync(packageKey, "development");

      const compiler = webpack(webpackConfig);

      const wds = new WebpackDevServer(compiler, {});
      server.on("request", (req, res) => {
        const urlObj = url.parse(req.url!, true, false);
        const urlPath = decodeURI(urlObj.pathname!);

        console.log(req.method, urlPath, webpackConfig.output!.publicPath!.slice(0, -1));
        if (req.method === "GET" && urlPath.startsWith(webpackConfig.output!.publicPath!.slice(0, -1))) {
          req.url = req.url.replace(webpackConfig.output!.publicPath!.slice(1, -1), "");
          wds["app"](req, res);
        }
      });
    }
  }

  private async _buildPackageAsync(packageKey: string): Promise<void> {
    const packagePath = path.resolve(process.cwd(), "packages", packageKey);
    const packageConfig = this.config.packages[packageKey];

    if (packageConfig.platform === "library") {
      await Promise.all([
        spawnAsync(["tslint", "--project", "tsconfig.json"], {cwd: packagePath}),
        spawnAsync(["tsc"], {cwd: packagePath})
      ]);
    }
    else {
      await new Promise<void>(async (resolve, reject) => {
        const webpackConfig: webpack.Configuration = await this._getWebpackConfigAsync(packageKey, "production");

        webpack(webpackConfig, err => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }
  }

  private async _getWebpackConfigAsync(packageKey: string, mode: "production" | "development"): Promise<webpack.Configuration> {
    const packagePath = path.resolve(process.cwd(), "packages", packageKey);
    const packageConfig = this.config.packages[packageKey];

    if (packageConfig.platform.startsWith("cordova.") || packageConfig.platform.startsWith("electron.")) {
      throw new Error("미구현");
    }

    const rootNpmConfig = await fs.readJson(path.resolve(process.cwd(), "package.json"));
    const npmConfig = await fs.readJson(path.resolve(packagePath, "package.json"));

    const distPath = path.resolve(packagePath, "dist");

    let webpackConfig: webpack.Configuration = {
      entry: path.resolve(__dirname, "../lib/main.js"),
      output: {
        path: distPath,
        publicPath: `/${rootNpmConfig.name}/${packageConfig.name}/`,
        filename: "app.js",
        chunkFilename: "[name].chunk.js"
      },
      resolve: {
        extensions: [".ts", ".js", ".json"],
        alias: {
          SIMPLYSM_CLIENT_APP_MODULE: path.resolve(packagePath, "src", "AppModule")
        }
      },
      module: {
        rules: [
          {
            enforce: "pre",
            test: /\.js$/,
            use: ["source-map-loader"]
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
                loader: "ts-loader",
                options: {
                  transpileOnly: true
                }
              },
              "angular-router-loader"
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
        new webpack.ContextReplacementPlugin(
          /angular[\\/]core[\\/]fesm5/,
          path.resolve(packagePath, "src"),
          {}
        ),
        new ForkTsCheckerWebpackPlugin({
          tslint: true
        }),
        new HtmlWebpackPlugin({
          template: path.resolve(__dirname, "../lib/index.ejs"),
          BASE_HREF: `/${rootNpmConfig.name}/${packageConfig.name}/`
        }),
        new webpack.DefinePlugin({
          "process.env": SdPackageBuilder._envStringify({
            VERSION: npmConfig.version
          })
        })
      ]
    };

    if (mode === "production") {
      webpackConfig = webpackMerge(webpackConfig, {
        mode: "production",
        devtool: "source-map"
      });
    }
    else {
      webpackConfig = webpackMerge(webpackConfig, {
        mode: "development",
        devtool: "cheap-module-source-map"
      });
    }

    return webpackConfig;
  }

  private static _envStringify(param: { [key: string]: string | undefined }): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    for (const key of Object.keys(param)) {
      result[key] = param[key] === undefined ? "undefined" : JSON.stringify(param[key]);
    }
    return result;
  }
}
