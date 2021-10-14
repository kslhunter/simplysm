import { ISdPackageBuildResult } from "../commons";
import * as webpack from "webpack";
import { NeverEntryError } from "@simplysm/sd-core-common";

export class SdWebpackUtil {
  public static getWebpackResults(stats: Error | webpack.Stats): ISdPackageBuildResult[] {
    if (stats instanceof Error) {
      return [{
        filePath: undefined,
        severity: "error",
        message: stats.stack ?? stats.message
      }];
    }

    const results: ISdPackageBuildResult[] = [];

    for (const warn of stats.compilation.warnings) {
      if (stats.compilation.options.ignoreWarnings?.some((ignoreWarning) => ignoreWarning(warn, stats.compilation))) continue;

      results.push({
        filePath: undefined,
        severity: "warning",
        message: this._errorToMessage(warn)
      });
    }

    for (const err of stats.compilation.errors) {
      results.push({
        filePath: undefined,
        severity: "error",
        message: this._errorToMessage(err)
      });
    }

    return results;
  }

  private static _errorToMessage(err: Partial<webpack.WebpackError>): string {
    let result = "";

    if ("error" in err && "originalSassError" in err["error"]) {
      const sassError = err["error"]["originalSassError"];
      result += sassError.file.replace(/^\.\//, "");
      // result += `(${sassError.line as number}${sassError.column !== undefined ? `, ${sassError.column as number}` : ""})`;
      result += ": ";
      result += err.name + ": ";
      result += err.message;
    }
    else {
      const filePath = err.file ?? err.module?.nameForCondition();
      if (filePath != null) {
        result += filePath.replace(/^\.\//, "");
        if (err.loc !== undefined) {
          if ("start" in err.loc) {
            result += `(${err.loc.start.line}${err.loc.start.column !== undefined ? `, ${err.loc.start.column}` : ""})`;
          }
          else {
            throw new NeverEntryError();
          }
        }
        result += ": ";

        result += err.name + ": ";
      }

      result += err.message;
    }

    return result;
  }
}
