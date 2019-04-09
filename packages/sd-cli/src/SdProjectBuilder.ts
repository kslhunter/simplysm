import * as fs from "fs-extra";
import * as path from "path";
import {Logger, optional, Wait} from "@simplysm/sd-common";
import * as webpack from "webpack";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import * as webpackMerge from "webpack-merge";
import * as glob from "glob";
import {FileWatcher, ProcessManager} from "@simplysm/sd-core";
import {SdProjectBuilderUtil} from "./SdProjectBuilderUtil";
import {SdWebpackLoggerPlugin} from "./SdWebpackLoggerPlugin";
import {ISdProjectConfig, ITsConfig} from "./commons";
import * as WebpackHotMiddleware from "webpack-hot-middleware";
import * as WebpackDevMiddleware from "webpack-dev-middleware";
import {SdWebSocketServer} from "@simplysm/sd-service";
import {SdWebSocketClient} from "@simplysm/sd-service-client";
import {SdWebpackWriteFilePlugin} from "./SdWebpackWriteFilePlugin";
import {RequestHandler} from "express";
import * as nodeExternals from "webpack-node-externals";
import * as os from "os";
import {SdWebpackTimeFixPlugin} from "./SdWebpackTimeFixPlugin";
import * as child_process from "child_process";

export class SdProjectBuilder {
  private readonly _serverMap = new Map<string, {
    server: SdWebSocketServer;
    middlewares: RequestHandler[];
    packageKeys: string[];
  }>();
  private config: ISdProjectConfig = {packages: {}};

  public async bootstrapAsync(): Promise<void> {
    await this._readConfigAsync("production");

    for (const packageKey of Object.keys(this.config.packages)) {
      await this._createTsConfigFileAsync(packageKey);

      const logger = new Logger("@simplysm/sd-cli", packageKey);
      await ProcessManager.spawnAsync(["git", "add", SdProjectBuilderUtil.getTsConfigPath(packageKey)], {logger});
    }
  }

  public async localUpdateAsync(): Promise<void> {
    await this._readConfigAsync("development");

    if (!this.config.localUpdates) {
      new Logger("@simplysm/sd-cli").warn("로컬 업데이트 설정이 없습니다.");
      return;
    }

    await this._localUpdateAsync();
  }

  public async watchAsync(argv?: { packages?: string; option?: string }): Promise<void> {
    const packageKeys = optional(() => argv!.packages!.split(",").map(item => item.trim()));
    await this._readConfigAsync("development", packageKeys, argv && argv.option);

    await this._localUpdateAsync(true);

    await this._parallelPackages(false, async packageKey => {
      if (this.config.packages[packageKey].type === "none") return;
      await Promise.all([
        SdProjectBuilder._createTsConfigForBuildFileAsync(packageKey),
        fs.remove(SdProjectBuilderUtil.getPackagesPath(packageKey, "dist")),
        this._generatePackageIndexFileAsync(packageKey, true)
      ]);
    });

    await Promise.all([
      this._parallelPackages(false, async packageKey => {
        if (this.config.packages[packageKey].type === "none") return;
        await this._runTsLinkWorkerAsync(packageKey, true);
      }),
      this._parallelPackages(true, async packageKey => {
        if (this.config.packages[packageKey].type === "none") return;
        await this._runTsCheckAndDeclarationWorkerAsync(packageKey, true);
      }),
      this._parallelPackages(true, async packageKey => {
        if (this.config.packages[packageKey].type === "none") return;
        await this._runWebpackBuildWatchAsync(packageKey);
      })
    ]);

    new Logger("@simplysm/sd-cli").info("모든 변경감지가 시작되었습니다.");
  }

  public async buildAsync(argv?: { packages?: string }): Promise<void> {
    const packageKeys = optional(() => argv!.packages!.split(",").map(item => item.trim()));
    await this._readConfigAsync("production", packageKeys);

    await this._buildProjectAsync();
  }

  private async _buildProjectAsync(): Promise<void> {
    await this._parallelPackages(false, async packageKey => {
      if (this.config.packages[packageKey].type === "none") return;
      await Promise.all([
        SdProjectBuilder._createTsConfigForBuildFileAsync(packageKey),
        this._generatePackageIndexFileAsync(packageKey, true),
        fs.remove(SdProjectBuilderUtil.getPackagesPath(packageKey, "dist"))
      ]);
    });

    await Promise.all([
      this._parallelPackages(false, async packageKey => {
        if (this.config.packages[packageKey].type === "none") return;
        await this._runTsLinkWorkerAsync(packageKey);
      }),
      this._parallelPackages(true, async packageKey => {
        if (this.config.packages[packageKey].type === "none") return;
        await this._runTsCheckAndDeclarationWorkerAsync(packageKey);
      }),
      this._parallelPackages(true, async packageKey => {
        if (this.config.packages[packageKey].type === "none") return;
        const webpackConfig: webpack.Configuration = await this._getWebpackConfigAsync(packageKey, "production");
        await new Promise<void>((resolve, reject) => {
          webpack(webpackConfig, err => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        });
      })
    ]);

    new Logger("@simplysm/sd-cli").info("모든 빌드가 완료되었습니다.");
  }

  public async publishAsync(argv?: { build?: boolean; packages?: string; noCommit?: boolean }): Promise<void> {
    const packageKeys = optional(() => argv!.packages!.split(",").map(item => item.trim()));
    await this._readConfigAsync("production", packageKeys);

    const logger = new Logger("@simplysm/sd-cli");
    if (!optional(() => argv!.noCommit)) {
      await new Promise<void>(async (resolve, reject) => {
        await ProcessManager.spawnAsync(["git", "status"], {
          logger,
          onMessage: async (errMsg, logMsg) => {
            if (logMsg && logMsg.includes("Changes")) {
              reject(new Error("커밋되지 않은 정보가 있습니다."));
            }
          }
        });
        resolve();
      });
    }

    if (optional(() => argv!.build)) {
      await this._buildProjectAsync();
    }

    await ProcessManager.spawnAsync(["npm", "version", "patch", "--git-tag-version", "false"], {logger});

    const projectNpmConfig = await SdProjectBuilderUtil.readProjectNpmConfigAsync();

    if (Object.keys(this.config.packages).every(packageKey => !this.config.packages[packageKey].publish)) {
      throw new Error("배포할 패키지가 없습니다.");
    }

    await this._parallelPackages(false, async packageKey => {
      const packageLogger = new Logger("@simplysm/sd-cli", packageKey);

      const packageConfig = this.config.packages[packageKey];

      if (packageConfig.publish) {
        packageLogger.log(`배포를 시작합니다. - v${projectNpmConfig.version}`);

        await ProcessManager.spawnAsync(["yarn", "version", "--new-version", projectNpmConfig.version, "--no-git-tag-version"], {
          cwd: SdProjectBuilderUtil.getPackagesPath(packageKey),
          logger: packageLogger
        });

        const allBuildPackageNpmNames: string[] = await this._getAllBuildPackageNpmNamesAsync();

        const projectDeps = {
          ...projectNpmConfig.dependencies,
          ...projectNpmConfig.devDependencies,
          ...projectNpmConfig.peerDependencies
        };

        const npmConfig = await SdProjectBuilderUtil.readNpmConfigAsync(packageKey);
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
        await SdProjectBuilderUtil.writeNpmConfigAsync(packageKey, npmConfig);

        if (packageConfig.publish.protocol === "npm") {
          let message = "";
          try {
            await ProcessManager.spawnAsync(["yarn", "publish", "--access", "public"], {
              cwd: SdProjectBuilderUtil.getPackagesPath(packageKey),
              logger: packageLogger,
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
        else if (packageConfig.publish.protocol === "simplysm") {
          const wsClient = new SdWebSocketClient(packageConfig.publish.port, packageConfig.publish.host);
          await wsClient.connectAsync();

          // 결과 파일 업로드
          const filePaths = await new Promise<string[]>((resolve, reject) => {
            glob(SdProjectBuilderUtil.getPackagesPath(packageKey, "dist", "**", "*"), (err, files) => {
              if (err) {
                reject(err);
                return;
              }

              resolve(files.filter(file => !fs.lstatSync(file).isDirectory()));
            });
          });

          filePaths.push(SdProjectBuilderUtil.getPackagesPath("package.json"));

          const uploadFileInfos: { total: number; current: number; filePath: string; targetPath: string }[] = [];
          await Promise.all(filePaths.map(async filePath => {
            let relativeFilePath = path.relative(SdProjectBuilderUtil.getPackagesPath(packageKey, "dist"), filePath);
            if (/^\.\.[\\/]package\.json$/.test(relativeFilePath)) {
              relativeFilePath = "package.json";
            }

            const targetPath = packageConfig.type === "server"
              ? path.join("/", relativeFilePath)
              : path.join("www", projectNpmConfig.name, packageKey, relativeFilePath);

            const fileSize = await wsClient.checkUploadFileSizeAsync(filePath, targetPath);

            if (fileSize > 0) {
              uploadFileInfos.push({
                filePath,
                targetPath,
                total: fileSize,
                current: 0
              });
            }
          }));

          const total = uploadFileInfos.sum(item => item.total)!;

          await Promise.all(uploadFileInfos.map(async uploadFileInfo => {
            await wsClient.uploadAsync(uploadFileInfo.filePath, uploadFileInfo.targetPath, progress => {
              uploadFileInfo.current = progress.current;

              const current = uploadFileInfos.sum(item => item.current)!;
              packageLogger.log(`파일 업로드 : (${(Math.floor(current * 10000 / total) / 100).toFixed(2).padStart(6, " ")}%) ${current.toLocaleString()} / ${total.toLocaleString()}`);
            }, 1000000);
          }));

          await wsClient.execAsync("yarn install");
        }
        else {
          throw new Error("미구현 (publish)");
        }

        packageLogger.log(`배포가 완료되었습니다. - v${projectNpmConfig.version}`);
      }
    });

    await ProcessManager.spawnAsync(["git", "add", "."], {logger});

    if (!optional(() => argv!.noCommit)) {
      await ProcessManager.spawnAsync(["git", "commit", "-m", `"v${projectNpmConfig.version}"`], {logger});
      await ProcessManager.spawnAsync(["git", "tag", "-a", `"v${projectNpmConfig.version}"`, "-m", `"v${projectNpmConfig.version}"`], {logger});
    }

    logger.log(`배포가 완료되었습니다.`);
  }

  public async _localUpdateAsync(watchOnly?: boolean): Promise<void> {
    if (!this.config.localUpdates) return;

    await Promise.all(Object.keys(this.config.localUpdates).map(async localUpdateKey => {
      const depPackageDirPaths = await new Promise<string[]>(async (resolve, reject) => {
        glob(SdProjectBuilderUtil.getProjectPath("node_modules", localUpdateKey), async (err, globResult) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(globResult);
        });
      });

      for (const depPackageDirPath of depPackageDirPaths) {
        const subPackageName = depPackageDirPath.match(new RegExp(
          localUpdateKey.replace(/([\/.*])/g, item => item === "/" ? "\\/" : item === "." ? "\\." : item === "*" ? "(.*)" : item)
        ))![1];

        const sourceDirPath = SdProjectBuilderUtil.getProjectPath(this.config.localUpdates![localUpdateKey].replace(/\*/g, subPackageName));
        const targetDirPath = SdProjectBuilderUtil.getProjectPath("node_modules", localUpdateKey.replace(/\*/g, subPackageName));

        if (!await fs.pathExists(sourceDirPath)) {
          throw new Error(`소스디렉토리를 찾을 수 없습니다. ("${sourceDirPath}")`);
        }

        if (!watchOnly) {
          await fs.copy(sourceDirPath, targetDirPath);
        }
        else {
          const logger = new Logger("@simplysm/sd-cli", "local-updates");

          // logger.log(`"${localUpdateKey.replace("*", subPackageName)}"의 로컬업데이트 감지를 시작합니다.`);
          await FileWatcher.watch(path.resolve(sourceDirPath, "**", "*"), ["add", "change", "unlink"], async changes => {
            try {
              for (const change of changes) {
                const targetFilePath = path.resolve(targetDirPath, path.relative(sourceDirPath, change.filePath));
                logger.log(`"${localUpdateKey.replace("*", subPackageName)}"의 파일이 변경되었습니다. : [${change.type}] ${change.filePath}`);
                if (change.type === "unlink") {
                  await fs.remove(targetFilePath);
                }
                else {
                  await fs.copy(change.filePath, targetFilePath);
                }
              }
            }
            catch (err) {
              logger.error(err);
            }
          });
        }
      }
    }));

    if (!watchOnly) {
      new Logger("@simplysm/sd-cli").log(`로컬 업데이트 완료`);
    }
  }

  private async _createTsConfigFileAsync(packageKey: string): Promise<void> {
    const tsconfig: ITsConfig = {};
    tsconfig.extends = "../../tsconfig.json";
    tsconfig.compilerOptions = {};
    const tsOptions = tsconfig.compilerOptions;

    tsOptions.rootDir = "src";
    tsOptions.outDir = "dist";

    tsOptions.lib = ["es2015"];

    const packageConfig = this.config.packages[packageKey];
    if (packageConfig.type !== "node" && packageConfig.type !== "server") {
      tsOptions.lib.push("dom");
    }

    const npmConfig = await SdProjectBuilderUtil.readNpmConfigAsync(packageKey);
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

      const projectNpmConfig = await SdProjectBuilderUtil.readProjectNpmConfigAsync();

      const generatePathsAsync = async (deps1: { [key: string]: string }) => {
        for (const depKey of Object.keys(deps1).filter(item => item.startsWith(`@${projectNpmConfig.name}/`))) {
          const depPackageKey = depKey.substr(`@${projectNpmConfig.name}/`.length);

          if (!Object.keys(tsOptions.paths!).includes(depKey)) {
            tsOptions.paths![depKey] = [
              `../${depPackageKey}/src/index.ts`
            ];
          }

          const depPackageNpmConfig = await SdProjectBuilderUtil.readNpmConfigAsync(depPackageKey);
          await generatePathsAsync({
            ...depPackageNpmConfig.dependencies,
            ...depPackageNpmConfig.devDependencies,
            ...depPackageNpmConfig.peerDependencies
          });
        }
      };
      await generatePathsAsync(deps);
    }

    await SdProjectBuilderUtil.writeTsConfigAsync(packageKey, tsconfig);
  }

  private static async _createTsConfigForBuildFileAsync(packageKey: string): Promise<void> {
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

  private async _readConfigAsync(env: "production" | "development", packageKeys?: string[], option?: string): Promise<void> {
    this.config = await SdProjectBuilderUtil.readConfigAsync(env, packageKeys, option);
  }

  private async _parallelPackages(byDep: boolean, cb: (packageKey: string) => Promise<void>): Promise<void> {
    if (byDep) {
      const allBuildPackageNpmNames: string[] = await this._getAllBuildPackageNpmNamesAsync();

      const completedPackageNpmNames: string[] = [];
      await Promise.all(Object.keys(this.config.packages).map(async packageKey => {
        const packageNpmConfig = await SdProjectBuilderUtil.readNpmConfigAsync(packageKey);
        const packageNpmName = packageNpmConfig.name;
        const packageNpmDeps = Object.merge(packageNpmConfig.dependencies, packageNpmConfig.devDependencies);
        if (packageNpmDeps) {
          for (const packageNpmDepName of Object.keys(packageNpmDeps)) {
            if (allBuildPackageNpmNames.includes(packageNpmDepName)) {
              try {
                await Wait.true(() => completedPackageNpmNames.includes(packageNpmDepName), undefined, 60000);
              }
              catch (err) {
                new Logger("@simplysm/sd-cli", packageKey).error("의존성 패키지의 빌드가 끝나지 않습니다.", packageNpmDepName);
                throw err;
              }
            }
          }
        }

        await cb(packageKey);

        completedPackageNpmNames.push(packageNpmName);
      }));
    }
    else {
      await Promise.all(Object.keys(this.config.packages).map(async packageKey => {
        await cb(packageKey);
      }));
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

  private async _runTsLinkWorkerAsync(packageKey: string, watch?: boolean): Promise<void> {
    const startedWorker = await new Promise<child_process.ChildProcess>((resolve, reject) => {
      const logger = new Logger("@simplysm/sd-cli", packageKey);

      const worker = ProcessManager.fork(
        path.resolve(__dirname, "..", "lib", "ts-lint-worker.js"),
        [packageKey, watch ? "watch" : "build"],
        {logger}
      );

      worker.on("message", message => {
        if (message.type === "finish") {
          // logger.log("코드검사가 완료되었습니다.");
          resolve(worker);
        }
        else if (message.type === "warning") {
          logger.warn("코드검사중 경고가 발생하였습니다.", message.message);
        }
        else if (message.type === "error") {
          logger.error("코드검사중 에러가 발생하였습니다.", message.message);
          if (!watch) {
            reject(message.message);
          }
        }
        else {
          logger.error("코드검사중 메시지가 잘못되었습니다. [" + message + "]");
          if (!watch) {
            reject(new Error("코드검사중 메시지가 잘못되었습니다. [" + message + "]"));
          }
        }
      });
      worker.send([]);
    });

    if (watch) {
      await FileWatcher.watch(
        SdProjectBuilderUtil.getPackagesPath(packageKey, "src", "**", "*.ts"), ["add", "change"],
        changedFileInfos => {
          startedWorker.send(changedFileInfos.map(item => item.filePath));
        }
      );
    }
  }

  private async _runTsCheckAndDeclarationWorkerAsync(packageKey: string, watch?: boolean): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const logger = new Logger("@simplysm/sd-cli", packageKey);

      const worker = ProcessManager.fork(
        path.resolve(__dirname, "..", "lib", "ts-check-and-declaration-worker.js"),
        [packageKey, watch ? "watch" : "build"],
        {logger}
      );

      worker.on("message", message => {
        if (message.type === "finish") {
          // logger.log("타입체크가 완료되었습니다.");
          resolve();
        }
        else if (message.type === "warning") {
          logger.warn("타입체크중 경고가 발생하였습니다.", message.message);
        }
        else if (message.type === "error") {
          logger.error("타입체크중 에러가 발생하였습니다.", message.message);
          if (!watch) {
            reject(message.message);
          }
        }
        else {
          logger.error("타입체크중 메시지가 잘못되었습니다. [" + message + "]");
          if (!watch) {
            reject(new Error("타입체크중 메시지가 잘못되었습니다. [" + message + "]"));
          }
        }
      });
    });
  }

  private async _runWebpackBuildWatchAsync(packageKey: string): Promise<void> {
    const logger = new Logger("@simplysm/sd-cli", packageKey);

    const packageConfig = this.config.packages[packageKey];
    const projectNpmConfig = await SdProjectBuilderUtil.readProjectNpmConfigAsync();

    await new Promise<void>(async (resolve, reject) => {
      try {
        if (packageConfig.type !== "dom" && packageConfig.type !== "node" && packageConfig.type !== "all" && packageConfig.type !== "server") {
          if (!packageConfig.server) {
            throw new Error(`'${packageKey}'에 서버가 설정되어있지 않습니다.`);
          }

          if (!this._serverMap.has(packageConfig.server!)) {
            await Wait.true(() => this._serverMap.has(packageConfig.server!));
          }

          const webpackConfig: webpack.Configuration = await this._getWebpackConfigAsync(packageKey, "development");

          const compiler = webpack(webpackConfig);

          const currServerInfo = this._serverMap.get(packageConfig.server!)!;
          currServerInfo.packageKeys.push(packageKey);

          const expressServerMiddlewareList = currServerInfo.middlewares;
          expressServerMiddlewareList.pushRange([
            WebpackDevMiddleware(compiler, {
              publicPath: webpackConfig.output!.publicPath!,
              logLevel: "silent",
              watchOptions: {
                aggregateTimeout: 600
              }
            }),
            WebpackHotMiddleware(compiler, {
              path: `/${projectNpmConfig.name}/${packageKey}/__webpack_hmr`,
              log: false
            })
          ]);
          currServerInfo.server.expressServer!.use(expressServerMiddlewareList);

          const packageDistConfigsFilePath = SdProjectBuilderUtil.getPackagesPath(packageConfig.server!, "dist", "www", projectNpmConfig.name, packageKey, "configs.json");
          await fs.mkdirs(path.dirname(packageDistConfigsFilePath));
          await fs.writeJson(packageDistConfigsFilePath, {
            vhost: packageConfig.vhost,
            ...packageConfig.configs
          });

          compiler.hooks.done.tap("SdProjectBuilder", () => {
            logger.info(`개발서버 서비스가 시작되었습니다.: ` + (
              packageConfig.vhost
                ? `http://${packageConfig.vhost}:${currServerInfo.server.port}`
                : `http://localhost:${currServerInfo.server.port}/${projectNpmConfig.name}/${packageKey}/`
            ));

            resolve();
          });

          if (packageConfig.type!.startsWith("electron.")) {
            const run = () => {
              ProcessManager.spawnAsync([
                  "electron",
                  path.resolve(__dirname, "../lib/electron.js"),
                  `http://localhost:${currServerInfo.server.port}/${projectNpmConfig.name}/${packageKey}/`
                ], {logger}
              ).then(() => {
                run();
              }).catch(err => {
                logger.error(err);
                run();
              });
            };
            run();
          }
        }
        else {
          if (packageConfig.type === "server") {
            const packageDistConfigsFilePath = SdProjectBuilderUtil.getPackagesPath(packageKey, "dist", "configs.json");
            await fs.mkdirs(path.dirname(packageDistConfigsFilePath));
            await fs.writeJson(packageDistConfigsFilePath, packageConfig.configs);
          }

          const webpackConfig: webpack.Configuration = await this._getWebpackConfigAsync(packageKey, "development");
          const compiler = webpack(webpackConfig);
          compiler.watch({aggregateTimeout: 600}, async err => {
            if (err) {
              reject(err);
              return;
            }

            if (packageConfig.type === "server") {
              const serverAppPath = SdProjectBuilderUtil.getPackagesPath(packageKey, "dist", "app");

              if (this._serverMap.has(packageKey)) {
                logger.log(`서버를 재시작합니다.`);
                const serverInfo = this._serverMap.get(packageKey)!;
                await serverInfo.server.closeAsync();
                require("decache")(serverAppPath); //tslint:disable-line:no-require-imports
                const server = eval("require(serverAppPath)") as SdWebSocketServer; //tslint:disable-line:no-eval
                serverInfo.server = server;
                server.expressServer!.use(serverInfo.middlewares);
                logger.info.apply(
                  logger,
                  [`개발서버 서비스가 재시작되었습니다`]
                    .concat(serverInfo.packageKeys.map(clientPackageKey => {
                      const clientPackageConfig = this.config.packages[clientPackageKey];
                      return clientPackageConfig.vhost
                        ? `http://${clientPackageConfig.vhost}:${server.port}`
                        : `http://localhost:${server.port}/${projectNpmConfig.name}/${clientPackageKey}/`;
                    }))
                );
              }
              else {
                logger.log(`서버를 시작합니다.`);
                const server = eval("require(serverAppPath)") as SdWebSocketServer; //tslint:disable-line:no-eval
                server.rootPath = SdProjectBuilderUtil.getPackagesPath(packageKey, "dist");
                this._serverMap.set(packageKey, {
                  server,
                  packageKeys: [],
                  middlewares: []
                });
              }
            }

            resolve();
          });
        }
      }
      catch (err) {
        reject(err);
      }
    });
  }

  private async _generatePackageIndexFileAsync(packageKey: string, watch?: boolean): Promise<void> {
    const writeAsync = async () => {
      let result = "";

      const npmConfig = await SdProjectBuilderUtil.readNpmConfigAsync(packageKey);
      if (!npmConfig.main) return;

      const deps = {
        ...npmConfig.dependencies,
        ...npmConfig.devDependencies,
        ...npmConfig.peerDependencies
      };

      const projectNpmConfig = await SdProjectBuilderUtil.readProjectNpmConfigAsync();
      for (const depKey of Object.keys(deps)) {
        if (depKey.startsWith(`@${projectNpmConfig.name}/`)) {
          const depIndexFilePath = SdProjectBuilderUtil.getPackagesPath(`${depKey.substr(`@${projectNpmConfig.name}/`.length)}`, "src/index.ts");
          const depIndexFileContent = await fs.readFile(depIndexFilePath);
          if (depIndexFileContent.includes(`import ".`)) {
            result += `import "${depKey}";` + os.EOL;
          }
        }
        else {
          const depIndexFilePath = SdProjectBuilderUtil.getProjectPath("node_modules", depKey, "src", "index.ts");
          if (await fs.pathExists(depIndexFilePath)) {
            const depIndexFileContent = await fs.readFile(depIndexFilePath);
            if (depIndexFileContent.includes(`import ".`)) {
              result += `import "${depKey}";` + os.EOL;
            }
          }
        }
      }

      const matches: string[] = await new Promise<string[]>((resolve, reject) => {
        glob(SdProjectBuilderUtil.getPackagesPath(packageKey, "src/**/*.ts"), (err, globResult) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(globResult);
        });
      });

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

      await fs.writeFile(SdProjectBuilderUtil.getPackagesPath(packageKey, "src", "index.ts"), result);
    };

    await writeAsync();

    if (watch) {
      await FileWatcher.watch(SdProjectBuilderUtil.getPackagesPath(packageKey, "src/!**/!*.ts"), ["add", "unlink"], async () => {
        try {
          await writeAsync();
        }
        catch (err) {
          new Logger("@simplysm/sd-cli", packageKey).error(err);
        }
      });
    }
  }


  private async _getWebpackConfigAsync(packageKey: string, mode: "production" | "development"): Promise<webpack.Configuration> {
    const packageConfig = this.config.packages[packageKey];

    if (packageConfig.type!.startsWith("cordova.")) {
      throw new Error("미구현 (webpack-config)");
    }

    const projectNpmConfig = await SdProjectBuilderUtil.readProjectNpmConfigAsync();

    const distPath = SdProjectBuilderUtil.getPackagesPath(packageKey, "dist");

    const tsconfig = await SdProjectBuilderUtil.readTsConfigAsync(packageKey, true);
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
      resolve: {
        extensions: [".ts", ".js", ".json"],
        alias
      },
      output: {
        path: distPath
      },
      module: {
        rules: [
          {
            enforce: "pre",
            test: /\.js$/,
            use: ["source-map-loader"]
          },
          {
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf|xlsx)$/,
            loader: "file-loader",
            options: {
              name: "assets/[name].[ext]?[hash]"
            }
          }
        ]
      },
      plugins: [
        new SdWebpackLoggerPlugin({
          logger: new Logger("@simplysm/sd-cli", packageKey)
        }),
        new SdWebpackTimeFixPlugin(),
        new webpack.DefinePlugin({
          "process.env.VERSION": `"${projectNpmConfig.version}"`
        })
      ]
    };

    if (packageConfig.type === "all" || packageConfig.type === "dom" || packageConfig.type === "node" || packageConfig.type === "server") {
      const packageNpmConfig = await SdProjectBuilderUtil.readNpmConfigAsync(packageKey);

      const entryFilePaths = [packageNpmConfig["main"] ? packageNpmConfig["main"] : "src/app.ts"]
        .concat(packageNpmConfig["bin"] ? Object.keys(packageNpmConfig["bin"]).map(key => packageNpmConfig["bin"][key]) : [])
        .filterExists()
        .map(filePath => SdProjectBuilderUtil.getPackagesPath(packageKey, filePath.replace("dist", "src").replace(/\.js$/g, ".ts")));

      const entry: { [key: string]: string } = {};
      for (const filePath of entryFilePaths) {
        const basename = path.basename(filePath, path.extname(filePath));
        entry[basename] = filePath;
      }

      webpackConfig = webpackMerge(webpackConfig, {
        target: "node",
        node: {
          __dirname: false
        },
        entry,
        output: {
          filename: "[name].js",
          libraryTarget: "umd"
        },
        optimization: {
          nodeEnv: false
        },
        module: {
          rules: [
            {
              test: /\.ts$/,
              exclude: /node_modules/,
              loader: path.resolve(__dirname, "..", "lib", "ts-build-loader")
            }
          ]
        },
        plugins: [
          ...(packageNpmConfig["bin"])
            ? [
              new webpack.BannerPlugin({
                banner: "#!/usr/bin/env node",
                raw: true,
                entryOnly: true,
                include: Object.keys(packageNpmConfig["bin"]).map(key => path.relative(distPath, SdProjectBuilderUtil.getPackagesPath(packageKey, packageNpmConfig["bin"][key])))
              })
            ]
            : []
        ],
        externals: [
          (context, request, callback) => {
            if (packageConfig.type !== "server" && alias[request]) {
              callback(undefined, `commonjs ${request}`);
              return;
            }

            callback(undefined, undefined);
          },
          nodeExternals()
        ]
      });

      if (mode === "production") {
        webpackConfig = webpackMerge(webpackConfig, {
          mode: "production",
          devtool: "source-map",
          optimization: {
            noEmitOnErrors: true,
            minimize: false
          }
        });
      }
      else {
        webpackConfig = webpackMerge(webpackConfig, {
          mode: "development",
          devtool: "cheap-module-source-map"
        });
      }

      if (packageConfig.type === "server") {
        webpackConfig = webpackMerge(webpackConfig, {
          plugins: [
            /*new webpack.NormalModuleReplacementPlugin(
              /^\.\/view$/,
              (resource: any) => {
                if (resource.context.endsWith("express\\lib")) {
                  resource.request = path.resolve(__dirname, "..", "lib", "express-view.js");
                }
              }
            ),*/
            new SdWebpackWriteFilePlugin({
              logger: new Logger("@simplysm/sd-cli", packageKey),
              files: [{
                path: SdProjectBuilderUtil.getPackagesPath(packageKey, "dist", "configs.json"),
                content: JSON.stringify(packageConfig.configs, undefined, 2)
              }]
            })
          ]
        });

        if (mode === "production") {
          webpackConfig = webpackMerge(webpackConfig, {
            plugins: [
              new SdWebpackWriteFilePlugin({
                logger: new Logger("@simplysm/sd-cli", packageKey),
                files: [{
                  path: SdProjectBuilderUtil.getPackagesPath(packageKey, "dist", "pm2.json"),
                  content: JSON.stringify({
                    name: "simplysm",
                    script: "app.js",
                    watch: [
                      "pm2.json",
                      "app.js"
                    ],
                    env: {
                      "NODE_ENV": "production"
                    }
                  }, undefined, 2)
                }]
              })
            ]
          });
        }
      }
      /*else {
        webpackConfig = webpackMerge(webpackConfig, {
          externals: [
            (context, request, callback) => {
              if (alias[request]) {
                callback(undefined, `commonjs ${request}`);
                return;
              }

              callback(undefined, undefined);
            },
            nodeExternals()
          ]
        });
      }*/
    }
    else {
      webpackConfig = webpackMerge(webpackConfig, {
        output: {
          publicPath: `/${projectNpmConfig.name}/${packageKey}/`,
          filename: "app.js",
          chunkFilename: "[name].chunk.js"
        },
        resolve: {
          alias: {
            SIMPLYSM_CLIENT_APP_MODULE: SdProjectBuilderUtil.getPackagesPath(packageKey, "src", "AppModule")
          }
        },
        module: {
          rules: [
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
            }
          ]
        },
        plugins: [
          new webpack.ContextReplacementPlugin(
            /angular[\\/]core[\\/]fesm5/,
            SdProjectBuilderUtil.getPackagesPath(packageKey, "src"),
            {}
          ),
          new SdWebpackWriteFilePlugin({
            logger: new Logger("@simplysm/sd-cli", packageKey),
            files: [{
              path: SdProjectBuilderUtil.getPackagesPath(packageKey, "dist", "configs.json"),
              content: JSON.stringify({
                vhost: packageConfig.vhost,
                ...packageConfig.configs
              }, undefined, 2)
            }]
          }),
          new HtmlWebpackPlugin({
            template: path.resolve(__dirname, "../lib/index.ejs"),
            BASE_HREF: `/${projectNpmConfig.name}/${packageKey}/`
          })
        ],
        externals: [
          (context, request, callback) => {
            if (request === "fs" || request === "fs-extra" || request === "net" || request === "tls") {
              callback(undefined, `""`);
              return;
            }

            if (request === "ws") {
              callback(undefined, `WebSocket`);
              return;
            }

            callback(undefined, undefined);
          }
        ]
      });

      if (mode === "production") {
        webpackConfig = webpackMerge(webpackConfig, {
          mode: "production",
          devtool: "source-map",
          entry: path.resolve(__dirname, "../lib/main.js"),
          optimization: {
            splitChunks: {
              cacheGroups: {
                vendor: {
                  test: /[\\/]node_modules[\\/](?!@simplysm)/,
                  name: "vendor",
                  chunks: "initial",
                  enforce: true
                },
                simplysm: {
                  test: /[\\/]node_modules[\\/]@simplysm/,
                  name: "simplysm",
                  chunks: "initial",
                  enforce: true
                }
              }
            },
            noEmitOnErrors: true,
            minimize: false
          }
        });
      }
      else {
        webpackConfig = webpackMerge(webpackConfig, {
          mode: "development",
          devtool: "cheap-module-source-map",
          entry: [
            `webpack-hot-middleware/client?path=/${projectNpmConfig.name}/${packageKey}/__webpack_hmr&timeout=20000&reload=true`,
            path.resolve(__dirname, "../lib/main.js")
          ],
          plugins: [
            new webpack.HotModuleReplacementPlugin()
          ]
        });
      }

      if (packageConfig.type!.startsWith("electron.")) {
        webpackConfig = webpackMerge(webpackConfig, {
          target: "electron-renderer"
        });
      }
    }

    return webpackConfig;
  }

  /*private static _envStringify(param: { [key: string]: string | undefined }): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    for (const key of Object.keys(param)) {
      result[key] = param[key] === undefined ? "undefined" : JSON.stringify(param[key]);
    }
    return result;
  }*/
}
