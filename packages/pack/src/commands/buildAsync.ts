import * as fs from "fs-extra";
import * as path from "path";
import * as ts from "typescript";
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
  const configJsContent = ts.transpile(fs.readFileSync(path.resolve(process.cwd(), argv.config), "utf-8"));
  const projectConfig: IProjectConfig = eval(configJsContent); // tslint:disable-line:no-eval

  const promiseList: Promise<void>[] = [];
  if (argv.watch && projectConfig.localDependencies) {
    for (const packageName of Object.keys(projectConfig.localDependencies)) {
      const packagePath = projectConfig.localDependencies[packageName];

      if (fs.existsSync(packagePath)) {
        promiseList.push(new LocalUpdater(packageName, packagePath).runAsync(true));
      }
    }
  }

  const runAsync = async (config: ILibraryPackageConfig | IClientPackageConfig | IServerPackageConfig) => {
    if (!argv.watch) {
      if (config.type === "client") {
        await new ClientPackageBuilder(config).buildAsync();
      }
      else if (config.type === "server") {
        await new ServerPackageBuilder(config).buildAsync();
      }
      else {
        await new LibraryPackageBuilder(config).buildAsync();
      }
    }
    else {
      if (config.type === "client") {
        await new ClientPackageBuilder(config).watchAsync();
      }
      else if (config.type === "server") {
        await new ServerPackageBuilder(config).watchAsync();
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
            if (thisPackageConfig.config.peerDependencies) {
              const depPackNames = packageConfigs.filter(otherPackageConfig => Object.keys(thisPackageConfig.config.peerDependencies).some(depKey => otherPackageConfig.config.name === depKey)).map(item => item.name);
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
    for (const pack of argv.package.split(",")) {
      promiseList.push(runAsync(projectConfig.packages.single(item => item.name === pack)!));
    }
  }

  await Promise.all(promiseList);
}