import crypto, { BinaryLike } from "crypto";

export class HashUtils {
  static get(filePath: BinaryLike) {
    return crypto.createHash("sha256").update(filePath).digest("hex");
  }
}