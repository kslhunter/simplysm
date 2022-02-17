import { SdError } from "@simplysm/sd-core-common";
import { ISdCliPackageBuildResult } from "./commons";
import { SdCliBuildResultUtil } from "./utils/SdCliBuildResultUtil";

export class SdCliBuildResultError extends SdError {
  public constructor(buildResult: ISdCliPackageBuildResult) {
    super(SdCliBuildResultUtil.getMessage(buildResult));
  }
}
