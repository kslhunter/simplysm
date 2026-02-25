import type { Bytes } from "../common.types";
import { ArgumentError } from "../errors/argument-error";

/**
 * UUID v4 class
 *
 * Generates cryptographically secure UUIDs based on crypto.getRandomValues. (Chrome 79+, Node.js compatible)
 *
 * @example
 * const id = Uuid.new();
 * const fromStr = new Uuid("550e8400-e29b-41d4-a716-446655440000");
 */
export class Uuid {
  // Pre-calculate hex strings for 0x00 ~ 0xFF (256 entries)
  private static readonly _hexTable: string[] = Array.from({ length: 256 }, (_, i) =>
    i.toString(16).padStart(2, "0"),
  );

  private static readonly _uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /** Convert 16-byte array to UUID string */
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

  /** Create new UUID v4 instance */
  static new(): Uuid {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // Set UUID v4 bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return new Uuid(Uuid._bytesToUuidStr(bytes));
  }

  /**
   * Create UUID from 16-byte Uint8Array
   * @param bytes 16-byte array
   * @throws {ArgumentError} If byte size is not 16
   */
  static fromBytes(bytes: Bytes): Uuid {
    if (bytes.length !== 16) {
      throw new ArgumentError("UUID byte size must be 16.", { length: bytes.length });
    }

    return new Uuid(Uuid._bytesToUuidStr(bytes));
  }

  private readonly _uuid: string;

  /**
   * @param uuid UUID string (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
   * @throws {ArgumentError} If format is invalid
   */
  constructor(uuid: string) {
    if (!Uuid._uuidRegex.test(uuid)) {
      throw new ArgumentError("Invalid UUID format.", { uuid });
    }
    this._uuid = uuid;
  }

  /** Convert UUID to string */
  toString(): string {
    return this._uuid;
  }

  /** Convert UUID to 16-byte Uint8Array */
  toBytes(): Bytes {
    const u = this._uuid;
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (8-4-4-4-12)
    // Hyphen positions: 8, 13, 18, 23
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
