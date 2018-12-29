import * as fs from "fs-extra";
import * as path from "path";
import {
  IClientPackageConfig,
  ILibraryPackageConfig,
  IProjectConfig,
  IServerPackageConfig
} from "../commons/IProjectConfig";
import {LocalUpdater} from "../builders/LocalUpdater";
import {LibraryPackageBuilder} from "../builders/LibraryPackageBuilder";
import {Logger, Wait} from "@simplism/core";
import {ServerPackageBuilder} from "../builders/ServerPackageBuilder";
import {ClientPackageBuilder} from "../builders/ClientPackageBuilder";
import * as semver from "semver";
import * as os from "os";
import * as child_process from "child_process";
import {FileWatcher} from "../utils/FileWatcher";

export async function buildAsync(argv: { watch: boolean; package?: string; config?: string; env?: any }): Promise<void> {
  process.env.NODE_ENV = argv.watch ? "development" : "production";

  let configFilePath = argv.config;
  configFilePath = configFilePath ? path.resolve(process.cwd(), configFilePath)
    : fs.existsSync(path.resolve(process.cwd(), "simplism.ts")) ? path.resolve(process.cwd(), "simplism.ts")
      : fs.existsSync(path.resolve(process.cwd(), "simplism.js")) ? path.resolve(process.cwd(), "simplism.js")
        : path.resolve(process.cwd(), "simplism.json");

  if (path.extname(configFilePath) === ".ts") {
    // tslint:disable-next-line
    require("ts-node/register");
    Object.assign(process.env, argv.env);
  }

  // tslint:disable-next-line:no-eval
  const projectConfig = eval("require(configFilePath)") as IProjectConfig;

  let promiseList: Promise<void>[] = [];
  if (argv.watch && projectConfig.localDependencies) {
    for (const packageName of Object.keys(projectConfig.localDependencies)) {
      const packagePath = projectConfig.localDependencies[packageName];

      if (fs.existsSync(packagePath)) {
        promiseList.push(new LocalUpdater(packageName, packagePath).runAsync(true));
      }
    }
  }
  await Promise.all(promiseList);
  promiseList = [];

  const runAsync = async (config: ILibraryPackageConfig | IClientPackageConfig | IServerPackageConfig) => {
    if (!argv.watch) {
      if (config.type === "client") {
        await new ClientPackageBuilder({
          ...config,
          "env": {...projectConfig.env, ...config.env, ...argv.env},
          "env.production": {...projectConfig["env.production"], ...config["env.production"]}
        }).buildAsync();
      }
      else if (config.type === "server") {
        await new ServerPackageBuilder({
          ...config,
          "env": {...projectConfig.env, ...config.env, ...argv.env},
          "env.production": {...projectConfig["env.production"], ...config["env.production"]}
        }).buildAsync();
      }
      else {
        await new LibraryPackageBuilder(config).buildAsync();
      }
    }
    else {
      if (config.type === "client") {
        await new ClientPackageBuilder({
          ...config,
          "env": {...projectConfig.env, ...config.env, ...argv.env},
          "env.development": {...projectConfig["env.development"], ...config["env.development"]}
        }).watchAsync();
      }
      else if (config.type === "server") {
        await new ServerPackageBuilder({
          ...config,
          "env": {...projectConfig.env, ...config.env, ...argv.env},
          "env.development": {...projectConfig["env.development"], ...config["env.development"]}
        }).watchAsync();
      }
      else {
        await new LibraryPackageBuilder(config).watchAsync();
      }
    }
  };

  const _loadersPath = (...args: string[]): string => {
    return fs.existsSync(path.resolve(process.cwd(), "node_modules/@simplism/cli/loaders"))
      ? path.resolve(process.cwd(), "node_modules/@simplism/cli/loaders", ...args)
      : path.resolve(__dirname, "../../loaders", ...args);
  };

  const lintAsync = async (packName: string) => {
    const logger = new Logger("@simplism/cli", `${packName}(LINT):`);

    logger.log("코드검사...");
    let worker: child_process.ChildProcess;
    await new Promise<void>((resolve, reject) => {
      worker = child_process.fork(
        _loadersPath("ts-lint-worker.js"),
        [
          packName,
          argv.watch ? "watch" : "build",
          path.resolve(process.cwd(), "packages", packName, "tsconfig.json")
        ].filterExists(),
        {
          stdio: [undefined, undefined, undefined, "ipc"]
        }
      );
      worker.on("message", message => {
        if (message === "finish") {
          logger.info("코드검사 완료");
          resolve();
        }
        else {
          logger.warn("코드검사 경고 발생", message);
        }
      });

      worker.send([], err => {
        if (err) {
          reject(err);
        }
      });
    });

    if (argv.watch) {
      await FileWatcher.watch(path.resolve(process.cwd(), "packages", packName, "src/**/*.ts"), ["add", "change"], files => {
        try {
          worker.send(files.map(item => item.filePath));
        }
        catch (err) {
          logger.error(err);
        }
      });
    }
  };

  if (!argv.watch) {
    // 최상위 package.json 설정 가져오기
    const rootPackageJsonPath = path.resolve(process.cwd(), "package.json");
    const rootPackageJson = fs.readJsonSync(rootPackageJsonPath);

    // 프로젝트의 버전 업
    rootPackageJson.version = semver.inc(rootPackageJson.version, "patch")!;

    for (const pack of projectConfig.packages) {
      // package.json 설정 가져오기
      const packageJsonPath = path.resolve(process.cwd(), `packages/${pack.name}`, "package.json");
      const packageJson = fs.readJsonSync(packageJsonPath);

      // 최상위 package.json 에서 버전 복사
      packageJson.version = rootPackageJson.version;

      // 최상위 package.json 에서 Repository 복사
      packageJson.repository = rootPackageJson.repository;

      // 의존성 버전 재구성
      const depTypeNames = ["dependencies", "peerDependencies", "optionalDependencies"];
      for (const depTypeName of depTypeNames) {
        for (const depName of Object.keys(packageJson[depTypeName] || {})) {
          if (depName.startsWith("@" + rootPackageJson.name)) {
            packageJson[depTypeName][depName] = `~${rootPackageJson.version}`;
          }
          else if ({...rootPackageJson.dependencies, ...rootPackageJson.devDependencies}[depName]) {
            packageJson[depTypeName][depName] = {...rootPackageJson.dependencies, ...rootPackageJson.devDependencies}[depName];
          }
          else {
            throw new Error(`'${pack.name}'패키지의 의존성 패키지인 "${depName}" 정보가 루트 패키지에 없습니다.`);
          }
        }
      }

      // 최상위 package.json 파일 다시쓰기
      fs.writeJsonSync(rootPackageJsonPath, rootPackageJson, {spaces: 2, EOL: os.EOL});

      // package.json 파일 다시쓰기
      fs.writeJsonSync(packageJsonPath, packageJson, {spaces: 2, EOL: os.EOL});
    }
  }

  if (!argv.package) {
    for (const pack of projectConfig.packages) {
      promiseList.push(lintAsync(pack.name));
    }
  }
  else {
    for (const packName of argv.package.split(",")) {
      promiseList.push(lintAsync(packName));
    }
  }

  if (!argv.package) {
    const packageConfigs = (
      argv.package
        ? projectConfig.packages.filter(item => argv.package!.split(",").includes(item.name))
        : projectConfig.packages
    )
      .map(pack => ({
        ...pack,
        config: fs.readJsonSync(path.resolve(process.cwd(), "packages", pack.name, "package.json"))
      }));

    const completedPackNames: string[] = [];

    for (const pack of argv.package ? argv.package.split(",").map(item => packageConfigs.single(item1 => item1.name === item)!) : projectConfig.packages) {
      promiseList.push(
        new Promise<void>(async (resolve, reject) => {
          try {
            const thisPackageConfig = packageConfigs.single(item => item.name === pack.name)!;
            const thisPackageDependencies = {
              ...thisPackageConfig.config.peerDependencies,
              ...thisPackageConfig.config.dependencies
            };
            if (thisPackageDependencies) {
              const depPackNames = packageConfigs
                .filter(otherPackageConfig => Object.keys(thisPackageDependencies).some(depKey => otherPackageConfig.config.name === depKey))
                .map(item => item.name);
              await Wait.true(() => depPackNames.every(depPackName => completedPackNames.includes(depPackName)));
            }

            await runAsync(pack);
            completedPackNames.push(pack.name);
            resolve();
          }
          catch (err) {
            reject(err);
          }
        })
      );
    }
  }
  else {
    for (const packName of argv.package.split(",")) {
      promiseList.push(runAsync(projectConfig.packages.single(item => item.name === packName)!));
    }
  }

  await Promise.all(promiseList);
}