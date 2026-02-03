import {
  Sidebar,
  SidebarContainer,
  SidebarMenu,
  SidebarUser,
  Topbar,
  TopbarContainer,
  TopbarMenu,
  TopbarUser,
  type SidebarMenuItem,
  type TopbarMenuItem,
} from "@simplysm/solid";
import {
  IconDashboard,
  IconFile,
  IconFolder,
  IconHome,
  IconSettings,
  IconUser,
  IconUsers,
} from "@tabler/icons-solidjs";

const topbarMenuItems: TopbarMenuItem[] = [
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
      {
        title: "고급 문서",
        children: [
          { title: "아키텍처", href: "/docs/advanced/architecture", icon: IconFile },
          { title: "성능 최적화", href: "/docs/advanced/performance", icon: IconFile },
        ],
      },
    ],
  },
];

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
];

export default function TopbarPage() {
  return (
    <div class="space-y-8">
      <h1 class="mb-4 text-2xl font-bold">Topbar Demo</h1>

      {/* Topbar + Sidebar 조합 */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">Topbar with Sidebar</h2>
        <p class="mb-2 text-sm text-gray-600">
          Topbar와 Sidebar를 조합하여 사용하는 예시입니다. Topbar의 햄버거 버튼으로 사이드바를 토글할 수 있습니다.
        </p>
        <div class="h-96 rounded-lg border border-gray-200">
          <SidebarContainer>
            <TopbarContainer>
              <Topbar>
                <h1 class="text-lg font-bold">앱 이름</h1>
                <TopbarMenu menus={topbarMenuItems} />
                <div class="flex-1" />
                <TopbarUser
                  menus={[
                    { title: "프로필", onClick: () => alert("프로필") },
                    { title: "설정", onClick: () => alert("설정") },
                    { title: "로그아웃", onClick: () => alert("로그아웃") },
                  ]}
                >
                  <div class="flex items-center gap-2">
                    <div class="flex size-8 items-center justify-center rounded-full bg-primary-500 text-white">
                      <IconUser class="size-5" />
                    </div>
                    <span>홍길동</span>
                  </div>
                </TopbarUser>
              </Topbar>
              <main class="flex-1 overflow-auto p-4">
                <div class="rounded border border-gray-200 bg-gray-50 p-4">
                  <p class="text-sm text-gray-600">
                    Topbar의 메뉴를 클릭하면 드롭다운이 표시됩니다. 드롭다운 내의 메뉴를 클릭하면 해당 경로로
                    이동합니다.
                  </p>
                </div>
              </main>
            </TopbarContainer>
            <Sidebar>
              <SidebarUser
                menus={[
                  { title: "프로필", onClick: () => alert("프로필") },
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
          </SidebarContainer>
        </div>
      </section>

      {/* Topbar 단독 사용 */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">Topbar Only (without Sidebar)</h2>
        <p class="mb-2 text-sm text-gray-600">
          Topbar를 단독으로 사용하는 예시입니다. SidebarContainer 없이 사용하면 햄버거 버튼이 표시되지 않습니다.
        </p>
        <div class="h-48 rounded-lg border border-gray-200">
          <TopbarContainer>
            <Topbar>
              <h1 class="text-lg font-bold">앱 이름</h1>
              <TopbarMenu
                menus={[
                  { title: "홈", href: "/home", icon: IconHome },
                  { title: "대시보드", href: "/dashboard", icon: IconDashboard },
                ]}
              />
              <div class="flex-1" />
              <TopbarUser
                menus={[
                  { title: "프로필", onClick: () => alert("프로필") },
                  { title: "로그아웃", onClick: () => alert("로그아웃") },
                ]}
              >
                <span>사용자</span>
              </TopbarUser>
            </Topbar>
            <main class="flex-1 overflow-auto p-4">
              <div class="rounded border border-gray-200 bg-gray-50 p-4">
                <p class="text-sm text-gray-600">Sidebar 없이 Topbar만 사용하는 레이아웃입니다.</p>
              </div>
            </main>
          </TopbarContainer>
        </div>
      </section>
    </div>
  );
}
