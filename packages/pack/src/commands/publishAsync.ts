import * as child_process from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import * as semver from "semver";
import * as ts from "typescript";
import {LibraryPackageBuilder} from "../builders/LibraryPackageBuilder";
import {IProjectConfig} from "../commons/IProjectConfig";
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
  for (const config of projectConfig.packages) {
    if (config.type === "server") {
      promiseList.push(new ServerPackageBuilder(config).publishAsync());
    }
    else if (config.type === "client") {
      promiseList.push(new ClientPackageBuilder(config).publishAsync());
    }
    else {
      promiseList.push(new LibraryPackageBuilder(config).publishAsync());
    }
  }
  await Promise.all(promiseList);

  // git push
  child_process.spawnSync("git", ["push"], {
    shell: true
  });
}
