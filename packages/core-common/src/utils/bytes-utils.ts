import { ArgumentError } from "../errors/argument-error";

/**
 * Uint8Array 유틸리티 (복잡한 연산만)
 */
export const BytesUtils = {
  /** 여러 Uint8Array 연결 */
  concat(arrays: Uint8Array[]): Uint8Array {
    const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  },

  /** hex 문자열로 변환 */
  toHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  },

  /**
   * hex 문자열에서 변환
   * @throws {ArgumentError} 홀수 길이 또는 유효하지 않은 hex 문자가 포함된 경우
   */
  fromHex(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
      throw new ArgumentError("hex 문자열은 짝수 길이여야 합니다", { hex });
    }
    if (hex.length > 0 && !/^[0-9a-fA-F]+$/.test(hex)) {
      throw new ArgumentError("유효하지 않은 hex 문자가 포함되어 있습니다", { hex });
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  },
};
