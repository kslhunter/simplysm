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
      message: "예상치 못한 방식의 코드가 발견되었습니다."
    });
  }
}
