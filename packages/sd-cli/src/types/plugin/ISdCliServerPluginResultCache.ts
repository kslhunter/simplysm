import esbuild from "esbuild";
import { TNormPath } from "@simplysm/sd-core-node";

export interface ISdCliServerPluginResultCache {
  watchFileSet?: Set<TNormPath>;
  affectedFileSet?: Set<TNormPath>;
  outputFiles?: esbuild.OutputFile[];
  metafile?: esbuild.Metafile;
}
