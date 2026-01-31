import type esbuild from "esbuild";

export type TStylesheetBundlingResult =
  | {
      errors: esbuild.PartialMessage[];
      warnings: esbuild.PartialMessage[];
      contents?: string;
    }
  | {
      errors: undefined;
      warnings: esbuild.PartialMessage[];
      metafile: esbuild.Metafile;
      outputFiles: esbuild.OutputFile[];
      contents: string;
    };
