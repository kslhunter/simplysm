import * as crypto from "crypto";
import * as fs from "fs";
import * as glob from "glob";

export class FsUtil {
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

  // TODO: UnitTest
  public static async globAsync(pattern: string): Promise<string[]>;
  public static async globAsync(pattern: string, options: glob.IOptions): Promise<string[]>;
  public static async globAsync(pattern: string, options?: glob.IOptions): Promise<string[]> {
    if (options) {
      return await new Promise<string[]>((resolve, reject) => {
        glob(pattern, options, (err, matches) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(matches);
        });
      });
    }
    else {
      return await new Promise<string[]>((resolve, reject) => {
        glob(pattern, (err, matches) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(matches);
        });
      });
    }
  }
}
