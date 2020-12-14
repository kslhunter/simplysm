import { SdProcessManager } from "@simplysm/sd-core-node";
import * as path from "path";

export class SdCliElectron {
  public async runAsync(url: string): Promise<void> {
    const electronJsFilePath = path.resolve(__dirname, "../../lib/electron.dev.js");
    await SdProcessManager.spawnAsync(`electron ${electronJsFilePath} ${url}`);
  }
}