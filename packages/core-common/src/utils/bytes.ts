import type { Bytes } from "../common.types";
import { ArgumentError } from "../errors/argument-error";

/**
 * Uint8Array utility functions (complex operations only)
 *
 * Features:
 * - bytesConcat: Concatenate multiple Uint8Arrays
 * - bytesToHex: Convert Uint8Array to hex string
 * - bytesFromHex: Convert hex string to Uint8Array
 * - bytesToBase64: Convert Uint8Array to base64 string
 * - bytesFromBase64: Convert base64 string to Uint8Array
 */

/** Lookup table for hex conversion (performance optimization) */
const hexTable: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

/** Base64 encoding table */
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Base64 decoding lookup table (O(1) lookup, covers all byte values) */
const BASE64_LOOKUP: number[] = Array.from({ length: 256 }, (_, i) => {
  const idx = BASE64_CHARS.indexOf(String.fromCharCode(i));
  return idx === -1 ? 0 : idx;
});

/**
 * Concatenate multiple Uint8Arrays
 * @param arrays Uint8Array array to concatenate
 * @returns New concatenated Uint8Array
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
 * Convert to hex string
 * @param bytes Uint8Array to convert
 * @returns Lowercase hex string
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
 * Convert from hex string to Uint8Array
 * @param hex Hex string to convert (lowercase and uppercase allowed)
 * @returns Converted Uint8Array
 * @throws {ArgumentError} If odd length or invalid hex characters are present
 * @example
 * bytesFromHex("ff007f");
 * // Uint8Array([255, 0, 127])
 */
export function bytesFromHex(hex: string): Bytes {
  if (hex.length % 2 !== 0) {
    throw new ArgumentError("Hex string must have even length", { hex });
  }
  if (hex.length > 0 && !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new ArgumentError("Invalid hex character included", { hex });
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Convert Bytes to base64 string
 * @param bytes Uint8Array to convert
 * @returns Base64 encoded string
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
 * Convert base64 string to Bytes
 * @param base64 Base64 string to convert
 * @returns Decoded Uint8Array
 * @throws {ArgumentError} If invalid base64 character is present
 * @example
 * bytesFromBase64("SGVsbG8=");
 * // Uint8Array([72, 101, 108, 108, 111])
 */
export function bytesFromBase64(base64: string): Bytes {
  // Remove whitespace and normalize padding
  const cleanBase64 = base64.replace(/\s/g, "").replace(/=+$/, "");

  // Handle empty string
  if (cleanBase64.length === 0) {
    return new Uint8Array(0);
  }

  // Validation: characters
  if (!/^[A-Za-z0-9+/]+$/.test(cleanBase64)) {
    throw new ArgumentError("Invalid base64 character included", {
      base64: base64.substring(0, 20),
    });
  }

  // Validation: length (remainder of 1 after padding removal is invalid)
  if (cleanBase64.length % 4 === 1) {
    throw new ArgumentError("Invalid base64 length", { length: cleanBase64.length });
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
