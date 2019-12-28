import * as crypto from "crypto";
import * as fs from "fs";

export class FileUtil {
  public static async getMd5(filePath: string): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const hash = crypto.createHash("md5").setEncoding("hex");
      fs.createReadStream(filePath)
        .on("error", (err) => {
          reject(err);
        })
        .pipe(hash)
        .once("finish", () => {
          resolve(hash.read());
        });
    });
  }
}