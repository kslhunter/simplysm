import { useLocation, useNavigate, type RouteSectionProps } from "@solidjs/router";
import {
  IconHome,
  IconComponents,
  IconSettings,
  IconUser,
} from "@tabler/icons-solidjs";
import {
  SdSidebarContainer,
  SdSidebar,
  SdSidebarMenu,
  SdSidebarUser,
  useTheme,
} from "@simplysm/solid";
import type { SdSidebarMenuItem } from "@simplysm/solid";

export function App(props: RouteSectionProps) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const menus: SdSidebarMenuItem[] = [
    {
      title: "대시보드",
      codeChain: ["dashboard"],
      icon: IconHome,
    },
    {
      title: "컴포넌트",
      codeChain: ["components"],
      icon: IconComponents,
      children: [
        { title: "앵커", codeChain: ["components", "anchor"] },
        { title: "버튼", codeChain: ["components", "button"] },
        { title: "체크박스", codeChain: ["components", "checkbox"] },
        { title: "필드", codeChain: ["components", "fields"] },
        { title: "리스트", codeChain: ["components", "list"] },
      ],
    },
    {
      title: "설정",
      codeChain: ["settings"],
      icon: IconSettings,
    },
  ];

  const userMenu = {
    title: "메뉴",
    menus: [
      {
        title: theme() === "light" ? "다크 모드" : "라이트 모드",
        onClick: toggleTheme,
      },
      {
        title: "로그아웃",
        onClick: () => alert("로그아웃"),
      },
    ],
  };

  const isMenuSelected = (item: SdSidebarMenuItem): boolean => {
    const path = "/" + item.codeChain.join("/");
    const hasChildren = item.children && item.children.length > 0;

    if (hasChildren) {
      // 자식 있는 메뉴는 exact match만
      return location.pathname === path;
    }

    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const onMenuClick = (item: SdSidebarMenuItem) => {
    // 자식이 있는 메뉴는 아코디언만 토글 (네비게이션 안 함)
    if (item.children && item.children.length > 0) {
      return;
    }
    const path = "/" + item.codeChain.join("/");
    navigate(path);
  };

  return (
    <SdSidebarContainer>
      <SdSidebar>
        <SdSidebarUser userMenu={userMenu}>
          <div class="flex items-center gap-3">
            <div class="
              flex size-10 items-center justify-center rounded-full
              bg-primary/20
            ">
              <IconUser size={24} />
            </div>
            <div>
              <div class="font-medium">홍길동</div>
              <div class="text-sm text-text-muted">hong@example.com</div>
            </div>
          </div>
        </SdSidebarUser>
        <SdSidebarMenu
          menus={menus}
          isMenuSelected={isMenuSelected}
          onMenuClick={onMenuClick}
        />
      </SdSidebar>

      <div class="
        h-full flex-1 overflow-auto bg-bg-base text-text-base transition-colors
      ">
        {props.children}
      </div>
    </SdSidebarContainer>
  );
}
