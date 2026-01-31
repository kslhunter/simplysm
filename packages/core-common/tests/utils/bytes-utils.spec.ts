import { describe, it, expect } from "vitest";
import { ArgumentError, bytesConcat as concat, bytesToHex as toHex, bytesFromHex as fromHex } from "@simplysm/core-common";

describe("BytesUtils", () => {
  //#region concat

  describe("concat()", () => {
    it("여러 Uint8Array를 연결한다", () => {
      const arr1 = new Uint8Array([1, 2, 3]);
      const arr2 = new Uint8Array([4, 5]);
      const arr3 = new Uint8Array([6, 7, 8, 9]);

      const result = concat([arr1, arr2, arr3]);

      expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]));
    });

    it("빈 배열을 처리한다", () => {
      const result = concat([]);

      expect(result).toEqual(new Uint8Array([]));
      expect(result.length).toBe(0);
    });

    it("단일 배열을 처리한다", () => {
      const arr = new Uint8Array([1, 2, 3]);

      const result = concat([arr]);

      expect(result).toEqual(new Uint8Array([1, 2, 3]));
    });

    it("빈 Uint8Array가 포함된 경우 처리한다", () => {
      const arr1 = new Uint8Array([1, 2]);
      const arr2 = new Uint8Array([]);
      const arr3 = new Uint8Array([3, 4]);

      const result = concat([arr1, arr2, arr3]);

      expect(result).toEqual(new Uint8Array([1, 2, 3, 4]));
    });
  });

  //#endregion

  //#region toHex/fromHex

  describe("toHex()", () => {
    it("Uint8Array를 hex 문자열로 변환한다", () => {
      const bytes = new Uint8Array([0, 1, 15, 16, 255]);

      const result = toHex(bytes);

      expect(result).toBe("00010f10ff");
    });

    it("빈 배열을 처리한다", () => {
      const result = toHex(new Uint8Array([]));

      expect(result).toBe("");
    });

    it("단일 바이트를 처리한다", () => {
      expect(toHex(new Uint8Array([0]))).toBe("00");
      expect(toHex(new Uint8Array([255]))).toBe("ff");
    });
  });

  describe("fromHex()", () => {
    it("hex 문자열을 Uint8Array로 변환한다", () => {
      const result = fromHex("00010f10ff");

      expect(result).toEqual(new Uint8Array([0, 1, 15, 16, 255]));
    });

    it("빈 문자열을 처리한다", () => {
      const result = fromHex("");

      expect(result).toEqual(new Uint8Array([]));
    });

    it("대문자 hex도 처리한다", () => {
      const result = fromHex("FF0A");

      expect(result).toEqual(new Uint8Array([255, 10]));
    });

    it("홀수 길이 문자열은 에러를 발생시킨다", () => {
      expect(() => fromHex("abc")).toThrow(ArgumentError);
      expect(() => fromHex("a")).toThrow(ArgumentError);
      expect(() => fromHex("12345")).toThrow(ArgumentError);
    });

    it("유효하지 않은 hex 문자가 포함되면 에러를 발생시킨다", () => {
      expect(() => fromHex("zz")).toThrow(ArgumentError);
      expect(() => fromHex("gh")).toThrow(ArgumentError);
      expect(() => fromHex("12g4")).toThrow(ArgumentError);
    });
  });

  describe("toHex/fromHex 왕복 변환", () => {
    it("왕복 변환이 일치한다", () => {
      const original = new Uint8Array([0, 127, 128, 255, 1, 2, 3]);

      const hex = toHex(original);
      const restored = fromHex(hex);

      expect(restored).toEqual(original);
    });

    it("모든 바이트 값(0-255)에 대해 왕복 변환이 일치한다", () => {
      const original = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        original[i] = i;
      }

      const hex = toHex(original);
      const restored = fromHex(hex);

      expect(restored).toEqual(original);
    });
  });

  //#endregion
});
