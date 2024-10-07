import { createSdWorker, Logger, LoggerSeverity, TNormPath } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import { SdTsCompiler } from "../ts-builder/SdTsCompiler";
import { TSdTsCompileWorkerType } from "../types/workers.type";
import { SdTsCompilerOptions } from "../types/ts-compiler.type";

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
  async compile(modifiedFileSet?: Set<TNormPath>) {
    return await compiler.compileAsync(modifiedFileSet);
  },
});
