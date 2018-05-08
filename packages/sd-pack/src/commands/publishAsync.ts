import {ImposibleException} from "@simplism/sd-core";
import * as child_process from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import * as semver from "semver";
import {SdClientPackageBuilder} from "../builders/SdClientPackageBuilder";
import {SdLibraryPackageBuilder} from "../builders/SdLibraryPackageBuilder";
import {SdPackConfigType} from "../commons/configs";
import {SdServerPackageBuilder} from "../builders/SdServerPackageBuilder";

export async function publishAsync(argv: { config: string }): Promise<void> {
  const promises: Promise<void>[] = [];

  const spawn1 = child_process.spawnSync("git", ["diff"], {
    shell: true
  });
  if (spawn1.output.filter((item: any) => item && item.toString().trim()).length > 0) {
    throw Error("커밋 되지 않은 정보가 있습니다.");
  }

  const packageConfig = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));
  const newVersion = semver.inc(packageConfig.version, "patch")!;
  child_process.spawnSync("yarn", ["version", "--new-version", newVersion], {
    shell: true,
    stdio: "inherit"
  });

  const configs: SdPackConfigType[] = require(path.resolve(process.cwd(), argv.config));
  for (const config of configs) {
    if (config.type === "library") {
      promises.push(new SdLibraryPackageBuilder(config).publishAsync());
    }
    else if (config.type === "client") {
      promises.push(new SdClientPackageBuilder(config).publishAsync());
    }
    else if (config.type === "server") {
      promises.push(new SdServerPackageBuilder(config).publishAsync());
    }
    else {
      throw new ImposibleException();
    }
  }
  await Promise.all(promises);

  // git push
  child_process.spawnSync("git", ["push"], {
    shell: true
  });
}
