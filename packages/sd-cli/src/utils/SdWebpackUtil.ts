import * as webpack from "webpack";
import { ISdPackageBuildResult } from "../commons";
import * as os from "os";
import { NeverEntryError } from "@simplysm/sd-core-common";
import { FsUtil } from "@simplysm/sd-core-node";

export class SdWebpackUtil {
  public static getWebpackResults(err: Error | null, stats?: webpack.Stats): ISdPackageBuildResult[] {
    if (err != null) {
      return [{
        type: "compile",
        filePath: undefined,
        severity: "error",
        message: err.stack ?? err.message
      }];
    }
    if (!stats) throw new NeverEntryError();

    const results: ISdPackageBuildResult[] = [];

    const info = stats.toJson("errors-warnings");

    if (stats.hasWarnings()) {
      results.push(
        ...info.warnings.map((item) => ({
          type: "compile" as const,
          filePath: undefined,
          severity: "warning" as const,
          message: item.startsWith("(undefined)") ? item.split("\n").slice(1).join(os.EOL) : item
        }))
      );
    }

    if (stats.hasErrors()) {
      const errors = info.errors.map((item) => {
        return item.replace(/.*\.ts.*.html\([0-9]*,[0-9]*\)/g, (item1) => {
          const match = (/(.*\.ts).*.html\(([0-9]*),([0-9]*)\)/).exec(item1);
          if (!match) throw new NeverEntryError();

          const tsFilePath = match[1];
          let line = Number(match[2]);
          const char = Number(match[3]);
          const content = FsUtil.readFile(tsFilePath);
          const contentSplit = content.split("\n");
          const lineText = contentSplit.single((item2) => item2.startsWith("  template:"))!;
          const index = contentSplit.indexOf(lineText);
          line += index;
          return tsFilePath + "(" + line + "," + char + ")";
        });
      });

      results.push(
        ...errors.map((item) => ({
          type: "compile" as const,
          filePath: undefined,
          severity: "error" as const,
          message: item.startsWith("(undefined)") ? item.split("\n").slice(1).join(os.EOL) : item
        }))
      );
    }

    return results;
  }
}