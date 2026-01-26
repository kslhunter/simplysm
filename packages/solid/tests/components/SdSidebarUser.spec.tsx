import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { SdSidebarUser, type SdSidebarUserMenu } from "../../src/components/SdSidebarUser";

describe("SdSidebarUser", () => {
  beforeEach(() => {
    // ResizeObserver mock
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );

    // MutationObserver mock
    vi.stubGlobal(
      "MutationObserver",
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("기본 렌더링", () => {
    const { container } = render(() => <SdSidebarUser>사용자 정보</SdSidebarUser>);
    const userArea = container.firstChild as HTMLElement;

    expect(userArea).toBeDefined();
    expect(userArea.textContent).toContain("사용자 정보");
  });

  it("기본 스타일 적용", () => {
    const { container } = render(() => <SdSidebarUser>사용자 정보</SdSidebarUser>);
    const userArea = container.firstChild as HTMLElement;

    expect(userArea.className).toContain("block");
  });

  it("children 렌더링", () => {
    const { getByTestId } = render(() => (
      <SdSidebarUser>
        <div data-testid="user-info">홍길동</div>
      </SdSidebarUser>
    ));

    expect(getByTestId("user-info").textContent).toBe("홍길동");
  });

  it("userMenu 없을 때 메뉴 버튼 숨김", () => {
    const { container } = render(() => <SdSidebarUser>사용자 정보</SdSidebarUser>);
    const menuButton = container.querySelector("[role='button']");

    expect(menuButton).toBeNull();
  });

  it("userMenu 있을 때 메뉴 버튼 표시", () => {
    const userMenu: SdSidebarUserMenu = {
      title: "메뉴",
      menus: [{ title: "로그아웃", onClick: vi.fn() }],
    };

    const { container } = render(() => <SdSidebarUser userMenu={userMenu}>사용자 정보</SdSidebarUser>);
    const menuButton = container.querySelector("[role='button']");

    expect(menuButton).not.toBeNull();
    expect(menuButton?.textContent).toContain("메뉴");
  });

  it("메뉴 버튼 클릭시 드롭다운 토글", () => {
    const userMenu: SdSidebarUserMenu = {
      title: "메뉴",
      menus: [{ title: "로그아웃", onClick: vi.fn() }],
    };

    const { container } = render(() => <SdSidebarUser userMenu={userMenu}>사용자 정보</SdSidebarUser>);
    const menuButton = container.querySelector("[role='button']")!;

    expect(menuButton.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(menuButton);
    expect(menuButton.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(menuButton);
    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
  });

  it("메뉴 아이템 클릭시 onClick 호출", () => {
    const handleLogout = vi.fn();
    const userMenu: SdSidebarUserMenu = {
      title: "메뉴",
      menus: [{ title: "로그아웃", onClick: handleLogout }],
    };

    const { container, getByText } = render(() => <SdSidebarUser userMenu={userMenu}>사용자 정보</SdSidebarUser>);
    const menuButton = container.querySelector("[role='button']")!;

    fireEvent.click(menuButton); // 드롭다운 열기
    fireEvent.click(getByText("로그아웃"));

    expect(handleLogout).toHaveBeenCalledTimes(1);
  });

  it("키보드 접근성 - Enter 키로 메뉴 토글", () => {
    const userMenu: SdSidebarUserMenu = {
      title: "메뉴",
      menus: [{ title: "로그아웃", onClick: vi.fn() }],
    };

    const { container } = render(() => <SdSidebarUser userMenu={userMenu}>사용자 정보</SdSidebarUser>);
    const menuButton = container.querySelector("[role='button']")!;

    fireEvent.keyDown(menuButton, { key: "Enter" });
    expect(menuButton.getAttribute("aria-expanded")).toBe("true");
  });

  it("키보드 접근성 - Space 키로 메뉴 토글", () => {
    const userMenu: SdSidebarUserMenu = {
      title: "메뉴",
      menus: [{ title: "로그아웃", onClick: vi.fn() }],
    };

    const { container } = render(() => <SdSidebarUser userMenu={userMenu}>사용자 정보</SdSidebarUser>);
    const menuButton = container.querySelector("[role='button']")!;

    fireEvent.keyDown(menuButton, { key: " " });
    expect(menuButton.getAttribute("aria-expanded")).toBe("true");
  });

  it("tabindex 설정", () => {
    const userMenu: SdSidebarUserMenu = {
      title: "메뉴",
      menus: [{ title: "로그아웃", onClick: vi.fn() }],
    };

    const { container } = render(() => <SdSidebarUser userMenu={userMenu}>사용자 정보</SdSidebarUser>);
    const menuButton = container.querySelector("[role='button']")!;

    expect(menuButton.getAttribute("tabindex")).toBe("0");
  });

  it("커스텀 class 병합", () => {
    const { container } = render(() => <SdSidebarUser class="custom-class">사용자 정보</SdSidebarUser>);
    const userArea = container.firstChild as HTMLElement;

    expect(userArea.className).toContain("custom-class");
    expect(userArea.className).toContain("block");
  });

  it("추가 props 전달", () => {
    const { container } = render(() => (
      <SdSidebarUser data-custom="value">
        사용자 정보
      </SdSidebarUser>
    ));
    const userArea = container.firstChild as HTMLElement;

    expect(userArea.getAttribute("data-custom")).toBe("value");
  });

  it("여러 메뉴 아이템 렌더링", () => {
    const userMenu: SdSidebarUserMenu = {
      title: "메뉴",
      menus: [
        { title: "프로필", onClick: vi.fn() },
        { title: "설정", onClick: vi.fn() },
        { title: "로그아웃", onClick: vi.fn() },
      ],
    };

    const { container, getByText } = render(() => <SdSidebarUser userMenu={userMenu}>사용자 정보</SdSidebarUser>);
    const menuButton = container.querySelector("[role='button']")!;

    fireEvent.click(menuButton); // 드롭다운 열기

    expect(getByText("프로필")).toBeDefined();
    expect(getByText("설정")).toBeDefined();
    expect(getByText("로그아웃")).toBeDefined();
  });
});
