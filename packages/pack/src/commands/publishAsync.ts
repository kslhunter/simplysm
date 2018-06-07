import * as child_process from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import * as semver from "semver";
import * as ts from "typescript";
import {LibraryPackageBuilder} from "../builders/LibraryPackageBuilder";
import {IClientPackageConfig, ILibraryPackageConfig, IProjectConfig} from "../commons/IProjectConfig";
import {ServerPackageBuilder} from "../builders/ServerPackageBuilder";
import {ClientPackageBuilder} from "../builders/ClientPackageBuilder";

export async function publishAsync(argv: { config: string }): Promise<void> {
  const packageConfig = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));
  const newVersion = semver.inc(packageConfig.version, "patch")!;
  child_process.spawnSync("yarn", ["version", "--new-version", newVersion], {
    shell: true,
    stdio: "inherit"
  });

  const configJsContent = ts.transpile(fs.readFileSync(path.resolve(process.cwd(), argv.config), "utf-8"));
  const projectConfig: IProjectConfig = eval(configJsContent); // tslint:disable-line:no-eval

  const promiseList: Promise<void>[] = [];
  for (const config of projectConfig.packages.filter(item => item.type === "library")) {
    promiseList.push(new LibraryPackageBuilder(config as ILibraryPackageConfig).publishAsync());
  }
  await Promise.all(promiseList);

  for (const config of projectConfig.packages.filter(item => item.type !== "library")) {
    if (config.type === "server") {
      await new ServerPackageBuilder(config).publishAsync();
    }
    else {
      await new ClientPackageBuilder(config as IClientPackageConfig).publishAsync();
    }
  }
}