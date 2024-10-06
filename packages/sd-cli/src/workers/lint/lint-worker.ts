import { createSdWorker, FsUtil, Logger, LoggerSeverity, PathUtil } from "@simplysm/sd-core-node";
import path from "path";
import { ESLint } from "eslint";
import { EventEmitter } from "events";
import { TSdLintWorkerType } from "./lint-worker.type";

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

createSdWorker<TSdLintWorkerType>({
  async lint(opt: { cwd: string; fileSet: Set<string> }) {
    const isTsPackage = FsUtil.exists(path.resolve(opt.cwd, "tsconfig.json"));

    const lintFilePaths = Array.from(opt.fileSet)
      .filter((item) => PathUtil.isChildPath(item, opt.cwd))
      .filter(
        (item) =>
          (isTsPackage && !item.endsWith(".d.ts") && item.endsWith(".ts")) ||
          item.endsWith(".js") ||
          item.endsWith(".tsx") ||
          item.endsWith(".jsx"),
      )
      .filter((item) => FsUtil.exists(item));

    if (lintFilePaths.length === 0) {
      return [];
    }

    const linter = new ESLint({ cwd: opt.cwd, cache: false });
    return await linter.lintFiles(lintFilePaths);
  },
});
