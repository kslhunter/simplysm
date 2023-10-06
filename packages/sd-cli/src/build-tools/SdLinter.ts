import {ISdCliPackageBuildResult} from "../commons";
import {ESLint} from "eslint";
import ts from "typescript";

export class SdLinter {
  public static async lintAsync(filePaths: string[], program?: ts.Program): Promise<ISdCliPackageBuildResult[]> {
    const linter = new ESLint(program ? {
      overrideConfig: {
        overrides: [
          {
            files: ["*.ts", "*.tsx"],
            parserOptions: {
              programs: [program],
              tsconfigRootDir: null,
              project: null
            },
            settings: {
              "import/resolver": {
                "typescript": {
                  programs: [program],
                  project: null
                }
              }
            }
          }
        ]
      }
    } : undefined);

    const lintResults = await linter.lintFiles(filePaths);

    return lintResults.mapMany((lintResult) => lintResult.messages.map((msg) => ({
      filePath: lintResult.filePath,
      line: msg.line,
      char: msg.column,
      code: msg.ruleId ?? undefined,
      severity: msg.severity === 1 ? "warning" as const : "error" as const,
      message: msg.message,
      type: "lint" as const
    })));
  }
}
