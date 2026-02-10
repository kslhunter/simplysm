import type { TNormPath } from "@simplysm/sd-core-node";

export interface ISdTsCompilerOptions {
  pkgPath: TNormPath;
  scopePathSet: Set<TNormPath>;
  watch?: {
    dev: boolean;
    emitOnly: boolean;
    noEmit: boolean;
  };
}
