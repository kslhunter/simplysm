import {SdServiceBase} from "@simplysm/sd-service-server";
import * as path from "path";
import * as fs from "fs";

export class TestService extends SdServiceBase {
  public async getTextAsync(str: string): Promise<string> {
    return "입력값: " + str;
  }

  public async removeFileAsync(filePath: string): Promise<void> {
    await fs.remove(path.resolve(this.server.rootPath, filePath));
  }
}
