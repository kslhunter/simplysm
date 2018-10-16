import * as fs from "fs-extra";
import * as path from "path";
import {LibraryPackageBuilder} from "../builders/LibraryPackageBuilder";
import {ILibraryPackageConfig, IProjectConfig} from "../commons/IProjectConfig";
import {ServerPackageBuilder} from "../builders/ServerPackageBuilder";
import {ClientPackageBuilder} from "../builders/ClientPackageBuilder";

export async function publishAsync(argv: { config?: string; package: string; env?: any }): Promise<void> {
  process.env.NODE_ENV = "production";

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

  const promiseList: Promise<void>[] = [];
  for (const config of projectConfig.packages.filter(item => item.type === "library" && item.publish !== false)) {
    if (!argv.package || argv.package.split(",").includes(config.name)) {
      promiseList.push(new LibraryPackageBuilder(config as ILibraryPackageConfig).publishAsync());
    }
  }
  await Promise.all(promiseList);

  for (const config of projectConfig.packages.filter(item => item.type !== "library" && item.publish !== undefined)) {
    if (config.type === "library") {
    }
    else if (!argv.package || argv.package.split(",").includes(config.name)) {
      if (config.type === "server") {
        await new ServerPackageBuilder({
          ...config,
          "env": {...projectConfig.env, ...config.env, ...argv.env},
          "env.production": {...projectConfig["env.production"], ...config["env.production"]}
        }).publishAsync();
      }
      else {
        await new ClientPackageBuilder({
          ...config,
          "env": {...projectConfig.env, ...config.env, ...argv.env},
          "env.production": {...projectConfig["env.production"], ...config["env.production"]}
        }).publishAsync();
      }
    }
  }
}