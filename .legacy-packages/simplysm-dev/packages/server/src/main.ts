import { SdAutoUpdateService, SdServiceServer } from "@simplysm/sd-service-server";
import { SdLogger, SdLoggerSeverity } from "@simplysm/sd-core-node";
import path from "path";
import { EventEmitter } from "events";
import { WebstormSettingFileService } from "./services/WebstormSettingFileService";

Error.stackTraceLimit = Infinity;
EventEmitter.defaultMaxListeners = 0;

if (process.env["NODE_ENV"] === "production") {
  SdLogger.setConfig({
    console: {
      level: SdLoggerSeverity.none,
    },
    file: {
      level: SdLoggerSeverity.debug,
      outDir: path.resolve(__dirname, "_logs"),
    },
  });
} else if (process.env["SD_CLI_LOGGER_SEVERITY"] === "DEBUG") {
  SdLogger.setConfig({
    console: {
      level: SdLoggerSeverity.debug,
    },
  });
} else {
  SdLogger.setConfig({
    console: {
      level: SdLoggerSeverity.log,
    },
    file: {
      level: SdLoggerSeverity.debug,
      outDir: path.resolve(process.cwd(), "_logs"),
    },
  });
}

const server = new SdServiceServer({
  rootPath: __dirname,
  services: [WebstormSettingFileService, SdAutoUpdateService],
  port: 50580,
});

const logger = SdLogger.get(["simplysm-ts", "server"]);

server.listenAsync().catch((err) => {
  logger.error(err);
  process.exit(1);
});

export default server;
