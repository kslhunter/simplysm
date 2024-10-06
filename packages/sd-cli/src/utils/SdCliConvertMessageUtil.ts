import ts from "typescript";
import os from "os";
import path from "path";
import { ISdBuildMessage } from "../commons";
import { Message, PartialMessage } from "esbuild";
import { ESLint } from "eslint";

export class SdCliConvertMessageUtil {
  static convertToBuildMessagesFromTsDiag(diags: ts.Diagnostic[]): ISdBuildMessage[] {
    return diags.map((diag) => {
      const severity =
        diag.category === ts.DiagnosticCategory.Error
          ? ("error" as const)
          : diag.category === ts.DiagnosticCategory.Warning
            ? ("warning" as const)
            : diag.category === ts.DiagnosticCategory.Suggestion
              ? ("suggestion" as const)
              : ("message" as const);

      const code = `TS${diag.code}`;
      const message = ts.flattenDiagnosticMessageText(diag.messageText, os.EOL);

      const filePath = diag.file ? path.resolve(diag.file.fileName) : undefined;
      const position =
        diag.file && diag.start !== undefined ? diag.file.getLineAndCharacterOfPosition(diag.start) : undefined;
      const line = position ? position.line + 1 : undefined;
      const char = position ? position.character + 1 : undefined;

      return {
        filePath,
        line,
        char,
        code,
        severity,
        message,
        type: "compile",
      };
    });
  }

  static convertToEsbuildFromBuildMessages(messages: ISdBuildMessage[]): {
    errors: PartialMessage[];
    warnings: PartialMessage[];
  } {
    return {
      errors: messages
        .filter((msg) => msg.severity === "error")
        .map((msg) => ({
          id: msg.code,
          pluginName: msg.type,
          text: msg.message,
          location: { file: msg.filePath, line: msg.line, column: msg.char },
        })),
      warnings: messages
        .filter((msg) => msg.severity !== "error")
        .map((msg) => ({
          id: msg.code,
          pluginName: msg.type,
          text: msg.message,
          location: { file: msg.filePath, line: msg.line, column: msg.char },
        })),
    };
  }

  static convertToBuildMessagesFromEsbuild(result: { errors?: Message[]; warnings?: Message[] }): ISdBuildMessage[] {
    const convertFn = (msg: Message, severity: "error" | "warning") => {
      const filePath = msg.location?.file != null ? path.resolve(msg.location.file) : undefined;
      const line = msg.location?.line;
      const char = msg.location?.column;
      const code = msg.text.slice(0, msg.text.indexOf(":"));
      const message = `(${msg.id}) ${msg.text.slice(msg.text.indexOf(":") + 1)}`;

      return {
        filePath,
        line,
        char,
        code,
        severity,
        message,
        type: msg.pluginName,
      };
    };

    return [
      ...(result.errors?.map((msg) => convertFn(msg, "error")) ?? []),
      ...(result.warnings?.map((msg) => convertFn(msg, "warning")) ?? []),
    ];
  }

  static convertToBuildMessagesFromEslint(results: ESLint.LintResult[]): ISdBuildMessage[] {
    return results.mapMany((result) =>
      result.messages.map((msg) => ({
        filePath: result.filePath,
        line: msg.line,
        char: msg.column,
        code: msg.messageId,
        severity: msg.severity === 1 ? ("warning" as const) : ("error" as const),
        message: msg.message + (msg.ruleId != null ? ` (${msg.ruleId})` : ``),
        type: "lint" as const,
      })),
    );
  }

  static getBuildMessageString(result: ISdBuildMessage): string {
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
