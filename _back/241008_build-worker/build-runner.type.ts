import { TNormPath } from "@simplysm/sd-core-node";
import { ISdProjectConfig } from "./sd-configs.type";

export interface ISdBuildRunnerWorkerRequest {
  cmd: "watch" | "build";
  pkgPath: TNormPath;
  projConf: ISdProjectConfig;
}
