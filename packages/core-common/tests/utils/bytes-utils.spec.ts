import { describe, it, expect } from "vitest";
import {
  ArgumentError,
  bytesConcat as concat,
  bytesToHex as toHex,
  bytesFromHex as fromHex,
  bytesToBase64 as toBase64,
  bytesFromBase64 as fromBase64,
} from "@simplysm/core-common";

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

  //#region toBase64/fromBase64

  describe("toBase64()", () => {
    it("빈 배열을 처리한다", () => {
      expect(toBase64(new Uint8Array([]))).toBe("");
    });

    it("일반 데이터를 변환한다", () => {
      expect(toBase64(new Uint8Array([72, 101, 108, 108, 111]))).toBe("SGVsbG8=");
    });

    it("대용량 데이터 (1MB)를 스택 오버플로우 없이 처리한다", () => {
      const data = new Uint8Array(1024 * 1024);
      expect(() => toBase64(data)).not.toThrow();
    });

    it("패딩이 필요없는 경우를 처리한다", () => {
      // 3의 배수 길이 - 패딩 없음
      expect(toBase64(new Uint8Array([1, 2, 3]))).toBe("AQID");
    });

    it("단일 패딩이 필요한 경우를 처리한다", () => {
      // 3으로 나눠 나머지 2 - = 1개
      expect(toBase64(new Uint8Array([1, 2]))).toBe("AQI=");
    });

    it("이중 패딩이 필요한 경우를 처리한다", () => {
      // 3으로 나눠 나머지 1 - == 2개
      expect(toBase64(new Uint8Array([1]))).toBe("AQ==");
    });
  });

  describe("fromBase64()", () => {
    it("빈 문자열을 처리한다", () => {
      expect(fromBase64("")).toEqual(new Uint8Array([]));
    });

    it("일반 데이터를 변환한다", () => {
      expect(fromBase64("SGVsbG8=")).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it("유효하지 않은 base64 문자가 포함되면 에러를 발생시킨다", () => {
      expect(() => fromBase64("!!invalid!!")).toThrow(ArgumentError);
    });

    it("유효하지 않은 base64 길이(나머지 1)면 에러를 발생시킨다", () => {
      expect(() => fromBase64("A")).toThrow(ArgumentError);
      expect(() => fromBase64("AAAAA")).toThrow(ArgumentError);
    });

    it("패딩 없는 base64를 처리한다", () => {
      expect(fromBase64("AQID")).toEqual(new Uint8Array([1, 2, 3]));
    });

    it("공백이 포함된 base64를 처리한다", () => {
      expect(fromBase64("SGVs bG8=")).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });
  });

  describe("toBase64/fromBase64 왕복 변환", () => {
    it("왕복 변환이 일치한다", () => {
      const original = new Uint8Array([0, 127, 128, 255, 1, 2, 3]);

      const base64 = toBase64(original);
      const restored = fromBase64(base64);

      expect(restored).toEqual(original);
    });

    it("모든 바이트 값(0-255)에 대해 왕복 변환이 일치한다", () => {
      const original = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        original[i] = i;
      }

      const base64 = toBase64(original);
      const restored = fromBase64(base64);

      expect(restored).toEqual(original);
    });

    it("다양한 길이(1~10바이트)에 대해 왕복 변환이 일치한다", () => {
      for (let len = 1; len <= 10; len++) {
        const original = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          original[i] = (i * 37 + 13) % 256;
        }

        const base64 = toBase64(original);
        const restored = fromBase64(base64);

        expect(restored).toEqual(original);
      }
    });
  });

  //#endregion
});
