import { describe, it, expect } from "vitest";
import { Uuid } from "@simplysm/core-common";

describe("Uuid", () => {
  describe("generate()", () => {
    it("유효한 UUID v4 형식 생성", () => {
      const uuid = Uuid.generate();
      const str = uuid.toString();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(str).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it("매번 새로운 UUID 생성", () => {
      const uuid1 = Uuid.generate();
      const uuid2 = Uuid.generate();

      expect(uuid1.toString()).not.toBe(uuid2.toString());
    });
  });

  describe("fromBytes()", () => {
    it("16바이트 Uint8Array에서 UUID 생성", () => {
      const bytes = new Uint8Array([
        0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde,
        0xf0,
      ]);
      const uuid = Uuid.fromBytes(bytes);

      expect(uuid.toString()).toBe("12345678-9abc-def0-1234-56789abcdef0");
    });

    it("16바이트가 아닌 입력에 대해 오류 발생", () => {
      const bytes = new Uint8Array([0x12, 0x34]);

      expect(() => Uuid.fromBytes(bytes)).toThrow("바이트 크기");
    });
  });

  describe("toBytes()", () => {
    it("UUID를 16바이트 Uint8Array로 변환", () => {
      const uuid = new Uuid("12345678-9abc-def0-1234-56789abcdef0");
      const bytes = uuid.toBytes();

      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(16);
      expect(Array.from(bytes)).toEqual([
        0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde,
        0xf0,
      ]);
    });

    it("fromBytes와 toBytes는 역연산", () => {
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
    it("잘못된 UUID 형식에 대해 오류 발생", () => {
      expect(() => new Uuid("invalid-uuid")).toThrow();
    });

    it("UUID 길이 불일치 시 오류 발생", () => {
      expect(() => new Uuid("12345678-9abc")).toThrow();
    });
  });
});
