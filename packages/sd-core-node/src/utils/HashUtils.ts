import crypto from "crypto";

export class HashUtils {
  static get(data: string | Buffer) {
    return crypto.createHash("sha256").update(data).digest("hex");
  }
}