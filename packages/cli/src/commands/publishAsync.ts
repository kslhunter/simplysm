import * as fs from "fs-extra";
import * as path from "path";
import {LibraryPackageBuilder} from "../builders/LibraryPackageBuilder";
import {ILibraryPackageConfig, IProjectConfig} from "../commons/IProjectConfig";
import {ServerPackageBuilder} from "../builders/ServerPackageBuilder";
import {ClientPackageBuilder} from "../builders/ClientPackageBuilder";

export async function publishAsync(argv: { config: string; package: string }): Promise<void> {
  /*const packageConfig = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));
  const newVersion = semver.inc(packageConfig.version, "patch")!;
  child_process.spawnSync("yarn", ["version", "--new-version", newVersion], {
    shell: true,
    stdio: "inherit"
  });*/
  /*child_process.spawnSync("npm", ["version", "patch", "--git-tag-version", "false"], {
    shell: true,
    stdio: "inherit"
  });*/

  const projectConfig = fs.readJsonSync(path.resolve(process.cwd(), argv.config)) as IProjectConfig;

  const promiseList: Promise<void>[] = [];
  for (const config of projectConfig.packages.filter(item => item.type === "library")) {
    if (!argv.package || argv.package.split(",").includes(config.name)) {
      promiseList.push(new LibraryPackageBuilder(config as ILibraryPackageConfig).publishAsync());
    }
  }
  await Promise.all(promiseList);

  for (const config of projectConfig.packages) {
    if (config.type === "library") {
    }
    else if (!argv.package || argv.package.split(",").includes(config.name)) {
      if (config.type === "server") {
        await new ServerPackageBuilder({
          "env": projectConfig.env,
          "env.production": projectConfig["env.production"],
          ...config
        }).publishAsync();
      }
      else {
        await new ClientPackageBuilder({
          "env": projectConfig.env,
          "env.production": projectConfig["env.production"],
          ...config
        }).publishAsync();
      }
    }
  }
}