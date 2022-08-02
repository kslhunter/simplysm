import path from "path";
import { INpmConfig } from "../../../commons";
import { FsUtil } from "@simplysm/sd-core-node";

export const fc_package_server_main = (opt: { projPath: string; pkgName: string; port: number }): string => {
  const projNpmConfig = FsUtil.readJson(path.resolve(opt.projPath, "package.json")) as INpmConfig;

  return /* language=ts */ `

import { SdServiceServer } from "@simplysm/sd-service-server";
import { Logger, LoggerSeverity } from "@simplysm/sd-core-node";
import path from "path";

Error.stackTraceLimit = Infinity;

if (process.env["NODE_ENV"] === "production") {
  Logger.setConfig({
    console: {
      level: LoggerSeverity.none
    },
    file: {
      level: LoggerSeverity.debug,
      outDir: path.resolve(__dirname, "_logs")
    }
  });
}
else if (process.env["SD_CLI_LOGGER_SEVERITY"] === "DEBUG") {
  Logger.setConfig({
    console: {
      level: LoggerSeverity.debug
    }
  });
}
else {
  Logger.setConfig({
    console: {
      level: LoggerSeverity.log,
    },
    file: {
      level: LoggerSeverity.debug,
      outDir: path.resolve(process.cwd(), "_logs")
    }
  });
}

const server = new SdServiceServer({
  rootPath: __dirname,
  services: [],
  port: ${opt.port}
});

const logger = Logger.get(["${projNpmConfig.name}", "${opt.pkgName}"]);

server.listenAsync().catch((err) => {
  logger.error(err);
  process.exit(1);
});

export = server;

`.trim();
};
