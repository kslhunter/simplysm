import {DateTime, FileWatcher, Logger, ProcessManager, Wait} from "@simplysm/sd-core";
import * as path from "path";
import * as fs from "fs-extra";
import * as ts from "typescript";
import * as glob from "glob";
import * as child_process from "child_process";
import {ISdProjectConfig, ISdWorkerMessage} from "./commons";
import * as os from "os";
import * as semver from "semver";
import {NextHandleFunction, SdServiceServer} from "@simplysm/sd-service";
import {SdPackageBuilder} from "./SdPackageBuilder";
import {SdCliUtil} from "./SdCliUtil";

export class SdProjectBuilder {
  private readonly _serverMap = new Map<string, {
    server: SdServiceServer;
    middlewares: NextHandleFunction[];
    clientKeys: string[];
  }>();

  public async localUpdateAsync(watch?: boolean): Promise<void> {
    const logger = new Logger("@simplysm/sd-cli", `[local-update]`);
    logger.log(watch ? `변경감지를 시작합니다.` : `업데이트를 시작합니다.`);

    // "simplysm.json" 정보 가져오기
    const config: ISdProjectConfig = await fs.readJson(path.resolve(process.cwd(), "simplysm.json"));

    // 옵션체크
    if (!config.localUpdates) {
      logger.warn("설정되어있지 않습니다. ('simplysm.json' -> 'localUpdates')");
      return;
    }

    // 로컬 업데이트 설정별 병렬로,
    await Promise.all(Object.keys(config.localUpdates).map(async localUpdateKey => {
      // > "node_modules'에서 로컬업데이트 설정에 맞는 패키지를 "glob"하여 대상 패키지경로 목록 가져오기
      const targetPaths = await new Promise<string[]>(async (resolve, reject) => {
        glob(path.resolve(process.cwd(), "node_modules", localUpdateKey), (err, files) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(files);
        });
      });

      // > 대상 패키지 경로별 병렬로,
      await Promise.all(targetPaths.map(async targetPath => {
        const targetName = targetPath.match(new RegExp(
          localUpdateKey.replace(/([\/.*])/g, item => item === "/" ? "\\/" : item === "." ? "\\." : item === "*" ? "(.*)" : item)
        ))![1];

        const targetLogger = new Logger("@simplysm/sd-cli", `[local-update] ${targetName}`);

        // > > 로컬 업데이트 설정에 따라, 가져올 소스 경로 추출
        const sourcePath = path.resolve(config.localUpdates![localUpdateKey].replace(/\*/g, targetName));

        // > > 변경감지 모드일 경우,
        if (watch) {
          // > > > 변경감지 시작
          await FileWatcher.watch(path.resolve(sourcePath, "**", "*"), ["add", "change", "unlink"], async changes => {
            try {
              for (const change of changes) {
                const targetFilePath = path.resolve(targetPath, path.relative(sourcePath, change.filePath));

                targetLogger.log(`파일이 변경되었습니다: [${change.type}] ${change.filePath}`);
                if (change.type === "unlink") {
                  await fs.remove(targetFilePath);
                }
                else {
                  await fs.copy(change.filePath, targetFilePath);
                }
              }
            }
            catch (err) {
              targetLogger.error(err);
            }
          }, 600);
        }
        // > > 변경감지 모드가 아닐 경우,
        else {
          // > > 소스경로에서 대상경로로 파일 복사
          await fs.copy(sourcePath, targetPath);
        }
      }));
    }));

    logger.log(watch ? `모든 변경감지를 시작되었습니다.` : `모든 업데이트가 완료되었습니다.`);
  }

  public async buildAsync(argv: { watch: boolean; profile: boolean; options?: string }): Promise<void> {
    const logger = new Logger("@simplysm/sd-cli");

    // "simplysm.json" 정보 가져오기
    const config: ISdProjectConfig = await SdCliUtil.getConfigObjAsync(
      argv.watch ? "development" : "production",
      argv.options ? argv.options.split(",").map(item => item.trim()) : undefined
    );

    // 패키지정보별 병렬실행,
    await Promise.all(Object.keys(config.packages).map(async packageKey => {
      const packagePath = path.resolve(process.cwd(), "packages", packageKey);
      const packageTsConfig = await fs.readJson(path.resolve(packagePath, "tsconfig.json"));
      const packageParsedTsConfig = ts.parseJsonConfigFileContent(packageTsConfig, ts.sys, packagePath);
      const distPath = packageParsedTsConfig.options.outDir ? path.resolve(packageParsedTsConfig.options.outDir) : path.resolve(packagePath, "dist");

      // > tsconfig.build.json 구성
      const buildTsConfig = Object.clone(packageTsConfig);
      const tsOptions = buildTsConfig.compilerOptions;
      if (tsOptions && tsOptions.baseUrl && tsOptions.paths) {
        for (const tsPathKey of Object.keys(tsOptions.paths)) {
          const result = [];
          for (const tsPathValue of tsOptions.paths[tsPathKey] as string[]) {
            result.push(tsPathValue.replace(/\/src\/index\.ts$/, ""));
          }
          tsOptions.paths[tsPathKey] = result;
        }
      }

      await Promise.all([
        fs.remove(distPath),
        fs.writeJson(path.resolve(packagePath, "tsconfig.build.json"), buildTsConfig, {spaces: 2, EOL: os.EOL})
      ]);
    }));

    // 변경감지 모드일 경우, 로컬 업데이트 변경감지 실행
    if (argv.watch && config.localUpdates) {
      await this.localUpdateAsync(true);
    }

    const startDateTime = new DateTime();
    logger.info("빌드 프로세스를 시작합니다.");

    // 병렬로,
    await Promise.all([
      // > 패키지별 병렬로,
      this._parallelPackagesByDepAsync(Object.keys(config.packages), async packageKey => {
        if (config.packages[packageKey].type === undefined || config.packages[packageKey].type === "server") {
          // > > 빌드
          const worker = await this._runPackageBuildWorkerAsync("build", packageKey, argv.options, argv.watch);

          // > > 변경감지 모드이며, 서버빌드 일때, 서버 실행 (변경감지 포함)
          if (argv.watch && config.packages[packageKey].type === "server") {
            await this._runServerAsync(packageKey, worker);
          }
        }
        else if (!argv.watch) {
          // > > 빌드
          await this._runPackageBuildWorkerAsync("build", packageKey, argv.options, false);
        }
        else {
          // > > 빌드
          await this._runClientWatcherAsync(
            packageKey,
            argv.options ? argv.options.split(",").map(item => item.trim()) : undefined
          );
        }
      }).then(() => {
        logger.info("모든 'build'가 완료되었습니다.");
      }),
      // > 패키지별 병렬로,
      this._parallelPackagesByDepAsync(Object.keys(config.packages), async packageKey => {
        // > > 타입체크 및 ".d"파일 생성
        await this._runPackageBuildWorkerAsync("check", packageKey, argv.options, argv.watch);

      }).then(() => {
        logger.info("모든 'check'가 완료되었습니다.");
      }),
      // > 패키지별 병렬로,
      Promise.all(Object.keys(config.packages).map(async packageKey => {
        // > > LINT
        await this._runPackageBuildWorkerAsync("lint", packageKey, argv.options, argv.watch);

      })).then(() => {
        logger.info("모든 'lint'가 완료되었습니다.");
      })
    ]);

    const span = new DateTime().tick - startDateTime!.tick;
    logger.info(`모든 빌드 프로세스가 완료되었습니다: ${span.toLocaleString()}ms`);
  }

  public async publishAsync(argv: { build: boolean; options?: string }): Promise<void> {
    const logger = new Logger("@simplysm/sd-cli", "[publish]");

    const projectNpmConfigPath = path.resolve(process.cwd(), "package.json");
    const projectNpmConfig = await fs.readJson(projectNpmConfigPath);

    // "simplysm.json" 정보 가져오기
    const config: ISdProjectConfig = await SdCliUtil.getConfigObjAsync(
      "production",
      argv.options ? argv.options.split(",").map(item => item.trim()) : undefined
    );

    // 커밋되지 않은 수정사항이 있는지 확인
    await ProcessManager.spawnAsync("git status", {
      logger: {
        log: data => {
          const message = data.toString();
          if (message.includes("Changes") || message.includes("Untracked")) {
            throw new Error("커밋되지 않은 정보가 있습니다.");
          }
        },
        error: message => {
          process.stderr.write(message);
        }
      }
    });

    // 빌드가 필요하면 빌드함
    if (argv.build) {
      await this.buildAsync({watch: false, profile: false});
    }

    // 프로젝트 "package.json" 버전 업
    projectNpmConfig.version = semver.inc(projectNpmConfig.version, "patch");
    await fs.writeJson(projectNpmConfigPath, projectNpmConfig, {spaces: 2, EOL: os.EOL});

    // 프로젝트 "package.json"의 의존성 패키지 버전목록 가져오기
    const projectDepObj = {
      ...(projectNpmConfig.dependencies || {}),
      ...(projectNpmConfig.devDependencies || {}),
      ...(projectNpmConfig.peerDependencies || {})
    };

    // 현재 프로젝트의 패키지명 목록 가져오기
    const allPackageNames = Object.keys(config.packages).map(key => ("@" + projectNpmConfig.name + "/" + key));

    // 패키지정보별 병렬실행,
    await Promise.all(Object.keys(config.packages).map(async packageKey => {
      const packagePath = path.resolve(process.cwd(), "packages", packageKey);
      const packageNpmConfigPath = path.resolve(packagePath, "package.json");
      const packageNpmConfig = await fs.readJson(packageNpmConfigPath);

      // > "npmConfig" 버전 변경
      packageNpmConfig.version = projectNpmConfig.version;

      // > "npmConfig"의 의존성 종류별,
      for (const depType of ["dependencies", "devDependencies", "peerDependencies"]) {
        const depObj = packageNpmConfig[depType];
        if (!depObj) continue;

        // > > 의존성 종류의 의존성 키별,
        for (const depKey of Object.keys(depObj)) {
          // > > > 프로젝트 "package.json"의 의존성 패키지 버전목록에 있는것들 프로젝트의 의존성버전으로 변경
          if (Object.keys(projectDepObj).includes(depKey)) {
            depObj[depKey] = projectDepObj[depKey];
          }
          // > > > 프로젝트의 서브패키지에 대한 버전을 프로젝트 자체 버전으로 변경
          else if (allPackageNames.includes(depKey)) {
            depObj[depKey] = projectNpmConfig.version;
          }
          else {
            throw new Error(`의존성 정보를 찾을 수 없습니다.(${packageKey}, ${depType}, ${depKey})`);
          }
        }
      }

      // > "npmConfig"를 패키지 "package.json"에 다시쓰기
      await fs.writeJson(packageNpmConfigPath, packageNpmConfig, {spaces: 2, EOL: os.EOL});

      // > 배포
      if (config.packages[packageKey].publish === "npm") {
        await ProcessManager.spawnAsync("yarn publish --access public", {cwd: packagePath});
      }
    }));

    await ProcessManager.spawnAsync("git add .");
    await ProcessManager.spawnAsync(`git commit -m "v${projectNpmConfig.version}"`);
    await ProcessManager.spawnAsync(`git tag -a "v${projectNpmConfig.version}" -m "v${projectNpmConfig.version}"`);

    logger.log(`모든 배포가 완료되었습니다. - v${projectNpmConfig.version}`);
  }

  private async _runPackageBuildWorkerAsync(type: string, packageKey: string, options?: string, watch?: boolean): Promise<child_process.ChildProcess> {
    const logger = new Logger("@simplysm/sd-cli", `[${type}]\t${packageKey}`);

    return await new Promise<child_process.ChildProcess>((resolve, reject) => {
      const execArgv = Object.clone(process.execArgv);
      if (execArgv.some(item => item.startsWith("--logfile"))) {
        const index = execArgv.indexOf(execArgv.single(item => item.startsWith("--logfile"))!);
        execArgv[index] = `--logfile=profiling/${type}.log`;
      }

      const worker = child_process.fork(
        eval(`require.resolve("./package-build-worker")`), //tslint:disable-line:no-eval
        [type, packageKey, watch ? "watch" : "build", ...(options ? [options] : [])],
        {
          stdio: ["inherit", "inherit", "inherit", "ipc"],
          cwd: process.cwd(),
          execArgv
        }
      );

      let startDateTime: DateTime | undefined;
      worker.on("message", (message: ISdWorkerMessage) => {
        try {
          switch (message.type) {
            case "run":
              startDateTime = new DateTime();
              logger.log(`시작합니다.`);
              break;
            case "done":
              const span = new DateTime().tick - startDateTime!.tick;
              logger.log(`완료되었습니다: ${span.toLocaleString()}ms`);
              resolve(worker);
              break;
            case "log":
              logger.log(message.message);
              break;
            case "info":
              logger.info(message.message);
              break;
            case "warning":
              logger.warn(`경고가 발생했습니다.`, message.message);
              break;
            case "error":
              logger.error(`오류가 발생했습니다.`, message.message);
              reject(new Error(`오류가 발생했습니다.(${type}, ${packageKey})${message.message ? os.EOL + message.message : ""}`));
              break;
            default:
              logger.error(`처리되지 않은 메시지가 출력되었습니다.(${message.type})`);
              reject(new Error(`처리되지 않은 메시지가 출력되었습니다.(${type}, ${packageKey}, ${message.type})`));
          }
        }
        catch (err) {
          err.message += `(${type}, ${packageKey})`;
          reject(err);
        }
      });
    });
  }

  private async _runClientWatcherAsync(packageKey: string, options?: string[]): Promise<void> {
    const logger = new Logger("@simplysm/sd-cli", `[client]\t${packageKey}`);

    const config: ISdProjectConfig = await SdCliUtil.getConfigObjAsync("development", options);
    const packageConfig = config.packages[packageKey];
    if (!packageConfig.server) {
      throw new Error(`서버 패키지가 설정되어있지 않습니다. (client, ${packageKey})`);
    }

    if (!Object.keys(config.packages).includes(packageConfig.server)) {
      throw new Error(`클라이언트를 올릴 서버 패키지가 빌드 설정에 존재하지 않습니다. (client, ${packageKey})`);
    }

    const middlewares = await new Promise<NextHandleFunction[]>(async (resolve, reject) => {
      try {
        let startDateTime: DateTime | undefined;
        const builder = new SdPackageBuilder(packageKey, options);
        builder
          .on("run", () => {
            startDateTime = new DateTime();
            logger.log(`시작합니다.`);
          })
          .on("done", () => {
            const span = new DateTime().tick - startDateTime!.tick;
            logger.log(`완료되었습니다: ${span.toLocaleString()}ms`);
          })
          .on("log", () => (message: string) => {
            logger.log(message);
          })
          .on("info", (message: string) => {
            logger.info(message);
          })
          .on("warning", (message: string) => {
            logger.warn(`경고가 발생했습니다.`, message);
          })
          .on("error", (message: string) => {
            logger.error(`오류가 발생했습니다.`, message);
            reject(new Error(`오류가 발생했습니다.(client, ${packageKey})${message ? os.EOL + message : ""}`));
          });

        resolve(await builder.watchAsync());
      }
      catch (err) {
        logger.error(`오류가 발생했습니다.`, err.stack);
        reject(new Error(`오류가 발생했습니다.(client, ${packageKey})${err.stack ? os.EOL + err.stack : ""}`));
      }
    });

    await Wait.true(() => this._serverMap.has(packageConfig.server!));

    const serverInfo = this._serverMap.get(packageConfig.server)!;
    serverInfo.clientKeys.push(packageKey);
    serverInfo.middlewares.pushRange(middlewares);
    for (const middleware of middlewares) {
      serverInfo.server.addMiddleware(middleware);
    }

    const packageConfigDistPath = path.resolve(serverInfo.server.rootPath, "www", packageKey, ".configs.json");
    await fs.mkdirs(path.dirname(packageConfigDistPath));
    await fs.writeJson(packageConfigDistPath, packageConfig.configs, {spaces: 2, EOL: os.EOL});

    await FileWatcher.watch(path.resolve(process.cwd(), "simplysm.json"), ["change"], async () => {
      const currConfig: ISdProjectConfig = await SdCliUtil.getConfigObjAsync("development", options);
      const currPackageConfig = currConfig.packages[packageKey];

      if (!Object.equal(currPackageConfig.configs, packageConfig.configs)) {
        await fs.mkdirs(path.dirname(packageConfigDistPath));
        await fs.writeJson(packageConfigDistPath, currPackageConfig.configs, {spaces: 2, EOL: os.EOL});
        logger.log(`'${packageKey}'의 '.configs.json' 파일이 변경되었습니다.`);
      }
    });

    logger.info(`개발서버 서비스가 시작되었습니다.: http://localhost:${serverInfo.server.port}/${packageKey}/`);
  }

  private async _runServerAsync(packageKey: string, worker: child_process.ChildProcess): Promise<void> {
    const packageServerLogger = new Logger("@simplysm/sd-cli", `[server]\t${packageKey}`);
    packageServerLogger.log("시작합니다.");

    const packagePath = path.resolve(process.cwd(), "packages", packageKey);
    const packageNpmConfig = await fs.readJson(path.resolve(packagePath, "package.json"));

    // @ts-ignore
    // noinspection JSUnusedLocalSymbols
    const packageEntryPath = path.resolve(packagePath, packageNpmConfig.main);

    // 서버 시작
    const server = eval(`require("${packageEntryPath.replace(/\\/g, "\\\\")}")`) as SdServiceServer; //tslint:disable-line:no-eval

    // 서버가 시작되면,
    await new Promise<void>(resolve => {
      server.on("ready", () => {
        // > 서버 맵 구성
        this._serverMap.set(packageKey, {
          server,
          middlewares: [],
          clientKeys: []
        });

        resolve();
      });
    });

    // 서버빌드 메시지 발생별,
    worker.on("message", async (message: ISdWorkerMessage) => {
      // > 서버빌드 완료시 (변경감지일 경우)
      if (message.type === "done") {
        packageServerLogger.log("재시작합니다.");

        // > > 서버 재시작
        const serverInfo = this._serverMap.get(packageKey)!;
        await serverInfo.server.closeAsync();
        require("decache")(packageEntryPath); //tslint:disable-line:no-require-imports
        const newServer = eval(`require("${packageEntryPath.replace(/\\/g, "\\\\")}")`) as SdServiceServer; //tslint:disable-line:no-eval
        serverInfo.server = newServer;
        for (const middleware of serverInfo.middlewares) {
          newServer.addMiddleware(middleware);
        }

        packageServerLogger.log.apply(packageServerLogger, ["재시작되었습니다."].concat(
          serverInfo.clientKeys.map(clientKey => {
            return `http://localhost:${server.port}/${clientKey}/`;
          })
        ));
      }
    });

    packageServerLogger.log("시작되었습니다.");
  }

  private async _parallelPackagesByDepAsync(packageKeys: string[], cb: (packageKey: string) => Promise<void>): Promise<void> {
    const completedPackageName: string[] = [];

    await Promise.all(packageKeys.map(async packageKey => {
      const projectNpmConfig = await fs.readJson(path.resolve(process.cwd(), "package.json"));
      const packagePath = path.resolve(process.cwd(), "packages", packageKey);
      const packageNpmConfig = await fs.readJson(path.resolve(packagePath, "package.json"));

      // > 패키지의 의존성 패키지 중에 빌드해야할 패키지 목록에 이미 있는 의존성 패키지만 추리기
      const deps = [
        ...Object.keys(packageNpmConfig.dependencies || {}),
        ...Object.keys(packageNpmConfig.devDependencies || {}),
        ...Object.keys(packageNpmConfig.peerDependencies || {})
      ].filter(dep =>
        packageKeys.some(key => ("@" + projectNpmConfig.name + "/" + key) === dep)
      );

      // > 추려진 의존성 패키지별,
      for (const dep of deps) {
        // > > 의존성 패키지의 빌드가 완료될때까지 기다리기
        await Wait.true(() => completedPackageName.includes(dep));
      }

      await cb(packageKey);

      completedPackageName.push("@" + projectNpmConfig.name + "/" + packageKey);
    }));
  }
}