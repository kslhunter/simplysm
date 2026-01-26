import type { Bytes } from "../common.types";
import { ArgumentError } from "../errors/argument-error";

/**
 * Uint8Array 유틸리티 함수 (복잡한 연산만)
 *
 * 기능:
 * - bytesConcat: 여러 Uint8Array 연결
 * - bytesToHex: Uint8Array를 hex 문자열로 변환
 * - bytesFromHex: hex 문자열을 Uint8Array로 변환
 */

/** hex 변환용 룩업 테이블 (성능 최적화) */
const hexTable: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

/**
 * 여러 Uint8Array 연결
 * @param arrays 연결할 Uint8Array 배열
 * @returns 연결된 새 Uint8Array
 * @example
 * const a = new Uint8Array([1, 2]);
 * const b = new Uint8Array([3, 4]);
 * bytesConcat([a, b]);
 * // Uint8Array([1, 2, 3, 4])
 */
export function bytesConcat(arrays: Bytes[]): Bytes {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * hex 문자열로 변환
 * @param bytes 변환할 Uint8Array
 * @returns 소문자 hex 문자열
 * @example
 * bytesToHex(new Uint8Array([255, 0, 127]));
 * // "ff007f"
 */
export function bytesToHex(bytes: Bytes): string {
  const h = hexTable;
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    result += h[bytes[i]];
  }
  return result;
}

/**
 * hex 문자열에서 Uint8Array로 변환
 * @param hex 변환할 hex 문자열 (소문자/대문자 모두 허용)
 * @returns 변환된 Uint8Array
 * @throws {ArgumentError} 홀수 길이 또는 유효하지 않은 hex 문자가 포함된 경우
 * @example
 * bytesFromHex("ff007f");
 * // Uint8Array([255, 0, 127])
 */
export function bytesFromHex(hex: string): Bytes {
  if (hex.length % 2 !== 0) {
    throw new ArgumentError("hex 문자열은 짝수 길이여야 합니다", { hex });
  }
  if (hex.length > 0 && !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new ArgumentError("유효하지 않은 hex 문자가 포함되어 있습니다", { hex });
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
