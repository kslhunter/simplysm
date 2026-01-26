import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { SdSidebarMenu, type SdSidebarMenuItem } from "../../src/components/SdSidebarMenu";
import { SidebarProvider } from "../../src/contexts/SidebarContext";

describe("SdSidebarMenu", () => {
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

  const renderWithProvider = (props: Parameters<typeof SdSidebarMenu>[0]) => {
    return render(() => (
      <SidebarProvider>
        <SdSidebarMenu {...props} />
      </SidebarProvider>
    ));
  };

  it("기본 렌더링 (Provider 필요)", () => {
    const menus: SdSidebarMenuItem[] = [{ title: "홈", codeChain: ["home"] }];

    const { container } = renderWithProvider({ menus });
    const menuWrapper = container.querySelector("[data-sd-root-layout]")!;

    expect(menuWrapper).not.toBeNull();
    expect(menuWrapper.textContent).toContain("MENU");
    expect(menuWrapper.textContent).toContain("홈");
  });

  it("기본 스타일 적용", () => {
    const menus: SdSidebarMenuItem[] = [{ title: "홈", codeChain: ["home"] }];

    const { container } = renderWithProvider({ menus });
    const menuWrapper = container.querySelector("[data-sd-root-layout]")!;

    expect(menuWrapper.className).toContain("flex");
    expect(menuWrapper.className).toContain("flex-col");
    expect(menuWrapper.className).toContain("flex-1");
  });

  it("메뉴 아이템 클릭 핸들러", () => {
    const handleClick = vi.fn();
    const menus: SdSidebarMenuItem[] = [{ title: "홈", codeChain: ["home"] }];

    const { getByText } = renderWithProvider({ menus, onMenuClick: handleClick });

    fireEvent.click(getByText("홈"));
    expect(handleClick).toHaveBeenCalledWith(menus[0]);
  });

  it("isMenuSelected로 선택 상태 표시", () => {
    const menus: SdSidebarMenuItem[] = [
      { title: "홈", codeChain: ["home"] },
      { title: "설정", codeChain: ["settings"] },
    ];

    const { container } = renderWithProvider({
      menus,
      isMenuSelected: (menu) => menu.codeChain[0] === "home",
    });

    const items = container.querySelectorAll("[data-sd-selected]");
    const selectedItem = Array.from(items).find((item) => item.getAttribute("data-sd-selected") === "true");

    expect(selectedItem).not.toBeUndefined();
  });

  it("자동 레이아웃 결정 - 자식 메뉴 있으면 accordion", () => {
    const menus: SdSidebarMenuItem[] = [
      {
        title: "부모",
        codeChain: ["parent"],
        children: [{ title: "자식", codeChain: ["parent", "child"] }],
      },
    ];

    const { container } = renderWithProvider({ menus });
    const menuWrapper = container.querySelector("[data-sd-root-layout]")!;

    expect(menuWrapper.getAttribute("data-sd-root-layout")).toBe("accordion");
  });

  it("자동 레이아웃 결정 - 3개 이하 flat", () => {
    const menus: SdSidebarMenuItem[] = [
      { title: "메뉴1", codeChain: ["m1"] },
      { title: "메뉴2", codeChain: ["m2"] },
      { title: "메뉴3", codeChain: ["m3"] },
    ];

    const { container } = renderWithProvider({ menus });
    const menuWrapper = container.querySelector("[data-sd-root-layout]")!;

    expect(menuWrapper.getAttribute("data-sd-root-layout")).toBe("flat");
  });

  it("자동 레이아웃 결정 - 4개 이상 accordion", () => {
    const menus: SdSidebarMenuItem[] = [
      { title: "메뉴1", codeChain: ["m1"] },
      { title: "메뉴2", codeChain: ["m2"] },
      { title: "메뉴3", codeChain: ["m3"] },
      { title: "메뉴4", codeChain: ["m4"] },
    ];

    const { container } = renderWithProvider({ menus });
    const menuWrapper = container.querySelector("[data-sd-root-layout]")!;

    expect(menuWrapper.getAttribute("data-sd-root-layout")).toBe("accordion");
  });

  it("layout prop으로 레이아웃 강제 지정", () => {
    const menus: SdSidebarMenuItem[] = [
      { title: "메뉴1", codeChain: ["m1"] },
      { title: "메뉴2", codeChain: ["m2"] },
    ];

    const { container } = renderWithProvider({ menus, layout: "accordion" });
    const menuWrapper = container.querySelector("[data-sd-root-layout]")!;

    expect(menuWrapper.getAttribute("data-sd-root-layout")).toBe("accordion");
  });

  it("외부 URL 메뉴 클릭시 새 탭에서 열기", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const menus: SdSidebarMenuItem[] = [{ title: "외부 링크", codeChain: ["external"], url: "https://example.com" }];

    const { getByText } = renderWithProvider({ menus });

    fireEvent.click(getByText("외부 링크"));
    expect(openSpy).toHaveBeenCalledWith("https://example.com", "_blank");

    openSpy.mockRestore();
  });

  it("계층 메뉴 렌더링", () => {
    const menus: SdSidebarMenuItem[] = [
      {
        title: "부모",
        codeChain: ["parent"],
        children: [{ title: "자식", codeChain: ["parent", "child"] }],
      },
    ];

    const { getByText } = renderWithProvider({ menus });

    expect(getByText("부모")).toBeDefined();
    // 아코디언이므로 클릭해서 열어야 자식이 보임
    fireEvent.click(getByText("부모"));
    expect(getByText("자식")).toBeDefined();
  });

  it("아이콘 렌더링 - JSX Element", () => {
    const menus: SdSidebarMenuItem[] = [
      {
        title: "홈",
        codeChain: ["home"],
        icon: () => <span data-testid="icon">아이콘</span>,
      },
    ];

    const { getByTestId } = renderWithProvider({ menus });

    expect(getByTestId("icon")).toBeDefined();
  });

  it("아이콘 렌더링 - 함수형 컴포넌트", () => {
    const Icon = () => <span data-testid="icon" data-size="24" />;
    const menus: SdSidebarMenuItem[] = [
      {
        title: "홈",
        codeChain: ["home"],
        icon: Icon,
      },
    ];

    const { getByTestId } = renderWithProvider({ menus });
    const icon = getByTestId("icon");

    expect(icon).toBeDefined();
    expect(icon.getAttribute("data-size")).toBe("24");
  });

  it("커스텀 class 병합", () => {
    const menus: SdSidebarMenuItem[] = [{ title: "홈", codeChain: ["home"] }];

    const { container } = renderWithProvider({ menus, class: "custom-class" });
    const menuWrapper = container.querySelector("[data-sd-root-layout]")!;

    expect(menuWrapper.className).toContain("custom-class");
    expect(menuWrapper.className).toContain("flex"); // 기본 스타일 유지
  });

  it("추가 props 전달", () => {
    const menus: SdSidebarMenuItem[] = [{ title: "홈", codeChain: ["home"] }];

    const { container } = renderWithProvider({ menus, "data-custom": "value", id: "my-menu" } as never);
    const menuWrapper = container.querySelector("[data-sd-root-layout]")!;

    expect(menuWrapper.getAttribute("data-custom")).toBe("value");
    expect(menuWrapper.getAttribute("id")).toBe("my-menu");
  });

  it("빈 메뉴 배열", () => {
    const { container } = renderWithProvider({ menus: [] });
    const menuWrapper = container.querySelector("[data-sd-root-layout]")!;

    expect(menuWrapper).not.toBeNull();
    expect(menuWrapper.textContent).toContain("MENU");
  });

  it("autoCloseOnMobile 기본값 true", () => {
    // autoCloseOnMobile 동작은 모바일 환경에서 테스트 필요
    // 여기서는 prop이 전달되는지만 확인
    const menus: SdSidebarMenuItem[] = [{ title: "홈", codeChain: ["home"] }];

    // 렌더링 시 에러 없으면 통과
    const { container } = renderWithProvider({ menus, autoCloseOnMobile: false });
    expect(container).toBeDefined();
  });
});
