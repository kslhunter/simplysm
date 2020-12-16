import { SdCliCordovaTool } from "../build-tools/SdCliCordovaTool";

export class SdCliCordova {
  public async runDeviceAsync(cordovaProjectPath: string, url: string): Promise<void> {
    await new SdCliCordovaTool().runDeviceAsync(cordovaProjectPath, url);
  }
}