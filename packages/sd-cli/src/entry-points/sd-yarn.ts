import "source-map-support/register";

import * as yargs from "yargs";
import { EventEmitter } from "events";
import { FsUtils, Logger, LoggerSeverity } from "@simplysm/sd-core-node";
import * as os from "os";
import * as path from "path";

const lockfile = require("@yarnpkg/lockfile");

EventEmitter.defaultMaxListeners = 0;
process.setMaxListeners(0);

const argv = yargs
  .version(false)
  .help("help", "도움말")
  .alias("help", "h")
  .options({
    debug: {
      type: "boolean",
      describe: "디버그 로그를 표시할 것인지 여부",
      default: false
    }
  })
  .command(
    "check-lock-ver",
    "yarn.lock 파일내의 중복 패키지 버전을 체크합니다.",
    cmd => cmd.version(false)
  )
  .argv;

const logger = Logger.get(["simplysm", "sd-yarn"]);

if (argv.debug) {
  Error.stackTraceLimit = 100; //Infinity;

  process.env.SD_CLI_LOGGER_SEVERITY = "DEBUG";

  Logger.setConfig({
    console: {
      level: LoggerSeverity.debug
    }
  });
}
else {
  Logger.setConfig({
    dot: true
  });
}


(async (): Promise<void> => {
  if (argv._[0] === "check-lock-ver") {
    const lockFileContent = await FsUtils.readFileAsync("yarn.lock");
    const lockFileObj = lockfile.parse(lockFileContent);
    const packageNames = Object.keys(lockFileObj.object)
      .map(item => item[0] + item.slice(1).split("@")[0])
      .distinct();
    const packages = packageNames
      .map(packageName => {
        const versions = Object.keys(lockFileObj.object)
          .filter(item => item.startsWith(packageName + "@"))
          .map(item => lockFileObj.object[item].version)
          .distinct();
        return { name: packageName, versions };
      });
    const multiVersionPackages = packages.filter(item => item.versions.length > 1);
    // console.log(multiVersionPackages);

    const rootNpmConfig = await FsUtils.readJsonAsync("package.json");
    const packagePaths = await (rootNpmConfig.workspaces as string[])
      .mapManyAsync(async workspace => await FsUtils.globAsync(workspace));
    const packageNpmConfigs = await packagePaths.map(item => path.resolve(item, "package.json"))
      .mapAsync(async item => await FsUtils.readJsonAsync(item));

    const depPackageNames = Object.keys((rootNpmConfig.dependencies ?? {}))
      .concat(Object.keys((rootNpmConfig.devDependencies ?? {})))
      .concat(Object.keys((rootNpmConfig.peerDependencies ?? {})))
      .concat(packageNpmConfigs.mapMany(item => Object.keys((item.dependencies ?? {}))))
      .concat(packageNpmConfigs.mapMany(item => Object.keys((item.devDependencies ?? {}))))
      .concat(packageNpmConfigs.mapMany(item => Object.keys((item.peerDependencies ?? {}))));

    const resultPackages = multiVersionPackages.filter(item => depPackageNames.includes(item.name));
    // eslint-disable-next-line no-console
    console.log(resultPackages.map(item => item.name + ": " + item.versions.join(", ")).join("\n"));
  }
  else {
    throw new Error(`명령어가 잘못되었습니다.${os.EOL + os.EOL}\t${argv._[0]}${os.EOL}`);
  }
})().catch(err => {
  logger.error(err);
  process.exit(1);
});