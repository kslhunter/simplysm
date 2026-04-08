import { describe, it, expect } from "vitest";
import {
  getMenuRouterLinkOption,
  getIsMenuSelected,
} from "../../../src/ui/navigation/menu-utils";
import type { SdMenu } from "../../../src/ui/navigation/menu-utils";

describe("FIX-3 CONSIST-007: menu-utils", () => {
  describe("getMenuRouterLinkOption", () => {
    it("children가 없고 url이 없는 메뉴는 라우터 링크를 반환한다", () => {
      const menu: SdMenu = { title: "Test", codeChain: ["admin", "users"] };
      const result = getMenuRouterLinkOption(menu);
      expect(result).toEqual({
        link: "/home/admin/users",
        queryParams: undefined,
      });
    });

    it("children가 있는 메뉴는 undefined를 반환한다", () => {
      const menu: SdMenu = {
        title: "Parent",
        codeChain: ["admin"],
        children: [{ title: "Child", codeChain: ["admin", "users"] }],
      };
      expect(getMenuRouterLinkOption(menu)).toBeUndefined();
    });

    it("url이 있는 메뉴는 undefined를 반환한다", () => {
      const menu: SdMenu = {
        title: "External",
        codeChain: ["ext"],
        url: "https://example.com",
      };
      expect(getMenuRouterLinkOption(menu)).toBeUndefined();
    });

    it("쿼리 파라미터가 포함된 codeChain을 파싱한다", () => {
      const menu: SdMenu = { title: "Test", codeChain: ["admin", "users?tab=active"] };
      const result = getMenuRouterLinkOption(menu);
      expect(result).toEqual({
        link: "/home/admin/users",
        queryParams: { tab: "active" },
      });
    });
  });

  describe("getIsMenuSelected", () => {
    it("fullPageCode가 codeChain.join('.')과 같으면 true", () => {
      const menu: SdMenu = { title: "Test", codeChain: ["admin", "users"] };
      expect(getIsMenuSelected(menu, "admin.users")).toBe(true);
    });

    it("fullPageCode가 다르면 false", () => {
      const menu: SdMenu = { title: "Test", codeChain: ["admin", "users"] };
      expect(getIsMenuSelected(menu, "admin.settings")).toBe(false);
    });

    it("커스텀 함수가 있으면 커스텀 함수로 판단한다", () => {
      const menu: SdMenu = { title: "Test", codeChain: ["admin", "users"] };
      const customFn = () => true;
      expect(getIsMenuSelected(menu, "other.code", customFn)).toBe(true);
    });
  });
});
