import type { Bytes } from "../common.types";
/**
 * UUID v4 클래스
 *
 * crypto.getRandomValues 기반으로 암호학적으로 안전한 UUID를 생성한다. (Chrome 79+, Node.js 공용)
 *
 * @example
 * const id = Uuid.new();
 * const fromStr = new Uuid("550e8400-e29b-41d4-a716-446655440000");
 */
export declare class Uuid {
  private static readonly _hexTable;
  private static readonly _uuidRegex;
  /** 16바이트 배열을 UUID 문자열로 변환 */
  private static _bytesToUuidStr;
  /** 새 UUID v4 인스턴스 생성 */
  static new(): Uuid;
  /**
   * 16바이트 Uint8Array에서 UUID 생성
   * @param bytes 16바이트 배열
   * @throws {ArgumentError} 바이트 크기가 16이 아닌 경우
   */
  static fromBytes(bytes: Bytes): Uuid;
  private readonly _uuid;
  /**
   * @param uuid UUID 문자열 (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx 형식)
   * @throws {ArgumentError} 형식이 올바르지 않은 경우
   */
  constructor(uuid: string);
  /** UUID를 문자열로 변환 */
  toString(): string;
  /** UUID를 16바이트 Uint8Array로 변환 */
  toBytes(): Bytes;
}
//# sourceMappingURL=uuid.d.ts.map
