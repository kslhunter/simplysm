import { type CompilerOptions } from "typescript";
import esbuild from "esbuild";
import { type ISdBuildMessage } from "./build.type";
import { type TNormPath } from "@simplysm/sd-core-node";

export interface SdTsCompilerOptions {
  pkgPath: TNormPath;
  additionalOptions: CompilerOptions;
  isForBundle: boolean;
  isDevMode: boolean;
  watchScopePaths: TNormPath[];
  globalStyleFilePath?: TNormPath;
  /*processWebWorker?: (
    workerFile: string,
    containingFile: string,
  ) => string;*/
}

export interface ISdTsCompilerResult {
  messages: ISdBuildMessage[];
  stylesheetBundlingResultMap: Map<TNormPath, IStylesheetBundlingResult>;
  emittedFilesCacheMap: Map<TNormPath, { outAbsPath?: TNormPath; text: string }[]>;
  emitFileSet: Set<TNormPath>;
  watchFileSet: Set<TNormPath>;
  affectedFileSet: Set<TNormPath>;
}

export interface IStylesheetBundlingResult {
  outputFiles?: esbuild.OutputFile[];
  metafile?: esbuild.Metafile;
  errors?: esbuild.Message[];
  warnings?: esbuild.Message[];
}
