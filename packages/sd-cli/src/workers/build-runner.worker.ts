import {
  createSdWorker,
  FsUtils,
  SdLogger,
  SdLoggerSeverity,
  TNormPath,
} from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import path from "path";
import {
  ISdBuildRunnerInitializeRequest,
  ISdBuildRunnerWorkerType,
} from "../types/worker/ISdBuildRunnerWorkerType";
import { SdBuildRunnerBase } from "../pkg-builders/commons/SdBuildRunnerBase";
import { SdServerBuildRunner } from "../pkg-builders/server/SdServerBuildRunner";
import { SdClientBuildRunner } from "../pkg-builders/client/SdClientBuildRunner";
import { SdTsLibBuildRunner } from "../pkg-builders/lib/SdTsLibBuildRunner";
import { SdJsLibBuildRunner } from "../pkg-builders/lib/SdJsLibBuildRunner";

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

let buildRunner: SdBuildRunnerBase<any>;

createSdWorker<ISdBuildRunnerWorkerType>({
  initialize(req: ISdBuildRunnerInitializeRequest) {
    const pkgConf = req.projConf.packages[path.basename(req.pkgPath)]!;

    const buildRunnerType =
      pkgConf.type === "server"
        ? SdServerBuildRunner
        : pkgConf.type === "client"
          ? SdClientBuildRunner
          : FsUtils.exists(path.resolve(req.pkgPath, "tsconfig.json"))
            ? SdTsLibBuildRunner
            : SdJsLibBuildRunner;

    buildRunner = new buildRunnerType(
      req.pkgPath,
      req.projConf,
      req.watch ?? false,
      req.watch ? !pkgConf.forceProductionMode : false,
      req.emitOnly,
      req.noEmit,
      req.scopePathSet,
    );
  },
  async rebuild(modifiedFileSet?: Set<TNormPath>) {
    return await buildRunner.rebuildAsync(modifiedFileSet);
  },
});
