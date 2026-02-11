import { describe, it, expect } from "vitest";
import { getWatchScopes } from "../src/utils/package-utils";

describe("getWatchScopes", () => {
  it("scope가 있는 패키지명에서 scope를 추출한다", () => {
    const result = getWatchScopes("@myapp/root");
    expect(result).toContain("@myapp");
    expect(result).toContain("@simplysm");
  });

  it("scope가 없는 패키지명이면 @simplysm만 반환한다", () => {
    const result = getWatchScopes("simplysm");
    expect(result).toEqual(["@simplysm"]);
  });

  it("@simplysm scope 패키지면 중복 없이 반환한다", () => {
    const result = getWatchScopes("@simplysm/core-common");
    expect(result).toEqual(["@simplysm"]);
  });
});
