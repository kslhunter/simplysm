import { describe, it, expect } from "vitest";
import { topbarContainer } from "../../../src/components/navigator/topbar/topbar-container.css";
import { topbar, topbarTitle } from "../../../src/components/navigator/topbar/topbar.css";
import {
  topbarMenu,
  topbarMenuNestedList,
} from "../../../src/components/navigator/topbar/topbar-menu.css";
import { topbarUser } from "../../../src/components/navigator/topbar/topbar-user.css";

describe("topbar CSS", () => {
  describe("topbarContainer 스타일", () => {
    it("클래스명이 존재한다", () => {
      expect(topbarContainer).toBeTruthy();
      expect(typeof topbarContainer).toBe("string");
    });
  });

  describe("topbar 스타일", () => {
    it("topbar 클래스명이 존재한다", () => {
      expect(topbar).toBeTruthy();
      expect(typeof topbar).toBe("string");
    });

    it("topbarTitle 클래스명이 존재한다", () => {
      expect(topbarTitle).toBeTruthy();
      expect(typeof topbarTitle).toBe("string");
    });
  });

  describe("topbarMenu 스타일", () => {
    it("topbarMenu 클래스명이 존재한다", () => {
      expect(topbarMenu).toBeTruthy();
      expect(typeof topbarMenu).toBe("string");
    });

    it("topbarMenuNestedList 클래스명이 존재한다", () => {
      expect(topbarMenuNestedList).toBeTruthy();
      expect(typeof topbarMenuNestedList).toBe("string");
    });
  });

  describe("topbarUser 스타일", () => {
    it("topbarUser 클래스명이 존재한다", () => {
      expect(topbarUser).toBeTruthy();
      expect(typeof topbarUser).toBe("string");
    });
  });
});
