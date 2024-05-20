import {EventEmitter} from "events";
import {Logger, LoggerSeverity} from "@simplysm/sd-core-node";
import path from "path";
import {pathToFileURL} from "url";
import {SdServiceServer} from "@simplysm/sd-service-server";
import {JsonConvert} from "@simplysm/sd-core-common";

Error.stackTraceLimit = Infinity;
EventEmitter.defaultMaxListeners = 0;

if (Boolean(process.env["SD_DEBUG"])) {
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

const logger = Logger.get(["simplysm", "sd-cli", "server-worker"]);

const pkgPathOrOpt = JsonConvert.parse(process.argv[2]) as (string | { port: number });

let server: SdServiceServer | undefined;

if (typeof pkgPathOrOpt === "string") {
  const mainFilePath = path.resolve(pkgPathOrOpt, "dist/main.js");
  const serverModule = await import(pathToFileURL(mainFilePath).href);
  server = serverModule.default as SdServiceServer | undefined;
  if (server === undefined) {
    logger.error(`${mainFilePath}(0, 0): 'SdServiceServer'를 'export'해야 합니다.`);
    process.exit();
  }
}
else {
  server = new SdServiceServer({
    rootPath: process.cwd(),
    services: [],
    port: pkgPathOrOpt.port
  });
  server.listenAsync()
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    });
}


server.on("ready", () => {
  process.send!({port: server.options.port});
});

process.on("message", (message: any) => {
  if (message.type === "setPathProxy") {
    server.pathProxy = message.pathProxy;
  }
  if (message.type === "broadcastReload") {
    server.broadcastReload();
  }
});