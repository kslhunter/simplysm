import { ISdBuildResult } from "../build/ISdBuildResult";
import { ISdWorkerType, TNormPath } from "@simplysm/sd-core-node";
import { ISdProjectConfig } from "../config/ISdProjectConfig";

export interface ISdBuildRunnerWorkerType extends ISdWorkerType {
  methods: {
    initialize: {
      params: [ISdBuildRunnerInitializeRequest];
      returnType: void;
    };
    rebuild: { params: [Set<TNormPath>?]; returnType: ISdBuildResult };
  };
}

export interface ISdBuildRunnerInitializeRequest {
  pkgPath: TNormPath;
  projConf: ISdProjectConfig;

  // watch
  watch?: boolean;
  emitOnly?: boolean;
  noEmit?: boolean;
  scopePathSet?: Set<TNormPath>;
}
