import { ISdCliPackageBuildResult } from "../commons";
import { ESLint } from "eslint";
import ts from "typescript";
import { FsUtil, PathUtil } from "@simplysm/sd-core-node";
import path from "path";

export abstract class SdLinter {
  static async lintAsync(
    cwd: string,
    fileSet: Set<string>,
    tsProgram: ts.Program | undefined,
  ): Promise<ISdCliPackageBuildResult[]> {
    const isTsPackage = FsUtil.exists(path.resolve(cwd, "tsconfig.json"));

    const lintFilePaths = Array.from(fileSet)
      .filter((item) => PathUtil.isChildPath(item, cwd))
      .filter(
        (item) =>
          (isTsPackage && !item.endsWith(".d.ts") && item.endsWith(".ts")) ||
          item.endsWith(".js") ||
          item.endsWith(".tsx") ||
          item.endsWith(".jsx"),
      )
      .filter((item) => FsUtil.exists(item));

    if (lintFilePaths.length === 0) {
      return [];
    }

    const linter = new ESLint({
      cwd,
      cache: false,
      ...(isTsPackage && tsProgram
        ? {
            overrideConfig: [
              {
                files: ["**/*.ts", "**/*.tsx"],
                languageOptions: {
                  parserOptions: {
                    programs: [tsProgram],
                    project: null,
                    tsconfigRootDir: null,
                  },
                },
              },
            ],
          }
        : {}),
    });

    const lintResults = await linter.lintFiles(lintFilePaths);

    return lintResults.mapMany((lintResult) =>
      lintResult.messages.map((msg) => ({
        filePath: lintResult.filePath,
        line: msg.line,
        char: msg.column,
        code: msg.messageId,
        severity: msg.severity === 1 ? ("warning" as const) : ("error" as const),
        message: msg.message + (msg.ruleId != null ? ` (${msg.ruleId})` : ``),
        type: "lint" as const,
      })),
    );
  }
}
