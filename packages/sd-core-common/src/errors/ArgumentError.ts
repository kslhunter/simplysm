import { SdError } from "./SdError";
import YAML from "yaml";

export class ArgumentError extends SdError {
  constructor(argObj: Record<string, any>);
  constructor(message: string, argObj: Record<string, any>);
  constructor(arg1: Record<string, any> | string, arg2?: Record<string, any>) {
    const message = typeof arg1 === "string" ? arg1 : undefined;
    const argObj = typeof arg1 === "string" ? arg2 : arg1;

    if (argObj) {
      super((message ?? "인수가 잘못되었습니다.") + "\n\n" + YAML.stringify(argObj));
    } else {
      super(message ?? "인수가 잘못되었습니다.");
    }
  }
}
