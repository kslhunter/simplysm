import path from "path";
import { pathToFileURL } from "url";
import type { SdServiceServer } from "@simplysm/sd-service-server";
import { createSdWorker, SdLogger, SdLoggerSeverity } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import { TServerWorkerType } from "../types/worker.types";

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
      // packages-test에서 오류발생. 해결을 위해 여기서 import
      const { SdServiceServer } = await import("@simplysm/sd-service-server");
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
