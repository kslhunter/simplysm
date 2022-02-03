import ts from "typescript";
import * as os from "os";
import * as path from "path";
import { ISdCliPackageBuildResult } from "../commons";

export class SdCliBuildResultUtil {
  public static convertDiagsToResult(diag: ts.Diagnostic): ISdCliPackageBuildResult | undefined {
    const severity = diag.category === ts.DiagnosticCategory.Error ? "error"
      : diag.category === ts.DiagnosticCategory.Warning ? "warning"
        : undefined;
    if (!severity) return undefined;

    const code = "TS" + diag.code;
    const message = ts.flattenDiagnosticMessageText(diag.messageText, os.EOL);


    const filePath = diag.file ? path.resolve(diag.file.fileName) : undefined;
    const position = diag.file && diag.start !== undefined ? diag.file.getLineAndCharacterOfPosition(diag.start) : undefined;
    const line = position ? position.line + 1 : undefined;
    const char = position ? position.character + 1 : undefined;

    return {
      filePath,
      line,
      char,
      code,
      severity,
      message
    };
  }

  public static getMessage(result: ISdCliPackageBuildResult): string {
    let str = "";
    if (result.filePath !== undefined) {
      str += `${result.filePath}(${result.line ?? 0}, ${result.char ?? 0}): `;
    }
    if (result.code !== undefined) {
      str += `${result.code}: `;
    }
    str += `${result.severity} ${result.message}`;
    return str;
  }
}
