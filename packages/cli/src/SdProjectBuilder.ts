import * as fs from "fs-extra";
import * as path from "path";
import {Logger, optional, Wait} from "@simplysm/common";
import * as webpack from "webpack";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import * as webpackMerge from "webpack-merge";
import * as glob from "glob";
import {FileWatcher, spawnAsync} from "@simplysm/core";
import {SdProjectBuilderUtil} from "./SdProjectBuilderUtil";
import {SdWebpackLoggerPlugin} from "./SdWebpackLoggerPlugin";
import {ISdProjectConfig, ITsConfig} from "./commons";
import * as child_process from "child_process";
import * as WebpackHotMiddleware from "webpack-hot-middleware";
import * as WebpackDevMiddleware from "webpack-dev-middleware";
import {RequestHandler} from "express";
import {SdWebSocketServer} from "@simplysm/ws-server";
import * as os from "os";

export class SdProjectBuilder {
  private readonly _serverMap = new Map<number, SdWebSocketServer>();
  private readonly _expressServerMiddlewareMap = new Map<number, RequestHandler[]>();
  private config: ISdProjectConfig = {packages: {}};

  public async bootstrapAsync(): Promise<void> {
    await this._readConfig("production", undefined);

    for (const packageKey of Object.keys(this.config.packages)) {
      const tsconfig: ITsConfig = {}; //await SdProjectBuilderUtil.readTsConfig(packageKey);
      tsconfig.extends = "../../tsconfig.json";
      tsconfig.compilerOptions = {};
      const tsOptions = tsconfig.compilerOptions;

      tsOptions.rootDir = "src";
      tsOptions.outDir = "dist";

      tsOptions.lib = ["es2017"];

      const packageConfig = this.config.packages[packageKey];
      if (packageConfig.type !== "node") {
        tsOptions.lib.push("dom");
      }

      const npmConfig = SdProjectBuilderUtil.readNpmConfig(packageKey);
      tsOptions.declaration = !!npmConfig.types;

      tsOptions.baseUrl = ".";
      tsOptions.paths = {};

      const deps = {
        ...npmConfig.dependencies,
        ...npmConfig.devDependencies,
        ...npmConfig.peerDependencies
      };

      if (deps) {
        if (Object.keys(deps).includes("tslint")) {
          tsOptions.paths["tslint"] = [
            "../../node_modules/tslint"
          ];
        }

        const projectNpmConfig = SdProjectBuilderUtil.readProjectNpmConfig();

        const generatePaths = (deps1: { [key: string]: string }) => {
          for (const depKey of Object.keys(deps1).filter(item => item.startsWith(`@${projectNpmConfig.name}/`))) {
            const depPackageKey = depKey.substr(`@${projectNpmConfig.name}/`.length);

            if (!Object.keys(tsOptions.paths!).includes(depKey)) {
              tsOptions.paths![depKey] = [
                `../${depPackageKey}/src/index.ts`
              ];
            }

            const depPackageNpmConfig = SdProjectBuilderUtil.readNpmConfig(depPackageKey);
            generatePaths({
              ...depPackageNpmConfig.dependencies,
              ...depPackageNpmConfig.devDependencies,
              ...depPackageNpmConfig.peerDependencies
            });
          }
        };
        generatePaths(deps);
      }

      SdProjectBuilderUtil.writeTsConfig(packageKey, tsconfig);

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
    await this._readConfig("development", undefined);

    if (!this.config.localUpdates) {
      new Logger("@simplysm/cli").warn("로컬 업데이트 설정이 없습니다.");
      return;
    }

    await Promise.all(Object.keys(this.config.localUpdates).map(async localUpdateKey => {
      await new Promise<void>(async (resolve, reject) => {
        glob(SdProjectBuilderUtil.getProjectPath("node_modules", localUpdateKey), (err, depPackageDirPaths) => {
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
            if (!fs.pathExistsSync(sourceDirPath)) {
              reject(new Error(`소스파일을 찾을 수 없습니다. ("${sourceDirPath}")`));
              return;
            }
            fs.copySync(sourceDirPath, targetDirPath);
          }

          resolve();
        });
      });
    }));

    new Logger("@simplysm/cli").log(`로컬 업데이트 완료`);
  }

  public async watchAsync(argv?: { packages?: string }): Promise<void> {
    if (this.config.localUpdates) {
      const promiseList: Promise<void>[] = [];
      const promiseList2: Promise<void>[] = [];

      for (const localUpdateKey of Object.keys(this.config.localUpdates)) {
        promiseList.push(new Promise<void>((resolve, reject) => {
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
              promiseList2.push(
                FileWatcher.watch(path.resolve(sourceDirPath, "**", "*"), ["add", "change", "unlink"], changes => {
                  for (const change of changes) {
                    const targetFilePath = path.resolve(targetDirPath, path.relative(sourceDirPath, change.filePath));
                    if (change.type === "unlink") {
                      fs.removeSync(targetFilePath);
                    }
                    else {
                      fs.copySync(change.filePath, targetFilePath);
                    }
                  }
                })
              );
            }
            resolve();
          });
        }));
      }

      await Promise.all(promiseList);
      await Promise.all(promiseList2);
    }

    const packageKeys = optional(argv, o => o.packages!.split(",").map(item => item.trim()));
    await this._readConfig("development", packageKeys);

    await this._parallelPackages(true, async packageKey => {
      const packageConfig = this.config.packages[packageKey];
      if (packageConfig.type === "none") {
        return;
      }

      await SdProjectBuilder._createTsConfigForBuild(packageKey);
      if (packageConfig.type !== "dom" && packageConfig.type !== "node") {
        const port = optional(packageConfig.server, o => o.port) || 80;
        await this._watchPackageAsync(packageKey, port);
      }
      else {
        await this._watchPackageAsync(packageKey);
      }
    });
  }

  public async buildAsync(argv?: { packages?: string }): Promise<void> {
    const packageKeys = optional(argv, o => o.packages!.split(",").map(item => item.trim()));
    await this._readConfig("production", packageKeys);

    await this._parallelPackages(true, async packageKey => {
      await SdProjectBuilder._createTsConfigForBuild(packageKey);
      await this._buildPackageAsync(packageKey);
    });
  }

  public async publishAsync(argv?: { build?: boolean; packages?: string }): Promise<void> {
    const packageKeys = optional(argv, o => o.packages!.split(",").map(item => item.trim()));
    await this._readConfig("production", packageKeys);

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

    if (optional(argv, o => o.build)) {
      await this._parallelPackages(true, async packageKey => {
        await SdProjectBuilder._createTsConfigForBuild(packageKey);
        await this._buildPackageAsync(packageKey);
      });
    }

    await spawnAsync(["npm", "version", "patch", "--git-tag-version", "false"], {logger});

    const projectNpmConfig = SdProjectBuilderUtil.readProjectNpmConfig();

    await this._parallelPackages(false, async packageKey => {
      const packageLogger = new Logger("@simplysm/cli", packageKey);

      const packageConfig = this.config.packages[packageKey];

      if (packageConfig.publish) {
        packageLogger.log(`배포를 시작합니다. - v${projectNpmConfig.version}`);

        await spawnAsync(["yarn", "version", "--new-version", projectNpmConfig.version, "--no-git-tag-version"], {
          cwd: SdProjectBuilderUtil.getPackagesPath(packageKey)
        });

        const allBuildPackageNpmNames: string[] = await this._getAllBuildPackageNpmNamesAsync();

        const projectDeps = {
          ...projectNpmConfig.dependencies,
          ...projectNpmConfig.devDependencies,
          ...projectNpmConfig.peerDependencies
        };

        const npmConfig = SdProjectBuilderUtil.readNpmConfig(packageKey);
        for (const deps of [npmConfig.dependencies, npmConfig.devDependencies, npmConfig.peerDependencies]) {
          if (deps) {
            for (const depKey of Object.keys(deps)) {
              if (allBuildPackageNpmNames.includes(depKey)) {
                deps[depKey] = projectNpmConfig.version;
              }

              if (Object.keys(projectDeps).includes(depKey)) {
                deps[depKey] = projectDeps[depKey];
              }
            }
          }
        }
        SdProjectBuilderUtil.writeNpmConfig(packageKey, npmConfig);

        if (packageConfig.publish.protocol === "npm") {
          let message = "";
          try {
            await spawnAsync(["yarn", "publish", "--access", "public"], {
              cwd: SdProjectBuilderUtil.getPackagesPath(packageKey),
              onMessage: async (errMsg, logMsg) => {
                if (errMsg) {
                  message += errMsg + "\r\n";
                }
                if (logMsg) {
                  message += logMsg + "\r\n";
                }
              }
            });
          }
          catch (err) {
            if (message.includes("You cannot publish over the previously published versions")) {
              packageLogger.warn(`해당 버전 이 이미 배포되어있습니다. - v${projectNpmConfig.version}`);
              return;
            }
            else if (message) {
              packageLogger.error(`배포중 에러가 발생하였습니다.`, message.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "").trim());
            }
            else {
              packageLogger.error(`배포중 에러가 발생하였습니다.`, err);
            }
          }
        }
        else {
          // 결과 파일 업로드

          // 프로젝트 설정파일 업로드

          // 가상호스트 파일 재설정/업로드

          throw new Error("미구현 (publish)");
        }

        packageLogger.log(`배포가 완료되었습니다. - v${projectNpmConfig.version}`);
      }
    });


    await spawnAsync(["git", "add", "."], {logger});
    await spawnAsync(["git", "commit", "-m", `"v${projectNpmConfig.version}"`], {logger});
    await spawnAsync(["git", "tag", "-a", `"v${projectNpmConfig.version}"`, "-m", `"v${projectNpmConfig.version}"`], {logger});
    // await spawnAsync(["git", "push", "origin", "--tags"], {logger});
  }

  private static async _createTsConfigForBuild(packageKey: string): Promise<void> {
    const tsconfig = SdProjectBuilderUtil.readTsConfig(packageKey);
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

    SdProjectBuilderUtil.writeTsConfig(packageKey, tsconfig, true);
  }

  private async _readConfig(env: "production" | "development", packageKeys: string[] | undefined): Promise<void> {
    this.config = SdProjectBuilderUtil.readConfig(env, packageKeys);
  }

  private async _parallelPackages(byDep: boolean, cb: (packageKey: string) => Promise<void>): Promise<void> {
    const promises: Promise<void>[] = [];

    if (byDep) {
      const allBuildPackageNpmNames: string[] = await this._getAllBuildPackageNpmNamesAsync();

      const completedPackageNpmNames: string[] = [];
      for (const packageKey of Object.keys(this.config.packages)) {
        promises.push(new Promise<void>(async (resolve, reject) => {
          try {
            const packageNpmConfig = SdProjectBuilderUtil.readNpmConfig(packageKey);
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
    }
    else {
      for (const packageKey of Object.keys(this.config.packages)) {
        promises.push(cb(packageKey));
      }
    }

    await Promise.all(promises);
  }

  private async _getAllBuildPackageNpmNamesAsync(): Promise<string[]> {
    const result: string[] = [];
    for (const packageKey of Object.keys(this.config.packages)) {
      const npmConfig = SdProjectBuilderUtil.readNpmConfig(packageKey);
      result.push(npmConfig.name);
    }
    return result;
  }

  private async _buildPackageAsync(packageKey: string): Promise<void> {
    await this._generatePackageIndexFileAsync(packageKey);

    fs.removeSync(SdProjectBuilderUtil.getPackagesPath(packageKey, "dist"));

    const packageConfig = this.config.packages[packageKey];

    if (packageConfig.type === "node" || packageConfig.type === "dom") {
      await Promise.all([
        this._runTsLintWorkerAsync(packageKey),
        this._runTsCheckAndDeclarationWorkerAsync(packageKey),
        this._runTsBuildWorkerAsync(packageKey)
      ]);
    }
    else {
      await Promise.all([
        this._runTsLintWorkerAsync(packageKey),
        this._runTsCheckAndDeclarationWorkerAsync(packageKey),
        new Promise<void>(async (resolve, reject) => {
          const webpackConfig: webpack.Configuration = await this._getWebpackConfigAsync(packageKey, "production");

          webpack(webpackConfig, err => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        })
      ]);
    }
  }

  private async _watchPackageAsync(packageKey: string, serverPort?: number): Promise<void> {
    await this._generatePackageIndexFileAsync(packageKey, true);

    fs.removeSync(SdProjectBuilderUtil.getPackagesPath(packageKey, "dist"));

    const packageConfig = this.config.packages[packageKey];

    if (packageConfig.type === "none") {
    }
    else if (!serverPort) {
      await Promise.all([
        this._runTsLintWorkerAsync(packageKey, true),
        this._runTsCheckAndDeclarationWorkerAsync(packageKey, true),
        this._runTsBuildWorkerAsync(packageKey, true)
      ]);
    }
    else {
      const logger = new Logger("@simplysm/cli", packageKey);

      const result = await Promise.all([
        this._runTsLintWorkerAsync(packageKey, true),
        this._runTsCheckAndDeclarationWorkerAsync(packageKey, true),
        new Promise<void>(async (resolve, reject) => {
          try {
            if (!this._serverMap.has(serverPort)) {
              let server = new SdWebSocketServer();
              await server.listenAsync(serverPort);
              this._serverMap.set(serverPort, server);

              await FileWatcher.watch(
                path.resolve(process.cwd(), "node_modules", "@simplysm", "ws-server", "dist", "**/*.js"),
                ["add", "change", "unlink"],
                async () => {
                  logger.log(`개발서버를 다시 시작합니다.`);
                  await server.closeAsync();

                  require("decache")("@simplysm/ws-server"); //tslint:disable-line:no-require-imports
                  const newSdWebSocketServer = require("@simplysm/ws-server").SdWebSocketServer; //tslint:disable-line:no-require-imports
                  server = new newSdWebSocketServer();
                  await server.listenAsync(serverPort);
                  this._serverMap.set(serverPort, server);
                  server.expressServer!.use(this._expressServerMiddlewareMap.get(serverPort)!);
                  logger.info(`개발서버 서비스가 시작되었습니다: http://localhost:${serverPort}/${(SdProjectBuilderUtil.readProjectNpmConfig()).name}/${packageKey}/`);
                });
            }

            const webpackConfig: webpack.Configuration = await this._getWebpackConfigAsync(packageKey, "development");

            const compiler = webpack(webpackConfig);

            const currServer = this._serverMap.get(serverPort)!;

            this._expressServerMiddlewareMap.set(serverPort, [
              WebpackDevMiddleware(compiler, {
                publicPath: webpackConfig.output!.publicPath!,
                logLevel: "silent"
              }),
              WebpackHotMiddleware(compiler, {
                path: "/__webpack_hmr",
                log: false
              })
            ]);
            currServer.expressServer!.use(this._expressServerMiddlewareMap.get(serverPort)!);

            const serverDirPath = path.dirname(require.resolve("@simplysm/ws-server"));

            const projectNpmConfig = SdProjectBuilderUtil.readProjectNpmConfig();
            const packageDistConfigsFilePath = path.resolve(serverDirPath, "www", projectNpmConfig.name, packageKey, "configs.json");
            fs.mkdirsSync(path.dirname(packageDistConfigsFilePath));
            fs.writeJsonSync(packageDistConfigsFilePath, packageConfig.configs);

            logger.info(`개발서버 서비스가 시작되었습니다: http://localhost:${serverPort}/${(SdProjectBuilderUtil.readProjectNpmConfig()).name}/${packageKey}/`);

            compiler.hooks.done.tap("SdProjectBuilder", () => {
              resolve();
            });
          }
          catch (err) {
            reject(err);
          }
        })
      ]);

      return result[2];
    }
  }

  private async _generatePackageIndexFileAsync(packageKey: string, watch?: boolean): Promise<void> {
    const write = () => {
      let result = "";

      const npmConfig = SdProjectBuilderUtil.readNpmConfig(packageKey);
      if (!npmConfig.main) return;

      const deps = {
        ...npmConfig.dependencies,
        ...npmConfig.devDependencies,
        ...npmConfig.peerDependencies
      };

      const projectNpmConfig = SdProjectBuilderUtil.readProjectNpmConfig();
      for (const depKey of Object.keys(deps)) {
        if (depKey.startsWith(`@${SdProjectBuilderUtil.readProjectNpmConfig().name}/`)) {
          const depIndexFilePath = `../${depKey.substr(`@${projectNpmConfig.name}/`.length)}/src/index.ts`;
          const depIndexFileContent = fs.readFileSync(depIndexFilePath);
          if (depIndexFileContent.includes(`import "`)) {
            result += `import "${depKey}";` + os.EOL;
          }
        }
        else {
          const depIndexFilePath = SdProjectBuilderUtil.getProjectPath("node_modules", depKey, "src", "index.ts");
          if (fs.pathExistsSync(depIndexFilePath)) {
            const depIndexFileContent = fs.readFileSync(depIndexFilePath);
            if (depIndexFileContent.includes(`import "`)) {
              result += `import "${depKey}";` + os.EOL;
            }
          }
        }
      }

      const matches = glob.sync(SdProjectBuilderUtil.getPackagesPath(packageKey, "src/**/*.ts"));
      for (const match of matches) {
        const relativePath = path.relative(SdProjectBuilderUtil.getPackagesPath(packageKey, "src"), match).replace(/\\/g, "/");
        if (relativePath === "index.ts" || relativePath === "bin.ts") {
          continue;
        }

        if (relativePath.includes("Extension")) {
          result += `import "./${relativePath.replace(/\.ts/g, "")}";` + os.EOL;
        }
        else {
          result += `export * from "./${relativePath.replace(/\.ts/g, "")}";` + os.EOL;
        }
      }

      fs.writeFileSync(SdProjectBuilderUtil.getPackagesPath(packageKey, "src", "index.ts"), result);
    };

    write();

    if (watch) {
      await FileWatcher.watch(SdProjectBuilderUtil.getPackagesPath(packageKey, "src/**/*.ts"), ["add", "unlink"], async () => {
        try {
          write();
        }
        catch (err) {
          new Logger("@simplysm/cli", packageKey).error(err);
        }
      });
    }
  }

  private async _runTsLintWorkerAsync(packageKey: string, watch?: boolean): Promise<void> {
    const logger = new Logger("@simplysm/cli", packageKey);

    const worker = child_process.fork(
      path.resolve(__dirname, "..", "lib", "ts-lint-worker.js"),
      [
        packageKey,
        watch ? "watch" : "build"
      ],
      {
        stdio: [undefined, undefined, undefined, "ipc"]
      }
    );

    await new Promise<void>((resolve, reject) => {
      worker.on("message", message => {
        if (message.type === "finish") {
          resolve();
        }
        else if (message.type === "warning") {
          logger.warn("코드검사중 경고가 발생하였습니다.", message.message);
        }
        else if (message.type === "error") {
          logger.error("코드검사중 에러가 발생하였습니다.", message.message);
        }
      });

      worker.send([], err => {
        if (err) {
          reject(err);
        }
      });
    });

    if (watch) {
      await FileWatcher.watch(SdProjectBuilderUtil.getPackagesPath(packageKey, "src/**/*.ts"), ["add", "change"], async files => {
        try {
          worker.send(files.map(item => item.filePath));
        }
        catch (err) {
          logger.error(err);
        }
      });
    }
  }

  private async _runTsBuildWorkerAsync(packageKey: string, watch?: boolean): Promise<void> {
    const logger = new Logger("@simplysm/cli", packageKey);

    if (watch) {
      logger.log("빌드 및 변경감지를 시작합니다...");
    }
    else {
      logger.log("빌드를 시작합니다...");
    }

    const worker = child_process.fork(
      path.resolve(__dirname, "..", "lib", "ts-build-worker.js"),
      [
        packageKey,
        watch ? "watch" : "build"
      ],
      {
        stdio: [undefined, undefined, undefined, "ipc"]
      }
    );

    await new Promise<void>((resolve, reject) => {
      worker.on("message", message => {
        if (message.type === "finish") {
          logger.log("빌드가 완료되었습니다.");
          resolve();
        }
        else if (message.type === "error") {
          logger.error("빌드중 에러가 발생하였습니다.", message.message);
        }
      });

      worker.send([], err => {
        if (err) {
          reject(err);
        }
      });
    });

    if (watch) {
      await FileWatcher.watch(SdProjectBuilderUtil.getPackagesPath(packageKey, "src/**/*.ts"), ["add", "change", "unlink"], async files => {
        try {
          logger.log("변경이 감지되었습니다. 빌드를 시작합니다...");
          worker.send(files.map(item => item.filePath));
        }
        catch (err) {
          logger.error(err);
        }
      });
    }
  }

  private async _runTsCheckAndDeclarationWorkerAsync(packageKey: string, watch?: boolean): Promise<void> {
    const logger = new Logger("@simplysm/cli", packageKey);

    const worker = child_process.fork(
      path.resolve(__dirname, "..", "lib", "ts-check-and-declaration-worker.js"),
      [
        packageKey,
        watch ? "watch" : "build"
      ],
      {
        stdio: [undefined, undefined, undefined, "ipc"]
      }
    );
    worker.on("message", message => {
      if (message.type === "finish") {
      }
      else if (message.type === "error") {
        logger.error(`타입체크중 오류가 발생하였습니다.`, message.message);
      }
    });
  }

  private async _getWebpackConfigAsync(packageKey: string, mode: "production" | "development"): Promise<webpack.Configuration> {
    const packageConfig = this.config.packages[packageKey];

    if (packageConfig.type!.startsWith("cordova.") || packageConfig.type!.startsWith("electron.")) {
      throw new Error("미구현 (webpack-config)");
    }

    const projectNpmConfig = SdProjectBuilderUtil.readProjectNpmConfig();

    const distPath = SdProjectBuilderUtil.getPackagesPath(packageKey, "dist");

    const tsconfig = SdProjectBuilderUtil.readTsConfig(packageKey, true);
    const tsOptions = tsconfig.compilerOptions;
    const alias = {};
    if (tsOptions && tsOptions.paths) {
      for (const tsPathKey of Object.keys(tsOptions.paths)) {
        if (tsOptions.paths[tsPathKey].length !== 1) {
          throw new Error("'tsconfig'의 'paths'옵션에서, 하나의 명칭에 반드시 하나의 목적지를 지정해야 합니다.");
        }
        alias[tsPathKey] = SdProjectBuilderUtil.getPackagesPath(packageKey, tsOptions.paths[tsPathKey][0]);
      }
    }

    let webpackConfig: webpack.Configuration = {
      output: {
        path: distPath,
        publicPath: `/${projectNpmConfig.name}/${packageKey}/`,
        filename: "app.js",
        chunkFilename: "[name].chunk.js"
      },
      resolve: {
        extensions: [".ts", ".js", ".json"],
        alias: {
          SIMPLYSM_CLIENT_APP_MODULE: SdProjectBuilderUtil.getPackagesPath(packageKey, "src", "AppModule"),
          ...alias
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
              path.resolve(__dirname, "..", "lib", "ts-build-loader"),
              "angular-router-loader"
            ]
          },
          {
            test: /\.scss$/,
            use: [
              "style-loader",
              "css-loader",
              "resolve-url-loader",
              {
                loader: "sass-loader",
                options: {
                  sourceMap: true,
                  sourceMapContents: false
                }
              }
            ]
          },
          {
            test: /\.css$/,
            use: [
              "style-loader",
              "css-loader"
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
        new SdWebpackLoggerPlugin({
          logger: new Logger("@simplysm/cli", packageKey)
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
        devtool: "source-map",
        entry: path.resolve(__dirname, "../lib/main.js")
      });
    }
    else {
      webpackConfig = webpackMerge(webpackConfig, {
        mode: "development",
        devtool: "cheap-module-source-map",
        entry: [
          `webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000`,
          path.resolve(__dirname, "../lib/main.js")
        ],
        plugins: [
          new webpack.HotModuleReplacementPlugin()
        ]
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
