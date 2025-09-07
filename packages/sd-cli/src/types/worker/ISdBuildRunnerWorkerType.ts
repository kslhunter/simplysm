import { ISdBuildResult } from "../build/ISdBuildResult";
import { ISdWorkerType, TNormPath } from "@simplysm/sd-core-node";
import { TSdPackageConfig } from "../config/ISdProjectConfig";
import { ISdTsCompilerOptions } from "../build/ISdTsCompilerOptions";

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
