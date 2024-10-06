import { createSdWorker, Logger, LoggerSeverity } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import { SdTsCompiler, SdTsCompilerOptions } from "../../ts-builder/SdTsCompiler";
import { TSdTsCompileWorkerType } from "./compile-worker.type";

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

let compiler: SdTsCompiler;

createSdWorker<TSdTsCompileWorkerType>({
  initialize(opt: SdTsCompilerOptions) {
    compiler = new SdTsCompiler(opt);
  },
  invalidate(modifiedFileSet: Set<string>) {
    return compiler.invalidate(modifiedFileSet);
  },
  async prepare() {
    return await compiler.prepareAsync();
  },
  async build(affectedFileSet: Set<string>) {
    return await compiler.buildAsync(affectedFileSet);
  },
});
