import YAML from "yaml";
import { SdError } from "./SdError.js";

/**
 * 인수 오류
 */
export class ArgumentError extends SdError {
  constructor(argObj: Record<string, unknown>);
  constructor(message: string, argObj: Record<string, unknown>);
  constructor(arg1: Record<string, unknown> | string, arg2?: Record<string, unknown>);
  constructor(arg1: Record<string, unknown> | string, arg2?: Record<string, unknown>) {
    const message = typeof arg1 === "string" ? arg1 : undefined;
    const argObj = typeof arg1 === "string" ? arg2 : arg1;

    if (argObj != null) {
      super((message ?? "인수가 잘못되었습니다.") + "\n\n" + YAML.stringify(argObj));
    } else {
      super(message ?? "인수가 잘못되었습니다.");
    }
    this.name = "ArgumentError";
  }
}
