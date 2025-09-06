import { TNormPath } from "@simplysm/sd-core-node";
import ts from "typescript";
import { ScopePathSet } from "../../pkg-builders/commons/ScopePathSet";

export interface ISdTsCompilerOptions {
  pkgPath: TNormPath;
  additionalOptions: ts.CompilerOptions;
  isForBundle: boolean;
  isWatchMode: boolean;
  isDevMode: boolean;
  isEmitOnly: boolean;
  isNoEmit: boolean;
  scopePathSet: ScopePathSet;
  globalStyleFilePath?: TNormPath;
}
