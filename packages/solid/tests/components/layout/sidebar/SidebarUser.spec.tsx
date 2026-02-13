import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { Sidebar, type SidebarUserMenu } from "../../../../src";

describe("SidebarUser", () => {
  beforeEach(() => {
    // requestAnimationFrame mock (Collapse 애니메이션용)
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("렌더링", () => {
    it("name prop을 렌더링", () => {
      const { getByText } = render(() => <Sidebar.User name="사용자 이름" />);

      expect(getByText("사용자 이름")).toBeTruthy();
    });

    it("menus가 없을 때 버튼에 aria-expanded 없음", () => {
      const { container } = render(() => <Sidebar.User name="사용자" />);

      const button = container.querySelector("button");
      expect(button?.hasAttribute("aria-expanded")).toBe(false);
    });

    it("menus가 있을 때 버튼에 aria-expanded=false", () => {
      const menus: SidebarUserMenu[] = [{ title: "로그아웃", onClick: () => {} }];

      const { container } = render(() => <Sidebar.User name="사용자" menus={menus} />);

      const button = container.querySelector("button");
      expect(button?.getAttribute("aria-expanded")).toBe("false");
    });
  });

  describe("클릭 동작", () => {
    it("menus가 없을 때 클릭해도 드롭다운이 열리지 않음", () => {
      const { container } = render(() => <Sidebar.User name="사용자" />);

      const button = container.querySelector("button")!;
      fireEvent.click(button);

      // aria-expanded가 없거나 변경되지 않음
      expect(button.hasAttribute("aria-expanded")).toBe(false);
    });

    it("menus가 있을 때 클릭으로 드롭다운 토글", () => {
      const menus: SidebarUserMenu[] = [{ title: "로그아웃", onClick: () => {} }];

      const { container } = render(() => <Sidebar.User name="사용자" menus={menus} />);

      const button = container.querySelector("button")!;

      // 초기 상태: 닫힘
      expect(button.getAttribute("aria-expanded")).toBe("false");

      // 첫 번째 클릭: 열림
      fireEvent.click(button);
      expect(button.getAttribute("aria-expanded")).toBe("true");

      // 두 번째 클릭: 닫힘
      fireEvent.click(button);
      expect(button.getAttribute("aria-expanded")).toBe("false");
    });
  });

  describe("메뉴 아이템 클릭", () => {
    it("메뉴 아이템 클릭 시 onClick 호출", () => {
      const onLogout = vi.fn();
      const menus: SidebarUserMenu[] = [{ title: "로그아웃", onClick: onLogout }];

      const { container, getByText } = render(() => <Sidebar.User name="사용자" menus={menus} />);

      // 드롭다운 열기
      const button = container.querySelector("button")!;
      fireEvent.click(button);

      // 메뉴 아이템 클릭
      fireEvent.click(getByText("로그아웃"));

      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it("메뉴 아이템 클릭 시 드롭다운 닫힘", () => {
      const menus: SidebarUserMenu[] = [{ title: "프로필", onClick: () => {} }];

      const { container, getByText } = render(() => <Sidebar.User name="사용자" menus={menus} />);

      const button = container.querySelector("button")!;

      // 드롭다운 열기
      fireEvent.click(button);
      expect(button.getAttribute("aria-expanded")).toBe("true");

      // 메뉴 아이템 클릭
      fireEvent.click(getByText("프로필"));

      // 드롭다운 닫힘
      expect(button.getAttribute("aria-expanded")).toBe("false");
    });
  });

  describe("menus 유무에 따른 스타일", () => {
    it("menus prop에 따라 스타일이 달라진다", () => {
      const menus: SidebarUserMenu[] = [{ title: "로그아웃", onClick: () => {} }];

      const { container: withoutMenus } = render(() => <Sidebar.User name="사용자" />);
      const { container: withMenus } = render(() => <Sidebar.User name="사용자" menus={menus} />);

      const buttonWithout = withoutMenus.querySelector("button")!;
      const buttonWith = withMenus.querySelector("button")!;

      expect(buttonWithout.className).not.toBe(buttonWith.className);
    });
  });

  describe("스타일 병합", () => {
    it("사용자 정의 class가 병합된다", () => {
      const { container } = render(() => (
        // eslint-disable-next-line tailwindcss/no-custom-classname
        <Sidebar.User name="사용자" class="my-custom-class" />
      ));

      expect(container.querySelector(".my-custom-class")).toBeTruthy();
    });
  });
});
