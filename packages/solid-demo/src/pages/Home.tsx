import { Show, Suspense } from "solid-js";
import type { RouteSectionProps } from "@solidjs/router";
import { Icon, Sidebar, SidebarContainer, SidebarMenu, type SidebarMenuItem, SidebarUser } from "@simplysm/solid";
import { env } from "@simplysm/core-common";
import {
  IconBell,
  IconForms,
  IconHome,
  IconLayoutList,
  IconLayoutSidebar,
  IconPlug,
  IconUser,
  IconWindowMaximize,
} from "@tabler/icons-solidjs";

const menuItems: SidebarMenuItem[] = [
  { title: "메인", href: "/home", icon: IconHome },
  {
    title: "Form Control",
    icon: IconForms,
    children: [
      { title: "Button", href: "/home/form-control/button" },
      { title: "Select", href: "/home/form-control/select" },
    ],
  },
  {
    title: "Layout",
    icon: IconLayoutSidebar,
    children: [
      { title: "Collapse", href: "/home/layout/collapse" },
      { title: "Sidebar", href: "/home/layout/sidebar" },
      { title: "Topbar", href: "/home/layout/topbar" },
    ],
  },
  {
    title: "Data",
    icon: IconLayoutList,
    children: [{ title: "List", href: "/home/data/list" }],
  },
  {
    title: "Overlay",
    icon: IconWindowMaximize,
    children: [{ title: "Dropdown", href: "/home/overlay/dropdown" }],
  },
  {
    title: "Feedback",
    icon: IconBell,
    children: [{ title: "Notification", href: "/home/feedback/notification" }],
  },
  {
    title: "Service",
    icon: IconPlug,
    children: [{ title: "ServiceClient", href: "/home/service/client" }],
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
          <div class="relative flex flex-1 items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-full bg-primary-500 text-white">
              <Icon icon={IconUser} class="size-6" />
            </div>
            <div class="flex flex-col">
              <span class="font-semibold">홍길동</span>
              <span class="text-sm text-gray-500">hong@example.com</span>
            </div>
          </div>
        </SidebarUser>
        <SidebarMenu menus={menuItems} />
        <Show when={env.VER}>
          <div class="pointer-events-none absolute bottom-0 left-0 px-2 py-1 text-sm text-black/30 dark:text-white/30">
            v{env.VER}
            <Show when={env.DEV}>_dev</Show>
          </div>
        </Show>
      </Sidebar>
      <main class="h-full overflow-auto">
        <Suspense fallback={<div>로딩 중...</div>}>{props.children}</Suspense>
      </main>
    </SidebarContainer>
  );
}
