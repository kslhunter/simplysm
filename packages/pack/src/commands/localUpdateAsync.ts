import * as fs from "fs-extra";
import * as path from "path";
import * as ts from "typescript";
import {LocalUpdater} from "../builders/LocalUpdater";
import {IProjectConfig} from "../commons/IProjectConfig";

export async function localUpdateAsync(argv: { watch: boolean; config: string }): Promise<void> {
  const configJsContent = ts.transpile(fs.readFileSync(path.resolve(process.cwd(), argv.config), "utf-8"));
  const projectConfig: IProjectConfig = eval(configJsContent); // tslint:disable-line:no-eval

  const promiseList: Promise<void>[] = [];
  if (argv.watch && projectConfig.localDependencies) {
    for (const packageName of Object.keys(projectConfig.localDependencies)) {
      const packagePath = projectConfig.localDependencies[packageName];

      if (fs.existsSync(packagePath)) {
        if (argv.watch) {
          promiseList.push(new LocalUpdater(packageName, packagePath).runAsync(true));
        }
        promiseList.push(new LocalUpdater(packageName, packagePath).runAsync());
      }
    }
  }

  await Promise.all(promiseList);
}
