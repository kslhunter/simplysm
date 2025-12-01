import { randomUUID } from "crypto";

export class Uuid {
  static new(): Uuid {
    return new Uuid(randomUUID());
  }

  static fromString(uuid: string): Uuid {
    return new Uuid(uuid);
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

  readonly #uuid: string;

  constructor(uuid: string) {
    this.#uuid = uuid;
  }

  toString(): string {
    return this.#uuid;
  }

  toBuffer(): Buffer {
    return Buffer.from(this.#uuid.replaceAll("-", ""), "hex");
  }
}
