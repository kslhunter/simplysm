import { Topbar, TopbarContainer, useTheme } from "@simplysm/solid";
import { atoms, themeVars, tokenVars } from "@simplysm/solid/styles";

export default function HomePage() {
  const { theme, setTheme } = useTheme();

  return (
    <TopbarContainer>
      <Topbar>
        <h1 class={atoms({ m: "none", fontSize: "base" })}>Home</h1>
      </Topbar>
      <div class={atoms({ p: "xxl" })} style={{ overflow: "auto", flex: 1 }}>
      {/* Theme Selector */}
      <div class={atoms({ px: "base", py: "base", mt: "auto" })}>
        <select
          value={theme()}
          onInput={(e) => setTheme(e.currentTarget.value as "light" | "dark")}
          style={{
            "width": "100%",
            "padding": "0.5rem",
            "border-radius": "4px",
            "border": `1px solid rgb(${themeVars.border.base})`,
            "background": `rgb(${themeVars.surface.base})`,
            "color": `rgb(${themeVars.text.base})`,
          }}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <h1>Simplysm Solid 컴포넌트 라이브러리</h1>
      <p
        style={{
          "font-size": tokenVars.font.size.lg,
          "color": `rgb(${themeVars.text.muted})`,
          "margin-bottom": tokenVars.spacing.xl,
        }}
      >
        SolidJS 기반의 UI 컴포넌트 데모 페이지입니다.
      </p>

      <h2>사용 가능한 컴포넌트</h2>
      <ul
        style={{
          "list-style-type": "disc",
          "padding-left": tokenVars.spacing.xl,
          "line-height": "2",
        }}
      >
        <li>
          <strong>Button</strong> - 다양한 테마, 크기, 스타일을 지원하는 버튼 컴포넌트
        </li>
        <li>
          <strong>List / ListItem</strong> - 계층 구조를 지원하는 리스트 컴포넌트
        </li>
        <li>
          <strong>Sidebar</strong> - 반응형 사이드바 레이아웃 컴포넌트
        </li>
        <li>
          <strong>Collapse</strong> - 접기/펼치기 애니메이션 컴포넌트
        </li>
      </ul>

      <h2 style={{ "margin-top": tokenVars.spacing.xl }}>시작하기</h2>
      <p style={{ color: `rgb(${themeVars.text.muted})` }}>
        왼쪽 사이드바 메뉴에서 각 컴포넌트의 데모를 확인할 수 있습니다.
      </p>
      </div>
    </TopbarContainer>
  );
}
