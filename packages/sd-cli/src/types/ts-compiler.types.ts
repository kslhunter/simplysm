import { CompilerOptions } from "typescript";
import esbuild from "esbuild";
import { ISdBuildMessage } from "./build.types";
import { TNormPath } from "@simplysm/sd-core-node";
import { ScopePathSet } from "../pkg-builders/commons/scope-path";

export interface SdTsCompilerOptions {
  pkgPath: TNormPath;
  additionalOptions: CompilerOptions;
  isForBundle: boolean;
  isDevMode: boolean;
  watchScopePathSet: ScopePathSet;
  globalStyleFilePath?: TNormPath;
  /*processWebWorker?: (
    workerFile: string,
    containingFile: string,
  ) => string;*/
}

export interface ISdTsCompilerResult {
  messages: ISdBuildMessage[];
  stylesheetBundlingResultMap: Map<TNormPath, TStylesheetBundlingResult>;
  emittedFilesCacheMap: Map<TNormPath, { outAbsPath?: TNormPath; text: string }[]>;
  emitFileSet: Set<TNormPath>;
  watchFileSet: Set<TNormPath>;
  affectedFileSet: Set<TNormPath>;
}

export type TStylesheetBundlingResult = {
  errors: esbuild.PartialMessage[];
  warnings: esbuild.PartialMessage[];
  contents?: string;
} | {
  errors: undefined;
  warnings: esbuild.PartialMessage[];
  metafile: esbuild.Metafile;
  outputFiles: esbuild.OutputFile[];
  contents: string;
}
