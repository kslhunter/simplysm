import {SdError} from "./SdError";

export class NotImplementError extends SdError {
  public constructor(message?: string) {
    super("구현되어있지 않습니다" + (message !== undefined ? ": " + message : ""));
  }
}