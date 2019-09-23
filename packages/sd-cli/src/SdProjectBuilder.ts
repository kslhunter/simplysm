import {DateTime, FileWatcher, Logger, ProcessManager, Wait} from "@simplysm/sd-core";
import * as path from "path";
import * as fs from "fs-extra";
import * as ts from "typescript";
import * as glob from "glob";
import * as child_process from "child_process";
import {ISdProjectConfig, ISdWorkerMessage} from "./commons/interfaces";
import * as os from "os";
import * as semver from "semver";
import {NextHandleFunction, SdServiceClient, SdServiceServer} from "@simplysm/sd-service";
import {SdAngularCompiler} from "./SdAngularCompiler";
import {SdCliUtils} from "./commons/SdCliUtils";
import {SdTypescriptProgram} from "./SdTypescriptProgram";

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
    const config: ISdProjectConfig = SdCliUtils.getConfigObj("development");

    // 옵션체크
    if (!config.localUpdates) {
      logger.warn("설정되어있지 않습니다. ('simplysm.json' -> 'localUpdates')");
      return;
    }

    // 로컬 업데이트 설정별 병렬로,
    await Promise.all(Object.keys(config.localUpdates).map(async localUpdateKey => {
      // > "node_modules'에서 로컬업데이트 설정에 맞는 패키지를 "glob"하여 대상 패키지경로 목록 가져오기
      const targetPaths = await new Promise<string[]>((resolve, reject) => {
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

        const targetLogger = new Logger("@simplysm/sd-cli", `[local-update]\t${targetName}`);

        // > > 로컬 업데이트 설정에 따라, 가져올 소스 경로 추출
        const sourcePath = path.resolve(config.localUpdates![localUpdateKey].replace(/\*/g, targetName));
        if (!fs.pathExistsSync(sourcePath)) {
          logger.info(`소스경로를 찾을 수 없어 무시됩니다(${sourcePath})`);
          return;
        }

        // > > 변경감지 모드일 경우,
        if (watch) {
          // > > > 변경감지 시작
          await FileWatcher.watch(path.resolve(sourcePath, "**", "*"), ["add", "change", "unlink"], async changes => {
            try {
              targetLogger.log(`파일이 변경되었습니다.`, ...changes.map(item => `[${item.type}] ${item.filePath}`));

              for (const change of changes) {
                if (
                  change.filePath.includes("node_modules") ||
                  change.filePath.endsWith("package.json")
                ) {
                  continue;
                }

                const targetFilePath = path.resolve(targetPath, path.relative(sourcePath, change.filePath));

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
          }, {
            millisecond: 600
          });
        }
        // > > 변경감지 모드가 아닐 경우,
        else {
          // > > 소스경로에서 대상경로로 파일 복사
          await fs.copy(sourcePath, targetPath, {
            filter: (src: string) => {
              return !src.includes("node_modules") &&
                !src.endsWith("package.json");
            }
          });
        }
      }));
    }));

    logger.log(watch ? `모든 변경감지가 시작되었습니다.` : `모든 업데이트가 완료되었습니다.`);
  }

  public async buildAsync(argv: { watch: boolean; options?: string }): Promise<void> {
    const logger = new Logger("@simplysm/sd-cli");

    // "simplysm.json" 정보 가져오기
    const config: ISdProjectConfig = SdCliUtils.getConfigObj(
      argv.watch ? "development" : "production",
      argv.options ? argv.options.split(",").map(item => item.trim()) : undefined
    );

    // 패키지정보별 병렬실행,
    await Promise.all(Object.keys(config.packages).map(async packageKey => {
      if (config.packages[packageKey].type === "none") {
        return;
      }

      const packagePath = path.resolve(process.cwd(), "packages", packageKey);
      const packageTsConfigPath = path.resolve(packagePath, "tsconfig.json");
      const packageTsConfig = await fs.readJson(packageTsConfigPath);
      const packageParsedTsConfig = ts.parseJsonConfigFileContent(packageTsConfig, ts.sys, packagePath);
      const distPath = packageParsedTsConfig.options.outDir ? path.resolve(packageParsedTsConfig.options.outDir) : path.resolve(packagePath, "dist");

      // > tsconfig.build.json 구성
      const buildTsConfig = Object.clone(packageTsConfig);
      buildTsConfig.compilerOptions = buildTsConfig.compilerOptions || {};
      const tsOptions = buildTsConfig.compilerOptions;
      if (tsOptions.baseUrl && tsOptions.paths) {
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

    const completedDeclarationPackageNames: string[] = [];
    const completedCompilePackageNames: string[] = [];
    const workerCpuUsages: { packageKey: string; type: string; cpuUsage: number }[] = [];
    const prefix = argv.watch ? "watch" : "run";
    const packageKeys = Object.keys(config.packages);

    await Promise.all([
      this._parallelPackagesByDepAsync(packageKeys, async (packageKey, packageName, projectOwnDepPackageNames) => {
        if (config.packages[packageKey].type === "none") {
          return;
        }

        if (config.packages[packageKey].type === "library" || config.packages[packageKey].type === "server") {
          // 변경감지 모드가 아니고, 서버빌드이면, 'webpack'으로 빌드
          if (!argv.watch && config.packages[packageKey].type === "server") {
            const worker = await this._runWorkerAsync(
              `run-compile-server`,
              packageKey,
              argv.options
            );

            if (worker.cpuUsage) {
              workerCpuUsages.push({packageKey, type: worker.workerName, cpuUsage: worker.cpuUsage});
            }
          }
          else {
            const worker = await this._runWorkerAsync(
              `${prefix}-compile`,
              packageKey,
              argv.options
            );

            if (worker.cpuUsage) {
              workerCpuUsages.push({packageKey, type: worker.workerName, cpuUsage: worker.cpuUsage});
            }

            // 변경감지 모드이며, 서버빌드 일때, 서버 실행 (변경감지 포함)
            if (argv.watch && config.packages[packageKey].type === "server") {
              const packagePath = path.resolve(process.cwd(), "packages", packageKey);
              const packageTsConfigPath = path.resolve(packagePath, "tsconfig.json");
              await this._runServerAsync(packageKey, worker, packageTsConfigPath);
            }
          }

          completedCompilePackageNames.push(packageName);
        }
        else {
          // 의존성 패키지들의 declaration 체크
          await Wait.true(() => projectOwnDepPackageNames.every(item => completedDeclarationPackageNames.includes(item)));

          if (!argv.watch) {
            const worker = await this._runWorkerAsync(
              "run-angular",
              packageKey,
              argv.options
            );
            if (worker.cpuUsage) {
              workerCpuUsages.push({packageKey, type: worker.workerName, cpuUsage: worker.cpuUsage});
            }
          }
          else {
            await this._runClientWatcherAsync(
              packageKey,
              argv.options ? argv.options.split(",").map(item => item.trim()) : undefined
            );
          }
        }
      }).then(() => {
        logger.info("모든 'compile'가 완료되었습니다.");
      }),
      this._parallelPackagesByDepAsync(packageKeys, async (packageKey, packageName, projectOwnDepPackageNames) => {
        if (config.packages[packageKey].type === "none") {
          return;
        }

        if (config.packages[packageKey].type !== "library" && config.packages[packageKey].type !== "server") {
          return;
        }

        const worker = await this._runWorkerAsync(`${prefix}-check`, packageKey);

        if (worker.cpuUsage) {
          workerCpuUsages.push({packageKey, type: worker.workerName, cpuUsage: worker.cpuUsage});
        }

        completedDeclarationPackageNames.push(packageName);
      }).then(() => {
        logger.info("모든 'check'가 완료되었습니다.");
      }),
      Promise.all(packageKeys.map(async packageKey => {
        if (config.packages[packageKey].type === "none") {
          return;
        }

        // angular 인 경우, 컴파일 완료를 기다림
        if (config.packages[packageKey].type !== "library" && config.packages[packageKey].type !== "server") {
          const projectNpmConfig = await fs.readJson(path.resolve(process.cwd(), "package.json"));
          const packageName = "@" + projectNpmConfig.name + "/" + packageKey;

          await Wait.true(() => completedCompilePackageNames.includes(packageName));
        }

        const worker = await this._runWorkerAsync(`${prefix}-lint`, packageKey);

        if (worker.cpuUsage) {
          workerCpuUsages.push({packageKey, type: worker.workerName, cpuUsage: worker.cpuUsage});
        }
      })).then(() => {
        logger.info("모든 'lint'가 완료되었습니다.");
      }),
      Promise.all(packageKeys.map(async packageKey => {
        if (config.packages[packageKey].type !== "library" || config.packages[packageKey].framework !== "angular") {
          return;
        }

        const worker = await this._runWorkerAsync(
          `${prefix}-metadata`,
          packageKey
        );

        if (worker.cpuUsage) {
          workerCpuUsages.push({packageKey, type: worker.workerName, cpuUsage: worker.cpuUsage});
        }
      })).then(() => {
        logger.info("모든 'metadata'가 완료되었습니다.");
      })
    ]);

    let cpuMessage = "------------------------\n";
    const maxPackageKeyLength = workerCpuUsages.max(item => item.packageKey.length)!;
    const maxTypeLength = workerCpuUsages.max(item => item.type.length)!;
    const sumCpuUsage = workerCpuUsages.sum(item => item.cpuUsage)!;

    const appendCpuMessageByGroup = (groupName: "type" | "packageKey") => {
      const groupedCpuUsages = workerCpuUsages.groupBy(item => item[groupName]).map(item => ({
        type: item.key,
        packageKey: item.key,
        cpuUsage: item.values.sum(item1 => item1.cpuUsage)!
      }));
      const maxGroupedCpuUsageLength = groupedCpuUsages.max(item => item.cpuUsage.toLocaleString().length)!;
      for (const groupedWorkerCpuUsage of groupedCpuUsages.orderBy(item => item.cpuUsage, true)) {
        cpuMessage += `${groupedWorkerCpuUsage.type.padEnd(maxTypeLength)}\t${groupedWorkerCpuUsage.cpuUsage.toLocaleString().padStart(maxGroupedCpuUsageLength)}ms\t${(100 * groupedWorkerCpuUsage.cpuUsage / sumCpuUsage).toFixed(2).padStart(5)}%\n`;
      }
      cpuMessage += "------------------------\n";
    };
    appendCpuMessageByGroup("type");
    appendCpuMessageByGroup("packageKey");

    const maxCpuUsageLength = workerCpuUsages.max(item => item.cpuUsage.toLocaleString().length)!;
    for (const workerCpuUsage of workerCpuUsages.orderBy(item => item.cpuUsage, true)) {
      cpuMessage += `${workerCpuUsage.type.padEnd(maxTypeLength)}\t${workerCpuUsage.packageKey.padEnd(maxPackageKeyLength)}\t${workerCpuUsage.cpuUsage.toLocaleString().padStart(maxCpuUsageLength)}ms\t${(100 * workerCpuUsage.cpuUsage / sumCpuUsage).toFixed(2).padStart(5)}%\n`;
    }
    cpuMessage += "------------------------";

    const span = new DateTime().tick - startDateTime!.tick;
    logger.info(`모든 빌드 프로세스가 완료되었습니다: ${span.toLocaleString()}ms\n${cpuMessage}`);
  }

  public async publishAsync(argv: { build: boolean; options?: string }): Promise<void> {
    const logger = new Logger("@simplysm/sd-cli", "[publish]");

    const projectNpmConfigPath = path.resolve(process.cwd(), "package.json");
    const projectNpmConfig = await fs.readJson(projectNpmConfigPath);

    // "simplysm.json" 정보 가져오기
    const config: ISdProjectConfig = SdCliUtils.getConfigObj(
      "production",
      argv.options ? argv.options.split(",").map(item => item.trim()) : undefined
    );

    if (await fs.pathExists(path.resolve(process.cwd(), ".git"))) {
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
    }

    // 빌드가 필요하면 빌드함
    if (argv.build) {
      await this.buildAsync({watch: false, options: argv.options});
    }

    // 프로젝트 "package.json" 버전 업
    projectNpmConfig.version = semver.inc(projectNpmConfig.version, "patch");
    await fs.writeJson(projectNpmConfigPath, projectNpmConfig, {spaces: 2, EOL: os.EOL});

    /*// 프로젝트 "package.json"의 의존성 패키지 버전목록 가져오기
    const projectDepObj = {
      ...(projectNpmConfig.dependencies || {}),
      ...(projectNpmConfig.devDependencies || {}),
      ...(projectNpmConfig.peerDependencies || {})
    };*/

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
          /*// > > > 프로젝트 "package.json"의 의존성 패키지 버전목록에 있는것들 프로젝트의 의존성버전으로 변경
          if (Object.keys(projectDepObj).includes(depKey)) {
            depObj[depKey] = projectDepObj[depKey];
          }
          // > > > 프로젝트의 서브패키지에 대한 버전을 프로젝트 자체 버전으로 변경
          else*/
          if (allPackageNames.includes(depKey)) {
            depObj[depKey] = projectNpmConfig.version;
          }
          /*else {
            throw new Error(`의존성 정보를 찾을 수 없습니다.(${packageKey}, ${depType}, ${depKey})`);
          }*/
        }
      }

      // > "npmConfig"를 패키지 "package.json"에 다시쓰기
      await fs.writeJson(packageNpmConfigPath, packageNpmConfig, {spaces: 2, EOL: os.EOL});
    }));

    if (await fs.pathExists(path.resolve(process.cwd(), ".git"))) {
      await ProcessManager.spawnAsync("git add .");
      await ProcessManager.spawnAsync(`git commit -m "v${projectNpmConfig.version}"`);
      await ProcessManager.spawnAsync(`git tag -a "v${projectNpmConfig.version}" -m "v${projectNpmConfig.version}"`);
    }

    await Promise.all(Object.keys(config.packages).map(async packageKey => {
      const packageLogger = new Logger("@simplysm/sd-cli", `[publish]\t${packageKey}`);
      const packagePath = path.resolve(process.cwd(), "packages", packageKey);

      // > 배포
      if (config.packages[packageKey].publish) {
        const publishConfig = config.packages[packageKey].publish!;

        const distConfig = await fs.readJson(path.resolve(packagePath, "dist", ".configs.json"));
        if (publishConfig === "npm") {
          if (distConfig.env === "development") {
            throw new Error("개발버전을 배포할 순 없습니다.");
          }

          await ProcessManager.spawnAsync("yarn publish --access public", {cwd: packagePath, logger: packageLogger});
        }
        else if (publishConfig.type === "simplysm") {
          if (distConfig.env === "development") {
            throw new Error("개발버전을 배포할 순 없습니다.");
          }

          const wsClient = new SdServiceClient(
            publishConfig.port || (publishConfig.ssl ? 443 : 80),
            publishConfig.host,
            publishConfig.ssl,
            publishConfig.origin
          );
          await wsClient.connectAsync();

          // 결과 파일 업로드
          const filePaths = await new Promise<string[]>((resolve, reject) => {
            glob(path.resolve(packagePath, "dist", "**", "*"), {dot: true}, (err, files) => {
              if (err) {
                reject(err);
                return;
              }

              resolve(files.filter(file => !fs.lstatSync(file).isDirectory()));
            });
          });

          const uploadFileInfos: { total: number; current: number; filePath: string; targetPath: string }[] = [];
          await Promise.all(filePaths.map(async filePath => {
            const relativeFilePath = path.relative(path.resolve(packagePath, "dist"), filePath);
            const targetPath = path.posix.join(publishConfig.path, relativeFilePath);

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

          await wsClient.closeAsync();
        }
        else {
          throw new Error("미구현");
        }
      }
    }));

    logger.log(`모든 배포가 완료되었습니다. - v${projectNpmConfig.version}`);
  }

  private async _runWorkerAsync(workerName: string, packageKey: string, ...args: (string | undefined)[]): Promise<child_process.ChildProcess & { cpuUsage?: number; workerName: string }> {
    const logger = new Logger("@simplysm/sd-cli", `[${workerName}]\t${packageKey}`);

    let hasError = false;
    const wk = await new Promise<child_process.ChildProcess>((resolve, reject) => {
      const execArgv = Object.clone(process.execArgv);
      if (execArgv.some(item => item.startsWith("--logfile"))) {
        const index = execArgv.indexOf(execArgv.single(item => item.startsWith("--logfile"))!);
        execArgv[index] = `--logfile=profiling/${workerName}-${packageKey}.log`;
      }

      const worker = child_process.fork(
        require.resolve(`./workers/${workerName}`),
        [packageKey, ...args.filterExists()],
        {
          stdio: ["inherit", "inherit", "inherit", "ipc"],
          cwd: process.cwd(),
          env: process.env,
          execArgv: [...execArgv]
        }
      );

      worker.on("message", (message: ISdWorkerMessage) => {
        try {
          switch (message.type) {
            case "run":
              logger.log(`시작합니다.`);
              break;
            case "done":
              logger.log(`완료되었습니다: ${message.message.cpuUsage.toLocaleString()}ms`);
              worker["cpuUsage"] = message.message.cpuUsage;
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
              hasError = true;
              break;
            default:
              logger.error(`처리되지 않은 메시지가 출력되었습니다.(${message.type})`);
              reject(new Error(`처리되지 않은 메시지가 출력되었습니다.(${workerName}, ${packageKey}, ${message.type})`));
          }
        }
        catch (err) {
          err.message += `(${workerName}, ${packageKey})`;
          reject(err);
        }
      });
    });

    if (hasError) {
      throw new Error(`오류가 발생했습니다.(${workerName}, ${packageKey})`);
    }

    wk["workerName"] = workerName;
    return wk as any;
  }

  private async _runClientWatcherAsync(packageKey: string, options?: string[]): Promise<void> {
    const logger = new Logger("@simplysm/sd-cli", `[client]\t${packageKey}`);

    const config: ISdProjectConfig = SdCliUtils.getConfigObj("development", options);
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
        const builder = new SdAngularCompiler(packageKey, options);
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
    await fs.writeJson(packageConfigDistPath, {
      env: "development",
      ...packageConfig.configs
    }, {spaces: 2, EOL: os.EOL});

    await FileWatcher.watch(path.resolve(process.cwd(), "simplysm.json"), ["change"], async () => {
      const currConfig: ISdProjectConfig = SdCliUtils.getConfigObj("development", options);
      const currPackageConfig = currConfig.packages[packageKey];

      if (!Object.equal(currPackageConfig.configs, packageConfig.configs)) {
        await fs.mkdirs(path.dirname(packageConfigDistPath));
        await fs.writeJson(packageConfigDistPath, {
          env: "development",
          ...currPackageConfig.configs
        }, {spaces: 2, EOL: os.EOL});
        logger.log(`'${packageKey}'의 '.configs.json' 파일이 변경되었습니다.`);
      }
    }, {});

    logger.info(`개발서버 서비스가 시작되었습니다.: http://localhost:${serverInfo.server.port}/${packageKey}/`);
  }

  private async _runServerAsync(packageKey: string, worker: child_process.ChildProcess, tsConfigPath: string): Promise<void> {
    const packageServerLogger = new Logger("@simplysm/sd-cli", `[server]\t${packageKey}`);
    packageServerLogger.log("시작합니다.");

    const packagePath = path.resolve(process.cwd(), "packages", packageKey);
    const packageNpmConfig = await fs.readJson(path.resolve(packagePath, "package.json"));

    // @ts-ignore
    // noinspection JSUnusedLocalSymbols
    const packageEntryPath = path.resolve(packagePath, packageNpmConfig.main);

    // 서버 시작
    const server = require(packageEntryPath) as SdServiceServer;

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

    const program = new SdTypescriptProgram(tsConfigPath, {});

    const watch = async () => {
      const watchPaths = [path.resolve(program.outDirPath, "**", "*.js")];
      watchPaths.push(...program
        .getMyTypescriptFiles()
        .mapMany(item => program.getDependencies(item))
        .map(item => item.replace(/\.d\.ts$/, ".js"))
        .filter(item => fs.pathExistsSync(item)));

      const watcher = await FileWatcher.watch(watchPaths.distinct(), ["add", "change", "unlink"], async fileChangeInfos => {
        packageServerLogger.log("재시작합니다.");

        program.applyChanges(fileChangeInfos, {withBeImportedFiles: true});

        // > > 서버 재시작
        const serverInfo = this._serverMap.get(packageKey)!;
        await serverInfo.server.closeAsync();
        require("decache")(packageEntryPath); //tslint:disable-line:no-require-imports
        const newServer = require(packageEntryPath) as SdServiceServer;
        serverInfo.server = newServer;
        for (const middleware of serverInfo.middlewares) {
          newServer.addMiddleware(middleware);
        }

        packageServerLogger.log.apply(packageServerLogger, ["재시작되었습니다."].concat(
          serverInfo.clientKeys.map(clientKey => {
            return `http://localhost:${server.port}/${clientKey}/`;
          })
        ));

        watcher.close();
        await watch();
      }, {
        millisecond: 1000,
        ignoreInitial: true
      });
    };

    await watch();

    /*// 서버빌드 메시지 발생별,
    worker.on("message", async (message: ISdWorkerMessage) => {
      // > 서버빌드 완료시 (변경감지일 경우)
      if (message.type === "done") {
        packageServerLogger.log("재시작합니다.");

        // > > 서버 재시작
        const serverInfo = this._serverMap.get(packageKey)!;
        await serverInfo.server.closeAsync();
        require("decache")(packageEntryPath); //tslint:disable-line:no-require-imports
        const newServer = require(packageEntryPath) as SdServiceServer;
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
    });*/

    packageServerLogger.log("시작되었습니다.");
  }

  private async _parallelPackagesByDepAsync(packageKeys: string[], cb: (packageKey: string, packageName: string, projectOwnDepPackageNames: string[]) => Promise<void>): Promise<void> {
    const completedPackageName: string[] = [];

    await Promise.all(packageKeys.map(async packageKey => {
      const projectNpmConfig = await fs.readJson(path.resolve(process.cwd(), "package.json"));
      const packagePath = path.resolve(process.cwd(), "packages", packageKey);
      const packageNpmConfig = await fs.readJson(path.resolve(packagePath, "package.json"));
      const packageName = "@" + projectNpmConfig.name + "/" + packageKey;

      // > 패키지의 의존성 패키지 중에 빌드해야할 패키지 목록에 이미 있는 의존성 패키지만 추리기
      const projectOwnDepPackageNames = [
        ...Object.keys(packageNpmConfig.dependencies || {}),
        ...Object.keys(packageNpmConfig.devDependencies || {}),
        ...Object.keys(packageNpmConfig.peerDependencies || {})
      ].filter(dep =>
        packageKeys.some(key => ("@" + projectNpmConfig.name + "/" + key) === dep)
      );

      // > 추려진 의존성 패키지별,
      for (const depPackageName of projectOwnDepPackageNames) {
        // > > 의존성 패키지의 빌드가 완료될때까지 기다리기
        await Wait.true(() => completedPackageName.includes(depPackageName));
      }

      await cb(packageKey, packageName, projectOwnDepPackageNames);

      completedPackageName.push(packageName);
    }));
  }
}
