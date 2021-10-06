import { SdProcessManager } from "@simplysm/sd-core-node";
import * as path from "path";
import { ISdClientPackageConfigWindowsPlatform } from "../commons";

export class SdCliElectron {
  public async runAsync(url: string, config: ISdClientPackageConfigWindowsPlatform): Promise<void> {
    const electronJsFilePath = path.resolve(__dirname, "../../lib/electron.dev.js");
    const configJson = JSON.stringify({
      targetUrl: url,
      ...config
    });
    await SdProcessManager.spawnAsync(`electron ${electronJsFilePath} ${configJson.replace(/"/g, "\\\"")}`);
  }
}