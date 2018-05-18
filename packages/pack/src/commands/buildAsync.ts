import * as fs from "fs-extra";
import * as path from "path";
import * as ts from "typescript";
import {
  IClientPackageConfig,
  ILibraryPackageConfig,
  IProjectConfig,
  IServerPackageConfig
} from "../commons/IProjectConfig";
import {SdLocalUpdater} from "../builders/SdLocalUpdater";
import {SdLibraryPackageBuilder} from "../builders/SdLibraryPackageBuilder";
import {Wait} from "@simplism/core";

export async function buildAsync(argv: { watch: boolean; package: string; config: string }): Promise<void> {
  const configJsContent = ts.transpile(fs.readFileSync(path.resolve(process.cwd(), argv.config), "utf-8"));
  const projectConfig: IProjectConfig = eval(configJsContent); // tslint:disable-line:no-eval

  const promiseList: Promise<void>[] = [];
  if (argv.watch && projectConfig.localDependencies) {
    for (const packageName of Object.keys(projectConfig.localDependencies)) {
      const packagePath = projectConfig.localDependencies[packageName];

      if (fs.existsSync(packagePath)) {
        await new SdLocalUpdater(packageName, packagePath).runAsync(true);
      }
    }
  }

  const runAsync = async (config: ILibraryPackageConfig | IClientPackageConfig | IServerPackageConfig) => {
    if (!argv.watch) {
      if (config.type === "client") {
        /*await new SdClientPackageBuilder(config).buildAsync();*/
      }
      else if (config.type === "server") {
        /*await new SdServerPackageBuilder(config).buildAsync();*/
      }
      else {
        await new SdLibraryPackageBuilder(config).buildAsync();
      }
    }
    else {
      if (config.type === "client") {
        /*await new SdClientPackageBuilder(config).watchAsync();*/
      }
      else if (config.type === "server") {
        /*await new SdServerPackageBuilder(config).watchAsync();*/
      }
      else {
        await new SdLibraryPackageBuilder(config).watchAsync();
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
      promiseList.push(new Promise<void>(async resolve => {
        const thisPackageConfig = packageConfigs.single(item => item.name === pack.name)!;
        if (thisPackageConfig.config.dependencies) {
          const depPackNames = packageConfigs.filter(otherPackageConfig => Object.keys(thisPackageConfig.config.dependencies).some(depKey => otherPackageConfig.config.name === depKey)).map(item => item.name);
          await Wait.true(() => depPackNames.every(depPackName => completedPackNames.includes(depPackName)));
        }

        await runAsync(pack);
        completedPackNames.push(pack.name);
        resolve();
      }));
    }
  }
  else {
    promiseList.push(runAsync(projectConfig.packages[argv.package]));
  }

  await Promise.all(promiseList);
}