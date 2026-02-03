# solid-demo 구조 변경 기획서

## 개요

### 배경
현재 solid-demo는 모든 데모 콘텐츠가 단일 App.tsx 파일(약 416줄)에 통합되어 있으며, 라우팅도 "/" 단일 경로만 설정되어 있다. 이 구조는 데모 확장 시 유지보수가 어렵고, 실제 애플리케이션의 레이아웃 패턴을 보여주지 못한다.

### 목적
1. **계층적 레이아웃 구조 도입**: App(Provider) > Home(Sidebar+Content) > 개별 페이지 구조
2. **라우팅 기반 페이지 분리**: 각 데모를 독립 페이지로 분리하여 URL로 접근 가능
3. **Lazy Loading 적용**: 페이지별 코드 분할로 초기 로딩 성능 개선

## 범위

### 포함
- App.tsx → App, Home, 개별 페이지 컴포넌트로 분리
- 라우팅 구조 확장 (중첩 라우트 적용)
- 페이지별 lazy loading 적용
- main.tsx 라우터 설정 변경

### 제외
- @simplysm/solid 패키지의 컴포넌트 수정
- 새로운 데모 콘텐츠 추가 (기존 코드 그대로 이전)
- 테스트 코드 작성

## 주요 기능

### 1. 레이아웃 계층 구조

```
App (ConfigContext.Provider + children 렌더링)
├── /login (향후 확장: 사이드바 없는 페이지들)
└── Home (Sidebar + Content 레이아웃 + Suspense)
    ├── main (메인페이지, alias: /home)
    ├── controls/
    │   └── button
    ├── data/
    │   └── list
    ├── disclosure/
    │   └── collapse
    └── navigation/
        └── sidebar
```

> **Note**: `/home` prefix를 사용하는 이유는 향후 `/login` 등 사이드바 없는 페이지를 App 아래에 추가할 수 있도록 하기 위함입니다.

### 2. URL 구조

| URL | 페이지 | 비고 |
|-----|--------|------|
| `/` | → `/home` | 리다이렉트 |
| `/home` | MainPage | main의 alias |
| `/home/main` | MainPage | |
| `/home/controls/button` | ButtonPage | |
| `/home/data/list` | ListPage | |
| `/home/disclosure/collapse` | CollapsePage | |
| `/home/navigation/sidebar` | SidebarPage | |
| `/*` | NotFoundPage | 404 처리 (Sidebar 표시됨) |

### 3. 파일 구조

```
packages/solid-demo/src/
├── main.tsx                         (진입점 + 라우터 설정)
├── App.tsx                          (ConfigContext.Provider)
├── layouts/
│   └── Home.tsx                     (Sidebar + Content + Suspense + SidebarToggleButton)
└── pages/
    ├── MainPage.tsx                 (메인페이지 - 환영 메시지)
    ├── NotFoundPage.tsx             (404 페이지)
    ├── controls/
    │   └── ButtonPage.tsx       (default export)
    ├── data/
    │   └── ListPage.tsx         (default export)
    ├── disclosure/
    │   └── CollapsePage.tsx     (default export)
    └── navigation/
        └── SidebarPage.tsx      (default export)
```

### 4. 라우팅 구조

```typescript
// main.tsx
import { render } from "solid-js/web";
import { Router, Route, Navigate } from "@solidjs/router";
import { lazy } from "solid-js";
import { App } from "./App";
import { Home } from "./layouts/Home";
import { MainPage } from "./pages/MainPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import "./main.css";

render(
  () => (
    <Router>
      <Route path="/" component={App}>
        {/* 향후 확장: <Route path="/login" component={LoginPage} /> */}
        <Route path="/" component={Home}>
          <Route path="/" component={() => <Navigate href="/home" />} />
          <Route path="/home" component={MainPage} />
          <Route path="/home/main" component={MainPage} />
          <Route path="/home/controls/button" component={lazy(() => import("./pages/controls/ButtonPage"))} />
          <Route path="/home/data/list" component={lazy(() => import("./pages/data/ListPage"))} />
          <Route path="/home/disclosure/collapse" component={lazy(() => import("./pages/disclosure/CollapsePage"))} />
          <Route path="/home/navigation/sidebar" component={lazy(() => import("./pages/navigation/SidebarPage"))} />
          <Route path="/*" component={NotFoundPage} />
        </Route>
      </Route>
    </Router>
  ),
  document.getElementById("root")!,
);
```

### 5. App 컴포넌트 구조

```typescript
// App.tsx
import { RouteSectionProps } from "@solidjs/router";
import { ConfigContext } from "@simplysm/solid";

export function App(props: RouteSectionProps) {
  return (
    <ConfigContext.Provider value={{ clientName: "solid-demo" }}>
      {props.children}
    </ConfigContext.Provider>
  );
}
```

> **Note**: SolidJS Router 권장사항에 따라 root layout(App)에 ConfigContext.Provider를 배치합니다.

### 6. Home 레이아웃 구조

```typescript
// layouts/Home.tsx
import { Suspense } from "solid-js";
import { RouteSectionProps } from "@solidjs/router";
import {
  Button,
  Sidebar,
  SidebarContainer,
  SidebarMenu,
  SidebarUser,
  useSidebarContext,
  type SidebarMenuItem,
} from "@simplysm/solid";
import { IconHome, IconMenu2, IconSettings, IconLayoutList, IconFold, IconLayoutSidebar } from "@tabler/icons-solidjs";

// Home.tsx에 직접 정의 (@simplysm/solid에 없음)
const SidebarToggleButton = () => {
  const { setToggle } = useSidebarContext();
  return (
    <Button variant="ghost" onClick={() => setToggle((v) => !v)} class="p-2">
      <IconMenu2 class="size-6" />
    </Button>
  );
};

const menuItems: SidebarMenuItem[] = [
  { title: "메인", href: "/home", icon: IconHome },
  {
    title: "Controls",
    icon: IconSettings,
    children: [
      { title: "Button", href: "/home/controls/button" },
    ],
  },
  {
    title: "Data",
    icon: IconLayoutList,
    children: [
      { title: "List", href: "/home/data/list" },
    ],
  },
  {
    title: "Disclosure",
    icon: IconFold,
    children: [
      { title: "Collapse", href: "/home/disclosure/collapse" },
    ],
  },
  {
    title: "Navigation",
    icon: IconLayoutSidebar,
    children: [
      { title: "Sidebar", href: "/home/navigation/sidebar" },
    ],
  },
];

export function Home(props: RouteSectionProps) {
  return (
    <SidebarContainer>
      <Sidebar>
        <SidebarUser
          menus={[
            { title: "프로필", onClick: () => alert("프로필") },
            { title: "설정", onClick: () => alert("설정") },
            { title: "로그아웃", onClick: () => alert("로그아웃") },
          ]}
        >
          {/* 사용자 정보 영역 - 기존 코드 참고 */}
        </SidebarUser>
        <SidebarMenu menus={menuItems} />
      </Sidebar>
      <main class="h-full overflow-auto p-4">
        <div class="mb-4">
          <SidebarToggleButton />
        </div>
        <Suspense fallback={<div>로딩 중...</div>}>
          {props.children}
        </Suspense>
      </main>
    </SidebarContainer>
  );
}
```

### 7. 페이지 콘텐츠

| 페이지 | 콘텐츠 |
|--------|--------|
| MainPage | 간단한 환영 메시지 ("Welcome to solid-demo" 등) |
| NotFoundPage | "페이지를 찾을 수 없습니다" 메시지 + /home 링크 |
| ButtonPage | 기존 Button 데모 코드 그대로 이전 |
| ListPage | 기존 List 데모 코드 그대로 이전 |
| CollapsePage | 기존 Collapse 데모 코드 그대로 이전 |
| SidebarPage | 기존 코드 그대로 이전 (h-96 컨테이너 안에 SidebarContainer 배치) |

## 결정사항

1. **기본 진입 경로**: "/" → "/home" 리다이렉트
2. **페이지 분류**: solid 패키지의 컴포넌트 분류 체계(controls, data, disclosure, navigation) 적용
3. **Suspense fallback UI**: 단순 텍스트 ("로딩 중...")
4. **404 페이지 처리**: "페이지를 찾을 수 없습니다" 메시지 표시
5. **MainPage 내용**: 간단한 환영 메시지만
6. **URL prefix**: `/home` prefix 유지 (향후 `/login` 등 사이드바 없는 페이지 추가를 위해)
7. **SidebarPage**: 기존 패턴 유지 (h-96 컨테이너 안에 미니 데모)
8. **데모 코드 이전**: 기존 코드 그대로 이전 (정리 없이)
9. **향후 확장**: `/login` 등 사이드바 없는 페이지는 App 아래에 위치 (ConfigContext 공유)
10. **404 레이아웃**: Sidebar 표시 유지 (Home 레이아웃 내부)
11. **Suspense 위치**: Home 내부 (Sidebar 유지, Content 영역만 로딩 상태)
12. **export 방식**: 데모 페이지는 default export 사용
13. **ConfigContext.Provider 위치**: App.tsx (SolidJS Router 권장사항)
14. **Props 타입**: RouteSectionProps 사용 (@solidjs/router 공식 타입)
15. **SidebarToggleButton**: Home.tsx에 직접 정의 (@simplysm/solid에 없음)
16. **메뉴 아이콘**: 그룹(Controls, Data 등)에도 아이콘 추가

## 미결 사항

없음
