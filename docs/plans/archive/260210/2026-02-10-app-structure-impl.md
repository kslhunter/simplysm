# createAppStructure 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 하나의 구조 정의 객체에서 메뉴, 라우트, 권한을 파생하는 `createAppStructure()` 유틸리티 구현

**Architecture:** Provider/Context 없이 reactive primitive로 구현. `createMemo`로 모듈/권한 필터링된 메뉴를 반응형으로 제공하고, 라우트는 정적 배열로 추출. solid-demo의 라우트 구조도 함께 수정.

**Tech Stack:** SolidJS (createMemo), @solidjs/router, TypeScript, Vitest + @solidjs/testing-library

---

### Task 1: createAppStructure 유틸리티 생성

**Files:**

- Create: `packages/solid/src/utils/createAppStructure.ts`

**Step 1: 파일 생성 — 타입 정의 + 함수 구현**

```typescript
import { type Accessor, createMemo } from "solid-js";
import type { Component } from "solid-js";
import type { IconProps } from "@tabler/icons-solidjs";
import type { SidebarMenuItem } from "../components/layout/sidebar/SidebarMenu";

// ── 입력 타입 ──

export interface AppStructureGroupItem<TModule> {
  code: string;
  title: string;
  icon?: Component<IconProps>;
  modules?: TModule[];
  requiredModules?: TModule[];
  children: AppStructureItem<TModule>[];
}

export interface AppStructureLeafItem<TModule> {
  code: string;
  title: string;
  icon?: Component<IconProps>;
  modules?: TModule[];
  requiredModules?: TModule[];
  component?: Component;
  perms?: ("use" | "edit")[];
  subPerms?: AppStructureSubPerm<TModule>[];
  isNotMenu?: boolean;
}

export type AppStructureItem<TModule> = AppStructureGroupItem<TModule> | AppStructureLeafItem<TModule>;

export interface AppStructureSubPerm<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  perms: ("use" | "edit")[];
}

// ── 출력 타입 ──

export interface AppRoute {
  path: string;
  component: Component;
}

export interface AppFlatMenu {
  titleChain: string[];
  href: string;
}

export interface AppStructure<TModule> {
  items: AppStructureItem<TModule>[];
  routes: AppRoute[];
  usableMenus: Accessor<SidebarMenuItem[]>;
  usableFlatMenus: Accessor<AppFlatMenu[]>;
  permRecord: Accessor<Record<string, boolean>>;
}

// ── 내부 헬퍼 ──

function isGroupItem<TModule>(item: AppStructureItem<TModule>): item is AppStructureGroupItem<TModule> {
  return "children" in item;
}

function checkModules<TModule>(
  modules: TModule[] | undefined,
  requiredModules: TModule[] | undefined,
  usableModules: TModule[] | undefined,
): boolean {
  if (usableModules === undefined) return true;

  if (modules !== undefined && modules.length > 0) {
    if (!modules.some((m) => usableModules.includes(m))) return false;
  }

  if (requiredModules !== undefined && requiredModules.length > 0) {
    if (!requiredModules.every((m) => usableModules.includes(m))) return false;
  }

  return true;
}

/** 트리에서 component가 있는 리프를 수집하여 상대 경로 배열 반환 */
function collectRoutes<TModule>(items: AppStructureItem<TModule>[], parentCodes: string[], routes: AppRoute[]): void {
  for (const item of items) {
    const codes = [...parentCodes, item.code];

    if (isGroupItem(item)) {
      collectRoutes(item.children, codes, routes);
    } else if (item.component !== undefined) {
      routes.push({
        path: "/" + codes.join("/"),
        component: item.component,
      });
    }
  }
}

/** 최상위 아이템의 children에서 라우트 추출 (상대 경로) */
function extractRoutes<TModule>(items: AppStructureItem<TModule>[]): AppRoute[] {
  const routes: AppRoute[] = [];
  for (const top of items) {
    if (isGroupItem(top)) {
      collectRoutes(top.children, [], routes);
    }
  }
  return routes;
}

/** 필터링된 메뉴 트리 생성 */
function buildMenus<TModule>(
  items: AppStructureItem<TModule>[],
  basePath: string,
  usableModules: TModule[] | undefined,
  permRecord: Record<string, boolean>,
): SidebarMenuItem[] {
  const result: SidebarMenuItem[] = [];

  for (const item of items) {
    if (!checkModules(item.modules, item.requiredModules, usableModules)) continue;

    const href = basePath + "/" + item.code;

    if (isGroupItem(item)) {
      const children = buildMenus(item.children, href, usableModules, permRecord);
      if (children.length > 0) {
        result.push({ title: item.title, icon: item.icon, children });
      }
    } else {
      if (item.isNotMenu) continue;
      if (item.perms?.includes("use") && !permRecord[href + "/use"]) continue;

      result.push({ title: item.title, href, icon: item.icon });
    }
  }

  return result;
}

/** SidebarMenuItem 트리를 평탄화 */
function flattenMenus(menus: SidebarMenuItem[], titleChain: string[] = []): AppFlatMenu[] {
  const result: AppFlatMenu[] = [];

  for (const menu of menus) {
    const chain = [...titleChain, menu.title];

    if (menu.children !== undefined) {
      result.push(...flattenMenus(menu.children, chain));
    } else if (menu.href !== undefined) {
      result.push({ titleChain: chain, href: menu.href });
    }
  }

  return result;
}

// ── 메인 함수 ──

export function createAppStructure<TModule>(opts: {
  items: AppStructureItem<TModule>[];
  usableModules?: Accessor<TModule[] | undefined>;
  permRecord?: Accessor<Record<string, boolean>>;
}): AppStructure<TModule> {
  const permRecord = () => opts.permRecord?.() ?? {};

  const routes = extractRoutes(opts.items);

  const usableMenus = createMemo(() => {
    const menus: SidebarMenuItem[] = [];
    for (const top of opts.items) {
      if (isGroupItem(top)) {
        menus.push(...buildMenus(top.children, "/" + top.code, opts.usableModules?.(), permRecord()));
      }
    }
    return menus;
  });

  const usableFlatMenus = createMemo(() => flattenMenus(usableMenus()));

  return {
    items: opts.items,
    routes,
    usableMenus,
    usableFlatMenus,
    permRecord,
  };
}
```

**Step 2: 타입체크 확인**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

---

### Task 2: 테스트 작성

**Files:**

- Create: `packages/solid/tests/utils/createAppStructure.spec.tsx`

**Step 1: 테스트 파일 생성**

```tsx
import { describe, it, expect } from "vitest";
import { createRoot, createSignal } from "solid-js";
import type { Component } from "solid-js";
import { createAppStructure, type AppStructureItem } from "../../src/utils/createAppStructure";

// 테스트용 더미 컴포넌트
const DummyA: Component = () => null;
const DummyB: Component = () => null;
const DummyC: Component = () => null;
const DummyD: Component = () => null;

// 공통 테스트 구조
function createTestItems(): AppStructureItem<string>[] {
  return [
    {
      code: "home",
      title: "홈",
      children: [
        {
          code: "sales",
          title: "영업",
          modules: ["sales"],
          children: [
            {
              code: "invoice",
              title: "송장",
              component: DummyA,
              perms: ["use", "edit"] as ("use" | "edit")[],
            },
            {
              code: "order",
              title: "주문",
              component: DummyB,
              perms: ["use"] as ("use" | "edit")[],
              requiredModules: ["sales", "erp"],
            },
          ],
        },
        {
          code: "admin",
          title: "관리",
          children: [
            {
              code: "users",
              title: "사용자",
              component: DummyC,
            },
            {
              code: "hidden",
              title: "숨김",
              component: DummyD,
              isNotMenu: true,
            },
          ],
        },
      ],
    },
  ];
}

describe("createAppStructure", () => {
  describe("routes", () => {
    it("리프 아이템의 상대 경로를 추출한다", () => {
      createRoot((dispose) => {
        const result = createAppStructure({ items: createTestItems() });

        expect(result.routes).toEqual([
          { path: "/sales/invoice", component: DummyA },
          { path: "/sales/order", component: DummyB },
          { path: "/admin/users", component: DummyC },
          { path: "/admin/hidden", component: DummyD },
        ]);

        dispose();
      });
    });

    it("component가 없는 아이템은 라우트에 포함되지 않는다", () => {
      createRoot((dispose) => {
        const items: AppStructureItem<string>[] = [
          {
            code: "home",
            title: "홈",
            children: [{ code: "about", title: "소개" }],
          },
        ];

        const result = createAppStructure({ items });
        expect(result.routes).toEqual([]);

        dispose();
      });
    });
  });

  describe("usableMenus", () => {
    it("필터 없으면 모든 메뉴가 표시된다 (isNotMenu 제외)", () => {
      createRoot((dispose) => {
        const result = createAppStructure({ items: createTestItems() });
        const menus = result.usableMenus();

        // 최상위에 "영업", "관리" 2개 그룹
        expect(menus).toHaveLength(2);
        expect(menus[0].title).toBe("영업");
        expect(menus[0].children).toHaveLength(2);
        expect(menus[1].title).toBe("관리");
        // "숨김"은 isNotMenu이므로 "사용자"만 표시
        expect(menus[1].children).toHaveLength(1);
        expect(menus[1].children![0].title).toBe("사용자");

        dispose();
      });
    });

    it("href가 올바른 전체 경로로 생성된다", () => {
      createRoot((dispose) => {
        const result = createAppStructure({ items: createTestItems() });
        const menus = result.usableMenus();

        expect(menus[0].children![0].href).toBe("/home/sales/invoice");
        expect(menus[1].children![0].href).toBe("/home/admin/users");

        dispose();
      });
    });

    it("modules OR 필터링: 모듈이 없으면 해당 그룹이 숨겨진다", () => {
      createRoot((dispose) => {
        const [modules] = createSignal<string[]>(["erp"]);

        const result = createAppStructure({
          items: createTestItems(),
          usableModules: modules,
        });

        const menus = result.usableMenus();
        // "영업" 그룹은 modules: ["sales"] → "erp"에 없으므로 숨김
        // "관리" 그룹은 modules 없음 → 표시
        expect(menus).toHaveLength(1);
        expect(menus[0].title).toBe("관리");

        dispose();
      });
    });

    it("requiredModules AND 필터링: 모든 모듈이 있어야 표시된다", () => {
      createRoot((dispose) => {
        const [modules] = createSignal<string[]>(["sales"]);

        const result = createAppStructure({
          items: createTestItems(),
          usableModules: modules,
        });

        const menus = result.usableMenus();
        // "영업" 그룹 표시 (modules: ["sales"] 통과)
        // "송장" 표시 (requiredModules 없음)
        // "주문" 숨김 (requiredModules: ["sales", "erp"], "erp" 없음)
        expect(menus[0].children).toHaveLength(1);
        expect(menus[0].children![0].title).toBe("송장");

        dispose();
      });
    });

    it("permRecord 필터링: use 권한이 없으면 숨겨진다", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": false,
          "/home/sales/order/use": true,
        });

        const [modules] = createSignal<string[]>(["sales", "erp"]);

        const result = createAppStructure({
          items: createTestItems(),
          usableModules: modules,
          permRecord: perms,
        });

        const menus = result.usableMenus();
        // "송장" 숨김 (use=false), "주문" 표시 (use=true)
        expect(menus[0].children).toHaveLength(1);
        expect(menus[0].children![0].title).toBe("주문");

        dispose();
      });
    });

    it("perms가 없는 리프는 권한 체크 없이 항상 표시된다", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({});

        const result = createAppStructure({
          items: createTestItems(),
          permRecord: perms,
        });

        const menus = result.usableMenus();
        // "사용자"는 perms 없으므로 표시
        expect(menus[1].children![0].title).toBe("사용자");

        dispose();
      });
    });

    it("자식이 모두 필터링되면 그룹도 숨겨진다", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": false,
          "/home/sales/order/use": false,
        });

        const [modules] = createSignal<string[]>(["sales", "erp"]);

        const result = createAppStructure({
          items: createTestItems(),
          usableModules: modules,
          permRecord: perms,
        });

        const menus = result.usableMenus();
        // "영업" 그룹의 자식이 모두 숨겨졌으므로 그룹도 숨김
        expect(menus[0].title).toBe("관리");

        dispose();
      });
    });

    it("usableModules가 변경되면 메뉴가 재계산된다", () => {
      createRoot((dispose) => {
        const [modules, setModules] = createSignal<string[] | undefined>(undefined);

        const result = createAppStructure({
          items: createTestItems(),
          usableModules: modules,
        });

        // 초기: 모든 메뉴 표시
        expect(result.usableMenus()).toHaveLength(2);

        // 모듈 설정: sales만
        setModules(["sales"]);
        expect(result.usableMenus()[0].title).toBe("영업");
        // "주문"은 requiredModules: ["sales", "erp"]이므로 숨김
        expect(result.usableMenus()[0].children).toHaveLength(1);

        dispose();
      });
    });
  });

  describe("usableFlatMenus", () => {
    it("트리를 평탄화하여 titleChain과 href를 반환한다", () => {
      createRoot((dispose) => {
        const result = createAppStructure({ items: createTestItems() });
        const flat = result.usableFlatMenus();

        expect(flat).toContainEqual({
          titleChain: ["영업", "송장"],
          href: "/home/sales/invoice",
        });
        expect(flat).toContainEqual({
          titleChain: ["관리", "사용자"],
          href: "/home/admin/users",
        });

        dispose();
      });
    });
  });
});
```

**Step 2: 테스트 실행**

Run: `pnpm vitest packages/solid/tests/utils/createAppStructure.spec.tsx --project=solid --run`
Expected: 모든 테스트 PASS

---

### Task 3: index.ts에 export 추가

**Files:**

- Modify: `packages/solid/src/index.ts`

**Step 1: export 추가**

`index.ts` 파일 끝에 추가:

```typescript
// app-structure
export { createAppStructure } from "./utils/createAppStructure";
export type {
  AppStructureItem,
  AppStructureGroupItem,
  AppStructureLeafItem,
  AppStructureSubPerm,
  AppRoute,
  AppFlatMenu,
  AppStructure,
} from "./utils/createAppStructure";
```

**Step 2: 타입체크 확인**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add packages/solid/src/utils/createAppStructure.ts packages/solid/tests/utils/createAppStructure.spec.tsx packages/solid/src/index.ts
git commit -m "feat(solid): createAppStructure 유틸리티 추가

단일 구조 정의에서 메뉴/라우트/권한을 파생하는 reactive primitive.
모듈(OR/AND) 및 권한 필터링 지원.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: solid-demo 라우트 구조 수정 및 AppStructure 적용

**Files:**

- Create: `packages/solid-demo/src/appStructure.ts`
- Modify: `packages/solid-demo/src/main.tsx`
- Modify: `packages/solid-demo/src/pages/Home.tsx`

**Step 1: appStructure.ts 생성**

```typescript
import { lazy } from "solid-js";
import { createAppStructure } from "@simplysm/solid";
import {
  IconBell,
  IconCards,
  IconForms,
  IconHome,
  IconLayoutList,
  IconLayoutSidebar,
  IconPlug,
  IconWindowMaximize,
} from "@tabler/icons-solidjs";
import { MainPage } from "./pages/main/MainPage";

export const appStructure = createAppStructure({
  items: [
    {
      code: "home",
      title: "홈",
      children: [
        {
          code: "main",
          title: "메인",
          icon: IconHome,
          component: MainPage,
        },
        {
          code: "form-control",
          title: "Form Control",
          icon: IconForms,
          children: [
            { code: "button", title: "Button", component: lazy(() => import("./pages/form-control/ButtonPage")) },
            { code: "select", title: "Select", component: lazy(() => import("./pages/form-control/SelectPage")) },
            { code: "field", title: "Field", component: lazy(() => import("./pages/form-control/FieldPage")) },
            {
              code: "theme-toggle",
              title: "ThemeToggle",
              component: lazy(() => import("./pages/form-control/ThemeTogglePage")),
            },
            {
              code: "checkbox-radio",
              title: "CheckBox & Radio",
              component: lazy(() => import("./pages/form-control/CheckBoxRadioPage")),
            },
            {
              code: "checkbox-radio-group",
              title: "CheckBoxGroup & RadioGroup",
              component: lazy(() => import("./pages/form-control/CheckBoxRadioGroupPage")),
            },
            {
              code: "date-range-picker",
              title: "DateRangePicker",
              component: lazy(() => import("./pages/form-control/DateRangePickerPage")),
            },
            {
              code: "rich-text-editor",
              title: "RichTextEditor",
              component: lazy(() => import("./pages/form-control/RichTextEditorPage")),
            },
            { code: "numpad", title: "Numpad", component: lazy(() => import("./pages/form-control/NumpadPage")) },
            {
              code: "state-preset",
              title: "StatePreset",
              component: lazy(() => import("./pages/form-control/StatePresetPage")),
            },
          ],
        },
        {
          code: "layout",
          title: "Layout",
          icon: IconLayoutSidebar,
          children: [
            { code: "sidebar", title: "Sidebar", component: lazy(() => import("./pages/layout/SidebarPage")) },
            { code: "topbar", title: "Topbar", component: lazy(() => import("./pages/layout/TopbarPage")) },
            { code: "form-group", title: "FormGroup", component: lazy(() => import("./pages/layout/FormGroupPage")) },
            { code: "form-table", title: "FormTable", component: lazy(() => import("./pages/layout/FormTablePage")) },
          ],
        },
        {
          code: "data",
          title: "Data",
          icon: IconLayoutList,
          children: [
            { code: "list", title: "List", component: lazy(() => import("./pages/data/ListPage")) },
            { code: "table", title: "Table", component: lazy(() => import("./pages/data/TablePage")) },
            { code: "pagination", title: "Pagination", component: lazy(() => import("./pages/data/PaginationPage")) },
            { code: "sheet", title: "Sheet", component: lazy(() => import("./pages/data/SheetPage")) },
            { code: "sheet-full", title: "Sheet (Full)", component: lazy(() => import("./pages/data/SheetFullPage")) },
            { code: "kanban", title: "Kanban", component: lazy(() => import("./pages/data/KanbanPage")) },
            { code: "calendar", title: "Calendar", component: lazy(() => import("./pages/data/CalendarPage")) },
          ],
        },
        {
          code: "disclosure",
          title: "Disclosure",
          icon: IconWindowMaximize,
          children: [
            { code: "collapse", title: "Collapse", component: lazy(() => import("./pages/disclosure/CollapsePage")) },
            { code: "dropdown", title: "Dropdown", component: lazy(() => import("./pages/disclosure/DropdownPage")) },
            { code: "modal", title: "Modal", component: lazy(() => import("./pages/disclosure/ModalPage")) },
          ],
        },
        {
          code: "navigation",
          title: "Navigation",
          icon: IconLayoutSidebar,
          children: [{ code: "tab", title: "Tab", component: lazy(() => import("./pages/navigation/TabPage")) }],
        },
        {
          code: "display",
          title: "Display",
          icon: IconCards,
          children: [
            { code: "card", title: "Card", component: lazy(() => import("./pages/display/CardPage")) },
            { code: "icon", title: "Icon", component: lazy(() => import("./pages/display/IconPage")) },
            { code: "label", title: "Label", component: lazy(() => import("./pages/display/LabelPage")) },
            { code: "note", title: "Note", component: lazy(() => import("./pages/display/NotePage")) },
            { code: "barcode", title: "Barcode", component: lazy(() => import("./pages/display/BarcodePage")) },
            { code: "echarts", title: "Echarts", component: lazy(() => import("./pages/display/EchartsPage")) },
            { code: "progress", title: "Progress", component: lazy(() => import("./pages/display/ProgressPage")) },
          ],
        },
        {
          code: "feedback",
          title: "Feedback",
          icon: IconBell,
          children: [
            {
              code: "notification",
              title: "Notification",
              component: lazy(() => import("./pages/feedback/NotificationPage")),
            },
            { code: "busy", title: "Busy", component: lazy(() => import("./pages/feedback/BusyPage")) },
            { code: "print", title: "Print", component: lazy(() => import("./pages/feedback/PrintPage")) },
          ],
        },
        {
          code: "service",
          title: "Service",
          icon: IconPlug,
          children: [
            {
              code: "client",
              title: "ServiceClient",
              component: lazy(() => import("./pages/service/ServiceClientPage")),
            },
          ],
        },
      ],
    },
  ],
});
```

**Step 2: main.tsx 수정 — 라우트 구조 개선 + appStructure 적용**

전체 파일 교체:

```typescript
import { render } from "solid-js/web";
import { HashRouter, Navigate, Route } from "@solidjs/router";
import { App } from "./App";
import { Home } from "./pages/Home";
import { NotFoundPage } from "./pages/NotFoundPage";
import { appStructure } from "./appStructure";
import "./main.css";

render(
  () => (
    <HashRouter>
      <Route path="/" component={App}>
        {/* Home 레이아웃 외부 라우트 */}
        <Route path="/mobile-layout-demo" component={(await import("solid-js")).lazy(() => import("./pages/mobile/MobileLayoutDemoPage"))} />
        {/* Home 레이아웃 내부 */}
        <Route path="/home" component={Home}>
          <Route path="/" component={() => <Navigate href="/home/main" />} />
          {appStructure.routes.map((r) => (
            <Route path={r.path} component={r.component} />
          ))}
          <Route path="/*" component={NotFoundPage} />
        </Route>
        {/* 루트 리다이렉트 */}
        <Route path="/" component={() => <Navigate href="/home" />} />
      </Route>
    </HashRouter>
  ),
  document.getElementById("root")!,
);
```

> **주의**: `mobile-layout-demo`의 lazy import 처리. 기존 코드의 `lazy` import를 유지.

실제 코드는 아래와 같이 작성:

```typescript
import { render } from "solid-js/web";
import { HashRouter, Navigate, Route } from "@solidjs/router";
import { lazy } from "solid-js";
import { App } from "./App";
import { Home } from "./pages/Home";
import { NotFoundPage } from "./pages/NotFoundPage";
import { appStructure } from "./appStructure";
import "./main.css";

render(
  () => (
    <HashRouter>
      <Route path="/" component={App}>
        <Route path="/mobile-layout-demo" component={lazy(() => import("./pages/mobile/MobileLayoutDemoPage"))} />
        <Route path="/home" component={Home}>
          <Route path="/" component={() => <Navigate href="/home/main" />} />
          {appStructure.routes.map((r) => (
            <Route path={r.path} component={r.component} />
          ))}
          <Route path="/*" component={NotFoundPage} />
        </Route>
        <Route path="/" component={() => <Navigate href="/home" />} />
      </Route>
    </HashRouter>
  ),
  document.getElementById("root")!,
);
```

**Step 3: Home.tsx 수정 — menuItems 제거, appStructure 사용**

```typescript
import { Show, Suspense } from "solid-js";
import type { RouteSectionProps } from "@solidjs/router";
import { Icon, Sidebar, ThemeToggle } from "@simplysm/solid";
import { env } from "@simplysm/core-common";
import { IconUser } from "@tabler/icons-solidjs";
import { appStructure } from "../appStructure";

export function Home(props: RouteSectionProps) {
  return (
    <Sidebar.Container>
      <Sidebar>
        <div class="flex items-center justify-between p-2 px-4">
          <img src="logo-landscape.png" alt="SIMPLYSM" class="h-9 w-auto" />
          <ThemeToggle size="sm" />
        </div>
        <Sidebar.User
          menus={[
            { title: "설정", onClick: () => alert("설정") },
            { title: "로그아웃", onClick: () => alert("로그아웃") },
          ]}
        >
          <div class="relative flex flex-1 items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-full bg-primary-500 text-white">
              <Icon icon={IconUser} class="size-6" />
            </div>
            <div class="flex flex-col">
              <span class="font-semibold">홍길동</span>
              <span class="text-sm text-base-500 dark:text-base-400">hong@example.com</span>
            </div>
          </div>
        </Sidebar.User>
        <Sidebar.Menu menus={appStructure.usableMenus()} />
        <Show when={env.VER}>
          <div class="pointer-events-none absolute bottom-0 left-0 px-2 py-1 text-sm text-black/30 dark:text-white/30">
            v{env.VER}
            <Show when={env.DEV}>_dev</Show>
          </div>
        </Show>
      </Sidebar>
      <main class="h-full overflow-auto">
        <Suspense fallback={<div>로딩 중...</div>}>{props.children}</Suspense>
      </main>
    </Sidebar.Container>
  );
}
```

**Step 4: 타입체크**

Run: `pnpm typecheck packages/solid-demo`
Expected: 에러 없음

**Step 5: 린트**

Run: `pnpm lint packages/solid-demo`
Expected: 에러 없음

**Step 6: dev 서버로 동작 확인**

Run: `pnpm dev`
확인 사항:

- 사이드바 메뉴가 기존과 동일하게 표시되는지
- 각 메뉴 클릭 시 올바른 페이지로 이동하는지
- `/home` 접속 시 `/home/main`으로 리다이렉트되는지
- 메뉴 선택 상태(하이라이트)가 올바른지

**Step 7: 커밋**

```bash
git add packages/solid-demo/src/appStructure.ts packages/solid-demo/src/main.tsx packages/solid-demo/src/pages/Home.tsx
git commit -m "refactor(solid-demo): createAppStructure로 메뉴/라우트 통합 관리

- 라우트 구조를 중첩 상대 경로로 수정
- menuItems 하드코딩 제거, appStructure.usableMenus() 사용
- appStructure.routes로 라우트 자동 생성

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: 최종 검증

**Step 1: 전체 타입체크**

Run: `pnpm typecheck`
Expected: 에러 없음

**Step 2: 전체 린트**

Run: `pnpm lint`
Expected: 에러 없음

**Step 3: solid 테스트**

Run: `pnpm vitest --project=solid --run`
Expected: 모든 테스트 PASS (createAppStructure 포함)
