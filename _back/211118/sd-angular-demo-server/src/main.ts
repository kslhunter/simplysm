import { SdServiceServer } from "../../../../packages/sd-service-node";
import { Logger, LoggerSeverity } from "../../../../packages/sd-core-node";
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

const logger = Logger.get(["simplysm", "sd-angular-demo-server"]);

server.listenAsync().catch((err) => {
  logger.error(err);
  process.exit(1);
});

export = server;
