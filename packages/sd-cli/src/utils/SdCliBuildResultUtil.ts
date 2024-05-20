import ts from "typescript";
import os from "os";
import path from "path";
import {ISdCliPackageBuildResult} from "../commons";
import {PartialMessage} from "esbuild";

export class SdCliBuildResultUtil {
  static convertFromTsDiag(diag: ts.Diagnostic, type: "build" | "check"): ISdCliPackageBuildResult {
    const severity = diag.category === ts.DiagnosticCategory.Error ? "error" as const
      : diag.category === ts.DiagnosticCategory.Warning ? "warning" as const
        : diag.category === ts.DiagnosticCategory.Suggestion ? "suggestion" as const
          : "message" as const;

    const code = `TS${diag.code}`;
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
      message,
      type
    };
  }

  static convertFromEsbuildResult(msg: PartialMessage, type: "build" | "check", severity: "warning" | "error") {
    const filePath = msg.location?.file != null ? path.resolve(msg.location.file) : undefined;
    const line = msg.location?.line;
    const char = msg.location?.column;
    const code = msg.text?.slice(0, msg.text.indexOf(":"));
    const message = `${msg.pluginName != null ? `(${msg.pluginName}) ` : ""} ${msg.text?.slice(msg.text.indexOf(":") + 1)}`;

    return {
      filePath,
      line,
      char,
      code,
      severity,
      message,
      type
    };
  }

  static getMessage(result: ISdCliPackageBuildResult): string {
    let str = "";
    if (result.filePath !== undefined) {
      str += `${result.filePath}(${result.line ?? 0}, ${result.char ?? 0}): `;
    }
    if (result.code !== undefined) {
      str += `${result.code}: `;
    }
    str += `(${result.type}) ${result.severity} ${result.message}`;

    return str;
  }
}
