import {ImposibleException} from "@simplism/sd-core";
import * as fs from "fs-extra";
import * as path from "path";
import {SdClientPackageBuilder} from "../builders/SdClientPackageBuilder";
import {SdLibraryPackageBuilder} from "../builders/SdLibraryPackageBuilder";
import {SdLocalUpdater} from "../builders/SdLocalUpdater";
import {SdServerPackageBuilder} from "../builders/SdServerPackageBuilder";
import {ISdPackageBuilder} from "../commons/ISdPackageBuilder";
import {SdPackConfigType} from "../commons/configs";

export interface IBuildArguments {
  watch: boolean;
  config: string;
  package?: string;
  localUpdateProject?: string;
}

export async function buildAsync(argv: IBuildArguments): Promise<void> {
  const promises: Promise<void>[] = [];

  if (argv.localUpdateProject) {
    const localUpdateProjectJson = fs.readJsonSync(path.resolve(process.cwd(), `../${argv.localUpdateProject}/package.json`));
    const localUpdateProjectName: string = localUpdateProjectJson.name;

    const projectJson = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));
    const depLocalUpdatePackageNames = [
      ...projectJson.dependencies ? Object.keys(projectJson.dependencies) : [],
      ...projectJson.devDependencies ? Object.keys(projectJson.devDependencies) : []
    ].filter(item => item.startsWith("@" + localUpdateProjectName)).map(item => item.slice(localUpdateProjectName.length + 2));

    for (const depLocalUpdatePackageName of depLocalUpdatePackageNames) {
      promises.push(new SdLocalUpdater(depLocalUpdatePackageName).runAsync(true));
    }
  }

  const configs: SdPackConfigType[] = require(path.resolve(process.cwd(), argv.config));
  for (const config of configs) {
    if (argv.package && !argv.package.split(",").includes(config.name)) {
      continue;
    }

    let builder: ISdPackageBuilder;
    if (config.type === "library") {
      builder = new SdLibraryPackageBuilder(config);
    }
    else if (config.type === "client") {
      builder = new SdClientPackageBuilder(config);
    }
    else if (config.type === "server") {
      builder = new SdServerPackageBuilder(config);
    }
    else {
      throw new ImposibleException();
    }

    promises.push(argv.watch ? builder.watchAsync() : builder.buildAsync());
  }

  await Promise.all(promises);
}