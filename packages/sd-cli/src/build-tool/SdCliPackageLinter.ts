import { ISdCliPackageBuildResult } from "../commons";
import ts from "typescript";
import { FsUtil } from "@simplysm/sd-core/node";
import path from "path";
import { ESLint } from "eslint";

export class SdCliPackageLinter {
  private readonly _lintResultCache = new Map<string, ISdCliPackageBuildResult[]>();

  public constructor(private readonly _rootPath: string) {
  }

  public async lintAsync(filePaths: string[], program?: ts.Program): Promise<ISdCliPackageBuildResult[]> {
    if (!FsUtil.exists(path.resolve(this._rootPath, ".eslintrc.cjs"))) return [];

    const linter = new ESLint(
      program && filePaths.some((item) => item.endsWith(".ts")) ? {
        overrideConfig: {
          parserOptions: { program }
        }
      } : {}
    );

    const lintFilePaths = await filePaths
      .filterAsync(async (filePath) => (
        !filePath.endsWith(".d.ts") &&
        !(await linter.isPathIgnored(filePath))
      ));
    for (const lintFilePath of lintFilePaths) {
      this._lintResultCache.delete(lintFilePath);
    }

    const lintResults = await linter.lintFiles(lintFilePaths);


    const result = lintResults.map((lintResult) => ({
      filePath: lintResult.filePath,
      results: lintResult.messages.map((msg) => ({
        filePath: lintResult.filePath,
        line: msg.line,
        char: msg.column,
        code: msg.ruleId ?? undefined,
        severity: msg.severity === 1 ? "warning" as const : "error" as const,
        message: msg.message
      }))
    }));

    for (const resultItem of result) {
      this._lintResultCache.set(resultItem.filePath, resultItem.results);
    }

    return Array.from(this._lintResultCache.values()).mapMany();
  }
}
