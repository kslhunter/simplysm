import * as fs from "fs-extra";
import * as path from "path";
import {Logger, Wait} from "@simplysm/common";
import * as webpack from "webpack";
import {ISdConfigFileJson, ISdPackageBuilderConfig} from "./commons";
import * as ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import * as webpackMerge from "webpack-merge";
import * as WebpackDevServer from "webpack-dev-server";
import * as http from "http";
import * as url from "url";
import {FileWatcher, spawnAsync} from "@simplysm/core";
import {SdPackageUtil} from "./SdPackageUtil";
import {SdWebpackLoggerPlugin} from "./SdWebpackLoggerPlugin";

export class SdPackageBuilder {
  private config: ISdPackageBuilderConfig = {packages: {}};

  public async bootstrapAsync(): Promise<void> {
    await this._readConfig("production");

    for (const packageKey of Object.keys(this.config.packages)) {
      const tsconfig = await SdPackageUtil.readTsConfigAsync(packageKey);
      tsconfig.extends = "../../tsconfig.json";
      tsconfig.compilerOptions = tsconfig.compilerOptions || {};

      const tsOptions = tsconfig.compilerOptions;

      tsOptions.rootDir = "src";
      tsOptions.outDir = "dist";

      tsOptions.lib = tsOptions.lib || ["es2017"];

      const packageConfig = this.config.packages[packageKey];
      if (packageConfig.type !== "node") {
        tsOptions.lib.push("dom");
      }

      const npmConfig = await fs.readJson(path.resolve(process.cwd(), "packages", packageKey, "package.json"));
      tsOptions.declaration = !!npmConfig.types;

      tsOptions.baseUrl = ".";
      tsOptions.paths = tsOptions.paths || {};

      const deps = Object.merge(npmConfig.dependencies, npmConfig.devDependencies);
      if (deps) {
        const projectNpmConfig = await fs.readJson(path.resolve(process.cwd(), "package.json"));
        for (const depKey of Object.keys(deps).filter(item => item.startsWith(`@${projectNpmConfig.name}/`))) {
          if (!Object.keys(tsOptions.paths).includes(depKey)) {
            tsOptions.paths[depKey] = [
              `../${depKey.substr(`@${projectNpmConfig.name}/`.length)}/src/index.ts`
            ];
          }
        }
      }

      await SdPackageUtil.writeTsConfigAsync(packageKey, tsconfig);

      const logger = new Logger("@simplysm/cli", packageKey);
      await spawnAsync(["git", "add", SdPackageUtil.getTsConfigPath(packageKey)], {
        logger,
        onMessage: async (errMsg, logMsg) => {
          return logMsg !== undefined && logMsg.includes("Watching for file changes.");
        }
      });
    }
  }

  public async buildAsync(): Promise<void> {
    await this._readConfig("production");
    await this._parallelPackagesByDep(async packageKey => {
      await SdPackageBuilder._createTsConfigForBuild(packageKey);
      await this._buildPackageAsync(packageKey);
    });
  }

  public async watchAsync(): Promise<void> {
    await this._readConfig("development");

    const server = Object.values(this.config.packages).some(item => item.type !== "dom" && item.type !== "node")
      ? http.createServer()
      : undefined;

    await this._parallelPackagesByDep(async packageKey => {
      await SdPackageBuilder._createTsConfigForBuild(packageKey);
      if (server && this.config.packages[packageKey].type !== "dom" && this.config.packages[packageKey].type !== "node") {
        await this._watchPackageAsync(packageKey, server);
      }
      else {
        await this._watchPackageAsync(packageKey);
      }
    });

    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.listen(this.config.port || 80, (err: Error) => {
          if (err) {
            reject(err);
            return;
          }

          new Logger("@simplysm/cli").log(`개발 서버 시작됨 [포트: ${this.config.port || 80}]`);
          resolve();
        });
      });
    }
  }

  public async publishAsync(): Promise<void> {
    await this._readConfig("production");

    const logger = new Logger("@simplysm/cli");
    await new Promise<void>(async (resolve, reject) => {
      await spawnAsync(["git", "status"], {
        onMessage: async (errMsg, logMsg) => {
          if (logMsg && logMsg.includes("no changes added to commit")) {
            reject(new Error("커밋되지 않은 정보가 있습니다."));
          }
        }
      });
      resolve();
    });

    await spawnAsync(["yarn", "version", "--patch", "--no-commit-hooks"], {logger});

    const projectNpmConfig = await SdPackageUtil.readProjectNpmConfig();

    const promiseList: Promise<void>[] = [];
    for (const packageKey of Object.keys(this.config.packages)) {
      promiseList.push(new Promise<void>(async (resolve, reject) => {
        const packageLogger = new Logger("@simplysm/cli", packageKey);

        await spawnAsync(["yarn", "version", "--new-version", projectNpmConfig.version, "--no-git-tag-version"], {
          logger,
          cwd: SdPackageUtil.getPackagesPath(packageKey)
        });

        const allBuildPackageNpmNames: string[] = await this._getAllBuildPackageNpmNamesAsync();
        const npmConfig = await SdPackageUtil.readNpmConfigAsync(packageKey);
        for (const deps of [npmConfig.dependencies, npmConfig.devDependencies, npmConfig.peerDependencies]) {
          if (deps) {
            for (const depKey of Object.keys(deps)) {
              if (allBuildPackageNpmNames.includes(depKey)) {
                deps[depKey] = projectNpmConfig.version;
              }
            }
          }
        }
        await SdPackageUtil.writeNpmConfig(packageKey, npmConfig);

        const packageConfig = this.config.packages[packageKey];

        if (packageConfig.publish) {
          if (packageConfig.publish === "npm") {
            await spawnAsync(["yarn", "publish", "--access", "public"], {
              cwd: SdPackageUtil.getPackagesPath(packageKey),
              logger: packageLogger
            });
          }
          else {
            reject(new Error("미구현"));
            return;
          }
        }

        resolve();
      }));
    }

    await Promise.all(promiseList);

    await spawnAsync(["git", "add", "."], {logger});
    await spawnAsync(["git", "commit", "-m", `"v${projectNpmConfig.version}"`], {logger});
    await spawnAsync(["git", "push", "origin", "--tags"], {logger});
  }

  private static async _createTsConfigForBuild(packageKey: string): Promise<void> {
    const tsconfig = await SdPackageUtil.readTsConfigAsync(packageKey);
    const tsOptions = tsconfig.compilerOptions;

    if (tsOptions && tsOptions.paths) {
      for (const tsPathKey of Object.keys(tsOptions.paths)) {
        const result = [];
        for (const tsPathValue of tsOptions.paths[tsPathKey]) {
          result.push(tsPathValue.replace(/\/src\/index\.ts$/, ""));
        }
        tsOptions.paths[tsPathKey] = result;
      }
    }

    await SdPackageUtil.writeTsConfigAsync(packageKey, tsconfig, true);
  }

  private async _readConfig(env: "production" | "development"): Promise<void> {
    const orgConfig: ISdConfigFileJson = await SdPackageUtil.readConfigAsync();
    this.config = SdPackageUtil.createBuilderConfig(orgConfig.common, orgConfig[env], orgConfig.publish);
  }

  private async _parallelPackagesByDep(cb: (packageKey: string) => Promise<void>): Promise<void> {
    const promises: Promise<void>[] = [];

    const allBuildPackageNpmNames: string[] = await this._getAllBuildPackageNpmNamesAsync();

    const completedPackageNpmNames: string[] = [];
    for (const packageKey of Object.keys(this.config.packages)) {
      promises.push(new Promise<void>(async (resolve, reject) => {
        try {
          const packageNpmConfig = await SdPackageUtil.readNpmConfigAsync(packageKey);
          const packageNpmName = packageNpmConfig.name;
          const packageNpmDeps = Object.merge(packageNpmConfig.dependencies, packageNpmConfig.devDependencies);
          if (packageNpmDeps) {
            for (const packageNpmDepName of Object.keys(packageNpmDeps)) {
              if (allBuildPackageNpmNames.includes(packageNpmDepName)) {
                await Wait.true(() => completedPackageNpmNames.includes(packageNpmDepName));
              }
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

  private async _getAllBuildPackageNpmNamesAsync(): Promise<string[]> {
    const result: string[] = [];
    for (const packageKey of Object.keys(this.config.packages)) {
      const npmConfig = await SdPackageUtil.readNpmConfigAsync(packageKey);
      result.push(npmConfig.name);
    }
    return result;
  }

  private async _buildPackageAsync(packageKey: string): Promise<void> {
    const logger = new Logger("@simplysm/cli", packageKey);
    logger.log("빌드를 시작합니다...");

    const packageConfig = this.config.packages[packageKey];

    if (packageConfig.type === "node" || packageConfig.type === "dom") {
      await Promise.all([
        this._runTslintAsync(packageKey),
        this._runTscAsync(packageKey, false)
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

    logger.log("빌드가 완료되었습니다.");
  }

  private async _watchPackageAsync(packageKey: string, server?: http.Server): Promise<void> {
    const logger = new Logger("@simplysm/cli", packageKey);
    const packageConfig = this.config.packages[packageKey];

    if (packageConfig.type === "node" || packageConfig.type === "dom") {
      logger.log(`코드검사를 시작합니다...`);

      await Promise.all([
        this._runTslintAsync(packageKey),
        FileWatcher.watch(SdPackageUtil.getPackagesPath(packageKey, "src/**/*.ts"), ["add", "change"], async files => {
          for (const filePath of files.map(item => item.filePath)) {
            logger.log(`변경이 감지되었습니다. 코드검사를 시작합니다...`);
            await this._runTslintAsync(packageKey, filePath);
          }
        }),
        this._runTscAsync(packageKey, true)
      ]);
    }
    else if (server) {
      const webpackConfig: webpack.Configuration = await this._getWebpackConfigAsync(packageKey, "development");

      const compiler = webpack(webpackConfig);

      const wds = new WebpackDevServer(compiler, {});
      server.on("request", (req, res) => {
        const urlObj = url.parse(req.url!, true, false);
        const urlPath = decodeURI(urlObj.pathname!);

        if (req.method === "GET" && urlPath.startsWith(webpackConfig.output!.publicPath!.slice(0, -1))) {
          req.url = (req.url as string).replace(webpackConfig.output!.publicPath!.slice(1, -1), "");
          wds["app"](req, res);
        }
      });
    }
  }

  private async _runTslintAsync(packageKey: string, filePath?: string): Promise<void> {
    const logger = new Logger("@simplysm/cli", packageKey);
    await spawnAsync([
      "tslint",
      "--project", SdPackageUtil.getTsConfigPath(packageKey, true),
      "-t", "msbuild",
      ...(filePath ? [filePath] : [])
    ], {
      onMessage: async (errMsg, logMsg) => {
        if (logMsg) {
          const isWarning = /: warning/.test(logMsg);
          if (isWarning) {
            logger.warn(`코드검사중 경고가 발생했습니다.`, logMsg);
            return false;
          }

          logger.log(logMsg);
        }
        else if (errMsg) {
          logger.error(errMsg);
        }
      }
    });

    logger.log(`코드검사가 완료되었습니다.`);
  }

  private async _runTscAsync(packageKey: string, watch: boolean): Promise<void> {
    const logger = new Logger("@simplysm/cli", packageKey);

    await spawnAsync([
      "tsc",
      "-p", SdPackageUtil.getTsConfigPath(packageKey, true),
      ...(watch ? ["--watch"] : [])
    ], {
      onMessage: async (errMsg, logMsg) => {
        if (logMsg) {
          const isWatchStarted = logMsg.trim().endsWith("Starting compilation in watch mode...");
          if (isWatchStarted) {
            logger.log("빌드를 시작합니다...");
            return false;
          }

          const isWatched = logMsg.trim().endsWith("Starting incremental compilation...");
          if (isWatched) {
            logger.log(`변경이 감지되었습니다. 빌드를 시작합니다...`);
            return false;
          }

          const isError = /: error TS[0-9]*:/.test(logMsg);
          if (isError) {
            logger.error(`빌드중 에러가 발생했습니다.`, logMsg);
            return false;
          }

          const isWatchCompleted = logMsg.trim().endsWith("Watching for file changes.");
          if (isWatchCompleted) {
            logger.log("빌드가 완료되었습니다.");
            return true;
          }

          logger.log(logMsg);
        }
        else if (errMsg) {
          logger.error(errMsg);
        }
      }
    });
  }

  private async _getWebpackConfigAsync(packageKey: string, mode: "production" | "development"): Promise<webpack.Configuration> {
    const packageConfig = this.config.packages[packageKey];

    if (packageConfig.type.startsWith("cordova.") || packageConfig.type.startsWith("electron.")) {
      throw new Error("미구현");
    }

    const projectNpmConfig = await SdPackageUtil.readProjectNpmConfig();

    const distPath = SdPackageUtil.getPackagesPath(packageKey, "dist");

    let webpackConfig: webpack.Configuration = {
      entry: path.resolve(__dirname, "../lib/main.js"),
      output: {
        path: distPath,
        publicPath: `/${projectNpmConfig.name}/${packageConfig.name}/`,
        filename: "app.js",
        chunkFilename: "[name].chunk.js"
      },
      resolve: {
        extensions: [".ts", ".js", ".json"],
        alias: {
          SIMPLYSM_CLIENT_APP_MODULE: SdPackageUtil.getPackagesPath(packageKey, "src", "AppModule")
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
                  configFile: SdPackageUtil.getTsConfigPath(packageKey, true),
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
          SdPackageUtil.getPackagesPath(packageKey, "src"),
          {}
        ),
        new SdWebpackLoggerPlugin({logger: new Logger("@simplysm/cli", packageKey)}),
        new ForkTsCheckerWebpackPlugin({
          tsconfig: SdPackageUtil.getTsConfigPath(packageKey, true),
          tslint: SdPackageUtil.getTsLintPath(packageKey)
        }),
        new HtmlWebpackPlugin({
          template: path.resolve(__dirname, "../lib/index.ejs"),
          BASE_HREF: `/${projectNpmConfig.name}/${packageConfig.name}/`
        }),
        new webpack.DefinePlugin({
          "process.env": SdPackageBuilder._envStringify({
            VERSION: projectNpmConfig.version
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
