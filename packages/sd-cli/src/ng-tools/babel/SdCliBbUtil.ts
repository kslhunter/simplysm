import { Node, SourceLocation } from "@babel/types";
import { SdCliBuildResultError } from "../../SdCliBuildResultError";

export class SdCliBbUtil {
  public static error(message: string, filePath?: string, meta?: Node | SourceLocation["start"]): SdCliBuildResultError {
    return new SdCliBuildResultError({
      filePath,
      line: meta && "loc" in meta ? meta.loc?.start.line : meta && "line" in meta ? meta.line : undefined,
      char: meta && "loc" in meta ? meta.loc?.start.column : meta && "column" in meta ? meta.column : undefined,
      code: undefined,
      severity: "error",
      message: message
    });
  }
}
