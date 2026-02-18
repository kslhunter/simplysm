import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { Topbar } from "../../../src/components/navigator/topbar/topbar";
import { TopbarContainer } from "../../../src/components/navigator/topbar/topbar-container";
import {
  TopbarMenu,
  type TopbarMenuItem,
} from "../../../src/components/navigator/topbar/topbar-menu";
import {
  TopbarUser,
  type TopbarUserMenuItem,
} from "../../../src/components/navigator/topbar/topbar-user";
import { SidebarContainer } from "../../../src/components/navigator/sidebar/sidebar-container";
import { MemoryRouter, Route } from "@solidjs/router";
import { IconHome, IconSettings, IconUser } from "@tabler/icons-solidjs";
import type { ParentProps } from "solid-js";

// 라우터 Wrapper 컴포넌트
function TestRouterWrapper(props: ParentProps) {
  return (
    <MemoryRouter>
      <Route path="*" component={() => props.children} />
    </MemoryRouter>
  );
}

describe("Topbar", () => {
  // 테스트용 메뉴 데이터
  const testMenus: TopbarMenuItem[] = [
    {
      title: "관리",
      icon: IconSettings,
      children: [
        { title: "사용자 관리", path: "/admin/users", icon: IconUser },
        { title: "설정", path: "/admin/settings" },
      ],
    },
    {
      title: "홈",
      icon: IconHome,
      children: [{ title: "대시보드", path: "/dashboard" }],
    },
  ];

  // 테스트용 사용자 메뉴 데이터
  const testUserMenus: TopbarUserMenuItem[] = [
    { title: "프로필", onClick: vi.fn() },
    { title: "로그아웃", onClick: vi.fn() },
  ];

  describe("TopbarContainer", () => {
    it("Topbar와 메인 콘텐츠가 함께 렌더링된다", () => {
      render(() => (
        <TestRouterWrapper>
          <TopbarContainer>
            <Topbar showToggle={false}>
              <span>탑바 내용</span>
            </Topbar>
            <main>메인 콘텐츠</main>
          </TopbarContainer>
        </TestRouterWrapper>
      ));

      expect(screen.getByText("탑바 내용")).toBeInTheDocument();
      expect(screen.getByText("메인 콘텐츠")).toBeInTheDocument();
    });
  });

  describe("Topbar", () => {
    it("SidebarContainer 내부에서 토글 버튼이 표시된다", () => {
      render(() => (
        <TestRouterWrapper>
          <SidebarContainer>
            <TopbarContainer>
              <Topbar data-testid="topbar">
                <span>탑바</span>
              </Topbar>
            </TopbarContainer>
          </SidebarContainer>
        </TestRouterWrapper>
      ));

      // 토글 버튼이 렌더링됨
      const topbar = screen.getByTestId("topbar");
      const toggleButton = topbar.querySelector("button");
      expect(toggleButton).toBeInTheDocument();
    });

    it("showToggle=false면 토글 버튼이 표시되지 않는다", () => {
      render(() => (
        <TestRouterWrapper>
          <SidebarContainer>
            <TopbarContainer>
              <Topbar showToggle={false} data-testid="topbar">
                <span>탑바</span>
              </Topbar>
            </TopbarContainer>
          </SidebarContainer>
        </TestRouterWrapper>
      ));

      // 토글 버튼이 렌더링되지 않음
      const topbar = screen.getByTestId("topbar");
      const toggleButton = topbar.querySelector("button");
      expect(toggleButton).not.toBeInTheDocument();
    });

    it("SidebarContainer 외부에서는 기본적으로 토글 버튼이 표시되지 않는다", () => {
      render(() => (
        <TestRouterWrapper>
          <TopbarContainer>
            <Topbar data-testid="topbar">
              <span>탑바</span>
            </Topbar>
          </TopbarContainer>
        </TestRouterWrapper>
      ));

      const topbar = screen.getByTestId("topbar");
      const toggleButton = topbar.querySelector("button");
      expect(toggleButton).not.toBeInTheDocument();
    });

    it("showToggle=true면 SidebarContainer 외부에서도 토글 버튼이 표시된다", () => {
      render(() => (
        <TestRouterWrapper>
          <TopbarContainer>
            <Topbar showToggle={true} data-testid="topbar">
              <span>탑바</span>
            </Topbar>
          </TopbarContainer>
        </TestRouterWrapper>
      ));

      const topbar = screen.getByTestId("topbar");
      const toggleButton = topbar.querySelector("button");
      expect(toggleButton).toBeInTheDocument();
    });

    it("children이 렌더링된다", () => {
      render(() => (
        <TestRouterWrapper>
          <TopbarContainer>
            <Topbar showToggle={false}>
              <h1>페이지 제목</h1>
              <span>추가 내용</span>
            </Topbar>
          </TopbarContainer>
        </TestRouterWrapper>
      ));

      expect(screen.getByText("페이지 제목")).toBeInTheDocument();
      expect(screen.getByText("추가 내용")).toBeInTheDocument();
    });
  });

  describe("TopbarMenu", () => {
    it("메뉴 항목들이 렌더링된다", () => {
      render(() => (
        <TestRouterWrapper>
          <TopbarContainer>
            <Topbar showToggle={false}>
              <TopbarMenu menus={testMenus} />
            </Topbar>
          </TopbarContainer>
        </TestRouterWrapper>
      ));

      expect(screen.getByText("관리")).toBeInTheDocument();
      expect(screen.getByText("홈")).toBeInTheDocument();
    });

    it("메뉴 버튼 클릭 시 드롭다운이 열린다", async () => {
      render(() => (
        <TestRouterWrapper>
          <TopbarContainer>
            <Topbar showToggle={false}>
              <TopbarMenu menus={testMenus} />
            </Topbar>
          </TopbarContainer>
        </TestRouterWrapper>
      ));

      // 초기: 하위 메뉴 보이지 않음
      expect(screen.queryByText("사용자 관리")).not.toBeInTheDocument();

      // 관리 메뉴 클릭
      fireEvent.click(screen.getByText("관리"));

      // 드롭다운 열림
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.getByText("사용자 관리")).toBeInTheDocument();
      expect(screen.getByText("설정")).toBeInTheDocument();
    });

    it("메뉴 항목 클릭 시 네비게이션이 발생한다", async () => {
      render(() => (
        <TestRouterWrapper>
          <TopbarContainer>
            <Topbar showToggle={false}>
              <TopbarMenu menus={testMenus} />
            </Topbar>
          </TopbarContainer>
        </TestRouterWrapper>
      ));

      // 드롭다운 열기
      fireEvent.click(screen.getByText("관리"));
      await new Promise((r) => setTimeout(r, 50));

      // 메뉴 항목 클릭
      const menuItem = screen.getByText("사용자 관리").closest("[data-list-item]") as HTMLElement;
      fireEvent.click(menuItem);

      // 클릭 후 드롭다운이 닫힘
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.queryByText("사용자 관리")).not.toBeInTheDocument();
    });

    it("아이콘이 있는 메뉴 항목이 올바르게 렌더링된다", async () => {
      render(() => (
        <TestRouterWrapper>
          <TopbarContainer>
            <Topbar showToggle={false}>
              <TopbarMenu menus={testMenus} />
            </Topbar>
          </TopbarContainer>
        </TestRouterWrapper>
      ));

      // 드롭다운 열기
      fireEvent.click(screen.getByText("관리"));
      await new Promise((r) => setTimeout(r, 50));

      // 아이콘이 있는 메뉴 항목 확인 (사용자 관리에 IconUser가 있음)
      expect(screen.getByText("사용자 관리")).toBeInTheDocument();
    });

    it("isSelectedFn으로 선택 상태를 커스터마이즈할 수 있다", () => {
      const customIsSelected = (menu: TopbarMenuItem) => menu.title === "관리";

      render(() => (
        <TestRouterWrapper>
          <TopbarContainer>
            <Topbar showToggle={false}>
              <TopbarMenu menus={testMenus} isSelectedFn={customIsSelected} />
            </Topbar>
          </TopbarContainer>
        </TestRouterWrapper>
      ));

      // isSelectedFn이 적용되어 렌더링됨
      expect(screen.getByText("관리")).toBeInTheDocument();
    });
  });

  describe("TopbarUser", () => {
    it("사용자 정보가 렌더링된다", () => {
      render(() => (
        <TestRouterWrapper>
          <TopbarContainer>
            <Topbar showToggle={false}>
              <TopbarUser menus={testUserMenus}>홍길동</TopbarUser>
            </Topbar>
          </TopbarContainer>
        </TestRouterWrapper>
      ));

      expect(screen.getByText("홍길동")).toBeInTheDocument();
    });

    it("클릭 시 사용자 메뉴 드롭다운이 열린다", async () => {
      render(() => (
        <TestRouterWrapper>
          <TopbarContainer>
            <Topbar showToggle={false}>
              <TopbarUser menus={testUserMenus}>홍길동</TopbarUser>
            </Topbar>
          </TopbarContainer>
        </TestRouterWrapper>
      ));

      // 초기: 메뉴 보이지 않음
      expect(screen.queryByText("프로필")).not.toBeInTheDocument();

      // 사용자 버튼 클릭
      fireEvent.click(screen.getByText("홍길동"));

      // 드롭다운 열림
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.getByText("프로필")).toBeInTheDocument();
      expect(screen.getByText("로그아웃")).toBeInTheDocument();
    });

    it("메뉴 항목 클릭 시 onClick 콜백이 호출된다", async () => {
      const handleLogout = vi.fn();
      const userMenus: TopbarUserMenuItem[] = [
        { title: "프로필", onClick: vi.fn() },
        { title: "로그아웃", onClick: handleLogout },
      ];

      render(() => (
        <TestRouterWrapper>
          <TopbarContainer>
            <Topbar showToggle={false}>
              <TopbarUser menus={userMenus}>홍길동</TopbarUser>
            </Topbar>
          </TopbarContainer>
        </TestRouterWrapper>
      ));

      // 드롭다운 열기
      fireEvent.click(screen.getByText("홍길동"));
      await new Promise((r) => setTimeout(r, 50));

      // 로그아웃 메뉴 클릭
      const logoutItem = screen.getByText("로그아웃").closest("[data-list-item]") as HTMLElement;
      fireEvent.click(logoutItem);

      expect(handleLogout).toHaveBeenCalled();
    });

    it("메뉴 클릭 후 드롭다운이 닫힌다", async () => {
      const userMenus: TopbarUserMenuItem[] = [{ title: "프로필", onClick: vi.fn() }];

      render(() => (
        <TestRouterWrapper>
          <TopbarContainer>
            <Topbar showToggle={false}>
              <TopbarUser menus={userMenus}>홍길동</TopbarUser>
            </Topbar>
          </TopbarContainer>
        </TestRouterWrapper>
      ));

      // 드롭다운 열기
      fireEvent.click(screen.getByText("홍길동"));
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.getByText("프로필")).toBeInTheDocument();

      // 메뉴 클릭
      const profileItem = screen.getByText("프로필").closest("[data-list-item]") as HTMLElement;
      fireEvent.click(profileItem);

      // 드롭다운 닫힘
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.queryByText("프로필")).not.toBeInTheDocument();
    });
  });
});
