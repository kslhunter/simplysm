import path from "path";
import { pathToFileURL } from "url";
import { SdServiceServer } from "@simplysm/sd-service-server";
import { createSdWorker, Logger, LoggerSeverity } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import { TServerWorkerType } from "../types/workers.type";

Error.stackTraceLimit = Infinity;
EventEmitter.defaultMaxListeners = 0;

if (process.env["SD_DEBUG"] != null) {
  Logger.setConfig({
    console: {
      level: LoggerSeverity.debug,
    },
  });
} else {
  Logger.setConfig({
    dot: true,
  });
}

let server: SdServiceServer;

createSdWorker<TServerWorkerType>({
  async listen(pkgInfo: { path: string } | { port: number }) {
    if ("path" in pkgInfo) {
      const mainFilePath = path.resolve(pkgInfo.path, "dist/main.js");
      const serverModule = await import(pathToFileURL(mainFilePath).href);
      const currServer = serverModule.default as SdServiceServer | undefined;
      if (currServer == null) {
        throw new Error(`${mainFilePath}(0, 0): 'SdServiceServer'를 'export'해야 합니다.`);
      }
      server = currServer;
    } else {
      server = new SdServiceServer({
        rootPath: process.cwd(),
        services: [],
        port: pkgInfo.port,
      });
      await server.listenAsync();
    }

    return server.options.port;
  },
  setPathProxy(pathProxy: Record<string, string | number>) {
    server.pathProxy = pathProxy;
  },
  broadcastReload(changedFileSet: Set<string>) {
    server.broadcastReload(changedFileSet);
  },
});
