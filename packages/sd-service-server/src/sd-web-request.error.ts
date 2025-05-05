import { SdError } from "@simplysm/sd-core-common";

export class SdWebRequestError extends SdError {
  constructor(public statusCode: number, body: string) {
    super(body);
  }
}
