import { SdError } from "@simplysm/sd-core-common";

export class SdMetadataError extends SdError {
  public constructor(public filePath: string, public message: string) {
    super();
  }
}