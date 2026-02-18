import { describe, it, expect } from "vitest";
import { getWatchScopes } from "../src/utils/package-utils";

describe("getWatchScopes", () => {
  it("scope가 있는 패키지명에서 scope를 추출한다", () => {
    const result = getWatchScopes("@myapp/root");
    expect(result).toEqual(["@myapp"]);
  });

  it("scope가 없는 패키지명이면 빈 배열을 반환한다", () => {
    const result = getWatchScopes("simplysm");
    expect(result).toEqual([]);
  });

  it("replaceDeps에서 scope를 추출한다", () => {
    const result = getWatchScopes("@myapp/root", { "@simplysm/*": "../simplysm/packages/*" });
    expect(result).toContain("@myapp");
    expect(result).toContain("@simplysm");
  });

  it("프로젝트 scope와 replaceDeps scope가 동일하면 중복 없이 반환한다", () => {
    const result = getWatchScopes("@simplysm/core-common", { "@simplysm/*": "../packages/*" });
    expect(result).toEqual(["@simplysm"]);
  });

  it("replaceDeps에 scope가 없는 패턴은 무시한다", () => {
    const result = getWatchScopes("@myapp/root", { lodash: "../lodash" });
    expect(result).toEqual(["@myapp"]);
  });
});
