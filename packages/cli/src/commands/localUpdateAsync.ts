import * as fs from "fs-extra";
import * as path from "path";
import {LocalUpdater} from "../builders/LocalUpdater";
import {IProjectConfig} from "../commons/IProjectConfig";

export async function localUpdateAsync(argv: { watch: boolean; config: string }): Promise<void> {
  const projectConfig = fs.readJsonSync(path.resolve(process.cwd(), argv.config)) as IProjectConfig;

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
