import * as ts from "typescript";
import { ISdPackageBuildResult } from "../commons";
import * as os from "os";
import * as path from "path";

export class SdTsDiagnosticUtil {
  public static convertDiagnosticsToResult(type: "compile" | "check", diag: ts.Diagnostic): ISdPackageBuildResult | undefined {
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
          type,
          filePath,
          severity,
          message: `${filePath}(${line}, ${char}): ${code}: ${severity} ${messageText}`
        };
      }
      else {
        return {
          type,
          filePath,
          severity,
          message: `${filePath}(0, 0): ${code}: ${severity} ${messageText}`
        };
      }
    }
    else {
      return {
        type,
        filePath: undefined,
        severity,
        message: `${code}: ${severity} ${messageText}`
      };
    }
  }
}