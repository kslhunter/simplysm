import { createSignal } from "solid-js";
import {
  IconDatabase,
  IconFolder,
  IconHome,
  IconServer,
  IconSettings,
  IconUsers,
} from "@tabler/icons-solidjs";
import {
  Sidebar,
  SidebarContainer,
  SidebarMenu,
  type SidebarMenuItem,
  Topbar,
  TopbarContainer,
  TopbarMenu,
  type TopbarMenuItem,
  TopbarUser,
  type TopbarUserMenuItem,
} from "@simplysm/solid";
import { atoms, themeVars } from "@simplysm/solid/styles";
import { demoContainer, demoContent, demoGrid, mobileIframeContainer } from "./TopbarPage.css";

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
const userMenus: TopbarUserMenuItem[] = [
  { title: "프로필", onClick: () => alert("프로필") },
  { title: "로그아웃", onClick: () => alert("로그아웃") },
];

// Sidebar + Topbar 통합용 메뉴
const sidebarMenus: SidebarMenuItem[] = [
  { title: "홈", path: "#", icon: IconHome },
  {
    title: "문서",
    icon: IconFolder,
    children: [
      { title: "시작하기", path: "#" },
      { title: "API 참조", path: "#" },
    ],
  },
  { title: "설정", path: "#", icon: IconSettings },
];

export default function TopbarPage() {
  // 통합 섹션 토글 상태
  const [toggledOpen, setToggledOpen] = createSignal(false);
  const [toggledClosed, setToggledClosed] = createSignal(true);

  return (
    <TopbarContainer>
      <Topbar>
        <h1 class={atoms({ m: "none", fontSize: "base" })}>Topbar</h1>
      </Topbar>
      <div class={atoms({ p: "xxl" })} style={{ overflow: "auto", flex: 1 }}>
        <h2>Topbar Demo</h2>

        {/* 1. TopbarContainer 기본 */}
        <section>
          <h3>TopbarContainer 기본</h3>
          <p class={atoms({ mb: "base", color: "muted" })}>
            TopbarContainer는 Topbar + 콘텐츠를 수직으로 배치합니다.
          </p>
          <div class={demoContainer}>
            <TopbarContainer>
              <Topbar showToggle={false}>
                <h1 class={atoms({ m: "none", fontSize: "base" })}>페이지 제목</h1>
              </Topbar>
              <div class={demoContent}>
                <p style={{ color: `rgb(${themeVars.text.muted})` }}>메인 콘텐츠 영역</p>
              </div>
            </TopbarContainer>
          </div>
        </section>

        {/* 2. Topbar 토글 버튼 */}
        <section>
          <h3>Topbar 토글 버튼</h3>
          <p class={atoms({ mb: "base", color: "muted" })}>
            showToggle prop으로 사이드바 토글 버튼 표시를 제어합니다. SidebarContext 없이는 클릭해도
            동작하지 않습니다.
          </p>
          <div class={demoGrid}>
            <div>
              <p class={atoms({ mb: "sm", color: "muted" })}>showToggle=false</p>
              <div class={demoContainer}>
                <TopbarContainer>
                  <Topbar showToggle={false}>
                    <h1 class={atoms({ m: "none", fontSize: "base" })}>토글 버튼 없음</h1>
                  </Topbar>
                  <div class={demoContent}>
                    <p style={{ color: `rgb(${themeVars.text.muted})` }}>콘텐츠 영역</p>
                  </div>
                </TopbarContainer>
              </div>
            </div>
            <div>
              <p class={atoms({ mb: "sm", color: "muted" })}>showToggle=true</p>
              <div class={demoContainer}>
                <TopbarContainer>
                  <Topbar showToggle={true}>
                    <h1 class={atoms({ m: "none", fontSize: "base" })}>토글 버튼 있음</h1>
                  </Topbar>
                  <div class={demoContent}>
                    <p style={{ color: `rgb(${themeVars.text.muted})` }}>콘텐츠 영역</p>
                  </div>
                </TopbarContainer>
              </div>
            </div>
          </div>
        </section>

        {/* 3. TopbarMenu 변형 */}
        <section>
          <h3>TopbarMenu 변형</h3>
          <p class={atoms({ mb: "base", color: "muted" })}>
            TopbarMenu는 드롭다운 메뉴를 제공합니다. 무제한 중첩을 지원합니다.
          </p>
          <div class={demoGrid}>
            <div>
              <p class={atoms({ mb: "sm", color: "muted" })}>단순 메뉴 (2단계)</p>
              <div class={demoContainer}>
                <TopbarContainer>
                  <Topbar showToggle={false}>
                    <TopbarMenu menus={simpleMenus} />
                  </Topbar>
                  <div class={demoContent}>
                    <p style={{ color: `rgb(${themeVars.text.muted})` }}>메뉴를 클릭해보세요</p>
                  </div>
                </TopbarContainer>
              </div>
            </div>
            <div>
              <p class={atoms({ mb: "sm", color: "muted" })}>중첩 메뉴 (3단계 이상, 아이콘 포함)</p>
              <div class={demoContainer}>
                <TopbarContainer>
                  <Topbar showToggle={false}>
                    <TopbarMenu menus={nestedMenus} />
                  </Topbar>
                  <div class={demoContent}>
                    <p style={{ color: `rgb(${themeVars.text.muted})` }}>
                      관리 → 시스템 → 고급 설정을 확인해보세요
                    </p>
                  </div>
                </TopbarContainer>
              </div>
            </div>
          </div>
        </section>

        {/* 4. TopbarUser 변형 */}
        <section>
          <h3>TopbarUser 변형</h3>
          <p class={atoms({ mb: "base", color: "muted" })}>
            TopbarUser는 사용자 메뉴 드롭다운을 제공합니다.
          </p>
          <div class={demoGrid}>
            <div>
              <p class={atoms({ mb: "sm", color: "muted" })}>기본 (이름만)</p>
              <div class={demoContainer}>
                <TopbarContainer>
                  <Topbar showToggle={false}>
                    <h1 class={atoms({ m: "none", fontSize: "base" })}>제목</h1>
                    <div style={{ flex: 1 }} />
                    <TopbarUser menus={[]}>홍길동</TopbarUser>
                  </Topbar>
                  <div class={demoContent}>
                    <p style={{ color: `rgb(${themeVars.text.muted})` }}>메뉴 없이 이름만 표시</p>
                  </div>
                </TopbarContainer>
              </div>
            </div>
            <div>
              <p class={atoms({ mb: "sm", color: "muted" })}>메뉴 포함</p>
              <div class={demoContainer}>
                <TopbarContainer>
                  <Topbar showToggle={false}>
                    <h1 class={atoms({ m: "none", fontSize: "base" })}>제목</h1>
                    <div style={{ flex: 1 }} />
                    <TopbarUser menus={userMenus}>홍길동</TopbarUser>
                  </Topbar>
                  <div class={demoContent}>
                    <p style={{ color: `rgb(${themeVars.text.muted})` }}>
                      클릭하면 프로필/로그아웃 메뉴 표시
                    </p>
                  </div>
                </TopbarContainer>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Sidebar + Topbar 통합 */}
        <section>
          <h3>Sidebar + Topbar 통합</h3>
          <p class={atoms({ mb: "base", color: "muted" })}>
            SidebarContainer 내부에서 TopbarContainer를 사용하면 토글 버튼이 자동으로 연동됩니다.
          </p>
          <div class={demoGrid}>
            <div>
              <p class={atoms({ mb: "sm", color: "muted" })}>사이드바 열림 (toggled=false)</p>
              <div class={demoContainer}>
                <SidebarContainer toggled={toggledOpen()} onToggledChange={setToggledOpen}>
                  <Sidebar>
                    <div class={atoms({ p: "base", fontWeight: "bold" })}>LOGO</div>
                    <SidebarMenu menus={sidebarMenus} layout="flat" />
                  </Sidebar>
                  <TopbarContainer>
                    <Topbar>
                      <h1 class={atoms({ m: "none", fontSize: "base" })}>페이지</h1>
                      <div style={{ flex: 1 }} />
                      <TopbarUser menus={userMenus}>홍길동</TopbarUser>
                    </Topbar>
                    <div class={demoContent}>
                      <p style={{ color: `rgb(${themeVars.text.muted})` }}>
                        토글 버튼을 클릭해보세요
                      </p>
                    </div>
                  </TopbarContainer>
                </SidebarContainer>
              </div>
            </div>
            <div>
              <p class={atoms({ mb: "sm", color: "muted" })}>사이드바 닫힘 (toggled=true)</p>
              <div class={demoContainer}>
                <SidebarContainer toggled={toggledClosed()} onToggledChange={setToggledClosed}>
                  <Sidebar>
                    <div class={atoms({ p: "base", fontWeight: "bold" })}>LOGO</div>
                    <SidebarMenu menus={sidebarMenus} layout="flat" />
                  </Sidebar>
                  <TopbarContainer>
                    <Topbar>
                      <h1 class={atoms({ m: "none", fontSize: "base" })}>페이지</h1>
                      <div style={{ flex: 1 }} />
                      <TopbarUser menus={userMenus}>홍길동</TopbarUser>
                    </Topbar>
                    <div class={demoContent}>
                      <p style={{ color: `rgb(${themeVars.text.muted})` }}>
                        토글 버튼을 클릭해보세요
                      </p>
                    </div>
                  </TopbarContainer>
                </SidebarContainer>
              </div>
            </div>
          </div>
        </section>

        {/* 6. 모바일 데모 */}
        <section>
          <h3>모바일 데모</h3>
          <p class={atoms({ mb: "base", color: "muted" })}>
            375px x 500px iframe으로 모바일 환경 시뮬레이션
          </p>
          <div class={mobileIframeContainer}>
            <iframe
              src="#/mobile-layout-demo"
              style={{ width: "100%", height: "100%", border: "none" }}
              title="Mobile Layout Demo"
            />
          </div>
        </section>
      </div>
    </TopbarContainer>
  );
}
