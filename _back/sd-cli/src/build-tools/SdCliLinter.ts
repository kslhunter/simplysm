import { SdCliPathUtil } from "../utils/SdCliPathUtil";
import { FsUtil } from "@simplysm/sd-core-node";
import * as path from "path";
import { ISdPackageBuildResult } from "../commons";
import * as tsEslintParser from "@typescript-eslint/parser";
import { ESLint } from "eslint";
import { Wait } from "@simplysm/sd-core-common";

export class SdCliLinter {
  private readonly _linter: ESLint;

  public constructor(private readonly _rootPath: string,
                     private readonly _target: "node" | "browser" | undefined) {
    const tsconfigFilePath = SdCliPathUtil.getTsConfigBuildFilePath(this._rootPath, this._target);

    this._linter = new ESLint({
      overrideConfig: !FsUtil.exists(tsconfigFilePath) ? {} : {
        overrides: [
          {
            files: ["*.ts"],
            parserOptions: {
              project: path.basename(tsconfigFilePath),
              tsconfigRootDir: this._rootPath,
              createDefaultProgram: false
            },
            settings: {
              "import/resolver": {
                typescript: {
                  project: tsconfigFilePath
                }
              }
            }
          }
        ]
      }
    });
  }

  public async lintAsync(filePaths: string[], parentResults?: ISdPackageBuildResult[], errCount = 0): Promise<ISdPackageBuildResult[]> {
    try {
      // 라이브러리 변화를 인지하지 못하므로, clearCaches를 통해 program을 다시 만들도록 함
      tsEslintParser.clearCaches();

      const results: ISdPackageBuildResult[] = parentResults ? [...parentResults] : [];

      const lintResults = await this._linter.lintFiles(filePaths);
      results.push(
        ...lintResults.mapMany((report) => (
          report.messages.map((msg) => {
            const severity: "warning" | "error" = msg.severity === 1 ? "warning" : "error";

            return {
              type: "lint" as const,
              filePath: report.filePath,
              severity,
              message: `${report.filePath}(${msg.line}, ${msg.column}): ${msg.ruleId ?? ""}: ${severity} ${msg.message}`
            };
          })
        ))
      );

      return results;
    }
    catch (err) {
      if (errCount >= 4) {
        throw err;
      }

      const results: ISdPackageBuildResult[] = [];

      const existsFilePaths: string[] = [];
      for (const filePath of filePaths) {
        if (!FsUtil.exists(filePath)) {
          results.push({
            type: "lint",
            filePath,
            severity: "error",
            message: filePath + "(0, 0): 파일을 찾을 수 없습니다."
          });
        }
        else {
          existsFilePaths.push(filePath);
        }
      }

      await Wait.time(1000);
      return await this.lintAsync(existsFilePaths, results, errCount + 1);
    }
  }
}