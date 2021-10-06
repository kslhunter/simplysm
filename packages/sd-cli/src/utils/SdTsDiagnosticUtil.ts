import * as ts from "typescript";
import * as os from "os";
import * as path from "path";
import { ISdPackageBuildResult } from "../commons";

export class SdTsDiagnosticUtil {
  public static convertDiagnosticsToResult(diag: ts.Diagnostic): ISdPackageBuildResult | undefined {
    const severity = ts.DiagnosticCategory[diag.category].toLowerCase();
    if (severity !== "error" && severity !== "warning") {
      return undefined;
    }

    const code = "TS" + diag.code;
    const messageText = ts.flattenDiagnosticMessageText(diag.messageText, os.EOL);

    if (diag.file?.fileName !== undefined) {
      const filePath = path.resolve(diag.file.fileName);

      if (diag.start !== undefined) {
        const position = diag.file.getLineAndCharacterOfPosition(diag.start);
        const line = position.line + 1;
        const char = position.character + 1;

        return {
          filePath,
          severity,
          message: `${filePath}(${line}, ${char}): ${code}: ${severity} ${messageText}`
        };
      }
      else {
        return {
          filePath,
          severity,
          message: `${filePath}(0, 0): ${code}: ${severity} ${messageText}`
        };
      }
    }
    else {
      return {
        filePath: undefined,
        severity,
        message: `${code}: ${severity} ${messageText}`
      };
    }
  }
}
