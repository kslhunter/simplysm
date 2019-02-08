import {SdWebSocketServiceBase} from "../SdWebSocketServiceBase";
import * as fs from "fs-extra";
import * as path from "path";

export class FileService extends SdWebSocketServiceBase {
  public async uploadAsync(filePath: string, buf: Buffer): Promise<void> {
    await fs.mkdirs(path.dirname(path.resolve(process.cwd(), filePath)));
    await fs.writeFile(path.resolve(process.cwd(), filePath), buf);
  }
}
