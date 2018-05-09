import * as fs from "fs-extra";
import * as path from "path";
import {SdClientPackageBuilder} from "../builders/SdClientPackageBuilder";
import {SdLibraryPackageBuilder} from "../builders/SdLibraryPackageBuilder";
import {SdLocalUpdater} from "../builders/SdLocalUpdater";
import {SdServerPackageBuilder} from "../builders/SdServerPackageBuilder";

export async function buildAsync(argv: { watch: boolean; env: { [key: string]: any }; package: string }): Promise<void> {
  const promiseList: Promise<void>[] = [];
  if (
    argv.watch &&
    path.basename(process.cwd()) !== "simplism" &&
    fs.existsSync(path.resolve(process.cwd(), "../simplism"))
  ) {
    const rootPackageJson = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));
    const dependencySimplismPackageNameList = [
      ...rootPackageJson.dependencies ? Object.keys(rootPackageJson.dependencies) : [],
      ...rootPackageJson.devDependencies ? Object.keys(rootPackageJson.devDependencies) : []
    ].filter(item => item.startsWith("@simplism")).map(item => item.slice(10));

    for (const dependencySimplismPackageName of dependencySimplismPackageNameList) {
      promiseList.push(new SdLocalUpdater(dependencySimplismPackageName).runAsync(true));
    }
  }

  const runBuild = (packageName: string) => {
    if (!argv.watch) {
      if (packageName.startsWith("client")) {
        promiseList.push(new SdClientPackageBuilder(packageName).buildAsync(argv.env));
      }
      else if (packageName.startsWith("server")) {
        promiseList.push(new SdServerPackageBuilder(packageName).buildAsync(argv.env));
      }
      else {
        promiseList.push(new SdLibraryPackageBuilder(packageName).buildAsync());
      }
    }
    else {
      if (packageName.startsWith("client")) {
        promiseList.push(new SdClientPackageBuilder(packageName).watchAsync(argv.env));
      }
      else if (packageName.startsWith("server")) {
        promiseList.push(new SdServerPackageBuilder(packageName).watchAsync(argv.env));
      }
      else {
        promiseList.push(new SdLibraryPackageBuilder(packageName).watchAsync());
      }
    }
  };

  if (!argv.package) {
    for (const packageName of fs.readdirSync(path.resolve(process.cwd(), "packages"))) {
      runBuild(packageName);
    }
  }
  else {
    runBuild(argv.package);
  }
  await Promise.all(promiseList);
}
