import * as fs from "fs-extra";
import * as path from "path";
import {ILibraryPackageConfig} from "../commons/IProjectConfig";
import {Exception, Logger} from "@simplism/core";
import * as child_process from "child_process";
import * as chokidar from "chokidar";

export class LibraryPackageBuilder {
  private readonly _logger = new Logger("@simplism/pack", `LibraryPackageBuilder`);

  public constructor(private readonly _config: ILibraryPackageConfig) {
  }

  public async buildAsync(): Promise<void> {
    this._logger.log(`${this._config.name} building...`);

    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.json"));
    fs.removeSync(this._packagePath(tsconfig.compilerOptions.outDir || "dist"));

    const tsBuildWorker = child_process
      .fork(
        path.join(__dirname, "../workers/ts-build"),
        [this._packagePath()],
        {stdio: ["inherit", "inherit", "inherit", "ipc"]}
      );

    const tsLintWorker = child_process
      .fork(
        path.join(__dirname, "../workers/ts-lint"),
        [this._packagePath()],
        {stdio: ["inherit", "inherit", "inherit", "ipc"]}
      );

    await Promise.all([
      new Promise<void>(resolve => {
        tsBuildWorker.once("message", result => {
          if (result.length > 0) {
            this._logger.error(`${this._config.name} build error occurred`, result.join("\r\n"));
          }
          resolve();
        }).send([]);
      }),
      new Promise<void>(resolve => {
        tsLintWorker.once("message", result => {
          if (result.length > 0) {
            this._logger.warn(`${this._config.name} lint error occurred`, result.join("\r\n"));
          }
          resolve();
        }).send("run");
      })
    ]);

    tsBuildWorker.kill();
    tsLintWorker.kill();

    this._logger.info(`${this._config.name} build complete`);
  }

  public async watchAsync(): Promise<void> {
    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.json"));
    fs.removeSync(this._packagePath(tsconfig.compilerOptions.outDir || "dist"));

    const tsBuildWorker = child_process
      .fork(
        path.join(__dirname, "../workers/ts-build"),
        [this._packagePath()],
        {stdio: ["inherit", "inherit", "inherit", "ipc"]}
      );

    const tsLintWorker = child_process
      .fork(
        path.join(__dirname, "../workers/ts-lint"),
        [this._packagePath()],
        {stdio: ["inherit", "inherit", "inherit", "ipc"]}
      );

    let preserveFilePaths: string[] = [];
    let timeout: NodeJS.Timer;
    const buildForWatchAsync = async (filePath?: string) => {
      if (filePath) {
        preserveFilePaths.push(filePath);
      }

      await new Promise<void>(resolve => {
        clearTimeout(timeout);
        timeout = setTimeout(
          async () => {
            const filePaths = preserveFilePaths;
            preserveFilePaths = [];

            this._logger.log(`${this._config.name} building...`);

            await Promise.all([
              new Promise<void>(resolve1 => {
                tsBuildWorker.once("message", result => {
                  if (result.length > 0) {
                    this._logger.error(`${this._config.name} build error occurred`, result.join("\r\n"));
                  }
                  resolve1();
                }).send(filePaths);
              }),
              new Promise<void>(resolve1 => {
                tsLintWorker.once("message", result => {
                  if (result.length > 0) {
                    this._logger.warn(`${this._config.name} lint error occurred`, result.join("\r\n"));
                  }
                  resolve1();
                }).send("run");
              })
            ]);

            this._logger.info(`${this._config.name} build complete`);

            resolve();
          },
          0
        );
      });
    };

    await buildForWatchAsync();

    await new Promise<void>(resolve => {
      const watcher = chokidar.watch(this._packagePath("src/**/*").replace(/\\/g, "/"))
        .on("ready", () => {
          watcher
            .on("add", filePath => buildForWatchAsync(filePath))
            .on("change", filePath => buildForWatchAsync(filePath))
            .on("unlink", filePath => buildForWatchAsync(filePath));
          resolve();
        });
    });
  }

  public async publishAsync(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this._logger.log(`${this._config.name} publishing...`);

      // 최상위 package.json 설정 가져오기
      const rootPackageJson = fs.readJsonSync(this._projectPath("package.json"));

      // package.json 설정 가져오기
      const packageJson = fs.readJsonSync(this._packagePath("package.json"));

      // 의존성 버전 재구성
      const depTypeNames = ["dependencies", "peerDependencies", "optionalDependencies"];
      for (const depTypeName of depTypeNames) {
        for (const depName of Object.keys(packageJson[depTypeName] || {})) {
          if (depName.startsWith("@" + rootPackageJson.name)) {
            packageJson[depTypeName][depName] = `^${rootPackageJson.version}`;
          }
          else if (rootPackageJson.devDependencies[depName]) {
            packageJson[depTypeName][depName] = rootPackageJson.devDependencies[depName];
          }
          else {
            throw new Exception(`'${this._config.name}'패키지의 의존성 패키지 정보가 루트 패키지에 없습니다.`);
          }
        }
      }

      // package.json 파일 다시쓰기
      fs.writeJsonSync(this._packagePath("package.json"), packageJson, {spaces: 2});

      // 새 버전으로 배포
      const shell = child_process.spawn("yarn", ["publish", "--new-version", rootPackageJson.version, "--access", "public", "--no-git-tag-version"], {
        shell: true,
        stdio: "pipe",
        cwd: this._packagePath()
      });

      let errorMessage = "";
      shell.stderr.on("data", chunk => {
        errorMessage += chunk.toString();
      });

      shell.on("exit", () => {
        if (errorMessage.trim()) {
          this._logger.error(`${this._config.name} error occurred`, errorMessage.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "").trim());
          reject();
          return;
        }

        this._logger.info(`${this._config.name} publish complete: v${rootPackageJson.version}`);
        resolve();
      });
    });
  }

  private _projectPath(...args: string[]): string {
    return path.resolve(process.cwd(), ...args);
  }

  private _packagePath(...args: string[]): string {
    return path.resolve(process.cwd(), `packages/${this._config.name}`, ...args);
  }
}
