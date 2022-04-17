import { Logger, LoggerSeverity } from "@simplysm/sd-core-node";
import { JsonConvert } from "@simplysm/sd-core-common";
import { SdServiceServer } from "@simplysm/sd-service-server";

if (process.env["SD_CLI_LOGGER_SEVERITY"] === "DEBUG") {
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

const filePathOrOpt = JsonConvert.parse(process.argv[2]) as (string | { port: number });

let runningServer: SdServiceServer | undefined;

if (typeof filePathOrOpt === "string") {
  import(`file:///${filePathOrOpt}`)
    .then((serverModule) => {
      const server = serverModule.default as SdServiceServer | undefined;
      if (server === undefined) {
        // eslint-disable-next-line no-console
        console.error(`${filePathOrOpt}(0, 0): 'SdServiceServer'를 'export'해야 합니다.`);
        process.exit(1);
        return;
      }
      const protocolStr = server.options.ssl ? "https" : "http";
      const portStr = server.options.port.toString();

      runningServer = server;
      process.send!(`${protocolStr}://localhost:${portStr}`);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    });
}
// DEV SERVER
else {
  const server = new SdServiceServer({
    rootPath: process.cwd(),
    services: [],
    port: filePathOrOpt.port
  });
  server.listenAsync()
    .then(() => {
      runningServer = server;
      process.send!(`http://localhost:${filePathOrOpt.port}`);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    });
}

process.on("message", (msg: string) => {
  if (!runningServer) return;

  if (msg === "broadcastReload") {
    runningServer.broadcastReload();
  }
  else {
    runningServer.pathProxy = JsonConvert.parse(msg);
  }
});
