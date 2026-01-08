import { describe, it, expect } from "vitest";
import { Uuid } from "@simplysm/core-common";

describe("Uuid", () => {
  describe("new()", () => {
    it("유효한 UUID v4 형식을 생성한다", () => {
      const uuid = Uuid.new();
      const str = uuid.toString();

      // UUID v4 형식: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(str).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it("매번 새로운 UUID를 생성한다", () => {
      const uuid1 = Uuid.new();
      const uuid2 = Uuid.new();

      expect(uuid1.toString()).not.toBe(uuid2.toString());
    });
  });

  describe("fromBuffer()", () => {
    it("16바이트 Buffer로부터 UUID를 생성한다", () => {
      const buffer = Buffer.from([
        0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde,
        0xf0,
      ]);
      const uuid = Uuid.fromBuffer(buffer);

      expect(uuid.toString()).toBe("12345678-9abc-def0-1234-56789abcdef0");
    });

    it("16바이트가 아닌 경우 에러를 던진다", () => {
      const buffer = Buffer.from([0x12, 0x34]);

      expect(() => Uuid.fromBuffer(buffer)).toThrow("UUID 바이트 크기는 16이어야 합니다");
    });
  });

  describe("toBuffer()", () => {
    it("UUID를 16바이트 Buffer로 변환한다", () => {
      const uuid = new Uuid("12345678-9abc-def0-1234-56789abcdef0");
      const buffer = uuid.toBuffer();

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBe(16);
      expect(Array.from(buffer)).toEqual([
        0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde,
        0xf0,
      ]);
    });

    it("fromBuffer와 toBuffer가 서로 역변환된다", () => {
      const originalBuffer = Buffer.from([
        0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde,
        0xf0,
      ]);
      const uuid = Uuid.fromBuffer(originalBuffer);
      const resultBuffer = uuid.toBuffer();

      expect(Array.from(resultBuffer)).toEqual(Array.from(originalBuffer));
    });
  });

  describe("toString()", () => {
    it("하이픈이 포함된 형식으로 반환한다", () => {
      const uuid = new Uuid("12345678-9abc-def0-1234-56789abcdef0");

      expect(uuid.toString()).toBe("12345678-9abc-def0-1234-56789abcdef0");
    });
  });
});
