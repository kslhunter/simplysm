import type { TNormPath } from "@simplysm/sd-core-node";
import type { ISdBuildMessage } from "./ISdBuildMessage";

export interface ISdBuildResult {
  buildMessages: ISdBuildMessage[];
  watchFileSet: Set<TNormPath>;
  affectedFileSet: Set<TNormPath>;
  emitFileSet: Set<TNormPath>;
}
