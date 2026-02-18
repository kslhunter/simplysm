import {
  Sidebar,
  Topbar,
  type SidebarMenuItem,
  type TopbarMenuItem,
  type TopbarUserMenu,
} from "@simplysm/solid";
import {
  IconDatabase,
  IconFolder,
  IconHome,
  IconServer,
  IconSettings,
  IconUsers,
} from "@tabler/icons-solidjs";

// 단순 메뉴 (2단계)
const simpleMenus: TopbarMenuItem[] = [
  {
    title: "관리",
    children: [{ title: "사용자 관리" }, { title: "권한 설정" }],
  },
  {
    title: "도움말",
    children: [{ title: "가이드" }, { title: "정보" }],
  },
];

// 중첩 메뉴 (3단계 이상, 아이콘 포함)
const nestedMenus: TopbarMenuItem[] = [
  {
    title: "관리",
    icon: IconSettings,
    children: [
      { title: "사용자 관리", icon: IconUsers },
      {
        title: "시스템",
        icon: IconServer,
        children: [
          { title: "서버 설정" },
          { title: "데이터베이스", icon: IconDatabase },
          {
            title: "고급 설정",
            children: [{ title: "캐시" }, { title: "로그" }],
          },
        ],
      },
    ],
  },
  {
    title: "문서",
    icon: IconFolder,
    children: [{ title: "시작하기" }, { title: "API 참조" }],
  },
];

// TopbarUser용 메뉴
const userMenus: TopbarUserMenu[] = [
  { title: "프로필", onClick: () => alert("프로필") },
  { title: "로그아웃", onClick: () => alert("로그아웃") },
];

// Sidebar + Topbar 통합용 메뉴
const sidebarMenus: SidebarMenuItem[] = [
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

export default function TopbarPage() {
  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Topbar</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* 1. TopbarContainer 기본 */}
          <section>
            <h2 class="mb-4 text-xl font-bold">TopbarContainer 기본</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              TopbarContainer는 Topbar + 콘텐츠를 수직으로 배치합니다. SidebarContext 없이 단독 사용
              시 토글 버튼이 표시되지 않습니다.
            </p>
            <div class="h-48 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
              <Topbar.Container>
                <Topbar>
                  <h1 class="m-0 text-base">페이지 제목</h1>
                </Topbar>
                <div class="flex-1 overflow-auto p-4">
                  <div class="rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                    <p class="text-sm text-base-600 dark:text-base-400">메인 콘텐츠 영역</p>
                  </div>
                </div>
              </Topbar.Container>
            </div>
          </section>

          {/* 2. 토글 버튼 자동 연동 */}
          <section>
            <h2 class="mb-4 text-xl font-bold">토글 버튼 자동 연동</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              SidebarContext 없이 단독 사용 vs SidebarContainer 내부 사용 비교. SidebarContainer
              내부에서 사용하면 토글 버튼이 자동으로 표시됩니다.
            </p>
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <p class="mb-2 text-sm text-base-600 dark:text-base-400">
                  단독 사용 (토글 버튼 없음)
                </p>
                <div class="h-48 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
                  <Topbar.Container>
                    <Topbar>
                      <h1 class="m-0 text-base">토글 버튼 없음</h1>
                    </Topbar>
                    <div class="flex-1 overflow-auto p-4">
                      <div class="rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                        <p class="text-sm text-base-600 dark:text-base-400">SidebarContext 없음</p>
                      </div>
                    </div>
                  </Topbar.Container>
                </div>
              </div>
              <div>
                <p class="mb-2 text-sm text-base-600 dark:text-base-400">
                  SidebarContainer 내부 사용 (토글 버튼 있음)
                </p>
                <div class="h-48 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
                  <Sidebar.Container>
                    <Sidebar>
                      <div class="p-2 px-4 font-bold">LOGO</div>
                    </Sidebar>
                    <Topbar.Container>
                      <Topbar>
                        <h1 class="m-0 text-base">토글 버튼 자동 표시</h1>
                      </Topbar>
                      <div class="flex-1 overflow-auto p-4">
                        <div class="rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                          <p class="text-sm text-base-600 dark:text-base-400">
                            SidebarContext 있음
                          </p>
                        </div>
                      </div>
                    </Topbar.Container>
                  </Sidebar.Container>
                </div>
              </div>
            </div>
          </section>

          {/* 3. TopbarMenu 변형 */}
          <section>
            <h2 class="mb-4 text-xl font-bold">TopbarMenu 변형</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              TopbarMenu는 드롭다운 메뉴를 제공합니다. 무제한 중첩을 지원합니다.
            </p>
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <p class="mb-2 text-sm text-base-600 dark:text-base-400">단순 메뉴 (2단계)</p>
                <div class="h-48 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
                  <Topbar.Container>
                    <Topbar>
                      <Topbar.Menu menus={simpleMenus} />
                    </Topbar>
                    <div class="flex-1 overflow-auto p-4">
                      <div class="rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                        <p class="text-sm text-base-600 dark:text-base-400">메뉴를 클릭해보세요</p>
                      </div>
                    </div>
                  </Topbar.Container>
                </div>
              </div>
              <div>
                <p class="mb-2 text-sm text-base-600 dark:text-base-400">
                  중첩 메뉴 (3단계 이상, 아이콘 포함)
                </p>
                <div class="h-48 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
                  <Topbar.Container>
                    <Topbar>
                      <Topbar.Menu menus={nestedMenus} />
                    </Topbar>
                    <div class="flex-1 overflow-auto p-4">
                      <div class="rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                        <p class="text-sm text-base-600 dark:text-base-400">
                          관리 → 시스템 → 고급 설정을 확인해보세요
                        </p>
                      </div>
                    </div>
                  </Topbar.Container>
                </div>
              </div>
            </div>
          </section>

          {/* 4. TopbarUser 변형 */}
          <section>
            <h2 class="mb-4 text-xl font-bold">TopbarUser 변형</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              TopbarUser는 사용자 메뉴 드롭다운을 제공합니다.
            </p>
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <p class="mb-2 text-sm text-base-600 dark:text-base-400">기본 (이름만)</p>
                <div class="h-48 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
                  <Topbar.Container>
                    <Topbar>
                      <h1 class="m-0 text-base">제목</h1>
                      <div class="flex-1" />
                      <Topbar.User>홍길동</Topbar.User>
                    </Topbar>
                    <div class="flex-1 overflow-auto p-4">
                      <div class="rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                        <p class="text-sm text-base-600 dark:text-base-400">
                          메뉴 없이 이름만 표시
                        </p>
                      </div>
                    </div>
                  </Topbar.Container>
                </div>
              </div>
              <div>
                <p class="mb-2 text-sm text-base-600 dark:text-base-400">메뉴 포함</p>
                <div class="h-48 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
                  <Topbar.Container>
                    <Topbar>
                      <h1 class="m-0 text-base">제목</h1>
                      <div class="flex-1" />
                      <Topbar.User menus={userMenus}>홍길동</Topbar.User>
                    </Topbar>
                    <div class="flex-1 overflow-auto p-4">
                      <div class="rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                        <p class="text-sm text-base-600 dark:text-base-400">
                          클릭하면 프로필/로그아웃 메뉴 표시
                        </p>
                      </div>
                    </div>
                  </Topbar.Container>
                </div>
              </div>
            </div>
          </section>

          {/* 5. Sidebar + Topbar 통합 */}
          <section>
            <h2 class="mb-4 text-xl font-bold">Sidebar + Topbar 통합</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              SidebarContainer 내부에서 TopbarContainer를 사용하면 토글 버튼이 자동으로 연동됩니다.
            </p>
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <p class="mb-2 text-sm text-base-600 dark:text-base-400">
                  사이드바 열림 (toggled=false)
                </p>
                <div class="h-80 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
                  <Sidebar.Container>
                    <Sidebar>
                      <div class="p-2 px-4 font-bold">LOGO</div>
                      <Sidebar.User
                        name="홍길동"
                        description="hong@example.com"
                        menus={[
                          { title: "프로필", onClick: () => alert("프로필") },
                          { title: "로그아웃", onClick: () => alert("로그아웃") },
                        ]}
                      />
                      <Sidebar.Menu menus={sidebarMenus} />
                    </Sidebar>
                    <Topbar.Container>
                      <Topbar>
                        <h1 class="m-0 text-base">페이지</h1>
                        <div class="flex-1" />
                        <Topbar.User menus={userMenus}>홍길동</Topbar.User>
                      </Topbar>
                      <div class="flex-1 overflow-auto p-4">
                        <div class="rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                          <p class="text-sm text-base-600 dark:text-base-400">
                            토글 버튼을 클릭해보세요
                          </p>
                        </div>
                      </div>
                    </Topbar.Container>
                  </Sidebar.Container>
                </div>
              </div>
              <div>
                <p class="mb-2 text-sm text-base-600 dark:text-base-400">
                  사이드바 닫힘 (toggled=true)
                </p>
                <div class="h-80 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
                  <Sidebar.Container>
                    <Sidebar>
                      <div class="p-2 px-4 font-bold">LOGO</div>
                      <Sidebar.Menu menus={sidebarMenus} />
                    </Sidebar>
                    <Topbar.Container>
                      <Topbar>
                        <h1 class="m-0 text-base">페이지</h1>
                        <div class="flex-1" />
                        <Topbar.User menus={userMenus}>홍길동</Topbar.User>
                      </Topbar>
                      <div class="flex-1 overflow-auto p-4">
                        <div class="rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                          <p class="text-sm text-base-600 dark:text-base-400">
                            토글 버튼을 클릭해보세요
                          </p>
                        </div>
                      </div>
                    </Topbar.Container>
                  </Sidebar.Container>
                </div>
              </div>
            </div>
          </section>

          {/* 6. 모바일 데모 */}
          <section>
            <h2 class="mb-4 text-xl font-bold">모바일 데모</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              375px x 500px iframe으로 모바일 환경 시뮬레이션
            </p>
            <div class="h-[500px] w-[375px] overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
              <iframe
                src="#/mobile-layout-demo"
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Mobile Layout Demo"
              />
            </div>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
