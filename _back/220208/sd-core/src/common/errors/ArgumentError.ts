import { SdError } from "./SdError";

export class ArgumentError extends SdError {
  public constructor(argObj: Record<string, any>) {
    super("인수가 잘못되었습니다: " + JSON.stringify(argObj));
  }
}