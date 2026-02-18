import type { Bytes } from "../common.types";
import { ArgumentError } from "../errors/argument-error";

/**
 * Uint8Array 유틸리티 함수 (복잡한 연산만)
 *
 * 기능:
 * - bytesConcat: 여러 Uint8Array 연결
 * - bytesToHex: Uint8Array를 hex 문자열로 변환
 * - bytesFromHex: hex 문자열을 Uint8Array로 변환
 * - bytesToBase64: Uint8Array를 base64 문자열로 변환
 * - bytesFromBase64: base64 문자열을 Uint8Array로 변환
 */

/** hex 변환용 룩업 테이블 (성능 최적화) */
const hexTable: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

/** base64 인코딩 테이블 */
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** base64 디코딩 룩업 테이블 (O(1) 조회, 모든 바이트 값 커버) */
const BASE64_LOOKUP: number[] = Array.from({ length: 256 }, (_, i) => {
  const idx = BASE64_CHARS.indexOf(String.fromCharCode(i));
  return idx === -1 ? 0 : idx;
});

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

/**
 * Bytes를 base64 문자열로 변환
 * @param bytes 변환할 Uint8Array
 * @returns base64 인코딩된 문자열
 * @example
 * bytesToBase64(new Uint8Array([72, 101, 108, 108, 111]));
 * // "SGVsbG8="
 */
export function bytesToBase64(bytes: Bytes): string {
  if (bytes.length === 0) {
    return "";
  }

  let result = "";
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;
    result += BASE64_CHARS[b1 >> 2];
    result += BASE64_CHARS[((b1 & 3) << 4) | (b2 >> 4)];
    result += i + 1 < len ? BASE64_CHARS[((b2 & 15) << 2) | (b3 >> 6)] : "=";
    result += i + 2 < len ? BASE64_CHARS[b3 & 63] : "=";
  }
  return result;
}

/**
 * base64 문자열을 Bytes로 변환
 * @param base64 변환할 base64 문자열
 * @returns 디코딩된 Uint8Array
 * @throws {ArgumentError} 유효하지 않은 base64 문자가 포함된 경우
 * @example
 * bytesFromBase64("SGVsbG8=");
 * // Uint8Array([72, 101, 108, 108, 111])
 */
export function bytesFromBase64(base64: string): Bytes {
  // 공백 제거 및 패딩 정규화
  const cleanBase64 = base64.replace(/\s/g, "").replace(/=+$/, "");

  // 빈 문자열 처리
  if (cleanBase64.length === 0) {
    return new Uint8Array(0);
  }

  // 유효성 검사: 문자
  if (!/^[A-Za-z0-9+/]+$/.test(cleanBase64)) {
    throw new ArgumentError("유효하지 않은 base64 문자가 포함되어 있습니다", {
      base64: base64.substring(0, 20),
    });
  }

  // 유효성 검사: 길이 (패딩 제거 후 나머지가 1이면 유효하지 않음)
  if (cleanBase64.length % 4 === 1) {
    throw new ArgumentError("유효하지 않은 base64 길이입니다", { length: cleanBase64.length });
  }

  const len = cleanBase64.length;
  const byteLen = Math.floor((len * 3) / 4);
  const bytes = new Uint8Array(byteLen);

  let byteIdx = 0;
  for (let i = 0; i < len; i += 4) {
    const c1 = BASE64_LOOKUP[cleanBase64.charCodeAt(i)];
    const c2 = i + 1 < len ? BASE64_LOOKUP[cleanBase64.charCodeAt(i + 1)] : 0;
    const c3 = i + 2 < len ? BASE64_LOOKUP[cleanBase64.charCodeAt(i + 2)] : 0;
    const c4 = i + 3 < len ? BASE64_LOOKUP[cleanBase64.charCodeAt(i + 3)] : 0;

    bytes[byteIdx++] = (c1 << 2) | (c2 >> 4);
    if (byteIdx < byteLen) bytes[byteIdx++] = ((c2 & 15) << 4) | (c3 >> 2);
    if (byteIdx < byteLen) bytes[byteIdx++] = ((c3 & 3) << 6) | c4;
  }

  return bytes;
}
