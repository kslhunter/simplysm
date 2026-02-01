import type { Bytes } from "../common.types";
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
export declare function bytesConcat(arrays: Bytes[]): Bytes;
/**
 * hex 문자열로 변환
 * @param bytes 변환할 Uint8Array
 * @returns 소문자 hex 문자열
 * @example
 * bytesToHex(new Uint8Array([255, 0, 127]));
 * // "ff007f"
 */
export declare function bytesToHex(bytes: Bytes): string;
/**
 * hex 문자열에서 Uint8Array로 변환
 * @param hex 변환할 hex 문자열 (소문자/대문자 모두 허용)
 * @returns 변환된 Uint8Array
 * @throws {ArgumentError} 홀수 길이 또는 유효하지 않은 hex 문자가 포함된 경우
 * @example
 * bytesFromHex("ff007f");
 * // Uint8Array([255, 0, 127])
 */
export declare function bytesFromHex(hex: string): Bytes;
//# sourceMappingURL=bytes.d.ts.map