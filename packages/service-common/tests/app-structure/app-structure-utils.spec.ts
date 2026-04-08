import { describe, it, expect } from "vitest";
import {
  isUsableModules,
  isUsableModulesChain,
  getFlatPermissions,
} from "../../src/app-structure/app-structure.utils";
import type { AppStructureItem } from "../../src/app-structure/app-structure.types";

describe("isUsableModules", () => {
  it("modules 전체 미매칭이면 false", () => {
    expect(isUsableModules(["X", "Y"], undefined, ["A"])).toBe(false);
  });

  it("usableModules가 undefined이고 modules가 있으면 false", () => {
    expect(isUsableModules(["A"], undefined, undefined)).toBe(false);
  });

  it("requiredModules 전체 매칭이면 true", () => {
    expect(isUsableModules(undefined, ["A", "B"], ["A", "B", "C"])).toBe(true);
  });

  it("modules와 requiredModules 모두 존재: 둘 다 통과해야 true", () => {
    expect(isUsableModules(["A"], ["B"], ["A", "B"])).toBe(true);
    expect(isUsableModules(["A"], ["B"], ["A"])).toBe(false);
  });
});

describe("isUsableModulesChain", () => {
  it("빈 체인이면 true", () => {
    expect(isUsableModulesChain([], [], ["A"])).toBe(true);
  });

  it("requiredModulesChain 중 하나 실패이면 false", () => {
    expect(isUsableModulesChain([], [["A"], ["B"]], ["A"])).toBe(false);
  });
});

describe("getFlatPermissions", () => {
  it("빈 items이면 빈 배열 반환", () => {
    expect(getFlatPermissions([], undefined)).toEqual([]);
  });

  it("usableModules가 undefined일 때 modules 없는 항목은 포함", () => {
    const items: AppStructureItem<string>[] = [
      { code: "page", title: "페이지", perms: ["use"] },
    ];
    const result = getFlatPermissions(items, undefined);
    expect(result).toHaveLength(1);
    expect(result[0].codeChain).toEqual(["page", "use"]);
  });

  it("titleChain과 modulesChain이 올바르게 누적된다", () => {
    const items: AppStructureItem<string>[] = [
      {
        code: "group",
        title: "그룹",
        modules: ["A"],
        children: [{ code: "child", title: "자식", perms: ["use"] }],
      },
    ];
    const result = getFlatPermissions(items, ["A"]);
    expect(result).toHaveLength(1);
    expect(result[0].titleChain).toEqual(["그룹", "자식"]);
    expect(result[0].codeChain).toEqual(["group", "child", "use"]);
    expect(result[0].modulesChain).toEqual([["A"]]);
  });
});
