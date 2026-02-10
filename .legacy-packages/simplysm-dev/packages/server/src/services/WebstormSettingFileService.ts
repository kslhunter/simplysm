import { SdServiceBase } from "@simplysm/sd-service-server";
import { FsUtils } from "@simplysm/sd-core-node";

export class WebstormSettingFileService extends SdServiceBase {
  exists() {
    return FsUtils.exists("www/files/webstorm-settings.zip");
  }

  upload(buf: Buffer) {
    FsUtils.writeFile("www/files/webstorm-settings.zip", buf);
  }

  get() {
    return FsUtils.readFileBuffer("www/files/webstorm-settings.zip");
  }
}
