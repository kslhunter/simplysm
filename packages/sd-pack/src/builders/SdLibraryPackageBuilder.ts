import {Logger, Wait} from "@simplism/sd-core";
import * as child_process from "child_process";
import * as chokidar from "chokidar";
import * as fs from "fs-extra";
import * as path from "path";
import * as ts from "typescript";
import {ISdPackLibraryConfig} from "../commons/configs";
import {ISdPackageBuilder} from "../commons/ISdPackageBuilder";

export class SdLibraryPackageBuilder implements ISdPackageBuilder {
  private readonly _logger: Logger;

  public constructor(private readonly _config: ISdPackLibraryConfig) {
    this._logger = new Logger("@simplism/sd-pack", this._config.name);
  }

  private get _tsconfig(): ts.ParsedCommandLine {
    const tsconfigPath = this._contextPath("tsconfig.json");
    const tsconfigJson = fs.readJsonSync(tsconfigPath);
    return ts.parseJsonConfigFileContent(tsconfigJson, ts.sys, this._contextPath());
  }

  public async buildAsync(): Promise<void> {
    this._logger.log("building...");
    await this._runAsync(false);
  }

  public async watchAsync(): Promise<void> {
    this._logger.log("watching...");
    await this._runAsync(true);
  }

  public async publishAsync(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this._logger.log("publishing...");

      const projectPackageJson = fs.readJsonSync(this._projectPath("package.json"));
      const packageJson = fs.readJsonSync(this._contextPath("package.json"));

      // 의존성 버전 재구성
      const depTypeNames = ["dependencies", "peerDependencies", "optionalDependencies"];
      for (const depTypeName of depTypeNames) {
        for (const depName of Object.keys(packageJson[depTypeName] || {})) {
          if (depName.startsWith("@simplism")) {
            packageJson[depTypeName][depName] = `^${projectPackageJson.version}`;
          }
          else if (projectPackageJson.devDependencies[depName]) {
            packageJson[depTypeName][depName] = projectPackageJson.devDependencies[depName];
          }
          else {
            throw new Error(`'${this._config.name}'패키지의 의존성 패키지 정보가 프로젝트 패키지에 없습니다.`);
          }
        }
      }

      fs.writeJsonSync(this._contextPath("package.json"), packageJson, {spaces: 2});

      // 새 버전으로 배포
      const shell = child_process.spawn("yarn", ["publish", "--new-version", projectPackageJson.version, "--access", "public", "--no-git-tag-version"], {
        shell: true,
        stdio: "pipe",
        cwd: this._contextPath()
      });

      shell.stderr.on("data", chunk => {
        const errorMessage = this._logger.getFlatString(chunk.toString()).trim();
        if (errorMessage) {
          this._logger.error(errorMessage);
          reject();
        }
      });

      shell.on("exit", () => {
        this._logger.info(`publish complete: v${projectPackageJson.version}`);
        resolve();
      });
    });
  }

  private async _runAsync(watch: boolean): Promise<void> {
    const tsconfig = this._tsconfig;
    if (!tsconfig.options.outDir) {
      throw new Error("'tsconfig.json' 에 'outDir'이 반드시 설정되어야 합니다.");
    }

    fs.removeSync(tsconfig.options.outDir);

    let buildCompleted = false;
    let lintCompleted = false;

    const tsBuildWorker = this._forkWorker("ts-build", (messages: string[]) => {
      if (messages.length > 0) {
        this._logger.error(`build error\n${messages.join("\n")}`);
      }
      buildCompleted = true;
    });

    const tsLintWorker = this._forkWorker("ts-lint", (messages: string[]) => {
      if (messages.length > 0) {
        this._logger.warn(`lint warning\n${messages.join("\n")}`);
      }
      lintCompleted = true;
    });

    tsBuildWorker.send([], err => {
      if (err) {
        this._logger.error("build failed", err);
        buildCompleted = true;
      }
    });

    tsLintWorker.send([], err => {
      if (err) {
        this._logger.error("lint failed", err);
        lintCompleted = true;
      }
    });

    await Wait.true(() => buildCompleted && lintCompleted);

    if (watch) {
      let watcher: chokidar.FSWatcher;

      let timeout: NodeJS.Timer;
      /*let changedFilePaths: string[] = [];*/
      const watchCallback = (filePath: string) => {
        /*changedFilePaths.push(filePath);*/

        clearTimeout(timeout);
        timeout = setTimeout(
          async () => {
            buildCompleted = false;
            lintCompleted = false;

            this._logger.log("building...");

            watcher.close();

            tsBuildWorker.send([]/*changedFilePaths*/, err => {
              if (err) {
                this._logger.error("build failed", err);
                buildCompleted = true;
              }
            });

            tsLintWorker.send([]/*changedFilePaths*/, err => {
              if (err) {
                this._logger.error("lint failed", err);
                lintCompleted = true;
              }
            });

            /*changedFilePaths = [];*/

            await Wait.true(() => buildCompleted && lintCompleted);

            this._logger.info("build complete");

            watcher = chokidar
              .watch(this._tsconfig.fileNames)
              .on("change", watchedFilePath => watchCallback(watchedFilePath));
          },
          200
        );
      };

      watcher = chokidar
        .watch(tsconfig.fileNames)
        .on("change", filePath => watchCallback(filePath));
    }
    else {
      tsBuildWorker.kill();
      tsLintWorker.kill();
    }

    this._logger.info("build complete");
  }

  private _forkWorker(workerName: string, callback: (messages: string[]) => void): child_process.ChildProcess {
    return child_process
      .fork(
        path.resolve(__dirname, `../workers/${workerName}.worker`),
        [
          "--package", this._config.name
        ],
        {
          stdio: ["inherit", "inherit", "inherit", "ipc"],
          env: process.env,
          execArgv: /\.ts$/.test(__filename)
            ? [
              path.resolve(process.cwd(), "node_modules/ts-node/dist/bin.js"),
              "--project", path.resolve(__dirname, "../../tsconfig.json"),
              "--require", "tsconfig-paths/register"
            ]
            : undefined
        }
      )
      .on("message", (messages: string[]) => {
        callback(messages);
      })
      .on("error", err => {
        throw err;
      });
  }

  private _contextPath(...args: string[]): string {
    return path.resolve(process.cwd(), "packages", this._config.name, ...args);
  }

  private _projectPath(...args: string[]): string {
    return path.resolve(process.cwd(), ...args);
  }
}
