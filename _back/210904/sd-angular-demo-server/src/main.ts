import { SdServiceServer } from "@simplysm/sd-service-node";
import { Logger, LoggerSeverity } from "@simplysm/sd-core-node";
import * as path from "path";

if (process.env.NODE_ENV === "production") {
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
else {
  Logger.setConfig({
    file: {
      level: LoggerSeverity.debug,
      outDir: path.resolve(process.cwd(), "_logs")
    }
  });
}

const server = new SdServiceServer({
  port: 50080,
  rootPath: __dirname,
  services: []
});

const logger = Logger.get(["simplysm-ts", "server"]);

server.listenAsync().catch((err) => {
  logger.error(err);
  process.exit(1);
});

export = server;
