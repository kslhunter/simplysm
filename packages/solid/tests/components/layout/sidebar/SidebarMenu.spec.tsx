import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { Router } from "@solidjs/router";
import { Sidebar, type SidebarMenuItem } from "../../../../src";

// Mock pathname signal
import { createSignal } from "solid-js";
const [mockPathname, setMockPathname] = createSignal("/");

// Mock useNavigate and useLocation
const mockNavigate = vi.fn();
vi.mock("@solidjs/router", async () => {
  const actual = await vi.importActual("@solidjs/router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      get pathname() {
        return mockPathname();
      },
    }),
  };
});

// window.open mock
const mockWindowOpen = vi.fn();

describe("SidebarMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockPathname("/"); // pathname 초기화
    vi.spyOn(window, "open").mockImplementation(mockWindowOpen);
    // requestAnimationFrame mock (Collapse 애니메이션용)
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithRouter = (menus: SidebarMenuItem[]) => {
    return render(() => (
      <Router base="" root={(props) => props.children}>
        {[
          {
            path: "*",
            component: () => <Sidebar.Menu menus={menus} />,
          },
        ]}
      </Router>
    ));
  };

  describe("렌더링", () => {
    it("메뉴 아이템을 렌더링", () => {
      const menus: SidebarMenuItem[] = [
        { title: "대시보드", href: "/dashboard" },
        { title: "설정", href: "/settings" },
      ];

      const { getByText } = renderWithRouter(menus);

      expect(getByText("대시보드")).toBeTruthy();
      expect(getByText("설정")).toBeTruthy();
    });

    it("MENU 헤더를 표시", () => {
      const menus: SidebarMenuItem[] = [{ title: "홈", href: "/" }];

      const { getByText } = renderWithRouter(menus);

      expect(getByText("MENU")).toBeTruthy();
    });

    it("중첩 메뉴를 렌더링", () => {
      const menus: SidebarMenuItem[] = [
        {
          title: "설정",
          children: [
            { title: "프로필", href: "/settings/profile" },
            { title: "보안", href: "/settings/security" },
          ],
        },
      ];

      const { getByText } = renderWithRouter(menus);

      expect(getByText("설정")).toBeTruthy();
    });

    it("아이콘이 있는 메뉴를 렌더링", () => {
      const MockIcon = (props: { class?: string }) => (
        <svg data-testid="mock-icon" class={props.class} />
      );

      const menus: SidebarMenuItem[] = [{ title: "대시보드", href: "/dashboard", icon: MockIcon }];

      const { container } = renderWithRouter(menus);

      expect(container.querySelector("[data-testid='mock-icon']")).toBeTruthy();
    });
  });

  describe("링크 동작", () => {
    it("내부 링크 클릭 시 SPA 라우팅", () => {
      const menus: SidebarMenuItem[] = [{ title: "대시보드", href: "/dashboard" }];

      const { getByText } = renderWithRouter(menus);

      fireEvent.click(getByText("대시보드"));

      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("외부 링크 클릭 시 새 탭에서 열기", () => {
      const menus: SidebarMenuItem[] = [{ title: "외부 링크", href: "https://example.com" }];

      const { getByText } = renderWithRouter(menus);

      fireEvent.click(getByText("외부 링크"));

      expect(mockWindowOpen).toHaveBeenCalledWith(
        "https://example.com",
        "_blank",
        "noopener,noreferrer",
      );
    });
  });

  describe("펼침/접힘 동작", () => {
    it("자식 있는 메뉴 클릭 시 펼침 토글", () => {
      const menus: SidebarMenuItem[] = [
        {
          title: "설정",
          children: [{ title: "프로필", href: "/settings/profile" }],
        },
      ];

      const { getByText, container } = renderWithRouter(menus);

      // 초기 상태: 접힘
      const listItem = container.querySelector("[data-list-item]") as HTMLElement;
      expect(listItem.getAttribute("aria-expanded")).toBe("false");

      // 클릭 후: 펼침
      fireEvent.click(getByText("설정"));
      expect(listItem.getAttribute("aria-expanded")).toBe("true");
    });
  });

  describe("pathname 반응성", () => {
    it("pathname과 일치하는 메뉴의 부모가 자동으로 펼쳐짐", () => {
      // 초기 pathname을 중첩 메뉴 경로로 설정
      setMockPathname("/settings/profile");

      const menus: SidebarMenuItem[] = [
        { title: "대시보드", href: "/dashboard" },
        {
          title: "설정",
          children: [
            { title: "프로필", href: "/settings/profile" },
            { title: "보안", href: "/settings/security" },
          ],
        },
      ];

      const { container } = renderWithRouter(menus);

      // "설정" 메뉴가 자동으로 펼쳐져야 함
      const settingsItem = container.querySelectorAll("[data-list-item]")[1] as HTMLElement;
      expect(settingsItem.getAttribute("aria-expanded")).toBe("true");
    });

    it("pathname 변경 시 해당 경로의 부모 메뉴가 펼쳐짐", () => {
      const menus: SidebarMenuItem[] = [
        { title: "대시보드", href: "/dashboard" },
        {
          title: "설정",
          children: [{ title: "프로필", href: "/settings/profile" }],
        },
      ];

      const { container } = renderWithRouter(menus);

      // 초기 상태: 설정 메뉴 접힘
      const settingsItem = container.querySelectorAll("[data-list-item]")[1] as HTMLElement;
      expect(settingsItem.getAttribute("aria-expanded")).toBe("false");

      // pathname 변경
      setMockPathname("/settings/profile");

      // 설정 메뉴가 펼쳐져야 함
      expect(settingsItem.getAttribute("aria-expanded")).toBe("true");
    });
  });

  describe("스타일 병합", () => {
    it("사용자 정의 class가 병합된다", () => {
      const menus: SidebarMenuItem[] = [{ title: "홈", href: "/" }];

      const { container } = render(() => (
        <Router base="" root={(props) => props.children}>
          {[
            {
              path: "*",
              // eslint-disable-next-line tailwindcss/no-custom-classname
              component: () => <Sidebar.Menu menus={menus} class="my-custom-class" />,
            },
          ]}
        </Router>
      ));

      expect(container.querySelector(".my-custom-class")).toBeTruthy();
    });
  });
});
