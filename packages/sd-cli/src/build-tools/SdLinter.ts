import {ISdCliPackageBuildResult} from "../commons";
import {ESLint} from "eslint";
import ts from "typescript";
import path from "path";

export class SdLinter {
  public static async lintAsync(filePaths: string[], programOrPkgPath?: ts.Program | string): Promise<ISdCliPackageBuildResult[]> {
    const linter = new ESLint(programOrPkgPath !== null ? {
      overrideConfig: {
        overrides: [
          {
            files: ["*.ts", "*.tsx"],
            parserOptions: {
              ...typeof programOrPkgPath === "string" ? {
                tsconfigRootDir: programOrPkgPath,
                project: "tsconfig.json"
              } : {
                programs: [programOrPkgPath],
                tsconfigRootDir: null,
                project: null
              }
            },
            settings: {
              "import/resolver": {
                "typescript": {
                  ...typeof programOrPkgPath === "string" ? {
                    project: path.resolve(programOrPkgPath, "tsconfig.json")
                  } : {
                    programs: [programOrPkgPath],
                    project: null
                  }
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
      code: undefined,
      severity: msg.severity === 1 ? "warning" as const : "error" as const,
      message: (msg.ruleId != null ? `${msg.ruleId}: ` : ``) + msg.message,
      type: "lint" as const
    })));
  }
}