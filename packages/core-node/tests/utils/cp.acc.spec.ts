import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

import { execSync } from "child_process";
import { getSystemEncoding, resetEncodingCache } from "../../src/utils/cp";

describe("getSystemEncoding", () => {
  const originalPlatform = process.platform;
  const originalLang = process.env["LANG"];
  const originalLcAll = process.env["LC_ALL"];

  beforeEach(() => {
    resetEncodingCache();
    vi.mocked(execSync).mockReset();
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
    if (originalLang !== undefined) process.env["LANG"] = originalLang;
    else delete process.env["LANG"];
    if (originalLcAll !== undefined) process.env["LC_ALL"] = originalLcAll;
    else delete process.env["LC_ALL"];
  });

  it("Windows CP949 시스템에서 euc-kr로 감지", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    vi.mocked(execSync).mockReturnValue("활성 코드 페이지: 949\n");

    expect(getSystemEncoding()).toBe("euc-kr");
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
