import { describe, it, expect } from "vitest";
import { ArgumentError, bytes } from "@simplysm/core-common";

describe("BytesUtils", () => {
  //#region concat

  describe("bytes.concat()", () => {
    it("여러 Uint8Array 연결", () => {
      const arr1 = new Uint8Array([1, 2, 3]);
      const arr2 = new Uint8Array([4, 5]);
      const arr3 = new Uint8Array([6, 7, 8, 9]);

      const result = bytes.concat([arr1, arr2, arr3]);

      expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]));
    });

    it("빈 배열 처리", () => {
      const result = bytes.concat([]);

      expect(result).toEqual(new Uint8Array([]));
      expect(result.length).toBe(0);
    });

    it("배열 내 빈 Uint8Array 처리", () => {
      const arr1 = new Uint8Array([1, 2]);
      const arr2 = new Uint8Array([]);
      const arr3 = new Uint8Array([3, 4]);

      const result = bytes.concat([arr1, arr2, arr3]);

      expect(result).toEqual(new Uint8Array([1, 2, 3, 4]));
    });
  });

  //#endregion

  //#region toHex/fromHex

  describe("bytes.toHex()", () => {
    it("Uint8Array를 hex 문자열로 변환", () => {
      const data = new Uint8Array([0, 1, 15, 16, 255]);

      const result = bytes.toHex(data);

      expect(result).toBe("00010f10ff");
    });

    it("빈 배열 처리", () => {
      const result = bytes.toHex(new Uint8Array([]));

      expect(result).toBe("");
    });

    it("단일 바이트 처리", () => {
      expect(bytes.toHex(new Uint8Array([0]))).toBe("00");
      expect(bytes.toHex(new Uint8Array([255]))).toBe("ff");
    });
  });

  describe("bytes.fromHex()", () => {
    it("hex 문자열을 Uint8Array로 변환", () => {
      const result = bytes.fromHex("00010f10ff");

      expect(result).toEqual(new Uint8Array([0, 1, 15, 16, 255]));
    });

    it("빈 문자열 처리", () => {
      const result = bytes.fromHex("");

      expect(result).toEqual(new Uint8Array([]));
    });

    it("대문자 hex 처리", () => {
      const result = bytes.fromHex("FF0A");

      expect(result).toEqual(new Uint8Array([255, 10]));
    });

    it("홀수 길이 문자열에 대해 오류 발생", () => {
      expect(() => bytes.fromHex("abc")).toThrow(ArgumentError);
      expect(() => bytes.fromHex("a")).toThrow(ArgumentError);
      expect(() => bytes.fromHex("12345")).toThrow(ArgumentError);
    });

    it("잘못된 hex 문자에 대해 오류 발생", () => {
      expect(() => bytes.fromHex("zz")).toThrow(ArgumentError);
      expect(() => bytes.fromHex("gh")).toThrow(ArgumentError);
      expect(() => bytes.fromHex("12g4")).toThrow(ArgumentError);
    });
  });

  describe("toHex/fromHex round-trip conversion", () => {
    it("왕복 변환이 모든 바이트 값(0-255)과 일치", () => {
      const original = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        original[i] = i;
      }

      const hex = bytes.toHex(original);
      const restored = bytes.fromHex(hex);

      expect(restored).toEqual(original);
    });
  });

  //#endregion

  //#region toBase64/fromBase64

  describe("bytes.toBase64()", () => {
    it("빈 배열 처리", () => {
      expect(bytes.toBase64(new Uint8Array([]))).toBe("");
    });

    it("일반 데이터 변환", () => {
      expect(bytes.toBase64(new Uint8Array([72, 101, 108, 108, 111]))).toBe("SGVsbG8=");
    });

    it("스택 오버플로 없이 대용량 데이터(1MB) 처리", () => {
      const data = new Uint8Array(1024 * 1024);
      expect(() => bytes.toBase64(data)).not.toThrow();
    });

    it("패딩 불필요한 경우 처리", () => {
      // Multiple of 3 length - no padding
      expect(bytes.toBase64(new Uint8Array([1, 2, 3]))).toBe("AQID");
    });

    it("단일 패딩 필요한 경우 처리", () => {
      // Remainder 2 when divided by 3 - 1 padding
      expect(bytes.toBase64(new Uint8Array([1, 2]))).toBe("AQI=");
    });

    it("이중 패딩 필요한 경우 처리", () => {
      // Remainder 1 when divided by 3 - 2 padding
      expect(bytes.toBase64(new Uint8Array([1]))).toBe("AQ==");
    });
  });

  describe("bytes.fromBase64()", () => {
    it("빈 문자열 처리", () => {
      expect(bytes.fromBase64("")).toEqual(new Uint8Array([]));
    });

    it("일반 데이터 변환", () => {
      expect(bytes.fromBase64("SGVsbG8=")).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it("잘못된 base64 문자에 대해 오류 발생", () => {
      expect(() => bytes.fromBase64("!!invalid!!")).toThrow(ArgumentError);
    });

    it("잘못된 base64 길이(나머지 1)에 대해 오류 발생", () => {
      expect(() => bytes.fromBase64("A")).toThrow(ArgumentError);
      expect(() => bytes.fromBase64("AAAAA")).toThrow(ArgumentError);
    });

    it("패딩 없는 base64 처리", () => {
      expect(bytes.fromBase64("AQID")).toEqual(new Uint8Array([1, 2, 3]));
    });

    it("공백 포함 base64 처리", () => {
      expect(bytes.fromBase64("SGVs bG8=")).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });
  });

  describe("toBase64/fromBase64 round-trip conversion", () => {
    it("왕복 변환이 모든 바이트 값(0-255)과 일치", () => {
      const original = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        original[i] = i;
      }

      const base64 = bytes.toBase64(original);
      const restored = bytes.fromBase64(base64);

      expect(restored).toEqual(original);
    });

    it("왕복 변환이 다양한 길이(1-10 바이트)와 일치", () => {
      for (let len = 1; len <= 10; len++) {
        const original = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          original[i] = (i * 37 + 13) % 256;
        }

        const base64 = bytes.toBase64(original);
        const restored = bytes.fromBase64(base64);

        expect(restored).toEqual(original);
      }
    });
  });

  //#endregion
});
