import * as ts from "typescript";
import * as os from "os";

export class SdTypescriptUtils {
  public static getDiagnosticMessage(diagnostic: ts.Diagnostic): IDiagnosticMessage {
    const message: IDiagnosticMessage = {
      code: diagnostic.code,
      severity: ts.DiagnosticCategory[diagnostic.category].toLowerCase(),
      messageText: ts.flattenDiagnosticMessageText(diagnostic.messageText, os.EOL)
    };

    if (diagnostic.file) {
      message.file = diagnostic.file.fileName;

      if (diagnostic.start !== undefined) {
        const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        message.line = position.line + 1;
        message.char = position.character + 1;
      }
    }

    return message;
  }

  public static getDiagnosticMessageText(message: IDiagnosticMessage): string {
    return message.file
      ? `${message.file}(${message.line}, ${message.char}): ${message.code}: ${message.severity} ${message.messageText}`
      : `${message.code}: ${message.severity} ${message.messageText}`;
  }
}

export interface IDiagnosticMessage {
  file?: string;
  line?: number;
  char?: number;
  code: number;
  severity: string;
  messageText: string;
}
