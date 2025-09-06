import { TNormPath } from "@simplysm/sd-core-node";
import { ISdBuildMessage } from "./ISdBuildMessage";

export interface ISdBuildResult {
  buildMessages: ISdBuildMessage[];
  watchFileSet: Set<TNormPath>;
  affectedFileSet: Set<TNormPath>;
  emitFileSet: Set<TNormPath>;
}
