import { describe, expect, it } from "vitest";
import { codePageToEncoding, decodeBytes } from "../../src/utils/cp";

describe("codePageToEncoding", () => {
  it("CP949 → euc-kr", () => {
    expect(codePageToEncoding(949)).toBe("euc-kr");
  });

  it("CP65001 → utf-8", () => {
    expect(codePageToEncoding(65001)).toBe("utf-8");
  });

  it("CP932 → shift-jis", () => {
    expect(codePageToEncoding(932)).toBe("shift-jis");
  });

  it("CP936 → gbk", () => {
    expect(codePageToEncoding(936)).toBe("gbk");
  });

  it("CP950 → big5", () => {
    expect(codePageToEncoding(950)).toBe("big5");
  });

  it("알 수 없는 코드 페이지 → utf-8 fallback", () => {
    expect(codePageToEncoding(99999)).toBe("utf-8");
  });
});

describe("decodeBytes", () => {
  it("EUC-KR 바이트를 한글로 디코딩", () => {
    const eucKrBytes = new Uint8Array([0xc7, 0xd1, 0xb1, 0xdb]); // "한글" in EUC-KR
    expect(decodeBytes(eucKrBytes, "euc-kr")).toBe("한글");
  });

  it("UTF-8 바이트는 systemEncoding이 euc-kr이어도 UTF-8로 디코딩", () => {
    const utf8Bytes = new TextEncoder().encode("한글");
    expect(decodeBytes(utf8Bytes, "euc-kr")).toBe("한글");
  });

  it("UTF-8 시스템에서는 직접 UTF-8 디코딩", () => {
    const utf8Bytes = new TextEncoder().encode("hello");
    expect(decodeBytes(utf8Bytes, "utf-8")).toBe("hello");
  });

  it("빈 바이트 → 빈 문자열", () => {
    expect(decodeBytes(new Uint8Array(0), "euc-kr")).toBe("");
  });
});
