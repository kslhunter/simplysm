import type esbuild from "esbuild";
import type { TNormPath } from "@simplysm/sd-core-node";

export interface ISdCliServerPluginResultCache {
  watchFileSet?: Set<TNormPath>;
  affectedFileSet?: Set<TNormPath>;
  outputFiles?: esbuild.OutputFile[];
  metafile?: esbuild.Metafile;
}
