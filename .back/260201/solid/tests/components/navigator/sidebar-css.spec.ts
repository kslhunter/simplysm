import { describe, it, expect } from "vitest";
import { sidebar } from "../../../src/components/navigator/sidebar/sidebar.css";
import {
  sidebarContainer,
  sidebarBackdrop,
} from "../../../src/components/navigator/sidebar/sidebar-container.css";
import {
  sidebarMenu,
  sidebarMenuHeader,
} from "../../../src/components/navigator/sidebar/sidebar-menu.css";
import {
  sidebarUser,
  sidebarUserContent,
} from "../../../src/components/navigator/sidebar/sidebar-user.css";

describe("sidebar CSS", () => {
  describe("sidebar recipe", () => {
    it("toggled=true 상태의 클래스명을 생성한다", () => {
      const className = sidebar({ toggled: true });
      expect(className).toBeTruthy();
      expect(typeof className).toBe("string");
    });

    it("toggled=false 상태의 클래스명을 생성한다", () => {
      const className = sidebar({ toggled: false });
      expect(className).toBeTruthy();
      expect(typeof className).toBe("string");
    });

    it("toggled=true와 toggled=false는 다른 클래스명을 생성한다", () => {
      const toggledClass = sidebar({ toggled: true });
      const defaultClass = sidebar({ toggled: false });
      expect(toggledClass).not.toBe(defaultClass);
    });

    it("기본값은 toggled=false이다", () => {
      const defaultClass = sidebar({});
      const notToggledClass = sidebar({ toggled: false });
      expect(defaultClass).toBe(notToggledClass);
    });
  });

  describe("sidebarContainer recipe", () => {
    it("클래스명을 생성한다", () => {
      const className = sidebarContainer();
      expect(className).toBeTruthy();
      expect(typeof className).toBe("string");
    });
  });

  describe("sidebarBackdrop recipe", () => {
    it("toggled=true 상태의 클래스명을 생성한다", () => {
      const className = sidebarBackdrop({ toggled: true });
      expect(className).toBeTruthy();
    });

    it("toggled=false 상태의 클래스명을 생성한다", () => {
      const className = sidebarBackdrop({ toggled: false });
      expect(className).toBeTruthy();
    });
  });

  describe("sidebarMenu 스타일", () => {
    it("sidebarMenu 클래스명이 존재한다", () => {
      expect(sidebarMenu).toBeTruthy();
      expect(typeof sidebarMenu).toBe("string");
    });

    it("sidebarMenuHeader 클래스명이 존재한다", () => {
      expect(sidebarMenuHeader).toBeTruthy();
      expect(typeof sidebarMenuHeader).toBe("string");
    });
  });

  describe("sidebarUser 스타일", () => {
    it("sidebarUser 클래스명이 존재한다", () => {
      expect(sidebarUser).toBeTruthy();
      expect(typeof sidebarUser).toBe("string");
    });

    it("sidebarUserContent 클래스명이 존재한다", () => {
      expect(sidebarUserContent).toBeTruthy();
      expect(typeof sidebarUserContent).toBe("string");
    });
  });

  describe("멱등성", () => {
    it("같은 toggled 값에 대해 같은 클래스명을 반환한다", () => {
      expect(sidebar({ toggled: true })).toBe(sidebar({ toggled: true }));
      expect(sidebar({ toggled: false })).toBe(sidebar({ toggled: false }));
    });

    it("sidebarContainer도 같은 호출에 대해 같은 클래스명을 반환한다", () => {
      expect(sidebarContainer()).toBe(sidebarContainer());
    });
  });
});
