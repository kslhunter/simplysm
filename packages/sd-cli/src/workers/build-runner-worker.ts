import { createSdWorker, FsUtil, Logger, LoggerSeverity } from "@simplysm/sd-core-node";
import { ISdBuildMessage } from "../types/build.type";
import path from "path";
import { SdServerBuildRunner } from "../pkg-builders/server/SdServerBuildRunner";
import { SdClientBuildRunner } from "../pkg-builders/client/SdClientBuildRunner";
import { SdTsLibBuildRunner } from "../pkg-builders/lib/SdTsLibBuildRunner";
import { SdJsLibBuildRunner } from "../pkg-builders/lib/SdJsLibBuildRunner";
import { TSdBuildRunnerWorkerType } from "../types/workers.type";
import { ISdBuildRunnerWorkerRequest } from "../types/build-runner.type";
import { EventEmitter } from "events";

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

const worker = createSdWorker<TSdBuildRunnerWorkerType>({
  async run(req: ISdBuildRunnerWorkerRequest): Promise<ISdBuildMessage[] | void> {
    const pkgConf = req.projConf.packages[path.basename(req.pkgPath)]!;

    const buildRunnerType =
      pkgConf.type === "server"
        ? SdServerBuildRunner
        : pkgConf.type === "client"
          ? SdClientBuildRunner
          : FsUtil.exists(path.resolve(req.pkgPath, "tsconfig.json"))
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
