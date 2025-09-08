import { SdError } from "@simplysm/sd-core-common";

export class SdWebRequestError extends SdError {
  constructor(public readonly statusCode: number, body: string) {
    super(body);
  }
}
