import * as readline from "readline";
import { Writable } from "stream";
import * as crypto from "crypto";
import { FsUtil } from "@simplysm/sd-core-node";
import * as os from "os";

export class SdCliFileCrypto {
  public async encryptAsync(filePath: string): Promise<void> {
    if (!FsUtil.exists(filePath)) {
      throw new Error(`파일 '${filePath}'을 찾을 수 없습니다.`);
    }

    const key = await this._readKeyAsync("password: ");
    if (!key) {
      throw new Error("암호화키를 반드시 입력해야 합니다.");
    }

    const confirmKey = await this._readKeyAsync("confirm password: ");
    if (key !== confirmKey) {
      throw new Error("암호화키가 서로 다릅니다.");
    }

    this._encryptFile(filePath, key, filePath + ".enc");
  }

  public async decryptAsync(encFilePath: string): Promise<void> {
    if (!FsUtil.exists(encFilePath)) {
      throw new Error(`파일 '${encFilePath}'을 찾을 수 없습니다.`);
    }

    if (!encFilePath.endsWith(".enc")) {
      throw new Error(`파일 ${encFilePath}의 확장자가 '.enc'가 아닙니다.`);
    }

    const resultFilePath = encFilePath.slice(0, -4);
    if (FsUtil.exists(resultFilePath)) {
      process.stdout.write(`복호화 시, 현재 존재하는 '${resultFilePath}'파일을 덮어씁니다.${os.EOL}`, "utf-8");
    }

    const key = await this._readKeyAsync("password: ");
    if (!key) {
      throw new Error("암호화키를 반드시 입력해야 합니다.");
    }

    this._decryptFile(encFilePath, key, resultFilePath);
  }

  private _encryptFile(filePath: string, key: string, encFilePath: string): void {
    const iv = Buffer.alloc(16, 0);
    const cipheriv = crypto.createCipheriv("aes-192-cbc", crypto.scryptSync(key, "salt", 24), iv);

    const input = FsUtil.createReadStream(filePath);
    const output = FsUtil.createWriteStream(encFilePath);
    input.pipe(cipheriv).pipe(output);
  }

  private _decryptFile(encFilePath: string, key: string, filePath: string): void {
    const iv = Buffer.alloc(16, 0);
    const cipheriv = crypto.createDecipheriv("aes-192-cbc", crypto.scryptSync(key, "salt", 24), iv);

    const input = FsUtil.createReadStream(encFilePath);
    const output = FsUtil.createWriteStream(filePath);
    input.pipe(cipheriv).pipe(output);
  }

  private async _readKeyAsync(message: string): Promise<string> {
    process.stdout.write(message, "utf-8");

    return await new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: new Writable({
          write: (chunk, encoding, callback) => {
            callback();
          }
        }),
        terminal: true
      });

      rl.question(message, (answer) => {
        process.stdout.write(os.EOL, "utf-8");
        resolve(answer);
        rl.close();
      });
    });
  }
}