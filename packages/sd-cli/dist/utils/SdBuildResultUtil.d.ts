import ts from "typescript";
import { ISdCliPackageBuildResult } from "../commons";
export declare class SdBuildResultUtil {
    static convertDiagsToResult(diag: ts.Diagnostic): ISdCliPackageBuildResult | undefined;
    static getMessage(result: ISdCliPackageBuildResult): string;
}
