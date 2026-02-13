import { Button, Icon, Sidebar, Topbar, useSidebarContext, type SidebarMenuItem } from "@simplysm/solid";
import { IconFolder, IconHome, IconMenu2, IconSettings, IconUser } from "@tabler/icons-solidjs";

const sampleMenuItems: SidebarMenuItem[] = [
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

const SidebarToggleButton = () => {
  const { setToggle } = useSidebarContext();
  return (
    <Button variant="ghost" onClick={() => setToggle((v) => !v)}>
      <Icon icon={IconMenu2} class="size-6" />
    </Button>
  );
};

export default function SidebarPage() {
  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Sidebar</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* 1. 기본 Sidebar */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">기본 Sidebar</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              Sidebar + SidebarMenu + SidebarUser 조합. 토글 버튼을 클릭하여 사이드바를 열고 닫을 수 있습니다.
            </p>
            <div class="h-96 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
              <Sidebar.Container>
                <Sidebar>
                  <div class="p-2 px-4 font-bold">LOGO</div>
                  <Sidebar.User
                    menus={[
                      { title: "프로필", onClick: () => alert("프로필") },
                      { title: "설정", onClick: () => alert("설정") },
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
                  <Sidebar.Menu menus={sampleMenuItems} />
                </Sidebar>
                <main class="h-full overflow-auto p-4">
                  <div class="mb-4 flex items-center gap-4">
                    <SidebarToggleButton />
                    <span class="font-medium">콘텐츠 영역</span>
                  </div>
                  <div class="rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                    <p class="text-sm text-base-600 dark:text-base-400">
                      사이드바 메뉴를 클릭하면 해당 경로로 이동합니다.
                    </p>
                  </div>
                </main>
              </Sidebar.Container>
            </div>
          </section>

          {/* 2. Toggled 상태 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">Toggled 상태</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              useSidebarContext().setToggle()을 통해 사이드바 토글 상태를 제어합니다.
            </p>
            <div class="h-96 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
              <Sidebar.Container>
                <Sidebar>
                  <div class="p-2 px-4 font-bold">LOGO</div>
                  <Sidebar.Menu menus={sampleMenuItems} />
                </Sidebar>
                <main class="h-full overflow-auto p-4">
                  <div class="mb-4 flex items-center gap-4">
                    <SidebarToggleButton />
                    <span class="font-medium">토글 버튼으로 상태 제어</span>
                  </div>
                  <div class="rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                    <p class="text-sm text-base-600 dark:text-base-400">
                      토글 버튼을 클릭하면 useSidebarContext().setToggle()이 호출됩니다.
                    </p>
                  </div>
                </main>
              </Sidebar.Container>
            </div>
          </section>

          {/* 3. SidebarUser 변형 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">SidebarUser 변형</h2>
            <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* 없음 */}
              <div>
                <p class="mb-2 text-sm text-base-600 dark:text-base-400">없음</p>
                <div class="h-80 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
                  <Sidebar.Container>
                    <Sidebar>
                      <div class="p-2 px-4 font-bold">LOGO</div>
                      <Sidebar.Menu menus={sampleMenuItems} />
                    </Sidebar>
                    <main class="h-full overflow-auto p-4">
                      <SidebarToggleButton />
                      <div class="mt-4 rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                        <p class="text-sm text-base-600 dark:text-base-400">SidebarUser 없음</p>
                      </div>
                    </main>
                  </Sidebar.Container>
                </div>
              </div>

              {/* 기본 (메뉴 없음) */}
              <div>
                <p class="mb-2 text-sm text-base-600 dark:text-base-400">기본 (메뉴 없음)</p>
                <div class="h-80 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
                  <Sidebar.Container>
                    <Sidebar>
                      <div class="p-2 px-4 font-bold">LOGO</div>
                      <Sidebar.User name="홍길동" description="hong@example.com" />
                      <Sidebar.Menu menus={sampleMenuItems} />
                    </Sidebar>
                    <main class="h-full overflow-auto p-4">
                      <SidebarToggleButton />
                      <div class="mt-4 rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                        <p class="text-sm text-base-600 dark:text-base-400">메뉴 없이 사용자 정보만 표시</p>
                      </div>
                    </main>
                  </Sidebar.Container>
                </div>
              </div>

              {/* 메뉴 포함 */}
              <div>
                <p class="mb-2 text-sm text-base-600 dark:text-base-400">메뉴 포함</p>
                <div class="h-80 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
                  <Sidebar.Container>
                    <Sidebar>
                      <div class="p-2 px-4 font-bold">LOGO</div>
                      <Sidebar.User
                        name="홍길동"
                        description="admin@example.com"
                        menus={[
                          { title: "프로필", onClick: () => alert("프로필") },
                          { title: "로그아웃", onClick: () => alert("로그아웃") },
                        ]}
                      />
                      <Sidebar.Menu menus={sampleMenuItems} />
                    </Sidebar>
                    <main class="h-full overflow-auto p-4">
                      <SidebarToggleButton />
                      <div class="mt-4 rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                        <p class="text-sm text-base-600 dark:text-base-400">클릭하면 드롭다운 메뉴 표시</p>
                      </div>
                    </main>
                  </Sidebar.Container>
                </div>
              </div>
            </div>
          </section>

          {/* 4. 모바일 데모 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">모바일 데모</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">375px x 500px iframe으로 모바일 환경 시뮬레이션</p>
            <div class="h-[500px] w-[375px] overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
              <iframe
                src="#/mobile-layout-demo"
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Mobile Sidebar Demo"
              />
            </div>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
