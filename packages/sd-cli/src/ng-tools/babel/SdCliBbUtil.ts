import { Node } from "@babel/types";
import { SdCliBuildResultError } from "../../SdCliBuildResultError";

export class SdCliBbUtil {
  public static error(message: string, filePath?: string, meta?: Node): SdCliBuildResultError {
    return new SdCliBuildResultError({
      filePath,
      line: meta?.loc?.start.line,
      char: meta?.loc?.start.column,
      code: undefined,
      severity: "error",
      message: message
    });
  }
}
