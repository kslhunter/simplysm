import { ISdCliPackageBuildResult } from "../commons";
import ts from "typescript";
export declare class SdCliPackageLinter {
    private readonly _rootPath;
    private readonly _lintResultCache;
    constructor(_rootPath: string);
    lintAsync(filePaths: string[], program?: ts.Program): Promise<ISdCliPackageBuildResult[]>;
}
