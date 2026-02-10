import { Icon, Sidebar, Topbar, type SidebarMenuItem } from "@simplysm/solid";
import { IconFolder, IconHome, IconSettings, IconUser } from "@tabler/icons-solidjs";

const sampleMenus: SidebarMenuItem[] = [
  { title: "홈", href: "#", icon: IconHome },
  {
    title: "문서",
    icon: IconFolder,
    children: [
      { title: "시작하기", href: "#" },
      { title: "API 참조", href: "#" },
    ],
  },
  { title: "설정", href: "#", icon: IconSettings },
];

export default function MobileLayoutDemoPage() {
  return (
    <div class="h-full bg-white dark:bg-base-900">
      <Sidebar.Container>
        <Sidebar>
          <div class="p-2 px-4 font-bold">LOGO</div>
          <Sidebar.User
            menus={[
              { title: "프로필", onClick: () => alert("프로필") },
              { title: "로그아웃", onClick: () => alert("로그아웃") },
            ]}
          >
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-full bg-primary-500 text-white">
                <Icon icon={IconUser} class="size-6" />
              </div>
              <div class="flex flex-col">
                <span class="font-semibold">홍길동</span>
                <span class="text-sm text-base-500 dark:text-base-400">hong@example.com</span>
              </div>
            </div>
          </Sidebar.User>
          <Sidebar.Menu menus={sampleMenus} />
        </Sidebar>
        <Topbar.Container>
          <Topbar>
            <h1 class="m-0 text-base font-bold">모바일 데모</h1>
            <div class="flex-1" />
            <Topbar.User
              menus={[
                { title: "프로필", onClick: () => alert("프로필") },
                { title: "로그아웃", onClick: () => alert("로그아웃") },
              ]}
            >
              홍길동
            </Topbar.User>
          </Topbar>
          <div class="flex-1 overflow-auto p-4">
            <p class="text-sm text-base-600 dark:text-base-400">햄버거 버튼을 클릭하여 사이드바를 열 수 있습니다.</p>
            <p class="mt-4 text-sm text-base-600 dark:text-base-400">사이드바 외부를 클릭하면 사이드바가 닫힙니다.</p>
          </div>
        </Topbar.Container>
      </Sidebar.Container>
    </div>
  );
}
