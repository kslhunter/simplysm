import { ArgumentError } from "../errors/argument-error";

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

  /** 새 UUID v4 인스턴스 생성 */
  static new(): Uuid {
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

  /**
   * 16바이트 Uint8Array에서 UUID 생성
   * @param bytes 16바이트 배열
   * @throws {ArgumentError} 바이트 크기가 16이 아닌 경우
   */
  static fromBytes(bytes: Uint8Array): Uuid {
    if (bytes.length !== 16) {
      throw new ArgumentError("UUID 바이트 크기는 16이어야 합니다.", { length: bytes.length });
    }

    const h = Uuid._hexTable;
    const uuidStr =
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
      h[bytes[15]];

    return new Uuid(uuidStr);
  }

  private readonly _uuid: string;

  /**
   * @param uuid UUID 문자열 (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx 형식)
   * @throws {ArgumentError} 형식이 올바르지 않은 경우
   */
  constructor(uuid: string) {
    if (!Uuid._uuidRegex.test(uuid)) {
      throw new ArgumentError("UUID 형식이 올바르지 않습니다.", { uuid });
    }
    this._uuid = uuid;
  }

  /** UUID를 문자열로 변환 */
  toString(): string {
    return this._uuid;
  }

  /** UUID를 16바이트 Uint8Array로 변환 */
  toBytes(): Uint8Array {
    const hex = this._uuid.replace(/-/g, "");
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
}
