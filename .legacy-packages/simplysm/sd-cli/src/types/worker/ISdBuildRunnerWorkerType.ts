import type { ISdBuildResult } from "../build/ISdBuildResult";
import type { ISdWorkerType, TNormPath } from "@simplysm/sd-core-node";
import type { TSdPackageConfig } from "../config/ISdProjectConfig";
import type { ISdTsCompilerOptions } from "../build/ISdTsCompilerOptions";

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
  options: ISdTsCompilerOptions;
  pkgConf: TSdPackageConfig<any>;
}
