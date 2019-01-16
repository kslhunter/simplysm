import * as fs from "fs-extra";
import * as path from "path";
import {Logger, optional, Wait} from "@simplysm/common";
import * as webpack from "webpack";
import * as ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import * as webpackMerge from "webpack-merge";
import * as WebpackDevServer from "webpack-dev-server";
import * as http from "http";
import * as url from "url";
import * as glob from "glob";
import {FileWatcher, spawnAsync} from "@simplysm/core";
import {SdProjectBuilderUtil} from "./SdProjectBuilderUtil";
import {SdWebpackLoggerPlugin} from "./SdWebpackLoggerPlugin";
import {ISdProjectConfig} from "./commons";

export class SdProjectBuilder {
  private config: ISdProjectConfig = {packages: {}};

  public async bootstrapAsync(): Promise<void> {
    await this._readConfig("production");

    for (const packageKey of Object.keys(this.config.packages)) {
      const tsconfig = await SdProjectBuilderUtil.readTsConfigAsync(packageKey);
      tsconfig.extends = "../../tsconfig.json";
      tsconfig.compilerOptions = tsconfig.compilerOptions || {};

      const tsOptions = tsconfig.compilerOptions;

      tsOptions.rootDir = "src";
      tsOptions.outDir = "dist";

      tsOptions.lib = ["es2017"];

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

      await SdProjectBuilderUtil.writeTsConfigAsync(packageKey, tsconfig);

      const logger = new Logger("@simplysm/cli", packageKey);
      await spawnAsync(["git", "add", SdProjectBuilderUtil.getTsConfigPath(packageKey)], {
        logger,
        onMessage: async (errMsg, logMsg) => {
          return logMsg !== undefined && logMsg.includes("Watching for file changes.");
        }
      });
    }
  }

  public async localUpdateAsync(): Promise<void> {
    await this._readConfig("development");

    if (!this.config.localUpdates) {
      new Logger("@simplysm/cli").warn("로컬 업데이트 설정이 없습니다.");
      return;
    }

    const promiseList: Promise<void>[] = [];
    const promiseList2: Promise<void>[] = [];
    for (const localUpdateKey of Object.keys(this.config.localUpdates)) {
      promiseList.push(new Promise<void>(async (resolve, reject) => {
        glob(SdProjectBuilderUtil.getProjectPath("node_modules", localUpdateKey), async (err, depPackageDirPaths) => {
          if (err) {
            reject(err);
            return;
          }

          for (const depPackageDirPath of depPackageDirPaths) {
            const subPackageName = depPackageDirPath.match(new RegExp(
              localUpdateKey.replace(/([\/.*])/g, item => item === "/" ? "\\/" : item === "." ? "\\." : item === "*" ? "(.*)" : item)
            ))![1];

            const sourceDirPath = SdProjectBuilderUtil.getProjectPath(this.config.localUpdates![localUpdateKey].replace(/\*/g, subPackageName));
            const targetDirPath = SdProjectBuilderUtil.getProjectPath("node_modules", localUpdateKey.replace(/\*/g, subPackageName));
            if (!await fs.pathExists(sourceDirPath)) {
              reject(new Error(`소스파일을 찾을 수 없습니다. ("${sourceDirPath}")`));
              return;
            }
            promiseList2.push(fs.copy(sourceDirPath, targetDirPath, {
              filter: src => !src.endsWith("package.json")
            }));
          }
        });
      }));
    }

    await Promise.all(promiseList);
    await Promise.all(promiseList2);

    new Logger("@simplysm/cli").log(`로컬 업데이트 완료`);
    throw new Error("미구현 (local-update)");
  }

  public async watchAsync(): Promise<void> {
    await this._readConfig("development");

    // TODO: 설정된 서버 호스트및 포트로 여러개의 서버 구성
    let server: http.Server;
    if (Object.values(this.config.packages).some(pkg => pkg.type !== "none" && pkg.type !== "dom" && pkg.type !== "node")) {
      server = http.createServer();

      await new Promise<void>((resolve, reject) => {
        const port = Object.values(this.config.packages).last(pkg => !!pkg.env)!.env!.SD_SERVER_PORT || 80;
        server.listen(port, (err: Error) => {
          if (err) {
            reject(err);
            return;
          }

          new Logger("@simplysm/cli").log(`개발 서버 시작됨 [포트: ${port}]`);
          resolve();
        });
      });
    }

    await this._parallelPackages(true, async packageKey => {
      await SdProjectBuilder._createTsConfigForBuild(packageKey);
      if (server && this.config.packages[packageKey].type !== "dom" && this.config.packages[packageKey].type !== "node") {
        await this._watchPackageAsync(packageKey, server);
      }
      else {
        await this._watchPackageAsync(packageKey);
      }
    });

    if (this.config.localUpdates) {
      throw new Error("미구현 (local-update)");
    }
  }

  public async buildAsync(): Promise<void> {
    await this._readConfig("production");
    await this._parallelPackages(true, async packageKey => {
      await SdProjectBuilder._createTsConfigForBuild(packageKey);
      await this._buildPackageAsync(packageKey);
    });
  }

  public async publishAsync(argv?: { build?: boolean }): Promise<void> {
    await this._readConfig("production");

    const logger = new Logger("@simplysm/cli");
    await new Promise<void>(async (resolve, reject) => {
      await spawnAsync(["git", "status"], {
        onMessage: async (errMsg, logMsg) => {
          if (logMsg && logMsg.includes("Changes")) {
            reject(new Error("커밋되지 않은 정보가 있습니다."));
          }
        }
      });
      resolve();
    });

    await spawnAsync(["npm", "version", "patch", "--git-tag-version", "false"], {logger});

    const projectNpmConfig = await SdProjectBuilderUtil.readProjectNpmConfig();

    await this._parallelPackages(!!optional(argv, o => o.build), async packageKey => {
      const packageLogger = new Logger("@simplysm/cli", packageKey);

      await SdProjectBuilder._createTsConfigForBuild(packageKey);
      await this._buildPackageAsync(packageKey);

      await spawnAsync(["yarn", "version", "--new-version", projectNpmConfig.version, "--no-git-tag-version"], {
        logger,
        cwd: SdProjectBuilderUtil.getPackagesPath(packageKey)
      });

      const allBuildPackageNpmNames: string[] = await this._getAllBuildPackageNpmNamesAsync();
      const npmConfig = await SdProjectBuilderUtil.readNpmConfigAsync(packageKey);
      for (const deps of [npmConfig.dependencies, npmConfig.devDependencies, npmConfig.peerDependencies]) {
        if (deps) {
          for (const depKey of Object.keys(deps)) {
            if (allBuildPackageNpmNames.includes(depKey)) {
              deps[depKey] = projectNpmConfig.version;
            }
          }
        }
      }
      await SdProjectBuilderUtil.writeNpmConfigAsync(packageKey, npmConfig);

      const packageConfig = this.config.packages[packageKey];

      if (packageConfig.publish) {
        if (packageConfig.publish.protocol === "npm") {
          await spawnAsync(["yarn", "publish", "--access", "public"], {
            cwd: SdProjectBuilderUtil.getPackagesPath(packageKey),
            logger: packageLogger
          });
        }
        else {
          // 결과 파일 업로드

          // 프로젝트 설정파일 업로드

          // 가상호스트 파일 재설정/업로드

          throw new Error("미구현 (publish)");
        }
      }
    });

    await spawnAsync(["git", "add", "."], {logger});
    await spawnAsync(["git", "commit", "-m", `"v${projectNpmConfig.version}"`], {logger});
    await spawnAsync(["git", "tag", "-a", `"v${projectNpmConfig.version}"`, "-m", `"v${projectNpmConfig.version}"`], {logger});
    // await spawnAsync(["git", "push", "origin", "--tags"], {logger});
  }

  private static async _createTsConfigForBuild(packageKey: string): Promise<void> {
    const tsconfig = await SdProjectBuilderUtil.readTsConfigAsync(packageKey);
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

    await SdProjectBuilderUtil.writeTsConfigAsync(packageKey, tsconfig, true);
  }

  private async _readConfig(env: "production" | "development"): Promise<void> {
    this.config = await SdProjectBuilderUtil.readConfigAsync(env);
  }

  private async _parallelPackages(byDep: boolean, cb: (packageKey: string) => Promise<void>): Promise<void> {
    const promises: Promise<void>[] = [];

    if (byDep) {
      const allBuildPackageNpmNames: string[] = await this._getAllBuildPackageNpmNamesAsync();

      const completedPackageNpmNames: string[] = [];
      for (const packageKey of Object.keys(this.config.packages)) {
        promises.push(new Promise<void>(async (resolve, reject) => {
          try {
            const packageNpmConfig = await SdProjectBuilderUtil.readNpmConfigAsync(packageKey);
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
    else {
      for (const packageKey of Object.keys(this.config.packages)) {
        promises.push(cb(packageKey));
      }
    }
  }

  private async _getAllBuildPackageNpmNamesAsync(): Promise<string[]> {
    const result: string[] = [];
    for (const packageKey of Object.keys(this.config.packages)) {
      const npmConfig = await SdProjectBuilderUtil.readNpmConfigAsync(packageKey);
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
        FileWatcher.watch(SdProjectBuilderUtil.getPackagesPath(packageKey, "src/**/*.ts"), ["add", "change"], async files => {
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

    // let timeout: NodeJS.Timeout;
    // await FileWatcher.watch(SdProjectBuilderUtil.getPackagesPath(packageKey, "**/*"), ["add", "change", "unlink"], async files => {
    //   if (files.length === 1 && files[0].filePath.endsWith("package.json")) {
    //     return;
    //   }
    //
    //   if (timeout) {
    //     clearTimeout(timeout);
    //   }
    //
    //   timeout = setTimeout(async () => {
    //     await spawnAsync(["npm", "version", "prerelease", "--git-tag-version", "false"], {logger});
    //     const projectNpmConfig = await SdProjectBuilderUtil.readProjectNpmConfig();
    //     for (const allPackagesItemKey of Object.keys(this.config.packages)) {
    //       const npmConfig = await SdProjectBuilderUtil.readNpmConfigAsync(allPackagesItemKey);
    //       npmConfig.version = projectNpmConfig.version;
    //       await SdProjectBuilderUtil.writeNpmConfigAsync(allPackagesItemKey, npmConfig);
    //
    //       const deps = Object.merge(npmConfig.dependencies, npmConfig.devDependencies);
    //       if (deps) {
    //         for (const depKey of Object.keys(deps).filter(item => item.startsWith(`@${projectNpmConfig.name}/`))) {
    //           deps[depKey] = npmConfig.version;
    //         }
    //       }
    //     }
    //   }, 1000);
    // });
  }

  private async _runTslintAsync(packageKey: string, filePath?: string): Promise<void> {
    const logger = new Logger("@simplysm/cli", packageKey);
    await spawnAsync([
      "tslint",
      "--project", SdProjectBuilderUtil.getTsConfigPath(packageKey, true),
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
      "-p", SdProjectBuilderUtil.getTsConfigPath(packageKey, true),
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

    if (packageConfig.type!.startsWith("cordova.") || packageConfig.type!.startsWith("electron.")) {
      throw new Error("미구현 (webpack-config)");
    }

    const projectNpmConfig = await SdProjectBuilderUtil.readProjectNpmConfig();

    const distPath = SdProjectBuilderUtil.getPackagesPath(packageKey, "dist");

    let webpackConfig: webpack.Configuration = {
      entry: path.resolve(__dirname, "../lib/main.js"),
      output: {
        path: distPath,
        publicPath: `/${projectNpmConfig.name}/${packageKey}/`,
        filename: "app.js",
        chunkFilename: "[name].chunk.js"
      },
      resolve: {
        extensions: [".ts", ".js", ".json"],
        alias: {
          SIMPLYSM_CLIENT_APP_MODULE: SdProjectBuilderUtil.getPackagesPath(packageKey, "src", "AppModule")
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
                  configFile: SdProjectBuilderUtil.getTsConfigPath(packageKey, true),
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
          SdProjectBuilderUtil.getPackagesPath(packageKey, "src"),
          {}
        ),
        new SdWebpackLoggerPlugin({logger: new Logger("@simplysm/cli", packageKey)}),
        new ForkTsCheckerWebpackPlugin({
          tsconfig: SdProjectBuilderUtil.getTsConfigPath(packageKey, true),
          tslint: SdProjectBuilderUtil.getTsLintPath(packageKey)
        }),
        new HtmlWebpackPlugin({
          template: path.resolve(__dirname, "../lib/index.ejs"),
          BASE_HREF: `/${projectNpmConfig.name}/${packageKey}/`
        }),
        new webpack.DefinePlugin({
          "process.env": SdProjectBuilder._envStringify({
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
