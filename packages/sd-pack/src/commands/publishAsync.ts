import * as child_process from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import * as semver from "semver";
import {Logger} from "../../../sd-core/src/utils/Logger";
import {SdClientPackageBuilder} from "../builders/SdClientPackageBuilder";
import {SdLibraryPackageBuilder} from "../builders/SdLibraryPackageBuilder";
import {SdServerPackageBuilder} from "../builders/SdServerPackageBuilder";

export async function publishAsync(argv: { host: string; port: number; user: string; pass: string; root: string }): Promise<void> {
  const logger = new Logger("@simplism/sd-pack", "publish");

  const spawn1 = child_process.spawnSync("git", ["diff"], {
    shell: true
  });
  if (spawn1.output.filter((item: any) => item && item.toString().trim()).length > 0) {
    logger.error("커밋 되지 않은 정보가 있습니다.");
    return;
  }

  const packageConfig = fs.readJsonSync(path.resolve(process.cwd(), "package.json"));
  const newVersion = semver.inc(packageConfig.version, "patch")!;
  child_process.spawnSync("yarn", ["version", "--new-version", newVersion], {
    shell: true,
    stdio: "inherit"
  });

  const promiseList: Promise<void>[] = [];
  for (const packageName of fs.readdirSync(path.resolve(process.cwd(), "packages"))) {
    if (packageName.startsWith("server")) {
      promiseList.push(new SdServerPackageBuilder(packageName).publishAsync(argv));
    }
    else if (packageName.startsWith("client")) {
      promiseList.push(new SdClientPackageBuilder(packageName).publishAsync(argv));
    }
    else {
      promiseList.push(new SdLibraryPackageBuilder(packageName).publishAsync());
    }
  }
  await Promise.all(promiseList);

  // git push
  child_process.spawnSync("git", ["push"], {
    shell: true
  });
}
