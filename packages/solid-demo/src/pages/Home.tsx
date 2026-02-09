import { Show, Suspense } from "solid-js";
import type { RouteSectionProps } from "@solidjs/router";
import { Icon, Sidebar, type SidebarMenuItem, ThemeToggle } from "@simplysm/solid";
import { env } from "@simplysm/core-common";
import {
  IconBell,
  IconCards,
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
      { title: "Field", href: "/home/form-control/field" },
      { title: "ThemeToggle", href: "/home/form-control/theme-toggle" },
      { title: "CheckBox & Radio", href: "/home/form-control/checkbox-radio" },
      { title: "CheckBoxGroup & RadioGroup", href: "/home/form-control/checkbox-radio-group" },
      { title: "DateRangePicker", href: "/home/form-control/date-range-picker" },
      { title: "RichTextEditor", href: "/home/form-control/rich-text-editor" },
      { title: "Numpad", href: "/home/form-control/numpad" },
      { title: "StatePreset", href: "/home/form-control/state-preset" },
    ],
  },
  {
    title: "Layout",
    icon: IconLayoutSidebar,
    children: [
      { title: "Sidebar", href: "/home/layout/sidebar" },
      { title: "Topbar", href: "/home/layout/topbar" },
      { title: "FormGroup", href: "/home/layout/form-group" },
      { title: "FormTable", href: "/home/layout/form-table" },
    ],
  },
  {
    title: "Data",
    icon: IconLayoutList,
    children: [
      { title: "List", href: "/home/data/list" },
      { title: "Table", href: "/home/data/table" },
      { title: "Pagination", href: "/home/data/pagination" },
      { title: "Sheet", href: "/home/data/sheet" },
      { title: "Sheet (Full)", href: "/home/data/sheet-full" },
      { title: "Kanban", href: "/home/data/kanban" },
    ],
  },
  {
    title: "Disclosure",
    icon: IconWindowMaximize,
    children: [
      { title: "Collapse", href: "/home/disclosure/collapse" },
      { title: "Dropdown", href: "/home/disclosure/dropdown" },
      { title: "Modal", href: "/home/disclosure/modal" },
    ],
  },
  {
    title: "Navigation",
    icon: IconLayoutSidebar,
    children: [
      { title: "Tab", href: "/home/navigation/tab" },
    ],
  },
  {
    title: "Display",
    icon: IconCards,
    children: [
      { title: "Card", href: "/home/display/card" },
      { title: "Icon", href: "/home/display/icon" },
      { title: "Label", href: "/home/display/label" },
      { title: "Note", href: "/home/display/note" },
      { title: "Barcode", href: "/home/display/barcode" },
    ],
  },
  {
    title: "Feedback",
    icon: IconBell,
    children: [
      { title: "Notification", href: "/home/feedback/notification" },
      { title: "Busy", href: "/home/feedback/busy" },
    ],
  },
  {
    title: "Service",
    icon: IconPlug,
    children: [{ title: "ServiceClient", href: "/home/service/client" }],
  },
];

export function Home(props: RouteSectionProps) {
  return (
    <Sidebar.Container>
      <Sidebar>
        <div class="flex items-center justify-between p-2 px-4">
          <img src="logo-landscape.png" alt="SIMPLYSM" class="h-9 w-auto" />
          <ThemeToggle size="sm" />
        </div>
        <Sidebar.User
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
              <span class="text-sm text-base-500 dark:text-base-400">hong@example.com</span>
            </div>
          </div>
        </Sidebar.User>
        <Sidebar.Menu menus={menuItems} />
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
    </Sidebar.Container>
  );
}
