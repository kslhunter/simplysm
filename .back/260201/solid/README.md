# @simplysm/solid

SolidJS 기반 UI 컴포넌트 라이브러리

## 설치

```bash
pnpm add @simplysm/solid
```

## 기본 설정

앱 진입점에서 Provider들을 설정한다:

```tsx
import { ConfigProvider, ThemeProvider } from "@simplysm/solid";
import "@simplysm/solid/styles"; // 글로벌 스타일

function App() {
  return (
    <ConfigProvider staticClientName="my-app">
      <ThemeProvider>
        <YourApp />
      </ThemeProvider>
    </ConfigProvider>
  );
}
```

## 컴포넌트

### Button

다양한 테마와 크기를 지원하는 버튼

```tsx
import { Button } from "@simplysm/solid";

<Button theme="primary" size="lg">클릭</Button>
<Button theme="danger" disabled>비활성화</Button>
<Button link>링크 스타일</Button>
```

**Props:**
- `theme`: primary, secondary, success, warning, danger, info, gray, slate
- `size`: xs, sm, lg, xl
- `link`: 링크 스타일 적용
- `inset`: 테이블 셀 등에서 사용하기 위한 인셋 스타일
- `disabled`: 비활성화 상태

### List / ListItem

리스트 컴포넌트로, 중첩 리스트와 아코디언을 지원한다.

```tsx
import { List, ListItem } from "@simplysm/solid";

// 기본 리스트
<List>
  <ListItem>항목 1</ListItem>
  <ListItem selected>선택된 항목</ListItem>
</List>

// 중첩 리스트 (아코디언)
<List>
  <ListItem>
    폴더
    <List>
      <ListItem>파일 1</ListItem>
      <ListItem>파일 2</ListItem>
    </List>
  </ListItem>
</List>

// 선택 아이콘
<ListItem selectedIcon={IconCheck} selected>선택됨</ListItem>
```

**ListItem Props:**
- `layout`: accordion (접기/펼치기), flat (항상 펼침)
- `selected`: 선택 상태
- `disabled`: 비활성화 상태
- `open`: 중첩 리스트 열림 상태 (controlled)
- `onOpenChange`: 열림 상태 변경 콜백
- `selectedIcon`: 선택 표시 아이콘 컴포넌트
- `icon`: 항목 앞에 표시할 아이콘 컴포넌트

### Dropdown

드롭다운 메뉴를 제공하는 컴포넌트. 클릭이나 키보드 조작으로 팝업을 열고 닫는다.

```tsx
import { Dropdown, DropdownPopup } from "@simplysm/solid";

// 기본 사용
<Dropdown>
  <Button>메뉴 열기</Button>
  <DropdownPopup>
    <List>
      <ListItem>옵션 1</ListItem>
      <ListItem>옵션 2</ListItem>
    </List>
  </DropdownPopup>
</Dropdown>

// Controlled 모드
const [open, setOpen] = createSignal(false);
<Dropdown open={open()} onOpenChange={setOpen}>
  ...
</Dropdown>
```

**특징:**
- 중첩 사용 지원 (서브메뉴)
- 뷰포트 기반 자동 포지셔닝 (상/하, 좌/우)
- 키보드 네비게이션 (ArrowDown, ArrowUp, Space, Escape)
- 모바일에서는 Bottom Sheet UI로 전환

**Dropdown Props:**
- `open`: Controlled 모드의 열림 상태
- `onOpenChange`: 열림 상태 변경 콜백
- `disabled`: 비활성화 상태

**DropdownPopup Props:**
- `showHandle`: 모바일 모드에서 드래그 핸들 표시 여부 (기본값: true)

**useDropdown Hook:**
- `id`: 현재 Dropdown의 고유 ID
- `parentId`: 부모 Dropdown의 ID
- `open`: 열림 상태 accessor
- `close`: Dropdown을 닫는 함수

### Collapse

높이 애니메이션으로 콘텐츠를 펼치거나 접는다.

```tsx
import { Collapse } from "@simplysm/solid";

const [isOpen, setIsOpen] = createSignal(false);

<button onClick={() => setIsOpen(!isOpen())}>토글</button>
<Collapse open={isOpen()}>
  <p>접을 수 있는 콘텐츠</p>
</Collapse>
```

### CollapseIcon

열림/닫힘 상태에 따라 회전하는 아이콘

```tsx
import { CollapseIcon } from "@simplysm/solid";
import { IconChevronDown } from "@tabler/icons-solidjs";

<CollapseIcon icon={IconChevronDown} open={isOpen()} />
```

### Sidebar

반응형 사이드바 레이아웃 컴포넌트 세트. 데스크톱에서는 고정 레이아웃, 모바일(520px 미만)에서는 오버레이 모드로 동작한다.

```tsx
import {
  SidebarContainer,
  Sidebar,
  SidebarMenu,
  SidebarUser,
  useSidebar,
} from "@simplysm/solid";

// 기본 사용
<SidebarContainer>
  <Sidebar width="280px">
    <SidebarMenu
      menus={[
        { title: "홈", path: "/", icon: IconHome },
        { title: "설정", children: [
          { title: "프로필", path: "/settings/profile" },
        ]},
        { title: "외부 링크", path: "https://example.com" },
      ]}
    />
    <SidebarUser
      name="홍길동"
      description="관리자"
      menus={[
        { title: "프로필", onClick: () => navigate("/profile") },
        { title: "로그아웃", onClick: logout },
      ]}
    />
  </Sidebar>
  <main>콘텐츠</main>
</SidebarContainer>

// Controlled 모드
const [toggled, setToggled] = createSignal(false);

<SidebarContainer toggled={toggled()} onToggledChange={setToggled}>
  ...
</SidebarContainer>

// 토글 버튼 (하위 컴포넌트에서)
function Header() {
  const { toggle } = useSidebar();
  return <button onClick={toggle}><IconMenu /></button>;
}
```

**SidebarContainer Props:**
- `toggled`: 사이드바 토글 상태 (controlled 모드). 데스크톱에서는 false=표시/true=숨김, 모바일에서는 반대
- `onToggledChange`: 토글 상태 변경 콜백
- `width`: 사이드바 너비 (기본값: "16rem")

**Sidebar Props:**
- `width`: 사이드바 너비 (기본값: "240px")

**SidebarMenu Props:**
- `menus`: 메뉴 아이템 목록
- `layout`: accordion (아코디언), flat (항상 펼침). 생략 시 메뉴 개수에 따라 자동 선택

메뉴 선택은 현재 라우터 경로(`location.pathname`)와 메뉴의 `path`를 비교하여 자동으로 결정된다.

**SidebarMenuItem 타입:**
- `title`: 메뉴 제목
- `path`: 내부 경로 또는 외부 URL (://포함 시 새 탭에서 열림)
- `icon`: 아이콘 컴포넌트 (@tabler/icons-solidjs)
- `children`: 하위 메뉴 목록

**SidebarUser Props:**
- `name`: 사용자 이름
- `description`: 사용자 설명 (역할, 이메일 등)
- `menus`: 사용자 메뉴 목록 ({ title, onClick }[])

**useSidebar Hook:**
- `toggled`: 현재 토글 상태 accessor
- `setToggled`: 토글 상태 변경 함수
- `toggle`: 토글 상태 반전 함수
- `width`: 사이드바 너비 accessor

### Topbar

상단바 레이아웃 컴포넌트 세트. SidebarContainer와 함께 또는 독립적으로 사용할 수 있다.

```tsx
import {
  TopbarContainer,
  Topbar,
  TopbarMenu,
  TopbarUser,
} from "@simplysm/solid";

// SidebarContainer와 함께 사용
<SidebarContainer>
  <Sidebar>...</Sidebar>
  <TopbarContainer>
    <Topbar>
      <h1>페이지 제목</h1>
      <TopbarMenu
        menus={[
          {
            title: "관리",
            children: [
              { title: "사용자 관리", path: "/admin/users" },
              { title: "설정", path: "/admin/settings" },
            ],
          },
        ]}
      />
      <div style={{ flex: 1 }} />
      <TopbarUser menus={[
        { title: "프로필", onClick: () => navigate("/profile") },
        { title: "로그아웃", onClick: logout },
      ]}>
        홍길동
      </TopbarUser>
    </Topbar>
    <main>콘텐츠</main>
  </TopbarContainer>
</SidebarContainer>

// 독립 사용 (Sidebar 없이)
<TopbarContainer>
  <Topbar showToggle={false}>...</Topbar>
  <main>콘텐츠</main>
</TopbarContainer>
```

**TopbarContainer Props:**
- 표준 HTMLDivElement 속성만 지원

**Topbar Props:**
- `showToggle`: 사이드바 토글 버튼 표시 여부 (기본값: SidebarContainer 내부일 때 true)

**TopbarMenu Props:**
- `menus`: 1단계 메뉴 배열 (각 메뉴가 드롭다운 트리거)
- `isSelectedFn`: 메뉴 선택 상태 판별 함수 (기본값: 현재 경로와 path 비교)

**TopbarMenuItem 타입:**
- `title`: 메뉴 제목
- `path`: 내부 라우터 경로
- `url`: 외부 URL (새 탭에서 열림)
- `icon`: 아이콘 컴포넌트 (@tabler/icons-solidjs)
- `children`: 하위 메뉴 목록

**TopbarUser Props:**
- `menus`: 사용자 메뉴 배열 ({ title, onClick }[])
- `children`: 트리거 버튼에 표시할 내용 (사용자 이름 등)

## 디렉티브

### ripple

Material Design 스타일의 ripple 효과

```tsx
import { ripple } from "@simplysm/solid";

// TypeScript에서 디렉티브 등록
void ripple;

<button use:ripple>클릭 효과</button>
<button use:ripple={!disabled()}>조건부 활성화</button>
```

## Hooks

### useLocalStorage

localStorage와 동기화되는 Signal

```tsx
import { useLocalStorage } from "@simplysm/solid";

// ConfigProvider 내부에서 사용
const [theme, setTheme] = useLocalStorage<"light" | "dark">("theme", "light");
```

### useTheme

현재 테마와 테마 변경 함수에 접근

```tsx
import { useTheme } from "@simplysm/solid";

const { theme, setTheme } = useTheme();

<button onClick={() => setTheme(theme() === "light" ? "dark" : "light")}>
  현재: {theme()}
</button>
```

### useConfig

애플리케이션 설정에 접근

```tsx
import { useConfig } from "@simplysm/solid";

const { clientName } = useConfig();
```

## 스타일 유틸리티

### atoms

원자적 CSS 클래스 생성 (vanilla-extract sprinkles 기반)

```tsx
import { atoms } from "@simplysm/solid";

// Flex 레이아웃
<div class={atoms({ display: "flex", alignItems: "center", gap: "sm" })}>

// Padding/Margin (shorthand 지원)
<div class={atoms({ p: "lg", mx: "lg" })}>

// 복합 사용
<div class={atoms({
  display: "flex",
  flexDirection: "column",
  gap: "base",
  p: "xl"
})}>
```

**지원 속성:**
- Display & Flex: `display`, `flexDirection`, `flexWrap`, `alignItems`, `justifyContent`
- Gap: `gap`, `rowGap`, `columnGap`
- Padding: `p`, `pt`, `pr`, `pb`, `pl`, `px`, `py`
- Margin: `m`, `mt`, `mr`, `mb`, `ml`, `mx`, `my`
- Spacing 값: none, xxs, xs, sm, base, lg, xl, xxl, xxxl, xxxxl

### 테마 변수

```tsx
import { themeVars, tokenVars, colorVars } from "@simplysm/solid";

// 테마 색상 사용
<div style={{ color: `rgb(${themeVars.text.base})` }}>
<div style={{ background: `rgb(${themeVars.surface.elevated})` }}>

// 토큰 사용
<div style={{ padding: tokenVars.spacing.lg }}>
<div style={{ "font-size": tokenVars.font.size.sm }}>
```

## 라이선스

Apache-2.0
