import { ISdBuildMessage } from "./ISdBuildMessage";
import { TNormPath } from "@simplysm/sd-core-node";
import { TStylesheetBundlingResult } from "./TStylesheetBundlingResult";

export interface ISdTsCompilerResult {
  messages: ISdBuildMessage[];
  stylesheetBundlingResultMap: Map<TNormPath, TStylesheetBundlingResult>;
  emittedFilesCacheMap: Map<TNormPath, { outAbsPath?: TNormPath; text: string }[]>;
  emitFileSet: Set<TNormPath>;
  watchFileSet: Set<TNormPath>;
  affectedFileSet: Set<TNormPath>;
}
