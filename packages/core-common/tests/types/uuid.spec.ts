import { describe, it, expect } from "vitest";
import { Uuid } from "@simplysm/core-common";

describe("Uuid", () => {
  describe("new()", () => {
    it("유효한 UUID v4 형식을 생성한다", () => {
      const uuid = Uuid.new();
      const str = uuid.toString();

      // UUID v4 형식: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(str).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it("매번 새로운 UUID를 생성한다", () => {
      const uuid1 = Uuid.new();
      const uuid2 = Uuid.new();

      expect(uuid1.toString()).not.toBe(uuid2.toString());
    });
  });

  describe("fromBytes()", () => {
    it("16바이트 Uint8Array로부터 UUID를 생성한다", () => {
      const bytes = new Uint8Array([
        0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
      ]);
      const uuid = Uuid.fromBytes(bytes);

      expect(uuid.toString()).toBe("12345678-9abc-def0-1234-56789abcdef0");
    });

    it("16바이트가 아닌 경우 에러를 던진다", () => {
      const bytes = new Uint8Array([0x12, 0x34]);

      expect(() => Uuid.fromBytes(bytes)).toThrow("UUID 바이트 크기는 16이어야 합니다");
    });
  });

  describe("toBytes()", () => {
    it("UUID를 16바이트 Uint8Array로 변환한다", () => {
      const uuid = new Uuid("12345678-9abc-def0-1234-56789abcdef0");
      const bytes = uuid.toBytes();

      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(16);
      expect(Array.from(bytes)).toEqual([
        0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
      ]);
    });

    it("fromBytes와 toBytes가 서로 역변환된다", () => {
      const originalBytes = new Uint8Array([
        0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
      ]);
      const uuid = Uuid.fromBytes(originalBytes);
      const resultBytes = uuid.toBytes();

      expect(Array.from(resultBytes)).toEqual(Array.from(originalBytes));
    });
  });

  describe("constructor", () => {
    it("유효하지 않은 UUID 형식은 에러를 던진다", () => {
      expect(() => new Uuid("invalid-uuid")).toThrow();
    });

    it("길이가 맞지 않는 UUID는 에러를 던진다", () => {
      expect(() => new Uuid("12345678-9abc")).toThrow();
    });
  });
});
