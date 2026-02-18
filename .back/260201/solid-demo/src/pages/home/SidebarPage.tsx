import { createSignal, For } from "solid-js";
import { IconFolder, IconHome, IconSettings } from "@tabler/icons-solidjs";
import {
  Sidebar,
  SidebarContainer,
  SidebarMenu,
  type SidebarMenuItem,
  SidebarUser,
  Button,
  Topbar,
  TopbarContainer,
} from "@simplysm/solid";
import { atoms, themeVars } from "@simplysm/solid/styles";
import { demoContainer, demoContent, demoGrid, mobileIframeContainer } from "./SidebarPage.css";

const sampleMenus: SidebarMenuItem[] = [
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

export default function SidebarPage() {
  // Width 변형 데모용 상태
  const widthOptions = [
    { label: "좁게 (12rem)", value: "12rem" },
    { label: "기본 (16rem)", value: "16rem" },
    { label: "넓게 (20rem)", value: "20rem" },
  ];

  // Toggled 상태 데모용
  const [toggledDemo, setToggledDemo] = createSignal(false);

  return (
    <TopbarContainer>
      <Topbar>
        <h1 class={atoms({ m: "none", fontSize: "base" })}>Sidebar</h1>
      </Topbar>
      <div class={atoms({ p: "xxl" })} style={{ overflow: "auto", flex: 1 }}>
        <h2>Sidebar Demo</h2>

        {/* Width 변형 */}
        <section>
          <h3>Width 변형</h3>
          <div class={demoGrid}>
            <For each={widthOptions}>
              {(option) => (
                <div>
                  <p class={atoms({ mb: "sm", color: "muted" })}>{option.label}</p>
                  <div class={demoContainer}>
                    <SidebarContainer width={option.value}>
                      <Sidebar>
                        <div class={atoms({ p: "base", fontWeight: "bold" })}>LOGO</div>
                        <SidebarMenu menus={sampleMenus} layout="flat" />
                      </Sidebar>
                      <div class={demoContent}>
                        <p style={{ color: `rgb(${themeVars.text.muted})` }}>메인 콘텐츠 영역</p>
                      </div>
                    </SidebarContainer>
                  </div>
                </div>
              )}
            </For>
          </div>
        </section>

        {/* Layout 변형 */}
        <section>
          <h3>Layout 변형</h3>
          <div class={demoGrid}>
            <div>
              <p class={atoms({ mb: "sm", color: "muted" })}>Accordion (기본)</p>
              <div class={demoContainer}>
                <SidebarContainer>
                  <Sidebar>
                    <div class={atoms({ p: "base", fontWeight: "bold" })}>LOGO</div>
                    <SidebarMenu menus={sampleMenus} layout="accordion" />
                  </Sidebar>
                  <div class={demoContent}>
                    <p style={{ color: `rgb(${themeVars.text.muted})` }}>메인 콘텐츠 영역</p>
                  </div>
                </SidebarContainer>
              </div>
            </div>
            <div>
              <p class={atoms({ mb: "sm", color: "muted" })}>Flat</p>
              <div class={demoContainer}>
                <SidebarContainer>
                  <Sidebar>
                    <div class={atoms({ p: "base", fontWeight: "bold" })}>LOGO</div>
                    <SidebarMenu menus={sampleMenus} layout="flat" />
                  </Sidebar>
                  <div class={demoContent}>
                    <p style={{ color: `rgb(${themeVars.text.muted})` }}>메인 콘텐츠 영역</p>
                  </div>
                </SidebarContainer>
              </div>
            </div>
          </div>
        </section>

        {/* Toggled 상태 */}
        <section>
          <h3>Toggled 상태</h3>
          <div class={atoms({ mb: "base" })}>
            <Button onClick={() => setToggledDemo((v) => !v)}>
              {toggledDemo() ? "사이드바 표시" : "사이드바 숨기기"}
            </Button>
            <span class={atoms({ ml: "base", color: "muted" })}>
              toggled: {toggledDemo() ? "true" : "false"}
            </span>
          </div>
          <div class={demoContainer}>
            <SidebarContainer toggled={toggledDemo()} onToggledChange={setToggledDemo}>
              <Sidebar>
                <div class={atoms({ p: "base", fontWeight: "bold" })}>LOGO</div>
                <SidebarMenu menus={sampleMenus} layout="flat" />
              </Sidebar>
              <div class={demoContent}>
                <p style={{ color: `rgb(${themeVars.text.muted})` }}>
                  토글 버튼으로 사이드바 숨김/표시 전환
                </p>
              </div>
            </SidebarContainer>
          </div>
        </section>

        {/* SidebarUser 변형 */}
        <section>
          <h3>SidebarUser 변형</h3>
          <div class={demoGrid}>
            <div>
              <p class={atoms({ mb: "sm", color: "muted" })}>없음</p>
              <div class={demoContainer}>
                <SidebarContainer>
                  <Sidebar>
                    <div class={atoms({ p: "base", fontWeight: "bold" })}>LOGO</div>
                    <SidebarMenu menus={sampleMenus} layout="flat" />
                  </Sidebar>
                  <div class={demoContent}>
                    <p style={{ color: `rgb(${themeVars.text.muted})` }}>SidebarUser 없음</p>
                  </div>
                </SidebarContainer>
              </div>
            </div>
            <div>
              <p class={atoms({ mb: "sm", color: "muted" })}>기본</p>
              <div class={demoContainer}>
                <SidebarContainer>
                  <Sidebar>
                    <div class={atoms({ p: "base", fontWeight: "bold" })}>LOGO</div>
                    <SidebarUser name="홍길동" description="user@example.com" />
                    <SidebarMenu menus={sampleMenus} layout="flat" />
                  </Sidebar>
                  <div class={demoContent}>
                    <p style={{ color: `rgb(${themeVars.text.muted})` }}>기본 SidebarUser</p>
                  </div>
                </SidebarContainer>
              </div>
            </div>
            <div>
              <p class={atoms({ mb: "sm", color: "muted" })}>메뉴 포함</p>
              <div class={demoContainer}>
                <SidebarContainer>
                  <Sidebar>
                    <div class={atoms({ p: "base", fontWeight: "bold" })}>LOGO</div>
                    <SidebarUser
                      name="홍길동"
                      description="admin@example.com"
                      menus={[
                        { title: "프로필", onClick: () => alert("프로필") },
                        { title: "로그아웃", onClick: () => alert("로그아웃") },
                      ]}
                    />
                    <SidebarMenu menus={sampleMenus} layout="flat" />
                  </Sidebar>
                  <div class={demoContent}>
                    <p style={{ color: `rgb(${themeVars.text.muted})` }}>메뉴 포함 SidebarUser</p>
                  </div>
                </SidebarContainer>
              </div>
            </div>
          </div>
        </section>

        {/* 모바일 데모 */}
        <section>
          <h3>모바일 데모</h3>
          <p class={atoms({ mb: "base", color: "muted" })}>
            375px x 500px iframe으로 모바일 환경 시뮬레이션
          </p>
          <div class={mobileIframeContainer}>
            <iframe
              src="#/mobile-layout-demo"
              style={{ width: "100%", height: "100%", border: "none" }}
              title="Mobile Sidebar Demo"
            />
          </div>
        </section>
      </div>
    </TopbarContainer>
  );
}
