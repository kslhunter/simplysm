import path from "path";
import { pathToFileURL } from "url";
import type { SdServiceServer } from "@simplysm/sd-service-server";
import { createSdWorker, SdLogger, SdLoggerSeverity } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import { IServerWorkerType } from "../types/worker/IServerWorkerType";

Error.stackTraceLimit = Infinity;
EventEmitter.defaultMaxListeners = 0;

if (process.env["SD_DEBUG"] != null) {
  SdLogger.setConfig({
    console: {
      level: SdLoggerSeverity.debug,
    },
  });
} else {
  SdLogger.setConfig({
    dot: true,
  });
}

let server: SdServiceServer;

createSdWorker<IServerWorkerType>({
  async listen(pkgPathOrPort: string | number) {
    if (typeof pkgPathOrPort === "string") {
      const mainFilePath = path.resolve(pkgPathOrPort, "dist/main.js");
      const serverModule = await import(pathToFileURL(mainFilePath).href);
      const currServer = serverModule.default as SdServiceServer | undefined;
      if (currServer == null) {
        throw new Error(`${mainFilePath}(0, 0): 'SdServiceServer'를 'export'해야 합니다.`);
      }
      server = currServer;
    } else {
      // packages-test에서 오류발생. 해결을 위해 여기서 import
      const { SdServiceServer } = await import("@simplysm/sd-service-server");
      server = new SdServiceServer({
        rootPath: process.cwd(),
        services: [],
        port: pkgPathOrPort,
      });
      await server.listenAsync();
    }

    return server.options.port;
  },
  setPathProxy(pathProxy: Record<string, string>) {
    server.options.pathProxy = pathProxy;
  },
  broadcastReload(clientName: string | undefined, changedFileSet: Set<string>) {
    server.broadcastReload(clientName, changedFileSet);
  },
});
