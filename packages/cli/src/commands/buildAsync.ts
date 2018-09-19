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
import {Wait} from "@simplism/core";
import {ServerPackageBuilder} from "../builders/ServerPackageBuilder";
import {ClientPackageBuilder} from "../builders/ClientPackageBuilder";
import * as semver from "semver";
import * as os from "os";

export async function buildAsync(argv: { watch: boolean; package?: string; config?: string }): Promise<void> {
  process.env.NODE_ENV = argv.watch ? "development" : "production";

  let configFilePath = argv.config;
  if (!configFilePath) {
    configFilePath = fs.existsSync(path.resolve(process.cwd(), "simplism.ts")) ? path.resolve(process.cwd(), "simplism.ts")
      : fs.existsSync(path.resolve(process.cwd(), "simplism.js")) ? path.resolve(process.cwd(), "simplism.js")
        : path.resolve(process.cwd(), "simplism.json");
    console.log(configFilePath);
  }

  if (path.extname(configFilePath) === ".ts") {
    // tslint:disable-next-line
    require("ts-node/register");
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
          "env": projectConfig.env,
          "env.production": projectConfig["env.production"],
          ...config
        }).buildAsync();
      }
      else if (config.type === "server") {
        await new ServerPackageBuilder({
          "env": projectConfig.env,
          "env.production": projectConfig["env.production"],
          ...config
        }).buildAsync();
      }
      else {
        await new LibraryPackageBuilder(config).buildAsync();
      }
    }
    else {
      if (config.type === "client") {
        await new ClientPackageBuilder({
          "env": projectConfig.env,
          "env.development": projectConfig["env.development"],
          ...config
        }).watchAsync();
      }
      else if (config.type === "server") {
        await new ServerPackageBuilder({
          "env": projectConfig.env,
          "env.development": projectConfig["env.development"],
          ...config
        }).watchAsync();
      }
      else {
        await new LibraryPackageBuilder(config).watchAsync();
      }
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
            packageJson[depTypeName][depName] = `^${rootPackageJson.version}`;
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
    const packageConfigs = projectConfig.packages
      .map(pack => ({
        name: pack.name,
        config: fs.readJsonSync(path.resolve(process.cwd(), "packages", pack.name, "package.json"))
      }));

    const completedPackNames: string[] = [];

    for (const pack of projectConfig.packages) {
      promiseList.push(
        new Promise<void>(async (resolve, reject) => {
          try {
            const thisPackageConfig = packageConfigs.single(item => item.name === pack.name)!;
            const thisPackageDependencies = {
              ...thisPackageConfig.config.peerDependencies,
              ...thisPackageConfig.config.dependencies
            };
            if (thisPackageDependencies) {
              const depPackNames = packageConfigs.filter(otherPackageConfig => Object.keys(thisPackageDependencies).some(depKey => otherPackageConfig.config.name === depKey)).map(item => item.name);
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