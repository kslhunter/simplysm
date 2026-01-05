import ts from "typescript";
import os from "os";
import path from "path";
import type { PartialMessage } from "esbuild";
import type { ESLint } from "eslint";
import type { ISdBuildMessage } from "../types/build/ISdBuildMessage";
import { PathUtils } from "@simplysm/sd-core-node";

export class SdCliConvertMessageUtils {
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

      const filePath = diag.file ? PathUtils.norm(path.resolve(diag.file.fileName)) : undefined;
      const position =
        diag.file && diag.start !== undefined
          ? diag.file.getLineAndCharacterOfPosition(diag.start)
          : undefined;
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

  static convertToBuildMessagesFromEsbuild(
    result: {
      errors?: PartialMessage[];
      warnings?: PartialMessage[];
    },
    orgPath: string,
  ): ISdBuildMessage[] {
    const convertFn = (msg: PartialMessage, severity: "error" | "warning") => {
      const filePath =
        msg.location?.file != null ? PathUtils.norm(orgPath, msg.location.file) : undefined;
      const line = msg.location?.line;
      const char = msg.location?.column;
      const code = msg.text!.slice(0, msg.text!.indexOf(":"));
      const message = `${msg.text!.slice(msg.text!.indexOf(":") + 1)}${Boolean(msg.id) ? ` (${msg.id})` : ``}`;

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
        filePath: PathUtils.norm(result.filePath),
        line: msg.line,
        char: msg.column,
        code: msg.messageId,
        severity: msg.severity === 1 ? ("warning" as const) : ("error" as const),
        message: msg.message + (Boolean(msg.ruleId) ? ` (${msg.ruleId})` : ``),
        type: "lint" as const,
      })),
    );
  }

  static convertToEsbuildFromBuildMessages(
    messages: ISdBuildMessage[],
    orgPath: string,
  ): {
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
          location: {
            file: Boolean(msg.filePath) ? path.relative(orgPath, msg.filePath!) : undefined,
            line: msg.line,
            column: msg.char,
          },
        })),
      warnings: messages
        .filter((msg) => msg.severity !== "error")
        .map((msg) => ({
          id: msg.code,
          pluginName: msg.type,
          text: msg.message,
          location: {
            file: Boolean(msg.filePath) ? path.relative(orgPath, msg.filePath!) : undefined,
            line: msg.line,
            column: msg.char,
          },
        })),
    };
  }

  static convertToEsbuildFromEslint(
    results: ESLint.LintResult[],
    orgPath: string,
  ): {
    errors: PartialMessage[];
    warnings: PartialMessage[];
  } {
    return {
      errors: results.mapMany((r) =>
        r.messages
          .filter((m) => m.severity === 2)
          .map((m) => {
            return {
              pluginName: "lint",
              text: m.messageId + ": " + m.message + (Boolean(m.ruleId) ? ` (${m.ruleId})` : ``),
              location: {
                file: path.relative(orgPath, r.filePath),
                line: m.line,
                column: m.column,
              },
            };
          }),
      ),
      warnings: results.mapMany((r) =>
        r.messages
          .filter((m) => m.severity !== 2)
          .map((m) => {
            return {
              pluginName: "lint",
              text: m.messageId + ": " + m.message + (Boolean(m.ruleId) ? ` (${m.ruleId})` : ``),
              location: {
                file: path.relative(orgPath, r.filePath),
                line: m.line,
                column: m.column,
              },
            };
          }),
      ),
    };
  }

  static getBuildMessageString(result: ISdBuildMessage): string {
    let str = "";
    if (result.filePath !== undefined) {
      str += `${result.filePath}(${result.line ?? 0}, ${result.char ?? 0}): `;
    }
    str += `[${result.type}] `;
    str += `${result.severity} `;
    if (result.code !== undefined) {
      str += `${result.code} `;
    }
    str += `: ${result.message}`;

    return str;
  }
}
