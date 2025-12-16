export class Uuid {
  static new(): Uuid {
    /*if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return new Uuid(crypto.randomUUID());
    }*/

    // Fallback: 비보안 컨텍스트용
    return new Uuid(
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      })
    );
  }

  static fromBuffer(buffer: Buffer): Uuid {
    if (buffer.length !== 16) {
      throw new Error(`UUID 버퍼 크기는 16바이트여야 합니다. (현재: ${buffer.length})`);
    }

    const hex = buffer.toString("hex");
    const uuidStr =
      hex.substring(0, 8) +
      "-" +
      hex.substring(8, 12) +
      "-" +
      hex.substring(12, 16) +
      "-" +
      hex.substring(16, 20) +
      "-" +
      hex.substring(20);

    return new Uuid(uuidStr);
  }

  private readonly _uuid: string;

  constructor(uuid: string) {
    this._uuid = uuid;
  }

  toString(): string {
    return this._uuid;
  }

  toBuffer(): Buffer {
    return Buffer.from(this._uuid.replace(/-/g, ""), "hex");
  }
}
