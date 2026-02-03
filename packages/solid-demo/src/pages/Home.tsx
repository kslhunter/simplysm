import { Suspense } from "solid-js";
import type { RouteSectionProps } from "@solidjs/router";
import {
  Button,
  Sidebar,
  SidebarContainer,
  SidebarMenu,
  type SidebarMenuItem,
  SidebarUser,
  useSidebarContext,
} from "@simplysm/solid";
import {
  IconFold,
  IconHome,
  IconLayoutList,
  IconLayoutSidebar,
  IconMenu2,
  IconSettings,
  IconUser,
} from "@tabler/icons-solidjs";

const SidebarToggleButton = () => {
  const { setToggle } = useSidebarContext();
  return (
    <Button variant="ghost" onClick={() => setToggle((v) => !v)} class="p-2">
      <IconMenu2 class="size-6" />
    </Button>
  );
};

const menuItems: SidebarMenuItem[] = [
  { title: "메인", href: "/home", icon: IconHome },
  {
    title: "Controls",
    icon: IconSettings,
    children: [{ title: "Button", href: "/home/controls/button" }],
  },
  {
    title: "Data",
    icon: IconLayoutList,
    children: [{ title: "List", href: "/home/data/list" }],
  },
  {
    title: "Disclosure",
    icon: IconFold,
    children: [{ title: "Collapse", href: "/home/disclosure/collapse" }],
  },
  {
    title: "Navigation",
    icon: IconLayoutSidebar,
    children: [
      { title: "Sidebar", href: "/home/navigation/sidebar" },
      { title: "Topbar", href: "/home/navigation/topbar" },
    ],
  },
];

export function Home(props: RouteSectionProps) {
  return (
    <SidebarContainer>
      <Sidebar>
        <div class="p-2 px-4">
          <img src="logo-landscape.png" alt="SIMPLYSM" class="h-9 w-auto" />
        </div>
        <SidebarUser
          menus={[
            { title: "설정", onClick: () => alert("설정") },
            { title: "로그아웃", onClick: () => alert("로그아웃") },
          ]}
        >
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-full bg-primary-500 text-white">
              <IconUser class="size-6" />
            </div>
            <div class="flex flex-col">
              <span class="font-semibold">홍길동</span>
              <span class="text-sm text-gray-500">hong@example.com</span>
            </div>
          </div>
        </SidebarUser>
        <SidebarMenu menus={menuItems} />
      </Sidebar>
      <main class="h-full overflow-auto p-4">
        <div class="mb-4">
          <SidebarToggleButton />
        </div>
        <Suspense fallback={<div>로딩 중...</div>}>{props.children}</Suspense>
      </main>
    </SidebarContainer>
  );
}
