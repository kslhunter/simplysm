import type { Bytes } from "../common.types";
import { ArgumentError } from "../errors/argument-error";

/**
 * UUID v4 클래스
 *
 * crypto.getRandomValues 기반으로 암호학적으로 안전한 UUID를 생성한다. (Chrome 79+, Node.js 공용)
 *
 * @example
 * const id = Uuid.new();
 * const fromStr = new Uuid("550e8400-e29b-41d4-a716-446655440000");
 */
export class Uuid {
  // 0x00 ~ 0xFF에 대한 hex 문자열 미리 계산 (256개)
  private static readonly _hexTable: string[] = Array.from({ length: 256 }, (_, i) =>
    i.toString(16).padStart(2, "0"),
  );

  private static readonly _uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /** 16바이트 배열을 UUID 문자열로 변환 */
  private static _bytesToUuidStr(bytes: Uint8Array): string {
    const h = Uuid._hexTable;
    return (
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
      h[bytes[15]]
    );
  }

  /** 새 UUID v4 인스턴스 생성 */
  static new(): Uuid {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // UUID v4 설정
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return new Uuid(Uuid._bytesToUuidStr(bytes));
  }

  /**
   * 16바이트 Uint8Array에서 UUID 생성
   * @param bytes 16바이트 배열
   * @throws {ArgumentError} 바이트 크기가 16이 아닌 경우
   */
  static fromBytes(bytes: Bytes): Uuid {
    if (bytes.length !== 16) {
      throw new ArgumentError("UUID 바이트 크기는 16이어야 합니다.", { length: bytes.length });
    }

    return new Uuid(Uuid._bytesToUuidStr(bytes));
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
  toBytes(): Bytes {
    const u = this._uuid;
    // UUID 형식: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (8-4-4-4-12)
    // 하이픈 위치: 8, 13, 18, 23
    return new Uint8Array([
      Number.parseInt(u.substring(0, 2), 16),
      Number.parseInt(u.substring(2, 4), 16),
      Number.parseInt(u.substring(4, 6), 16),
      Number.parseInt(u.substring(6, 8), 16),
      Number.parseInt(u.substring(9, 11), 16),
      Number.parseInt(u.substring(11, 13), 16),
      Number.parseInt(u.substring(14, 16), 16),
      Number.parseInt(u.substring(16, 18), 16),
      Number.parseInt(u.substring(19, 21), 16),
      Number.parseInt(u.substring(21, 23), 16),
      Number.parseInt(u.substring(24, 26), 16),
      Number.parseInt(u.substring(26, 28), 16),
      Number.parseInt(u.substring(28, 30), 16),
      Number.parseInt(u.substring(30, 32), 16),
      Number.parseInt(u.substring(32, 34), 16),
      Number.parseInt(u.substring(34, 36), 16),
    ]);
  }
}
