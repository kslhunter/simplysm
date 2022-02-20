import ts from "typescript";
import { SdCliBuildResultError } from "../../SdCliBuildResultError";
import path from "path";

export class SdCliTsUtil {
  public static error(message: string, sourceFile: ts.SourceFile, meta?: ts.Node): SdCliBuildResultError {
    if (meta) {
      const pos = sourceFile.getLineAndCharacterOfPosition(meta.getStart());
      return new SdCliBuildResultError({
        filePath: path.resolve(sourceFile.fileName),
        line: pos.line,
        char: pos.character,
        code: undefined,
        severity: "error",
        message: message
      });
    }
    else {
      return new SdCliBuildResultError({
        filePath: path.resolve(sourceFile.fileName),
        line: undefined,
        char: undefined,
        code: undefined,
        severity: "error",
        message: message
      });
    }
  }
}
