import * as fs from "fs-extra";
import * as path from "path";
import {LocalUpdater} from "../builders/LocalUpdater";
import {IProjectConfig} from "../commons/IProjectConfig";

export async function localUpdateAsync(argv: { watch: boolean; config?: string }): Promise<void> {
  process.env.NODE_ENV = "development";

  let configFilePath = argv.config;
  if (!configFilePath) {
    configFilePath = fs.existsSync(path.resolve(process.cwd(), "simplism.ts")) ? path.resolve(process.cwd(), "simplism.ts")
      : fs.existsSync(path.resolve(process.cwd(), "simplism.js")) ? path.resolve(process.cwd(), "simplism.js")
        : path.resolve(process.cwd(), "simplism.json");
  }

  if (path.extname(configFilePath) === ".ts") {
    // tslint:disable-next-line
    require("ts-node/register");
  }

  // tslint:disable-next-line:no-eval
  const projectConfig = eval("require(configFilePath)") as IProjectConfig;

  const promiseList: Promise<void>[] = [];
  if (projectConfig.localDependencies) {
    for (const packageName of Object.keys(projectConfig.localDependencies)) {
      const packagePath = projectConfig.localDependencies[packageName];

      if (fs.existsSync(packagePath)) {
        promiseList.push(new LocalUpdater(packageName, packagePath).runAsync());
        if (argv.watch) {
          promiseList.push(new LocalUpdater(packageName, packagePath).runAsync(true));
        }
      }
    }
  }

  await Promise.all(promiseList);
}
