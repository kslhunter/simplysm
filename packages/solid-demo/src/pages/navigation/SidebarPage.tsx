import {
  Button,
  Icon,
  Sidebar,
  SidebarContainer,
  SidebarMenu,
  SidebarUser,
  Topbar,
  TopbarContainer,
  useSidebarContext,
  type SidebarMenuItem,
} from "@simplysm/solid";
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
    <Button variant="ghost" onClick={() => setToggle((v) => !v)} class="p-2">
      <Icon icon={IconMenu2} class="size-6" />
    </Button>
  );
};

export default function SidebarPage() {
  return (
    <TopbarContainer>
      <Topbar>
        <h1 class="m-0 text-base">Sidebar</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* 1. 기본 Sidebar */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">기본 Sidebar</h2>
            <p class="mb-4 text-sm text-gray-600">
              Sidebar + SidebarMenu + SidebarUser 조합. 토글 버튼을 클릭하여 사이드바를 열고 닫을 수 있습니다.
            </p>
            <div class="h-96 overflow-hidden rounded-lg border border-gray-200">
              <SidebarContainer>
                <Sidebar>
                  <div class="p-2 px-4 font-bold">LOGO</div>
                  <SidebarUser
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
                        <span class="text-sm text-gray-500">hong@example.com</span>
                      </div>
                    </div>
                  </SidebarUser>
                  <SidebarMenu menus={sampleMenuItems} />
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

          {/* 2. Toggled 상태 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">Toggled 상태</h2>
            <p class="mb-4 text-sm text-gray-600">
              useSidebarContext().setToggle()을 통해 사이드바 토글 상태를 제어합니다.
            </p>
            <div class="h-96 overflow-hidden rounded-lg border border-gray-200">
              <SidebarContainer>
                <Sidebar>
                  <div class="p-2 px-4 font-bold">LOGO</div>
                  <SidebarMenu menus={sampleMenuItems} />
                </Sidebar>
                <main class="h-full overflow-auto p-4">
                  <div class="mb-4 flex items-center gap-4">
                    <SidebarToggleButton />
                    <span class="font-medium">토글 버튼으로 상태 제어</span>
                  </div>
                  <div class="rounded border border-gray-200 bg-gray-50 p-4">
                    <p class="text-sm text-gray-600">
                      토글 버튼을 클릭하면 useSidebarContext().setToggle()이 호출됩니다.
                    </p>
                  </div>
                </main>
              </SidebarContainer>
            </div>
          </section>

          {/* 3. SidebarUser 변형 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">SidebarUser 변형</h2>
            <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* 없음 */}
              <div>
                <p class="mb-2 text-sm text-gray-600">없음</p>
                <div class="h-80 overflow-hidden rounded-lg border border-gray-200">
                  <SidebarContainer>
                    <Sidebar>
                      <div class="p-2 px-4 font-bold">LOGO</div>
                      <SidebarMenu menus={sampleMenuItems} />
                    </Sidebar>
                    <main class="h-full overflow-auto p-4">
                      <SidebarToggleButton />
                      <div class="mt-4 rounded border border-gray-200 bg-gray-50 p-4">
                        <p class="text-sm text-gray-600">SidebarUser 없음</p>
                      </div>
                    </main>
                  </SidebarContainer>
                </div>
              </div>

              {/* 기본 (children만) */}
              <div>
                <p class="mb-2 text-sm text-gray-600">기본 (children만)</p>
                <div class="h-80 overflow-hidden rounded-lg border border-gray-200">
                  <SidebarContainer>
                    <Sidebar>
                      <div class="p-2 px-4 font-bold">LOGO</div>
                      <SidebarUser>
                        <div class="flex items-center gap-3">
                          <div class="flex size-10 items-center justify-center rounded-full bg-primary-500 text-white">
                            <Icon icon={IconUser} class="size-6" />
                          </div>
                          <div class="flex flex-col">
                            <span class="font-semibold">홍길동</span>
                            <span class="text-sm text-gray-500">hong@example.com</span>
                          </div>
                        </div>
                      </SidebarUser>
                      <SidebarMenu menus={sampleMenuItems} />
                    </Sidebar>
                    <main class="h-full overflow-auto p-4">
                      <SidebarToggleButton />
                      <div class="mt-4 rounded border border-gray-200 bg-gray-50 p-4">
                        <p class="text-sm text-gray-600">메뉴 없이 사용자 정보만 표시</p>
                      </div>
                    </main>
                  </SidebarContainer>
                </div>
              </div>

              {/* 메뉴 포함 */}
              <div>
                <p class="mb-2 text-sm text-gray-600">메뉴 포함</p>
                <div class="h-80 overflow-hidden rounded-lg border border-gray-200">
                  <SidebarContainer>
                    <Sidebar>
                      <div class="p-2 px-4 font-bold">LOGO</div>
                      <SidebarUser
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
                            <span class="text-sm text-gray-500">admin@example.com</span>
                          </div>
                        </div>
                      </SidebarUser>
                      <SidebarMenu menus={sampleMenuItems} />
                    </Sidebar>
                    <main class="h-full overflow-auto p-4">
                      <SidebarToggleButton />
                      <div class="mt-4 rounded border border-gray-200 bg-gray-50 p-4">
                        <p class="text-sm text-gray-600">클릭하면 드롭다운 메뉴 표시</p>
                      </div>
                    </main>
                  </SidebarContainer>
                </div>
              </div>
            </div>
          </section>

          {/* 4. 모바일 데모 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">모바일 데모</h2>
            <p class="mb-4 text-sm text-gray-600">375px x 500px iframe으로 모바일 환경 시뮬레이션</p>
            <div class="h-[500px] w-[375px] overflow-hidden rounded-lg border border-gray-200">
              <iframe
                src="#/mobile-layout-demo"
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Mobile Sidebar Demo"
              />
            </div>
          </section>
        </div>
      </div>
    </TopbarContainer>
  );
}
