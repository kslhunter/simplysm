import * as fs from "fs-extra";
import * as path from "path";
import {SdLocalUpdater} from "../builders/SdLocalUpdater";

export async function localUpdateAsync(argv: { project: string; watch: boolean }): Promise<void> {
  const promises: Promise<void>[] = [];

  const localUpdateProjectJson = fs.readJsonSync(path.resolve(process.cwd(), `../${argv.project}/package.json`));
  const localUpdateProjectName: string = localUpdateProjectJson.name;

  const projectJson = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));
  const depLocalUpdatePackageNames = [
    ...projectJson.dependencies ? Object.keys(projectJson.dependencies) : [],
    ...projectJson.devDependencies ? Object.keys(projectJson.devDependencies) : []
  ].filter(item => item.startsWith("@" + localUpdateProjectName)).map(item => item.slice(localUpdateProjectName.length + 2));

  for (const depLocalUpdatePackageName of depLocalUpdatePackageNames) {
    promises.push(new SdLocalUpdater(depLocalUpdatePackageName).runAsync());

    if (argv.watch) {
      promises.push(new SdLocalUpdater(depLocalUpdatePackageName).runAsync(true));
    }
  }

  await Promise.all(promises);
}
