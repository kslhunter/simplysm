import type { ConsolaOptions, ConsolaReporter, LogObject } from "consola";
import consola, { LogLevels } from "consola";
import { env, parseBoolEnv } from "@simplysm/core-common";
import { PrettyReporter } from "./pretty-reporter";
import { createFileReporter } from "./file-reporter";

export function withMaxLevel(reporter: ConsolaReporter, maxLevel: number): ConsolaReporter {
  return {
    log(logObj: LogObject, ctx: { options: ConsolaOptions }) {
      if (logObj.level > maxLevel) return;
      reporter.log(logObj, ctx);
    },
  };
}

export interface SetupConsolaOptions {
  cli?: boolean;
}

export function setupConsola(opts?: SetupConsolaOptions): void {
  if (!opts?.cli && !env.DEV) {
    // prod: debug 포함 FileReporter
    consola.level = LogLevels.debug;
    consola.options.reporters = [createFileReporter()];
    return;
  }

  if (parseBoolEnv(env["SD_DEBUG"])) {
    // dev + SD_DEBUG: debug 포함 PrettyReporter
    consola.level = LogLevels.debug;
    consola.options.reporters = [new PrettyReporter()];
  } else {
    // dev: debug 포함 FileReporter + debug 비포함 PrettyReporter
    consola.level = LogLevels.debug;
    consola.options.reporters = [
      createFileReporter(),
      withMaxLevel(new PrettyReporter(), LogLevels.info),
    ];
  }
}
