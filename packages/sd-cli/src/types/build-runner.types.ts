import { type TNormPath } from "@simplysm/sd-core-node";
import { type ISdProjectConfig } from "./config.types";

export interface ISdBuildRunnerWorkerRequest {
  cmd: "watch" | "build";
  pkgPath: TNormPath;
  projConf: ISdProjectConfig;
}
