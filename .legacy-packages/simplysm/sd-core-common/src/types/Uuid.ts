export class Uuid {
  // 0x00 ~ 0xFF에 대한 hex 문자열 미리 계산 (256개)
  private static readonly _hexTable: string[] = Array.from({ length: 256 }, (_, i) =>
    i.toString(16).padStart(2, "0"),
  );

  static new(): Uuid {
    if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);

      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      // lookup table 사용 - 함수 호출 없이 직접 인덱싱
      const h = Uuid._hexTable;
      return new Uuid(
        h[bytes[0]] +
          h[bytes[1]] +
          h[bytes[2]] +
          h[bytes[3]] +
          "-" +
          h[bytes[4]] +
          h[bytes[5]] +
          "-" +
          h[bytes[6]] +
          h[bytes[7]] +
          "-" +
          h[bytes[8]] +
          h[bytes[9]] +
          "-" +
          h[bytes[10]] +
          h[bytes[11]] +
          h[bytes[12]] +
          h[bytes[13]] +
          h[bytes[14]] +
          h[bytes[15]],
      );
    }

    // Fallback (거의 도달하지 않음)
    return new Uuid(
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }),
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
