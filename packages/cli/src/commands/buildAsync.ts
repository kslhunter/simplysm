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

export async function buildAsync(argv: { watch: boolean; package?: string; config: string }): Promise<void> {
  const projectConfig = fs.readJsonSync(path.resolve(process.cwd(), argv.config)) as IProjectConfig;

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