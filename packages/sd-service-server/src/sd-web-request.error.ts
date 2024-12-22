import { SdError } from "@simplysm/sd-core-common";

export class SdWebRequestError extends SdError {
  public constructor(public statusCode: number, body: string) {
    super(body);
  }
}
