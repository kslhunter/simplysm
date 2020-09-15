import { FsUtils, Logger, NetworkUtils, ProcessManager, ProcessWorkManager } from "@simplysm/sd-core-node";
import * as path from "path";
import { INpmConfig, ISdProjectConfig, ISdServerPackageConfig } from "../commons";
import { DateTime, NeverEntryError, Wait } from "@simplysm/sd-core-common";
import { SdCliPackage } from "./SdCliPackage";
import { ISdPackageBuildResult } from "../build-tools/SdPackageBuilder";
import * as os from "os";
import * as semver from "semver";
import { SdProjectConfigUtils } from "../SdProjectConfigUtils";
import { SdCliLocalUpdate } from "./SdCliLocalUpdate";
import { SdServiceServer } from "@simplysm/sd-service-node";
import { NextHandleFunction } from "connect";

const decache = require("decache");

export class SdCliProject {
  private readonly _servers: {
    [name: string]: {
      server?: SdServiceServer;
      isClosed: boolean;
      middlewares: {
        [clientName: string]: NextHandleFunction[];
      };
    };
  } = {};

  public static async createAsync(argv: { devMode: boolean; packages: string[]; options: string[]; config?: string }): Promise<SdCliProject> {
    const logger = Logger.get(["simplysm", "sd-cli", "project"]);

    logger.debug("프로젝트 준비...");

    const config = await SdProjectConfigUtils.loadConfigAsync(argv.devMode, argv.options, argv.config);

    const npmConfigPath = path.resolve(process.cwd(), "package.json");
    const npmConfig: INpmConfig = await FsUtils.readJsonAsync(npmConfigPath);

    if (!npmConfig.workspaces) throw new NeverEntryError();
    const packages = (
      await npmConfig.workspaces.parallelAsync(async workspace => {
        const workspacePath = path.resolve(process.cwd(), workspace);
        const packagePaths = await FsUtils.globAsync(workspacePath);

        return await packagePaths.parallelAsync(async packagePath => {
          const pkgNpmConfigPath = path.resolve(packagePath, "package.json");
          const pkgNpmConfig = (await FsUtils.readJsonAsync(pkgNpmConfigPath)) as INpmConfig;
          let pkgConfig = config.packages[pkgNpmConfig.name];

          if (argv.packages.length > 0 && !argv.packages.includes(pkgNpmConfig.name)) {
            // return undefined;
            pkgConfig = undefined;
          }

          return await SdCliPackage.createAsync(packagePath, pkgNpmConfig, pkgNpmConfigPath, pkgConfig, argv.devMode);
        });
      })
    ).mapMany().filterExists();

    logger.debug("프로젝트 준비 완료");

    return new SdCliProject(logger, packages, config, npmConfig, npmConfigPath);
  }

  private constructor(private readonly _logger: Logger,
                      private readonly _packages: SdCliPackage[],
                      private readonly _config: ISdProjectConfig,
                      private readonly _npmConfig: INpmConfig,
                      private readonly _npmConfigPath: string) {
  }

  public async buildAsync(watch: boolean, subBuild?: ("gen" | "check" | "lint" | "compile" | "cordova")[]): Promise<void> {
    if (watch) {
      await SdCliLocalUpdate.watchAsync(this._config);
    }
    else {
      await SdCliLocalUpdate.runAsync(this._config);
    }

    this._logger.debug(`빌드 준비...`);
    await this._upgradeVersionAsync(watch);
    await this._packages.parallelAsync(async pkg => {
      await Promise.all([
        pkg.updateVersionAsync(this._npmConfig.version, this._packages.map(item => item.name)),
        pkg.createTsBuildConfigAsync()
      ]);
      await pkg.removeDistPathAsync();
    });
    this._logger.debug(`빌드 준비 완료`);

    this._logger.debug(`빌드 시작...`);

    let isFirstCompleted = false;

    const processManager = await ProcessWorkManager.createAsync(path.resolve(__dirname, "../build-worker"), [], os.cpus().length - 1);

    await new Promise<void>(async (resolve, reject) => {
      try {
        const lastResultsObj: { [key: string]: (ISdPackageBuildResult & { command: string })[] | undefined } = {};

        let startTick = new DateTime().tick;
        let busyCount = 0;
        this._logger.debug(`busyCount: ${busyCount}`);

        const endFn = (key?: string): void => {
          setTimeout(
            async () => {
              busyCount -= 1;
              this._logger.debug(`busyCount--: ${busyCount}: ${key}`);

              if (busyCount === 0) {
                // 클라이언트/서버 빌드라면, 서버에 미들웨어 추가
                for (const serverDefKey of Object.keys(this._servers)) {
                  const serverDef = this._servers[serverDefKey];
                  await Wait.true(() => serverDef.server !== undefined);
                  const defMiddlewares = Object.values(serverDef.middlewares).mapMany().reverse();
                  for (const defMiddleware of defMiddlewares) {
                    if (!serverDef.server!.middlewares.includes(defMiddleware)) {
                      serverDef.server!.middlewares.insert(0, defMiddleware);
                    }
                  }
                }

                // WARN, ERROR 표시
                const warnings = Object.values(lastResultsObj)
                  .mapMany(item => item ?? [])
                  .filter(item => item.severity === "warning")
                  .map(item => item.message.trim() + "(" + item.command + ")")
                  .distinct();
                const errors = Object.values(lastResultsObj)
                  .mapMany(item => item ?? [])
                  .filter(item => item.severity === "error")
                  .map(item => item.message.trim() + "(" + item.command + ")")
                  .distinct();

                if (warnings.length > 0) {
                  this._logger.warn(`경고 발생${os.EOL}`, warnings.join(os.EOL));
                }
                if (errors.length > 0) {
                  this._logger.error(`오류 발생${os.EOL}`, errors.join(os.EOL));
                }

                if (errors.length > 0) {
                  this._logger.error(`경고: ${warnings.length}건, 오류: ${errors.length}건`);
                }
                else if (warnings.length > 0) {
                  this._logger.warn(`경고: ${warnings.length}건, 오류: ${errors.length}건`);
                }

                // 완료
                resolve();
                await Wait.true(() => isFirstCompleted);
                this._logger.info(`빌드 프로세스가 완료되었습니다. (${(new DateTime().tick - startTick).toLocaleString()}ms)`);
              }
            },
            watch && isFirstCompleted ? 500 : 3000
          );
        };

        for (const pkg of this._packages) {
          pkg.on("change", data => {
            if (busyCount === 0) {
              startTick = new DateTime().tick;
              this._logger.log(`변경감지...`);
            }
            busyCount += 1;
            this._logger.debug(`busyCount++: ${busyCount}: ${data.packageName}: ${data.command}: ${data.target ?? ""}`);

            if (data.filePaths) {
              delete lastResultsObj[`${data.command}-${data.target ?? ""}-${data.packageName}`];
              for (const filePath of data.filePaths) {
                const key = `${data.command}-${data.target ?? ""}-${filePath}`;
                delete lastResultsObj[key];
              }
            }
            else {
              const removeKeys = Object.keys(lastResultsObj)
                .filter(key => key.startsWith(`${data.command}-${data.target ?? ""}-`));
              for (const removeKey of removeKeys) {
                delete lastResultsObj[removeKey];
              }
            }
          });
          pkg.on("complete", data => {
            for (const result of data.results) {
              const key = `${data.command}-${data.target ?? ""}-${result.filePath ?? data.packageName}`;
              lastResultsObj[key] = lastResultsObj[key] ?? [];
              lastResultsObj[key]!.push({
                ...result,
                command: data.command
              });
            }

            endFn(`${data.packageName}: ${data.command}: ${data.target ?? ""}`);
          });
        }

        busyCount += 1;
        this._logger.debug(`busyCount: ${busyCount}`);

        const genCompleted: string[] = [];
        const depCheckCompleted: string[] = [];

        await Promise.all([
          this._parallelPackagesByDepAsync(async pkg => {
            depCheckCompleted.push(pkg.name);

            await Wait.true(() => genCompleted.includes(pkg.name));

            if (!subBuild || subBuild.includes("check")) {
              await pkg.checkAsync(watch, processManager);
            }
          }),
          this._packages.parallelAsync(async pkg => {
            await Wait.true(() => depCheckCompleted.includes(pkg.name));

            if (!subBuild || subBuild.includes("gen")) {
              if (pkg.isAngular) {
                await pkg.genIndexAsync(false, processManager);
                await pkg.genNgAsync(watch, processManager);
                await pkg.genIndexAsync(watch, processManager);
              }
              else {
                await pkg.genIndexAsync(watch, processManager);
              }
            }

            genCompleted.push(pkg.name);
          }),
          this._packages.parallelAsync(async pkg => {
            await Wait.true(() => genCompleted.includes(pkg.name));

            if (!subBuild || subBuild.includes("compile")) {
              if (pkg.info.config?.type === "library") {
                await pkg.compileAsync(false, processManager);

                if (watch) {
                  await pkg.compileAsync(true, processManager);
                }
              }
              else if (pkg.info.config?.type === "server") {
                await Wait.true(() => depCheckCompleted.includes(pkg.name));
                await Wait.true(() => genCompleted.includes(pkg.name));

                if (pkg.info.npmConfig.main === undefined) {
                  throw new Error("서버빌드시, 'package.json'에 'main'이 반드시 설정되어 있어야 합니다.");
                }

                if (watch) {
                  await pkg
                    .on("change", async arg => {
                      if (arg.command !== "compile") return;
                      await this._stopServerAsync(pkg);
                    })
                    .on("complete", async arg => {
                      if (arg.command !== "compile") return;
                      await this._startServerAsync(pkg);
                    })
                    .compileAsync(watch, processManager);
                }
                else {
                  await pkg.compileAsync(watch, processManager);
                }
              }
              else if (pkg.info.config?.type === "web" || pkg.info.config?.type === "android") {
                await Wait.true(() => genCompleted.includes(pkg.name));
                await Wait.true(() => depCheckCompleted.includes(pkg.name));

                if (pkg.info.config?.type === "android") {
                  await pkg.initializeCordovaAsync(pkg.info.config.device ? "android" : "browser");
                }

                if (watch) {
                  const middlewares = (
                    await pkg
                      .on("change", arg => {
                        if (arg.command !== "compile") return;
                        this._logger.log(`[${pkg.name}] 클라이언트 준비...`);
                      })
                      .on("complete", async arg => {
                        if (arg.command !== "compile") return;
                        await Wait.true(() => this._servers[pkg.info.config?.["server"]]?.server !== undefined);
                        const port = this._servers[pkg.info.config?.["server"]].server!.options.port ?? 80;
                        this._logger.info(`[${pkg.name}] 클라이언트가 준비되었습니다.: http://localhost:${port}/${path.basename(pkg.info.rootPath)}/`);
                      })
                      .compileAsync(watch, processManager)
                  ) as NextHandleFunction[];

                  await this._registerClientAsync(pkg, middlewares);

                  if (pkg.info.config?.type === "android" && pkg.info.config.device) {
                    const ip = NetworkUtils.getCurrentIPs()[0];
                    const port = this._servers[pkg.info.config?.["server"]].server!.options.port ?? 80;
                    await pkg.runCordovaOnDeviceAsync(ip, port);
                  }
                }
                else {
                  await pkg.compileAsync(watch, processManager);
                }
              }
            }
          }),
          this._packages.parallelAsync(async pkg => {
            await Wait.true(() => genCompleted.includes(pkg.name));
            await Wait.true(() => depCheckCompleted.includes(pkg.name));

            if (!subBuild || subBuild.includes("lint")) {
              await pkg.lintAsync(false, processManager);

              if (watch) {
                await pkg.lintAsync(true, processManager);
              }
            }
          })
        ]);

        endFn();
      }
      catch (err) {
        reject(err);
      }
    });

    this._logger.debug(`빌드 완료`);

    if (!watch) {
      this._logger.debug(`프로세스 종료...`);

      await processManager.closeAllAsync();

      this._logger.debug(`프로세스 종료`);
    }

    isFirstCompleted = true;
  }

  public async publishAsync(build: boolean): Promise<void> {
    if (!build) {
      this._logger.warn("빌드하지 않고, 배포하는것은 상당히 위험합니다.");
      const waitSec = 5;
      for (let i = waitSec; i > 0; i--) {
        if (i !== waitSec) {
          process.stdout.cursorTo(0);
        }
        process.stdout.write("프로세스를 중지하려면, 'CTRL+C'를 누르세요. " + i);
        await Wait.time(1000);
      }

      process.stdout.cursorTo(0);
      process.stdout.clearLine(0);
    }

    this._logger.debug(`배포 준비...`);

    // GIT 사용중일 경우, 커밋되지 않은 수정사항이 있는지 확인
    if (FsUtils.exists(path.resolve(process.cwd(), ".git"))) {
      await ProcessManager.spawnAsync(
        "git status",
        undefined,
        message => {
          if (message.includes("Changes") || message.includes("Untracked")) {
            throw new Error("커밋되지 않은 정보가 있습니다.");
          }
        },
        false
      );
    }

    // 빌드가 필요하면 빌드함
    if (build) {
      await this.buildAsync(false);
    }
    // watch 버전에선 배포 불가
    else if (this._npmConfig.version.includes("-")) {
      throw new Error("현재 최종 버전이 빌드(배포) 버전이 아닙니다.");
    }
    // 빌드시엔 빌드에서 버전업했고, 빌드가 아닌경우 여기서 버전업
    else {
      await this._upgradeVersionAsync(false);
      await this._packages.parallelAsync(async pkg => {
        await pkg.updateVersionAsync(this._npmConfig.version, this._packages.map(item => item.name));
      });
    }

    // GIT 사용중일경우, 새 버전 커밋 및 TAG 생성
    if (FsUtils.exists(path.resolve(process.cwd(), ".git"))) {
      await ProcessManager.spawnAsync(
        `git add .`,
        undefined,
        false,
        false
      );

      await ProcessManager.spawnAsync(
        `git commit -m "v${this._npmConfig.version}"`,
        undefined,
        false,
        false
      );

      await ProcessManager.spawnAsync(
        `git tag -a "v${this._npmConfig.version}" -m "v${this._npmConfig.version}"`,
        undefined,
        false,
        false
      );
    }

    this._logger.debug(`배포 준비 완료`);

    this._logger.debug(`배포 시작...`);

    await this._packages.parallelAsync(async pkg => {
      await pkg.publishAsync();
    });

    this._logger.info(`배포 프로세스가 완료되었습니다.(v${this._npmConfig.version})`);
  }

  private async _upgradeVersionAsync(prerelease: boolean): Promise<void> {
    const newVersion = semver.inc(this._npmConfig.version, prerelease ? "prerelease" : "patch");
    if (newVersion == null) throw new NeverEntryError();
    this._npmConfig.version = newVersion;

    const dependencyNames = this._packages.map(item => item.name);

    const fn = (currDeps: { [key: string]: string | undefined } | undefined): void => {
      if (currDeps) {
        for (const dependencyName of dependencyNames) {
          if (currDeps[dependencyName] !== undefined) {
            currDeps[dependencyName] = newVersion;
          }
        }
      }
    };

    fn(this._npmConfig.dependencies);
    fn(this._npmConfig.devDependencies);
    fn(this._npmConfig.peerDependencies);

    await FsUtils.writeJsonAsync(this._npmConfigPath, this._npmConfig, { space: 2 });
  }

  private async _parallelPackagesByDepAsync(cb: (pkg: SdCliPackage) => Promise<void>): Promise<void> {
    const completedPackageNames: string[] = [];

    await this._packages.parallelAsync(async pkg => {
      // 패키지의 의존성 패키지 중에 빌드해야할 패키지 목록에 이미 있는 의존성 패키지만 추리기
      const depNames = pkg.dependencies.filter(dep => (
        this._packages.some(targetPkg => targetPkg.name === dep)
      ));

      // 추려진 의존성 패키지별로 의존성 패키지의 빌드가 완료될때까지 기다리기
      await depNames.parallelAsync(async depName => {
        await Wait.true(() => completedPackageNames.includes(depName));
      });

      await cb(pkg);

      completedPackageNames.push(pkg.name);
    });
  }

  private async _stopServerAsync(pkg: SdCliPackage): Promise<void> {
    if (pkg.entryFilePath === undefined) {
      throw new Error("서버 빌드시, 'package.json'에 'main'이 반드시 설정되어 있어야 합니다.");
    }

    if (!this._servers[pkg.name]?.server) return;

    if (this._servers[pkg.name]?.server) {
      this._logger.log(`[${pkg.name}] 서버를 재시작합니다.`);

      const server = this._servers[pkg.name].server!;
      delete this._servers[pkg.name].server;
      decache(pkg.entryFilePath);
      await server.closeAsync();
      this._servers[pkg.name].isClosed = true;
    }
  }

  /**
   * 서버를 시작합니다.
   * - 처음 변경감지 빌드를 수행할때 혹은 서버의 변경을 감지할 시에 실행됩니다.
   * @param {SdCliPackage} pkg
   * @returns {Promise<void>}
   * @private
   */
  private async _startServerAsync(pkg: SdCliPackage): Promise<void> {
    if (pkg.entryFilePath === undefined) {
      throw new Error("서버 빌드시, 'package.json'에 'main'이 반드시 설정되어 있어야 합니다.");
    }

    try {
      // 서버 중지가 완료될때까지 대기
      await Wait.true(() => (
        (this._servers[pkg.name] === undefined || this._servers[pkg.name].isClosed) &&
        pkg.entryFilePath !== undefined &&
        FsUtils.exists(pkg.entryFilePath)
      ));
      await Wait.time(1000);

      // 서버 시작
      Object.assign(process.env, (pkg.info.config as ISdServerPackageConfig).env);
      const server = require(pkg.entryFilePath) as SdServiceServer | undefined;
      if (!server) {
        this._logger.error(`[${pkg.name}] '${pkg.entryFilePath}'에서 'SdServiceServer'를 'export'하고있지 않습니다.`);
        return;
      }

      // 서버 설정 정의 추가
      this._servers[pkg.name] = this._servers[pkg.name] ?? { middlewares: {}, isClosed: true };

      // 서버에 미들웨어 추가
      /*const defMiddlewares = Object.values(this._servers[pkg.name].middlewares).mapMany().reverse();
      for (const defMiddleware of defMiddlewares) {
        if (!this._servers[pkg.name].server!.middlewares.includes(defMiddleware)) {
          this._servers[pkg.name].server!.middlewares.insert(0, defMiddleware);
        }
      }*/

      await new Promise<void>(resolve => {
        server.on("ready", () => {
          this._logger.info(`[${pkg.name}] 서버가 시작되었습니다.`);

          // 서버 설정 정의에 서버 추가
          this._servers[pkg.name].server = server;
          this._servers[pkg.name].isClosed = false;

          resolve();
        });
      });
    }
    catch (err) {
      decache(pkg.entryFilePath);
      this._logger.error(`[${pkg.name}] 서버를 시작할 수 없습니다.${os.EOL}`, err);
    }
  }

  /**
   * 클라이언트의 WebpackDevMiddleware에서 나온 middleware를 서버에 등록합니다.
   * - 처음 변경감지 빌드를 수행할때만 호출됩니다.
   * @param {SdCliPackage} pkg
   * @param {createServer.NextHandleFunction[]} middlewares
   * @returns {Promise<void>}
   * @private
   */
  private async _registerClientAsync(pkg: SdCliPackage, middlewares: NextHandleFunction[]): Promise<void> {
    if (pkg.info.config?.type !== "web" && pkg.info.config?.type !== "android") throw new NeverEntryError();

    this._servers[pkg.info.config.server] = this._servers[pkg.info.config.server] ?? { middlewares: {}, isClosed: true };

    // 서버 설정 정의에 미들웨어 추가
    const serverDef = this._servers[pkg.info.config.server];
    serverDef.middlewares[pkg.name] = middlewares;

    // 서버가 실행될때까지 기다리기
    await Wait.true(() => serverDef.server !== undefined);

    // 서버의 www의 클라이언트 폴더에 .configs.json 파일 쓰기
    await FsUtils.writeJsonAsync(
      path.resolve(
        serverDef.server!.rootPath,
        "www",
        path.basename(pkg.info.rootPath),
        ".configs.json"
      ),
      pkg.info.config.configs
    );

    // 서버에 미들웨어 추가
    /*const serverDefMiddlewares = Object.values(serverDef.middlewares).mapMany().reverse();
    for (const serverDefMiddleware of serverDefMiddlewares) {
      if (!serverDef.server!.middlewares.includes(serverDefMiddleware)) {
        serverDef.server!.middlewares.insert(0, serverDefMiddleware);
      }
    }*/

    // const port = this._servers[pkg.info.config.server].server!.options.port ?? 80;
    // this._logger.info(`[${pkg.name}] 클라이언트가 준비되었습니다.: http://localhost:${port}/${path.basename(pkg.info.rootPath)}/`);
  }
}