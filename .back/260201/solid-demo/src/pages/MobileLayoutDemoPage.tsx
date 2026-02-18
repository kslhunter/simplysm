import { createSignal } from "solid-js";
import { IconMenu2, IconFolder, IconHome, IconSettings } from "@tabler/icons-solidjs";
import {
  Sidebar,
  SidebarContainer,
  SidebarMenu,
  type SidebarMenuItem,
  SidebarUser,
  Button,
} from "@simplysm/solid";
import { atoms, themeVars, tokenVars } from "@simplysm/solid/styles";

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

export default function MobileLayoutDemoPage() {
  const [toggled, setToggled] = createSignal(false);

  return (
    <div style={{ height: "100%", background: `rgb(${themeVars.surface.base})` }}>
      <SidebarContainer toggled={toggled()} onToggledChange={setToggled}>
        <Sidebar>
          <div class={atoms({ p: "base", fontWeight: "bold" })}>LOGO</div>
          <SidebarUser
            name="홍길동"
            description="user@example.com"
            menus={[
              { title: "프로필", onClick: () => alert("프로필") },
              { title: "로그아웃", onClick: () => alert("로그아웃") },
            ]}
          />
          <SidebarMenu menus={sampleMenus} />
        </Sidebar>

        <main style={{ height: "100%", overflow: "auto" }}>
          {/* 헤더 (토글 버튼 포함) */}
          <header
            style={{
              "display": "flex",
              "align-items": "center",
              "padding": tokenVars.spacing.base,
              "border-bottom": `1px solid rgb(${themeVars.border.base})`,
              "background": `rgb(${themeVars.surface.base})`,
            }}
          >
            <Button onClick={() => setToggled((v) => !v)} inset>
              <IconMenu2 size={20} />
            </Button>
            <span class={atoms({ ml: "base", fontWeight: "bold" })}>모바일 데모</span>
          </header>

          {/* 콘텐츠 */}
          <div class={atoms({ p: "lg" })}>
            <p style={{ color: `rgb(${themeVars.text.muted})` }}>
              햄버거 버튼을 클릭하여 사이드바를 열 수 있습니다.
            </p>
            <p class={atoms({ mt: "base" })} style={{ color: `rgb(${themeVars.text.muted})` }}>
              사이드바 외부를 클릭하면 사이드바가 닫힙니다.
            </p>
          </div>
        </main>
      </SidebarContainer>
    </div>
  );
}
