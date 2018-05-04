import * as fs from "fs-extra";
import * as path from "path";
import {SdLocalUpdater} from "../builders/SdLocalUpdater";

export async function localUpdateAsync(argv: { watch: boolean }): Promise<void> {
  const promiseList: Promise<void>[] = [];
  if (
    path.basename(process.cwd()) !== "simplism" &&
    fs.existsSync(path.resolve(process.cwd(), "../simplism"))
  ) {
    const rootPackageJson = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));
    const dependencySimplismPackageNameList = [
      ...rootPackageJson.dependencies ? Object.keys(rootPackageJson.dependencies) : [],
      ...rootPackageJson.devDependencies ? Object.keys(rootPackageJson.devDependencies) : []
    ].filter(item => item.startsWith("@simplism")).map(item => item.slice(10));

    for (const dependencySimplismPackageName of dependencySimplismPackageNameList) {
      if (argv.watch) {
        promiseList.push(new SdLocalUpdater(dependencySimplismPackageName).runAsync());
      }
      promiseList.push(new SdLocalUpdater(dependencySimplismPackageName).runAsync(argv.watch));
    }
  }

  await Promise.all(promiseList);
}
