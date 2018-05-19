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
  /*const logger = new Logger("@simplism/sd-pack", "publish");

  const spawn1 = child_process.spawnSync("git", ["diff"], {
    shell: true
  });
  if (spawn1.output.filter((item: any) => item && item.toString().trim()).length > 0) {
    logger.error("커밋 되지 않은 정보가 있습니다.");
    return;
  }*/

  const packageConfig = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));
  const newVersion = semver.inc(packageConfig.version, "patch")!;
  child_process.spawnSync("yarn", ["version", "--new-version", newVersion], {
    shell: true,
    stdio: "inherit"
  });

  const configJsContent = ts.transpile(fs.readFileSync(path.resolve(process.cwd(), argv.config), "utf-8"));
  const projectConfig: IProjectConfig = eval(configJsContent); // tslint:disable-line:no-eval

  for (const config of projectConfig.packages) {
    if (config.type === "server") {
      await new ServerPackageBuilder(config).publishAsync();
    }
    else if (config.type === "client") {
      await new ClientPackageBuilder(config).publishAsync();
    }
    else {
      await new LibraryPackageBuilder(config).publishAsync();
    }
  }

  // git push
  child_process.spawnSync("git", ["push"], {
    shell: true
  });
}
