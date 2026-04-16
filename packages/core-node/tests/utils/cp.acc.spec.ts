/* eslint-disable no-restricted-properties -- 테스트 환경변수 조작 필요 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSystemEncoding, resetEncodingCache } from "../../src/utils/cp";

const KNOWN_ENCODINGS = [
  "utf-8",
  "euc-kr",
  "shift-jis",
  "gbk",
  "big5",
  "windows-1252",
  "windows-1251",
  "windows-1250",
  "windows-874",
];

describe("getSystemEncoding", () => {
  const originalPlatform = process.platform;
  const originalLang = process.env["LANG"];
  const originalLcAll = process.env["LC_ALL"];

  beforeEach(() => {
    resetEncodingCache();
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
    if (originalLang != null) process.env["LANG"] = originalLang;
    else delete process.env["LANG"];
    if (originalLcAll != null) process.env["LC_ALL"] = originalLcAll;
    else delete process.env["LC_ALL"];
  });

  it("현재 시스템 인코딩이 알려진 인코딩 목록에 포함", () => {
    expect(KNOWN_ENCODINGS).toContain(getSystemEncoding());
  });

  it("Linux UTF-8 시스템에서 utf-8로 감지", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    process.env["LANG"] = "en_US.UTF-8";

    expect(getSystemEncoding()).toBe("utf-8");
  });

  it("감지 실패 시 utf-8 fallback", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    delete process.env["LANG"];
    delete process.env["LC_ALL"];

    expect(getSystemEncoding()).toBe("utf-8");
  });
});
