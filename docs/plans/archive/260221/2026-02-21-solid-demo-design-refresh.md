# solid-demo Design Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Apply client-admin design patterns to solid-demo for a more polished, consistent UI.

**Architecture:** Move Topbar from individual pages to the shared Home layout. Redesign LoginPage with Card component and icons. Standardize section headers across all demo pages.

**Tech Stack:** SolidJS, @simplysm/solid (Card, Link, Topbar, NotificationBell, ThemeToggle), @tabler/icons-solidjs, Tailwind CSS

---

### Task 1: Redesign LoginPage

**Files:**
- Modify: `packages/solid-demo/src/pages/LoginPage.tsx`

**No tests** (demo page, no corresponding test file)

**Step 1: Rewrite LoginPage**

Replace the entire LoginPage with the client-admin-inspired design:

```tsx
import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Button, Card, FormGroup, Link, TextInput, ThemeToggle } from "@simplysm/solid";
import clsx from "clsx";
import { IconLock, IconMail } from "@tabler/icons-solidjs";

export default function LoginPage() {
  const navigate = useNavigate();

  const [id, setId] = createSignal("");
  const [pw, setPw] = createSignal("");

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    navigate("/home");
  }

  return (
    <div
      class={clsx(
        "flex items-center justify-center",
        "pb-64",
        "bg-base-100 dark:bg-base-900",
      )}
    >
      <div class="max-w-sm">
        {/* Logo */}
        <div class={clsx("flex justify-center", "mb-4", "animate-fade-in")}>
          <img src="../../../../packages/solid-demo/public/logo-landscape.png" alt="SIMPLYSM"
               class="h-12 w-auto" />
        </div>

        <Card class={clsx("rounded-2xl p-8", "[animation-delay:0.3s]")}>
          {/* Form */}
          <form onSubmit={handleSubmit}>
            <FormGroup class="w-full">
              <FormGroup.Item>
                <TextInput
                  prefixIcon={IconMail}
                  class="w-full"
                  placeholder="아이디를 입력하세요"
                  size="lg"
                  required
                  touchMode
                  value={id()}
                  onValueChange={setId}
                />
              </FormGroup.Item>
              <FormGroup.Item>
                <TextInput
                  prefixIcon={IconLock}
                  class="w-full"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  size="lg"
                  required
                  touchMode
                  value={pw()}
                  onValueChange={setPw}
                />
              </FormGroup.Item>
              <FormGroup.Item>
                <Button theme="primary" variant="solid" class="w-full" type="submit" size="xl">
                  로그인
                </Button>
              </FormGroup.Item>
              <FormGroup.Item class="flex flex-row justify-center gap-3 pt-4">
                <Link onClick={() => alert("비밀번호 변경")} class="text-sm text-base-500">
                  비밀번호 변경
                </Link>
                <span class="text-base-300 dark:text-base-600">|</span>
                <Link onClick={() => alert("회원가입")} class="text-sm text-base-500">
                  회원가입
                </Link>
              </FormGroup.Item>
            </FormGroup>
          </form>
        </Card>
      </div>

      <ThemeToggle class="fixed bottom-4 right-4" size="sm" />
    </div>
  );
}
```

Key changes from current:
- `Card` component (has built-in `animate-fade-in`)
- Neutral background (`bg-base-100 dark:bg-base-900`)
- `prefixIcon` on TextInput fields
- `Link` component instead of raw `<span>`
- FormGroup wraps login button and links
- Logo has separate `animate-fade-in`

**Step 2: Verify**

Run: `pnpm typecheck packages/solid-demo && pnpm lint packages/solid-demo`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid-demo/src/pages/LoginPage.tsx
git commit -m "style(solid-demo): redesign LoginPage with Card, icons, animations"
```

---

### Task 2: Redesign Home layout with Topbar

**Files:**
- Modify: `packages/solid-demo/src/pages/Home.tsx`

**No tests** (layout component, no test file)

**Step 1: Rewrite Home.tsx**

```tsx
import { Show, Suspense } from "solid-js";
import { useNavigate, useLocation, type RouteSectionProps } from "@solidjs/router";
import { NotificationBell, Sidebar, ThemeToggle, Topbar } from "@simplysm/solid";
import { env } from "@simplysm/core-common";
import { appStructure } from "../appStructure";

export function Home(props: RouteSectionProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const titleChain = () => {
    const chain = appStructure.getTitleChainByHref(location.pathname);
    return chain.length > 1 ? chain.slice(1) : chain;
  };

  return (
    <Sidebar.Container>
      <Sidebar>
        <div class="p-2 px-4">
          <img src="logo-landscape.png" alt="SIMPLYSM" class="h-9 w-auto" />
        </div>
        <Sidebar.User
          name="홍길동"
          description="hong@example.com"
          menus={[
            { title: "설정", onClick: () => alert("설정") },
            { title: "로그아웃", onClick: () => navigate("/login") },
          ]}
        />
        <Sidebar.Menu menus={appStructure.usableMenus()} class="flex-1" />
        <Show when={env.VER}>
          <div class="pointer-events-none px-2 py-1 text-sm text-black/30 dark:text-white/30">
            v{env.VER}
            <Show when={env.DEV}>(dev)</Show>
          </div>
        </Show>
      </Sidebar>

      <Topbar.Container>
        <Topbar>
          <span class="ml-2 mr-6 text-lg font-bold">{titleChain().join(" > ")}</span>
          <div class="flex-1" />
          <NotificationBell />
          <ThemeToggle size="sm" />
        </Topbar>

        <main class="flex-1 overflow-auto">
          <Suspense fallback={<div>로딩 중...</div>}>{props.children}</Suspense>
        </main>
      </Topbar.Container>
    </Sidebar.Container>
  );
}
```

Key changes:
- Added `Topbar.Container` + `Topbar` with breadcrumb title
- `ThemeToggle` moved from Sidebar to Topbar right side
- `NotificationBell` added in Topbar
- Version info: removed `absolute`, uses normal flow
- `Sidebar.Menu` gets `class="flex-1"` to push version to bottom
- `<main>` is now inside `Topbar.Container` with `flex-1 overflow-auto`
- `useLocation` added for breadcrumb

**Step 2: Verify**

Run: `pnpm typecheck packages/solid-demo && pnpm lint packages/solid-demo`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid-demo/src/pages/Home.tsx
git commit -m "style(solid-demo): add Topbar with breadcrumb to Home layout"
```

---

### Task 3: Update form-control pages (12 files)

**Files:**
- Modify: `packages/solid-demo/src/pages/form-control/ButtonPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/SelectPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/ComboboxPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/FieldPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/ColorPickerPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/CheckBoxRadioPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/CheckBoxRadioGroupPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/DateRangePickerPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/RichTextEditorPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/NumpadPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/StatePresetPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/ThemeTogglePage.tsx`

**Mechanical changes for each file:**

1. Remove `Topbar` from imports (keep other imports from `@simplysm/solid`)
2. Remove `<Topbar.Container>` wrapper
3. Remove `<Topbar><h1 class="m-0 text-base">...</h1></Topbar>`
4. Remove `<div class="flex-1 overflow-auto p-6">` wrapper
5. Top-level element becomes `<div class="space-y-8 p-6">`
6. Update all `<h2>` section headers:
   - `text-xl font-bold` → `border-l-4 border-primary-500 pl-3 text-lg font-bold`
   - `text-2xl font-bold` → `border-l-4 border-primary-500 pl-3 text-lg font-bold`

**Example transformation (ButtonPage.tsx):**

Before:
```tsx
import { Button, Topbar } from "@simplysm/solid";
// ...
return (
  <Topbar.Container>
    <Topbar>
      <h1 class="m-0 text-base">Button</h1>
    </Topbar>
    <div class="flex-1 overflow-auto p-6">
      <div class="space-y-8">
        <section>
          <h2 class="mb-4 text-xl font-bold">Themes & Variants</h2>
```

After:
```tsx
import { Button } from "@simplysm/solid";
// ...
return (
  <div class="space-y-8 p-6">
    <section>
      <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Themes & Variants</h2>
```

**Step 1: Apply changes to all 12 files**
**Step 2: Verify**

Run: `pnpm typecheck packages/solid-demo && pnpm lint packages/solid-demo`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid-demo/src/pages/form-control/
git commit -m "style(solid-demo): remove Topbar wrappers and update headers in form-control pages"
```

---

### Task 4: Update data pages (8 files)

**Files:**
- Modify: `packages/solid-demo/src/pages/data/ListPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/TablePage.tsx`
- Modify: `packages/solid-demo/src/pages/data/PaginationPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/SheetPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/SheetFullPage.tsx` (SPECIAL)
- Modify: `packages/solid-demo/src/pages/data/KanbanPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/CalendarPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/PermissionTablePage.tsx`

**Standard pages** (ListPage, TablePage, PaginationPage, SheetPage, KanbanPage, CalendarPage, PermissionTablePage):
Same mechanical changes as Task 3.

**Special: SheetFullPage.tsx**

SheetFullPage uses full-height DataSheet with `overflow-hidden`. Transform:

Before:
```tsx
return (
  <Topbar.Container>
    <Topbar>
      <h1 class="m-0 text-base">DataSheet (Full)</h1>
      <span class="ml-2 text-sm text-base-500 dark:text-base-400">{employees.length}건</span>
    </Topbar>
    <div class="flex-1 overflow-hidden p-2">
      <DataSheet ... />
    </div>
  </Topbar.Container>
);
```

After:
```tsx
return (
  <div class="flex h-full flex-col overflow-hidden p-2">
    <DataSheet ... />
  </div>
);
```

- Remove Topbar wrapper
- Use `h-full flex flex-col overflow-hidden` to fill `<main>` area
- The item count badge (`{employees.length}건`) moves to be unnecessary since the title is now in Home's Topbar

**Step 1: Apply changes to all 8 files**
**Step 2: Verify**

Run: `pnpm typecheck packages/solid-demo && pnpm lint packages/solid-demo`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid-demo/src/pages/data/
git commit -m "style(solid-demo): remove Topbar wrappers and update headers in data pages"
```

---

### Task 5: Update disclosure + display pages (11 files)

**Files:**
- Modify: `packages/solid-demo/src/pages/disclosure/CollapsePage.tsx`
- Modify: `packages/solid-demo/src/pages/disclosure/DialogPage.tsx`
- Modify: `packages/solid-demo/src/pages/disclosure/DropdownPage.tsx`
- Modify: `packages/solid-demo/src/pages/disclosure/TabPage.tsx`
- Modify: `packages/solid-demo/src/pages/display/AlertPage.tsx`
- Modify: `packages/solid-demo/src/pages/display/BarcodePage.tsx`
- Modify: `packages/solid-demo/src/pages/display/CardPage.tsx`
- Modify: `packages/solid-demo/src/pages/display/EchartsPage.tsx`
- Modify: `packages/solid-demo/src/pages/display/IconPage.tsx`
- Modify: `packages/solid-demo/src/pages/display/LinkPage.tsx`
- Modify: `packages/solid-demo/src/pages/display/TagPage.tsx`

Same mechanical changes as Task 3:
1. Remove `Topbar` import
2. Remove `Topbar.Container` + `Topbar` wrapper
3. Remove `<div class="flex-1 overflow-auto p-6">` wrapper
4. Top-level becomes `<div class="space-y-8 p-6">`
5. Update `<h2>` headers to `border-l-4 border-primary-500 pl-3 text-lg font-bold`

**Step 1: Apply changes to all 11 files**
**Step 2: Verify**

Run: `pnpm typecheck packages/solid-demo && pnpm lint packages/solid-demo`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid-demo/src/pages/disclosure/ packages/solid-demo/src/pages/display/
git commit -m "style(solid-demo): remove Topbar wrappers and update headers in disclosure/display pages"
```

---

### Task 6: Update feedback + layout + service + main pages (12 files)

**Files:**
- Modify: `packages/solid-demo/src/pages/feedback/BusyPage.tsx`
- Modify: `packages/solid-demo/src/pages/feedback/NotificationPage.tsx` (SPECIAL)
- Modify: `packages/solid-demo/src/pages/feedback/PrintPage.tsx`
- Modify: `packages/solid-demo/src/pages/feedback/ProgressPage.tsx`
- Modify: `packages/solid-demo/src/pages/layout/FormGroupPage.tsx`
- Modify: `packages/solid-demo/src/pages/layout/FormTablePage.tsx`
- Modify: `packages/solid-demo/src/pages/layout/SidebarPage.tsx`
- Modify: `packages/solid-demo/src/pages/layout/TopbarPage.tsx`
- Modify: `packages/solid-demo/src/pages/service/ServiceClientPage.tsx` (SPECIAL)
- Modify: `packages/solid-demo/src/pages/service/SharedDataPage.tsx` (SPECIAL)
- Modify: `packages/solid-demo/src/pages/main/MainPage.tsx`
- Modify: `packages/solid-demo/src/pages/NotFoundPage.tsx`

**Standard pages**: Same mechanical changes as Task 3.

**Special: BusyPage.tsx**
Already has no Topbar wrapper. Only update section headers:
- `text-xl font-bold` → `border-l-4 border-primary-500 pl-3 text-lg font-bold`

**Special: NotificationPage.tsx**
- Remove `Topbar.Container` + `Topbar` wrapper
- Remove `NotificationBell` from this page (now in Home's Topbar)
- Remove `NotificationBell` and `Topbar` from imports
- Update section headers

**Special: ServiceClientPage.tsx and SharedDataPage.tsx**
- Remove `Topbar.Container` + `Topbar` wrapper
- Remove `NotificationBell` from these pages (now in Home's Topbar)
- Remove `NotificationBell` and `Topbar` from imports
- Update section headers

**MainPage.tsx**
Remove Topbar wrapper. The welcome card content becomes the direct return:
```tsx
export function MainPage() {
  return (
    <div class="p-6">
      <div class="rounded-lg border border-base-200 bg-base-50 p-8 dark:border-base-700 dark:bg-base-800">
        <h1 class="mb-4 text-2xl font-bold">Welcome to solid-demo</h1>
        <p class="text-base-600 dark:text-base-400">
          왼쪽 사이드바 메뉴에서 각 컴포넌트의 데모를 확인할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
```

**NotFoundPage.tsx**
Already has no Topbar. No changes needed beyond possibly adding padding:
```tsx
export function NotFoundPage() {
  return (
    <div class="p-6">
      <div class="rounded-lg border border-base-200 bg-base-50 p-8 text-center dark:border-base-700 dark:bg-base-800">
        <h1 class="mb-4 text-2xl font-bold">404</h1>
        <p class="mb-4 text-base-600 dark:text-base-400">페이지를 찾을 수 없습니다.</p>
        <A href="/home" class="text-primary-500 hover:underline">홈으로 돌아가기</A>
      </div>
    </div>
  );
}
```

**Step 1: Apply changes to all 12 files**
**Step 2: Verify**

Run: `pnpm typecheck packages/solid-demo && pnpm lint packages/solid-demo`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid-demo/src/pages/feedback/ packages/solid-demo/src/pages/layout/ packages/solid-demo/src/pages/service/ packages/solid-demo/src/pages/main/ packages/solid-demo/src/pages/NotFoundPage.tsx
git commit -m "style(solid-demo): remove Topbar wrappers and update headers in remaining pages"
```

---

## Task Dependencies

```
Task 1 (LoginPage)      ─ independent
Task 2 (Home layout)    ─ independent
Task 3 (form-control)   ─ independent (file-level changes only)
Task 4 (data)           ─ independent
Task 5 (disclosure+display) ─ independent
Task 6 (feedback+layout+service+main) ─ independent
```

All tasks modify different files and can be executed in parallel.

## Final Verification

After all tasks complete:
Run: `pnpm typecheck packages/solid-demo && pnpm lint packages/solid-demo`
