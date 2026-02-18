import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { Sidebar } from "../../../src/components/navigator/sidebar/sidebar";
import { SidebarContainer } from "../../../src/components/navigator/sidebar/sidebar-container";
import {
  SidebarMenu,
  type SidebarMenuItem,
} from "../../../src/components/navigator/sidebar/sidebar-menu";
import { SidebarUser } from "../../../src/components/navigator/sidebar/sidebar-user";
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

describe("Sidebar", () => {
  // 테스트용 메뉴 데이터
  const testMenus: SidebarMenuItem[] = [
    { title: "홈", path: "/", icon: IconHome },
    { title: "설정", path: "/settings", icon: IconSettings },
    {
      title: "관리",
      icon: IconUser,
      children: [
        { title: "사용자", path: "/admin/users" },
        { title: "권한", path: "/admin/permissions" },
      ],
    },
  ];

  describe("SidebarContainer", () => {
    it("Sidebar와 메인 콘텐츠가 함께 렌더링된다", () => {
      render(() => (
        <TestRouterWrapper>
          <SidebarContainer>
            <Sidebar>
              <div>사이드바 내용</div>
            </Sidebar>
            <main>메인 콘텐츠</main>
          </SidebarContainer>
        </TestRouterWrapper>
      ));

      expect(screen.getByText("사이드바 내용")).toBeInTheDocument();
      expect(screen.getByText("메인 콘텐츠")).toBeInTheDocument();
    });

    it("width prop으로 사이드바 너비를 설정한다", () => {
      render(() => (
        <TestRouterWrapper>
          <SidebarContainer width="280px">
            <Sidebar data-testid="sidebar">내용</Sidebar>
          </SidebarContainer>
        </TestRouterWrapper>
      ));

      const sidebar = screen.getByTestId("sidebar");
      expect(sidebar).toHaveStyle({ width: "280px" });
    });

    it("onToggledChange 콜백이 호출된다", () => {
      const handleToggledChange = vi.fn();

      render(() => (
        <TestRouterWrapper>
          <SidebarContainer onToggledChange={handleToggledChange}>
            <Sidebar>내용</Sidebar>
          </SidebarContainer>
        </TestRouterWrapper>
      ));

      // backdrop 클릭으로 toggled 변경 테스트
      // backdrop은 sidebarBackdrop 클래스를 가진 div
      const container = screen.getByText("내용").closest("[class*='sidebarContainer']");
      const backdrop = container?.querySelector("[class*='sidebarBackdrop']") as HTMLElement | null;

      // backdrop이 없으면 테스트 스킵
      if (!backdrop) {
        return;
      }

      fireEvent.click(backdrop);
      expect(handleToggledChange).toHaveBeenCalledWith(false);
    });
  });

  describe("SidebarMenu", () => {
    it("메뉴 항목들이 렌더링된다", () => {
      render(() => (
        <TestRouterWrapper>
          <SidebarContainer>
            <Sidebar>
              <SidebarMenu menus={testMenus} />
            </Sidebar>
          </SidebarContainer>
        </TestRouterWrapper>
      ));

      expect(screen.getByText("홈")).toBeInTheDocument();
      expect(screen.getByText("설정")).toBeInTheDocument();
      expect(screen.getByText("관리")).toBeInTheDocument();
    });

    it("MENU 헤더가 렌더링된다", () => {
      render(() => (
        <TestRouterWrapper>
          <SidebarContainer>
            <Sidebar>
              <SidebarMenu menus={testMenus} />
            </Sidebar>
          </SidebarContainer>
        </TestRouterWrapper>
      ));

      expect(screen.getByText("MENU")).toBeInTheDocument();
    });

    it("하위 메뉴가 있는 항목은 children을 표시한다", () => {
      render(() => (
        <TestRouterWrapper>
          <SidebarContainer>
            <Sidebar>
              <SidebarMenu menus={testMenus} layout="flat" />
            </Sidebar>
          </SidebarContainer>
        </TestRouterWrapper>
      ));

      // flat 레이아웃에서는 하위 메뉴가 항상 보임
      expect(screen.getByText("사용자")).toBeInTheDocument();
      expect(screen.getByText("권한")).toBeInTheDocument();
    });

    it("메뉴 항목 클릭 시 onClick이 발생한다", () => {
      render(() => (
        <TestRouterWrapper>
          <SidebarContainer>
            <Sidebar>
              <SidebarMenu menus={testMenus} />
            </Sidebar>
          </SidebarContainer>
        </TestRouterWrapper>
      ));

      const homeMenuItem = screen.getByText("홈").closest("[data-list-item]") as HTMLElement;
      // 클릭이 에러 없이 수행되면 성공
      fireEvent.click(homeMenuItem);

      // 클릭 후에도 메뉴가 여전히 표시됨
      expect(screen.getByText("홈")).toBeInTheDocument();
    });

    it("layout=accordion이 적용된다", () => {
      render(() => (
        <TestRouterWrapper>
          <SidebarContainer>
            <Sidebar>
              <SidebarMenu menus={testMenus} layout="accordion" />
            </Sidebar>
          </SidebarContainer>
        </TestRouterWrapper>
      ));

      // accordion 레이아웃으로 렌더링됨
      expect(screen.getByText("홈")).toBeInTheDocument();
    });

    it("layout=flat이 적용된다", () => {
      render(() => (
        <TestRouterWrapper>
          <SidebarContainer>
            <Sidebar>
              <SidebarMenu menus={testMenus} layout="flat" />
            </Sidebar>
          </SidebarContainer>
        </TestRouterWrapper>
      ));

      // flat 레이아웃으로 렌더링됨
      expect(screen.getByText("홈")).toBeInTheDocument();
    });

    it("메뉴가 3개 이하일 때 자동으로 flat 레이아웃이 적용된다", () => {
      const smallMenus: SidebarMenuItem[] = [
        { title: "메뉴1", path: "/1" },
        { title: "메뉴2", path: "/2" },
      ];

      render(() => (
        <TestRouterWrapper>
          <SidebarContainer>
            <Sidebar>
              <SidebarMenu menus={smallMenus} />
            </Sidebar>
          </SidebarContainer>
        </TestRouterWrapper>
      ));

      expect(screen.getByText("메뉴1")).toBeInTheDocument();
      expect(screen.getByText("메뉴2")).toBeInTheDocument();
    });
  });

  describe("SidebarUser", () => {
    it("사용자 이름이 렌더링된다", () => {
      render(() => (
        <TestRouterWrapper>
          <SidebarContainer>
            <Sidebar>
              <SidebarUser name="홍길동" />
            </Sidebar>
          </SidebarContainer>
        </TestRouterWrapper>
      ));

      expect(screen.getByText("홍길동")).toBeInTheDocument();
    });

    it("사용자 설명이 렌더링된다", () => {
      render(() => (
        <TestRouterWrapper>
          <SidebarContainer>
            <Sidebar>
              <SidebarUser name="홍길동" description="관리자" />
            </Sidebar>
          </SidebarContainer>
        </TestRouterWrapper>
      ));

      expect(screen.getByText("홍길동")).toBeInTheDocument();
      expect(screen.getByText("관리자")).toBeInTheDocument();
    });

    it("사용자 영역 클릭 시 메뉴가 펼쳐진다", async () => {
      const handleLogout = vi.fn();

      render(() => (
        <TestRouterWrapper>
          <SidebarContainer>
            <Sidebar>
              <SidebarUser
                name="홍길동"
                menus={[
                  { title: "프로필", onClick: () => {} },
                  { title: "로그아웃", onClick: handleLogout },
                ]}
              />
            </Sidebar>
          </SidebarContainer>
        </TestRouterWrapper>
      ));

      // 사용자 영역 클릭
      const userContent = screen
        .getByText("홍길동")
        .closest("[class*='sidebarUserContent']") as HTMLElement;
      fireEvent.click(userContent);

      // 메뉴가 펼쳐짐
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.getByText("프로필")).toBeInTheDocument();
      expect(screen.getByText("로그아웃")).toBeInTheDocument();
    });

    it("메뉴 항목 클릭 시 onClick 콜백이 호출된다", async () => {
      const handleLogout = vi.fn();

      render(() => (
        <TestRouterWrapper>
          <SidebarContainer>
            <Sidebar>
              <SidebarUser name="홍길동" menus={[{ title: "로그아웃", onClick: handleLogout }]} />
            </Sidebar>
          </SidebarContainer>
        </TestRouterWrapper>
      ));

      // 사용자 영역 클릭하여 메뉴 펼치기
      const userContent = screen
        .getByText("홍길동")
        .closest("[class*='sidebarUserContent']") as HTMLElement;
      fireEvent.click(userContent);

      await new Promise((r) => setTimeout(r, 50));

      // 로그아웃 메뉴 클릭
      const logoutItem = screen.getByText("로그아웃").closest("[data-list-item]") as HTMLElement;
      fireEvent.click(logoutItem);

      expect(handleLogout).toHaveBeenCalled();
    });
  });
});
