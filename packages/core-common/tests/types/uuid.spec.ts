import { describe, it, expect } from "vitest";
import { Uuid } from "@simplysm/core-common";

describe("Uuid", () => {
  describe("new()", () => {
    it("Generates valid UUID v4 format", () => {
      const uuid = Uuid.new();
      const str = uuid.toString();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(str).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it("Generates new UUID each time", () => {
      const uuid1 = Uuid.new();
      const uuid2 = Uuid.new();

      expect(uuid1.toString()).not.toBe(uuid2.toString());
    });
  });

  describe("fromBytes()", () => {
    it("Creates UUID from 16-byte Uint8Array", () => {
      const bytes = new Uint8Array([
        0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde,
        0xf0,
      ]);
      const uuid = Uuid.fromBytes(bytes);

      expect(uuid.toString()).toBe("12345678-9abc-def0-1234-56789abcdef0");
    });

    it("Throws error for non-16-byte input", () => {
      const bytes = new Uint8Array([0x12, 0x34]);

      expect(() => Uuid.fromBytes(bytes)).toThrow("UUID byte size must be 16");
    });
  });

  describe("toBytes()", () => {
    it("Converts UUID to 16-byte Uint8Array", () => {
      const uuid = new Uuid("12345678-9abc-def0-1234-56789abcdef0");
      const bytes = uuid.toBytes();

      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(16);
      expect(Array.from(bytes)).toEqual([
        0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde,
        0xf0,
      ]);
    });

    it("fromBytes and toBytes are inverse operations", () => {
      const originalBytes = new Uint8Array([
        0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde,
        0xf0,
      ]);
      const uuid = Uuid.fromBytes(originalBytes);
      const resultBytes = uuid.toBytes();

      expect(Array.from(resultBytes)).toEqual(Array.from(originalBytes));
    });
  });

  describe("constructor", () => {
    it("Throws error for invalid UUID format", () => {
      expect(() => new Uuid("invalid-uuid")).toThrow();
    });

    it("Throws error for mismatched UUID length", () => {
      expect(() => new Uuid("12345678-9abc")).toThrow();
    });
  });
});
