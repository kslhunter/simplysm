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
import {SdWebSocketClient} from "@simplysm/ws-common";
import {SdWebpackWriteFilePlugin} from "./SdWebpackWriteFilePlugin";

export class SdProjectBuilder {
  private readonly _serverMap = new Map<number, {
    server: SdWebSocketServer;
    middlewares: RequestHandler[];
    packageKeys: string[];
  }>();
  // private readonly _expressServerMiddlewareMap = new Map<number, RequestHandler[]>();
  private config: ISdProjectConfig = {packages: {}};

  public async bootstrapAsync(): Promise<void> {
    await this._readConfigAsync("production", undefined);

    for (const packageKey of Object.keys(this.config.packages)) {
      await this._createTsConfigFileAsync(packageKey);

      const logger = new Logger("@simplysm/cli", packageKey);
      await spawnAsync(["git", "add", SdProjectBuilderUtil.getTsConfigPath(packageKey)], {logger});
    }
  }

  public async localUpdateAsync(): Promise<void> {
    await this._readConfigAsync("development", undefined);

    if (!this.config.localUpdates) {
      new Logger("@simplysm/cli").warn("로컬 업데이트 설정이 없습니다.");
      return;
    }

    await this._localUpdateAsync();
  }

  public async watchAsync(argv?: { packages?: string }): Promise<void> {
    const packageKeys = optional(argv, o => o.packages!.split(",").map(item => item.trim()));
    await this._readConfigAsync("development", packageKeys);

    await this._localUpdateAsync(true);

    await this._parallelPackages(true, async packageKey => {
      const packageConfig = this.config.packages[packageKey];
      if (packageConfig.type === "none") {
        return;
      }

      await SdProjectBuilder._createTsConfigForBuildFileAsync(packageKey);
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
    await this._readConfigAsync("production", packageKeys);

    await this._parallelPackages(true, async packageKey => {
      const packageConfig = this.config.packages[packageKey];
      if (packageConfig.type === "none") {
        return;
      }

      await SdProjectBuilder._createTsConfigForBuildFileAsync(packageKey);
      await this._buildPackageAsync(packageKey);
    });
  }

  public async publishAsync(argv?: { build?: boolean; packages?: string; noCommit?: boolean }): Promise<void> {
    const packageKeys = optional(argv, o => o.packages!.split(",").map(item => item.trim()));
    await this._readConfigAsync("production", packageKeys);

    const logger = new Logger("@simplysm/cli");
    if (!optional(argv, o => o.noCommit)) {
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
    }

    if (optional(argv, o => o.build)) {
      await this._parallelPackages(true, async packageKey => {
        await SdProjectBuilder._createTsConfigForBuildFileAsync(packageKey);
        await this._buildPackageAsync(packageKey);
      });
    }

    await spawnAsync(["npm", "version", "patch", "--git-tag-version", "false"], {logger});

    const projectNpmConfig = await SdProjectBuilderUtil.readProjectNpmConfigAsync();

    if (Object.keys(this.config.packages).every(packageKey => !this.config.packages[packageKey].publish)) {
      throw new Error("배포할 패키지가 없습니다.");
    }

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

          const status: { total: number; current: number; filePath: string }[] = filePaths.map(filePath => ({
            filePath,
            total: fs.lstatSync(filePath).size,
            current: 0
          }));
          await Promise.all(filePaths.map(async filePath => {
            const relativeFilePath = path.relative(SdProjectBuilderUtil.getPackagesPath(packageKey, "dist"), filePath);

            await wsClient.uploadAsync(filePath, path.join("www", projectNpmConfig.name, packageKey, relativeFilePath), progress => {
              status.single(item => item.filePath === filePath)!.current = progress.current;

              const current = status.sum(item => item.current)!;
              const total = status.sum(item => item.total)!;
              packageLogger.log(`파일 업로드 : (${(Math.floor(current * 10000 / total) / 100).toFixed(2).padStart(6, " ")}%) ${current.toLocaleString()} / ${total.toLocaleString()}`);
            }, 10000);
          }));
        }
        else {
          throw new Error("미구현 (publish)");
        }

        packageLogger.log(`배포가 완료되었습니다. - v${projectNpmConfig.version}`);
      }
    });

    await spawnAsync(["git", "add", "."], {logger});

    if (!optional(argv, o => o.noCommit)) {
      await spawnAsync(["git", "commit", "-m", `"v${projectNpmConfig.version}"`], {logger});
      await spawnAsync(["git", "tag", "-a", `"v${projectNpmConfig.version}"`, "-m", `"v${projectNpmConfig.version}"`], {logger});
    }

    logger.log(`배포가 완료되었습니다.`);
  }

  public async startServerOnlyAsync(argv?: { port: number }): Promise<void> {
    await this._readConfigAsync("development", undefined);
    await this._localUpdateAsync(true);
    await this._startServerOnlyAsync(optional(argv, o => o.port) || 80);
  }

  public async _localUpdateAsync(watch?: boolean): Promise<void> {
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

        if (!watch) {
          await fs.copy(sourceDirPath, targetDirPath);
        }
        else {
          const logger = new Logger("@simplysm/cli", "local-updates");

          logger.log(`"${localUpdateKey.replace("*", subPackageName)}"의 로컬업데이트 감지를 시작합니다.`);
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

    if (!watch) {
      new Logger("@simplysm/cli").log(`로컬 업데이트 완료`);
    }
  }

  private async _createTsConfigFileAsync(packageKey: string): Promise<void> {
    const tsconfig: ITsConfig = {};
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

  private async _readConfigAsync(env: "production" | "development", packageKeys: string[] | undefined): Promise<void> {
    this.config = await SdProjectBuilderUtil.readConfigAsync(env, packageKeys);
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
                new Logger("@simplysm/cli", packageKey).error("의존성 패키지의 빌드가 끝나지 않습니다.", packageNpmDepName);
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

  private async _buildPackageAsync(packageKey: string): Promise<void> {
    await this._generatePackageIndexFileAsync(packageKey);

    await fs.remove(SdProjectBuilderUtil.getPackagesPath(packageKey, "dist"));

    const packageConfig = this.config.packages[packageKey];

    if (packageConfig.type === "none") {
    }
    else if (packageConfig.type === "node" || packageConfig.type === "dom") {
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

    await fs.remove(SdProjectBuilderUtil.getPackagesPath(packageKey, "dist"));

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
      const result = await Promise.all([
        this._runTsLintWorkerAsync(packageKey, true),
        this._runTsCheckAndDeclarationWorkerAsync(packageKey, true),
        this._runWebpackBuildWatchAsync(packageKey, serverPort)
      ]);

      return result[2];
    }
  }

  private async _startServerOnlyAsync(serverPort: number): Promise<void> {
    const logger = new Logger("@simplysm/cli", "server");
    const serverDirPath = path.dirname(require.resolve("@simplysm/ws-server"));

    let server = new SdWebSocketServer();
    await server.listenAsync(path.resolve(serverDirPath, "www"), serverPort);

    await FileWatcher.watch(
      path.resolve(process.cwd(), "node_modules", "@simplysm", "ws-server", "dist", "**/*.js"),
      ["add", "change", "unlink"],
      async () => {
        logger.log(`개발서버를 재시작합니다.`);
        await server.closeAsync();

        require("decache")("@simplysm/ws-server"); //tslint:disable-line:no-require-imports
        const newSdWebSocketServer = require("@simplysm/ws-server").SdWebSocketServer; //tslint:disable-line:no-require-imports
        server = new newSdWebSocketServer();
        await server.listenAsync(path.resolve(serverDirPath, "www"), serverPort);
        logger.info(`개발서버 서비스가 재시작되었습니다`);
      });

    logger.info(`개발서버 서비스가 시작되었습니다`);
  }

  private async _runWebpackBuildWatchAsync(packageKey: string, serverPort: number): Promise<void> {
    const logger = new Logger("@simplysm/cli", packageKey);

    const packageConfig = this.config.packages[packageKey];
    const projectNpmConfig = await SdProjectBuilderUtil.readProjectNpmConfigAsync();

    const serverDirPath = path.dirname(require.resolve("@simplysm/ws-server"));

    await new Promise<void>(async (resolve, reject) => {
      try {
        if (!this._serverMap.has(serverPort)) {
          let server = new SdWebSocketServer();
          await server.listenAsync(path.resolve(serverDirPath, "www"), serverPort);
          this._serverMap.set(serverPort, {
            server,
            packageKeys: [],
            middlewares: []
          });

          await FileWatcher.watch(
            path.resolve(process.cwd(), "node_modules", "@simplysm", "ws-server", "dist", "**/*.js"),
            ["add", "change", "unlink"],
            async () => {
              logger.log(`개발서버를 재시작합니다.`);
              await server.closeAsync();

              require("decache")("@simplysm/ws-server"); //tslint:disable-line:no-require-imports
              const newSdWebSocketServer = require("@simplysm/ws-server").SdWebSocketServer; //tslint:disable-line:no-require-imports
              server = new newSdWebSocketServer();
              await server.listenAsync(path.resolve(serverDirPath, "www"), serverPort);
              const serverInfo = this._serverMap.get(serverPort)!;
              serverInfo.server = server;
              server.expressServer!.use(serverInfo.middlewares);
              logger.info.apply(
                logger,
                [`개발서버 서비스가 재시작되었습니다`]
                  .concat(serverInfo.packageKeys.map(serverPackageKey => {
                    const serverPackageConfig = this.config.packages[serverPackageKey];
                    return serverPackageConfig.vhost
                      ? `http://${serverPackageConfig.vhost}:${serverPort}`
                      : `http://localhost:${serverPort}/${projectNpmConfig.name}/${serverPackageKey}/`;
                  }))
              );
            });
        }

        const webpackConfig: webpack.Configuration = await this._getWebpackConfigAsync(packageKey, "development");

        const compiler = webpack(webpackConfig);

        const currServerInfo = this._serverMap.get(serverPort)!;
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

        const packageDistConfigsFilePath = path.resolve(serverDirPath, "www", projectNpmConfig.name, packageKey, "configs.json");
        await fs.mkdirs(path.dirname(packageDistConfigsFilePath));
        await fs.writeJson(packageDistConfigsFilePath, {
          vhost: packageConfig.vhost,
          ...packageConfig.configs
        });

        logger.info(`개발서버 서비스가 시작되었습니다.: ` + (
          packageConfig.vhost
            ? `http://${packageConfig.vhost}:${serverPort}`
            : `http://localhost:${serverPort}/${projectNpmConfig.name}/${packageKey}/`
        ));

        compiler.hooks.done.tap("SdProjectBuilder", () => {
          resolve();
        });
      }
      catch (err) {
        reject(err);
      }
    });

    if (packageConfig.type!.startsWith("electron.")) {
      const run = () => {
        spawnAsync([
            "electron",
            path.resolve(__dirname, "../lib/electron.js"),
            `http://localhost:${serverPort}/${projectNpmConfig.name}/${packageKey}/`
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
          if (depIndexFileContent.includes(`import "`)) {
            result += `import "${depKey}";` + os.EOL;
          }
        }
        else {
          const depIndexFilePath = SdProjectBuilderUtil.getProjectPath("node_modules", depKey, "src", "index.ts");
          if (await fs.pathExists(depIndexFilePath)) {
            const depIndexFileContent = await fs.readFile(depIndexFilePath);
            if (depIndexFileContent.includes(`import "`)) {
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
      await FileWatcher.watch(SdProjectBuilderUtil.getPackagesPath(packageKey, "src/**/*.ts"), ["add", "unlink"], async () => {
        try {
          await writeAsync();
        }
        catch (err) {
          new Logger("@simplysm/cli", packageKey).error(err);
        }
      });
    }
  }

  private async _runTsLintWorkerAsync(packageKey: string, watch?: boolean): Promise<void> {
    const logger = new Logger("@simplysm/cli", packageKey);

    logger.log("코드검사를 시작합니다...");

    const worker = child_process.fork(
      path.resolve(__dirname, "..", "lib", "ts-lint-worker.js"),
      [
        packageKey,
        watch ? "watch" : "build"
      ],
      {
        stdio: ["inherit", "inherit", "inherit", "ipc"],
        execArgv: ["--max-old-space-size=2048"]
      }
    );

    await new Promise<void>((resolve, reject) => {
      worker.on("error", err => {
        logger.log("코드검사 실행중 오류가 발생했습니다.");
        reject(err);
      });

      worker.on("message", message => {
        if (message.type === "finish") {
          logger.log("코드검사가 완료되었습니다.");
          resolve();
        }
        else if (message.type === "warning") {
          logger.warn("코드검사중 경고가 발생하였습니다.", message.message);
        }
        else if (message.type === "error") {
          logger.error("코드검사중 에러가 발생하였습니다.", message.message);
          if (!watch) {
            reject(new Error(message.message));
          }
        }
        else {
          logger.error("코드검사중 메시지가 잘못되었습니다. [" + message + "]");
          if (!watch) {
            reject(new Error("코드검사중 메시지가 잘못되었습니다."));
          }
        }
      });

      worker.send([], err => {
        if (err) {
          reject(err);
        }
      });
    });

    if (watch) {
      await FileWatcher.watch(SdProjectBuilderUtil.getPackagesPath(packageKey, "src/**/*.ts"), ["add", "change"], files => {
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
        stdio: ["inherit", "inherit", "inherit", "ipc"],
        execArgv: ["--max-old-space-size=2048"]
      }
    );

    await new Promise<void>((resolve, reject) => {
      worker.on("error", err => {
        logger.log("빌드 실행중 오류가 발생했습니다.");
        reject(err);
      });

      worker.on("message", message => {
        if (message.type === "finish") {
          logger.log("빌드가 완료되었습니다.");
          resolve();
        }
        else if (message.type === "error") {
          logger.error("빌드중 에러가 발생하였습니다.", message.message);
          if (!watch) {
            reject(new Error(message.message));
          }
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
    await new Promise<void>((resolve, reject) => {
      const logger = new Logger("@simplysm/cli", packageKey);

      logger.log("타입체크를 시작합니다.");
      const worker = child_process.fork(
        path.resolve(__dirname, "..", "lib", "ts-check-and-declaration-worker.js"),
        [
          packageKey,
          watch ? "watch" : "build"
        ],
        {
          stdio: ["inherit", "inherit", "inherit", "ipc"],
          execArgv: ["--max-old-space-size=2048"]
        }
      );

      worker.on("error", err => {
        logger.log("빌드 실행중 오류가 발생했습니다.");
        reject(err);
      });

      worker.on("message", message => {
        if (message.type === "finish") {
          logger.log("타입체크가 완료되었습니다.");
          resolve();
        }
        else if (message.type === "error") {
          logger.error(`타입체크중 오류가 발생하였습니다.`, message.message);
          if (!watch) {
            reject(new Error(message.message));
          }
        }
      });
    });
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
        new SdWebpackWriteFilePlugin({
          logger: new Logger("@simplysm/cli", packageKey),
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
        }),
        new webpack.DefinePlugin({
          "process.env": SdProjectBuilder._envStringify({
            VERSION: projectNpmConfig.version
          })
        })
      ],
      externals: [
        (context, request, callback) => {
          if (request === "fs" || request === "fs-extra") {
            callback(undefined, "undefined");
            return;
          }

          if (request === "ws") {
            callback(undefined, `WebSocket`);
            return;
          }

          callback(undefined, undefined);
        }
      ]
    };

    if (mode === "production") {
      webpackConfig = webpackMerge(webpackConfig, {
        mode: "production",
        devtool: "source-map",
        entry: path.resolve(__dirname, "../lib/main.js"),
        optimization: {
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
      webpackConfig.target = "electron-renderer";
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
