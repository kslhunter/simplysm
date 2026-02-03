import {
  Button,
  Sidebar,
  SidebarContainer,
  SidebarMenu,
  SidebarUser,
  useSidebarContext,
  type SidebarMenuItem,
} from "@simplysm/solid";
import {
  IconDashboard,
  IconFile,
  IconFolder,
  IconHome,
  IconMenu2,
  IconSettings,
  IconUser,
  IconUsers,
} from "@tabler/icons-solidjs";

const sidebarMenuItems: SidebarMenuItem[] = [
  { title: "대시보드", href: "/dashboard", icon: IconDashboard },
  { title: "홈", href: "/home", icon: IconHome },
  {
    title: "사용자 관리",
    icon: IconUsers,
    children: [
      { title: "사용자 목록", href: "/users", icon: IconUser },
      { title: "역할 관리", href: "/roles", icon: IconSettings },
    ],
  },
  {
    title: "문서",
    icon: IconFolder,
    children: [
      { title: "가이드", href: "/docs/guide", icon: IconFile },
      { title: "API 문서", href: "/docs/api", icon: IconFile },
    ],
  },
];

const SidebarToggleButton = () => {
  const { setToggle } = useSidebarContext();
  return (
    <Button variant="ghost" onClick={() => setToggle((v) => !v)} class="p-2">
      <IconMenu2 class="size-6" />
    </Button>
  );
};

export default function SidebarPage() {
  return (
    <div class="space-y-8">
      <h1 class="mb-4 text-2xl font-bold">Sidebar Demo</h1>

      {/* Basic Sidebar */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">Basic Sidebar</h2>
        <p class="mb-2 text-sm text-gray-600">
          토글 버튼을 클릭하여 사이드바를 열고 닫을 수 있습니다. 화면 크기를 640px 미만으로 줄이면 모바일 모드로
          전환됩니다.
        </p>
        <div class="h-96 rounded-lg border border-gray-200">
          <SidebarContainer>
            <Sidebar>
              <SidebarUser
                menus={[
                  { title: "프로필", onClick: () => alert("프로필") },
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
              <SidebarMenu menus={sidebarMenuItems} />
            </Sidebar>
            <main class="h-full overflow-auto p-4">
              <div class="mb-4 flex items-center gap-4">
                <SidebarToggleButton />
                <span class="font-medium">콘텐츠 영역</span>
              </div>
              <div class="rounded border border-gray-200 bg-gray-50 p-4">
                <p class="text-sm text-gray-600">사이드바 메뉴를 클릭하면 해당 경로로 이동합니다.</p>
              </div>
            </main>
          </SidebarContainer>
        </div>
      </section>
    </div>
  );
}
