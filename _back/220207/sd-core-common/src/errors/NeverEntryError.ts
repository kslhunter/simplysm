import { SdError } from "./SdError";

export class NeverEntryError extends SdError {
  public constructor(message?: string) {
    super("절대 진입될 수 없는것으로 판단된 코드에 진입되었습니다" + (message !== undefined ? ": " + message : ""));
  }
}
