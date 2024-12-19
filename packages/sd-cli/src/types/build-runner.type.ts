import { type TNormPath } from "@simplysm/sd-core-node";
import { type ISdProjectConfig } from "./sd-configs.type";

export interface ISdBuildRunnerWorkerRequest {
  cmd: "watch" | "build";
  pkgPath: TNormPath;
  projConf: ISdProjectConfig;
}
