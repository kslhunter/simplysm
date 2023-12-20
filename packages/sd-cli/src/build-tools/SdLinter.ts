import {ISdCliPackageBuildResult} from "../commons";
import {ESLint} from "eslint";
import ts from "typescript";

export abstract class SdLinter {
  static async lintAsync(fileSet: Iterable<string>, tsProgram: ts.Program | undefined): Promise<ISdCliPackageBuildResult[]> {
    const sourceFilePaths = Array.from(fileSet).filter((item) =>
      (!item.endsWith(".d.ts") && item.endsWith(".ts")) ||
      item.endsWith(".js") ||
      item.endsWith(".cjs") ||
      item.endsWith(".mjs")
    );

    if (sourceFilePaths.length === 0) {
      return [];
    }

    const linter = new ESLint(tsProgram !== null ? {
      cache: false,
      overrideConfig: {
        overrides: [
          {
            files: ["*.ts", "*.tsx"],
            parserOptions: {
              programs: [tsProgram],
              tsconfigRootDir: null,
              project: null
            },
            settings: {
              "import/resolver": {
                "typescript": {
                  programs: [tsProgram],
                  project: null
                }
              }
            }
          }
        ]
      }
    } : undefined);


    const lintResults = await linter.lintFiles(sourceFilePaths);

    return lintResults.mapMany((lintResult) => lintResult.messages.map((msg) => ({
      filePath: lintResult.filePath,
      line: msg.line,
      char: msg.column,
      code: msg.messageId,
      severity: msg.severity === 1 ? "warning" as const : "error" as const,
      message: msg.message + (msg.ruleId != null ? ` (${msg.ruleId})` : ``),
      type: "lint" as const
    })));
  }
}
