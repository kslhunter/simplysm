import { ISdCliPackageBuildResult } from "../commons";
import { ESLint } from "eslint";
import ts from "typescript";
import { FsUtil } from "@simplysm/sd-core-node";

export abstract class SdLinter {
  static async lintAsync(
    fileSet: Iterable<string>,
    tsProgram: ts.Program | undefined
  ): Promise<ISdCliPackageBuildResult[]> {
    const lintFilePaths = Array.from(fileSet)
      .filter(
        (item) =>
          (!item.endsWith(".d.ts") && item.endsWith(".ts")) ||
          item.endsWith(".tsx") ||
          item.endsWith(".js")
      )
      .filter((item) => FsUtil.exists(item));

    if (lintFilePaths.length === 0) {
      return [];
    }

    const linter = new ESLint(
      tsProgram != null
        ? {
          cache: false,
          overrideConfig: [
            {
              files: ["**/*.ts", "**/*.tsx"],
              languageOptions: {
                parserOptions: {
                  programs: [tsProgram],
                  project: null,
                  tsconfigRootDir: null
                }
              }
            }
          ]
        }
        : undefined
    );

    const lintResults = await linter.lintFiles(lintFilePaths);

    return lintResults.mapMany((lintResult) =>
      lintResult.messages.map((msg) => ({
        filePath: lintResult.filePath,
        line: msg.line,
        char: msg.column,
        code: msg.messageId,
        severity: msg.severity === 1 ? ("warning" as const) : ("error" as const),
        message: msg.message + (msg.ruleId != null ? ` (${msg.ruleId})` : ``),
        type: "lint" as const
      }))
    );
  }
}
