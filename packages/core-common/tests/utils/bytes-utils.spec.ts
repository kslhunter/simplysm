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
    it("Concatenates multiple Uint8Arrays", () => {
      const arr1 = new Uint8Array([1, 2, 3]);
      const arr2 = new Uint8Array([4, 5]);
      const arr3 = new Uint8Array([6, 7, 8, 9]);

      const result = concat([arr1, arr2, arr3]);

      expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]));
    });

    it("Handles empty array", () => {
      const result = concat([]);

      expect(result).toEqual(new Uint8Array([]));
      expect(result.length).toBe(0);
    });

    it("Handles single array", () => {
      const arr = new Uint8Array([1, 2, 3]);

      const result = concat([arr]);

      expect(result).toEqual(new Uint8Array([1, 2, 3]));
    });

    it("Handles empty Uint8Array in array", () => {
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
    it("Converts Uint8Array to hex string", () => {
      const bytes = new Uint8Array([0, 1, 15, 16, 255]);

      const result = toHex(bytes);

      expect(result).toBe("00010f10ff");
    });

    it("Handles empty array", () => {
      const result = toHex(new Uint8Array([]));

      expect(result).toBe("");
    });

    it("Handles single byte", () => {
      expect(toHex(new Uint8Array([0]))).toBe("00");
      expect(toHex(new Uint8Array([255]))).toBe("ff");
    });
  });

  describe("fromHex()", () => {
    it("Converts hex string to Uint8Array", () => {
      const result = fromHex("00010f10ff");

      expect(result).toEqual(new Uint8Array([0, 1, 15, 16, 255]));
    });

    it("Handles empty string", () => {
      const result = fromHex("");

      expect(result).toEqual(new Uint8Array([]));
    });

    it("Handles uppercase hex", () => {
      const result = fromHex("FF0A");

      expect(result).toEqual(new Uint8Array([255, 10]));
    });

    it("Throws error for odd-length string", () => {
      expect(() => fromHex("abc")).toThrow(ArgumentError);
      expect(() => fromHex("a")).toThrow(ArgumentError);
      expect(() => fromHex("12345")).toThrow(ArgumentError);
    });

    it("Throws error for invalid hex characters", () => {
      expect(() => fromHex("zz")).toThrow(ArgumentError);
      expect(() => fromHex("gh")).toThrow(ArgumentError);
      expect(() => fromHex("12g4")).toThrow(ArgumentError);
    });
  });

  describe("toHex/fromHex round-trip conversion", () => {
    it("Round-trip conversion matches", () => {
      const original = new Uint8Array([0, 127, 128, 255, 1, 2, 3]);

      const hex = toHex(original);
      const restored = fromHex(hex);

      expect(restored).toEqual(original);
    });

    it("Round-trip conversion matches all byte values (0-255)", () => {
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
    it("Handles empty array", () => {
      expect(toBase64(new Uint8Array([]))).toBe("");
    });

    it("Converts general data", () => {
      expect(toBase64(new Uint8Array([72, 101, 108, 108, 111]))).toBe("SGVsbG8=");
    });

    it("Handles large data (1MB) without stack overflow", () => {
      const data = new Uint8Array(1024 * 1024);
      expect(() => toBase64(data)).not.toThrow();
    });

    it("Handles case with no padding needed", () => {
      // Multiple of 3 length - no padding
      expect(toBase64(new Uint8Array([1, 2, 3]))).toBe("AQID");
    });

    it("Handles case with single padding needed", () => {
      // Remainder 2 when divided by 3 - 1 padding
      expect(toBase64(new Uint8Array([1, 2]))).toBe("AQI=");
    });

    it("Handles case with double padding needed", () => {
      // Remainder 1 when divided by 3 - 2 padding
      expect(toBase64(new Uint8Array([1]))).toBe("AQ==");
    });
  });

  describe("fromBase64()", () => {
    it("Handles empty string", () => {
      expect(fromBase64("")).toEqual(new Uint8Array([]));
    });

    it("Converts general data", () => {
      expect(fromBase64("SGVsbG8=")).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it("Throws error for invalid base64 characters", () => {
      expect(() => fromBase64("!!invalid!!")).toThrow(ArgumentError);
    });

    it("Throws error for invalid base64 length (remainder 1)", () => {
      expect(() => fromBase64("A")).toThrow(ArgumentError);
      expect(() => fromBase64("AAAAA")).toThrow(ArgumentError);
    });

    it("Handles base64 without padding", () => {
      expect(fromBase64("AQID")).toEqual(new Uint8Array([1, 2, 3]));
    });

    it("Handles base64 with whitespace", () => {
      expect(fromBase64("SGVs bG8=")).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });
  });

  describe("toBase64/fromBase64 round-trip conversion", () => {
    it("Round-trip conversion matches", () => {
      const original = new Uint8Array([0, 127, 128, 255, 1, 2, 3]);

      const base64 = toBase64(original);
      const restored = fromBase64(base64);

      expect(restored).toEqual(original);
    });

    it("Round-trip conversion matches all byte values (0-255)", () => {
      const original = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        original[i] = i;
      }

      const base64 = toBase64(original);
      const restored = fromBase64(base64);

      expect(restored).toEqual(original);
    });

    it("Round-trip conversion matches various lengths (1-10 bytes)", () => {
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
