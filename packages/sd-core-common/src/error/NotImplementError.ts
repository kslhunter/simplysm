import {CustomError} from "./CustomError";

export class NotImplementError extends CustomError {
  public constructor(message?: string) {
    super("구현되어있지 않습니다" + (message ? ": " + message : ""));
  }
}