import { ArgumentError } from "../errors/ArgumentError";

/**
 * UUID v4 클래스
 * crypto.getRandomValues 기반 (Chrome 79+ 지원)
 */
export class Uuid {
  // 0x00 ~ 0xFF에 대한 hex 문자열 미리 계산 (256개)
  private static readonly _hexTable: string[] = Array.from(
    { length: 256 },
    (_, i) => i.toString(16).padStart(2, "0"),
  );

  private static readonly _uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  static new(): Uuid {
    if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);

      // UUID v4 설정
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
      throw new ArgumentError("UUID 바이트 크기는 16이어야 합니다.", { length: buffer.length });
    }

    const h = Uuid._hexTable;
    const uuidStr =
      h[buffer[0]] +
      h[buffer[1]] +
      h[buffer[2]] +
      h[buffer[3]] +
      "-" +
      h[buffer[4]] +
      h[buffer[5]] +
      "-" +
      h[buffer[6]] +
      h[buffer[7]] +
      "-" +
      h[buffer[8]] +
      h[buffer[9]] +
      "-" +
      h[buffer[10]] +
      h[buffer[11]] +
      h[buffer[12]] +
      h[buffer[13]] +
      h[buffer[14]] +
      h[buffer[15]];

    return new Uuid(uuidStr);
  }

  private readonly _uuid: string;

  constructor(uuid: string) {
    if (!Uuid._uuidRegex.test(uuid)) {
      throw new ArgumentError("UUID 형식이 올바르지 않습니다.", { uuid });
    }
    this._uuid = uuid;
  }

  toString(): string {
    return this._uuid;
  }

  toBuffer(): Buffer {
    const hex = this._uuid.replace(/-/g, "");
    const buffer = Buffer.alloc(16);
    for (let i = 0; i < 16; i++) {
      buffer[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return buffer;
  }
}
