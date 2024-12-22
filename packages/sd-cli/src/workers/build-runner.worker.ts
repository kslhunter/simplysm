import { createSdWorker, FsUtils, SdLogger, SdLoggerSeverity } from "@simplysm/sd-core-node";
import { type ISdBuildMessage } from "../types/build.types";
import path from "path";
import { SdServerBuildRunner } from "../pkg-builders/server/sd-server.build-runner";
import { SdClientBuildRunner } from "../pkg-builders/client/sd-client.build-runner";
import { SdTsLibBuildRunner } from "../pkg-builders/lib/sd-ts-lib.build-runner";
import { SdJsLibBuildRunner } from "../pkg-builders/lib/sd-js-lib.build-runner";
import { type TSdBuildRunnerWorkerType } from "../types/worker.types";
import { type ISdBuildRunnerWorkerRequest } from "../types/build-runner.types";
import { EventEmitter } from "events";

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

const worker = createSdWorker<TSdBuildRunnerWorkerType>({
  async run(req: ISdBuildRunnerWorkerRequest): Promise<ISdBuildMessage[] | void> {
    const pkgConf = req.projConf.packages[path.basename(req.pkgPath)]!;

    const buildRunnerType =
      pkgConf.type === "server"
        ? SdServerBuildRunner
        : pkgConf.type === "client"
          ? SdClientBuildRunner
          : FsUtils.exists(path.resolve(req.pkgPath, "tsconfig.json"))
            ? SdTsLibBuildRunner
            : SdJsLibBuildRunner;

    const builder = new buildRunnerType(req.projConf, req.pkgPath)
      .on("change", () => {
        worker.send("change");
      })
      .on("complete", (result) => {
        worker.send("complete", result)
      });

    if (req.cmd === "build") {
      const res = await builder.buildAsync();
      return res.buildMessages;
    } else {
      await builder.watchAsync();
      return;
    }
  },
});
