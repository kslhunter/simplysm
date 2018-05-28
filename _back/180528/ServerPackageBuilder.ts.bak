import * as fs from "fs-extra";
import * as path from "path";
import * as child_process from "child_process";
import * as chokidar from "chokidar";
import * as glob from "glob";
import {IServerPackageConfig} from "../commons/IProjectConfig";
import {Logger} from "@simplism/core";
import {FtpStorage} from "@simplism/storage";

export class ServerPackageBuilder {
  private readonly _logger = new Logger("@simplism/pack", `ServerPackageBuilder`);

  public constructor(private readonly _config: IServerPackageConfig) {
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
    let worker: child_process.ChildProcess;
    let timeout: NodeJS.Timer;
    const buildForWatchAsync = async () => {
      await new Promise<void>(resolve => {
        clearTimeout(timeout);
        timeout = setTimeout(
          async () => {
            this._logger.log(`${this._config.name} starting...`);

            if (worker) worker.kill();
            worker = child_process.fork(this._packagePath("src/app.ts"), [], {
              cwd: this._packagePath(),
              env: {
                TARGET: "node",
                ...this._config.env
              },
              execArgv: ["--require", "ts-node/register"]
            });

            resolve();
          },
          300
        );
      });
    };

    await buildForWatchAsync();

    const deps = Object.keys(fs.readJsonSync(this._packagePath("package.json")).dependencies);
    /*let i = 0;
    let cursorDep = deps[i];
    let cursorPackageJson = fs.readJsonSync(this._projectPath("node_modules", cursorDep, "package.json"));
    let cursorDepDeps = Object.keys(cursorPackageJson.dependencies);
    if (cursorDepDeps.length > 0) deps = deps.concat(cursorDepDeps);
    while (deps[++i]) {
      cursorDep = deps[i];
      cursorPackageJson = fs.readJsonSync(this._projectPath("node_modules", cursorDep, "package.json"));
      cursorDepDeps = Object.keys(cursorPackageJson.dependencies);
      if (cursorDepDeps.length > 0) deps = deps.concat(cursorDepDeps).distinct();
    }*/

    await new Promise<void>(resolve => {
      const watcher = chokidar
        .watch([
          this._packagePath("src/**/*"),
          ...deps.map(item => this._projectPath("node_modules", item, "**/*"))
        ].map(item => item.replace(/\\/g, "/")))
        .on("ready", () => {
          watcher
            .on("add", () => buildForWatchAsync())
            .on("change", () => buildForWatchAsync())
            .on("unlink", () => buildForWatchAsync());
          resolve();
        });
    });
  }

  public async publishAsync(): Promise<void> {
    this._logger.log(`${this._config.name} publishing...`);

    if (!this._config.publish) {
      throw new Error("설정파일에 'publish'옵션이 설정되어야 합니다.");
    }

    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.json"));
    const distPath = this._packagePath(tsconfig.compilerOptions.outDir || "dist");

    // 배포
    const storage = new FtpStorage();
    await storage.connectAsync({
      host: this._config.publish.host,
      port: this._config.publish.port,
      user: this._config.publish.username,
      password: this._config.publish.password
    });

    // 루트 디렉토리 생성
    await storage.mkdirAsync(this._config.publish.path);

    // 로컬 파일 전송
    const filePaths = glob.sync(path.resolve(distPath, "**/*"));
    for (const filePath of filePaths) {
      const ftpFilePath = `${this._config.publish.path}/${path.relative(distPath, filePath).replace(/\\/g, "/")}`;
      if (fs.lstatSync(filePath).isDirectory()) {
        await storage.mkdirAsync(ftpFilePath);
      }
      else {
        await storage.putAsync(filePath, ftpFilePath);
      }
    }

    await storage.putAsync(this._packagePath("package.json"), this._config.publish.path + "/package.json");

    // pm2.json 전송
    await storage.putAsync(
      Buffer.from(
        JSON.stringify(
          {
            apps: [{
              name: this._config.publish.path.replace(/[\\/]/g, "."),
              script: "./app.js",
              watch: true,
              env: {
                TARGET: "node",
                NODE_ENV: "production",
                ...this._config.env
              }
            }]
          },
          undefined,
          2
        )
      ),
      `/${this._config.publish.path}/pm2.json`
    );

    await storage.closeAsync();

    // 완료
    const rootPackageJson = fs.readJsonSync(this._projectPath("package.json"));
    this._logger.info(`${this._config.name} publish complete: v${rootPackageJson.version}`);
  }

  private _projectPath(...args: string[]): string {
    return path.resolve(process.cwd(), ...args);
  }

  private _packagePath(...args: string[]): string {
    return path.resolve(process.cwd(), `packages/${this._config.name}`, ...args);
  }
}
