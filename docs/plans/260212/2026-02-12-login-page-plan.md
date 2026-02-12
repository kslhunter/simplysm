# Login Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** solid-demo에 풀스크린 로그인 페이지 UI 데모를 추가한다.

**Architecture:** Home 레이아웃 외부에 `/login` 독립 라우트를 추가하고, 로그인 버튼 클릭 시 `/home`으로, 로그아웃 시 `/login`으로 이동하는 단순 네비게이션 구조. 실제 인증 로직 없음.

**Tech Stack:** SolidJS, @solidjs/router, @simplysm/solid (TextInput, Button, ThemeToggle), Tailwind CSS

---

### Task 1: LoginPage 컴포넌트 생성

**Files:**
- Create: `packages/solid-demo/src/pages/LoginPage.tsx`

**Step 1: Create LoginPage.tsx**

```tsx
import { useNavigate } from "@solidjs/router";
import { TextInput, Button, ThemeToggle } from "@simplysm/solid";
import clsx from "clsx";

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div
      class={clsx(
        "flex h-full items-center justify-center",
        "bg-gradient-to-br from-primary-50 to-primary-100",
        "dark:from-base-900 dark:to-base-800",
      )}
    >
      {/* Card */}
      <div
        class={clsx(
          "w-full max-w-sm rounded-2xl p-8",
          "bg-white shadow-lg",
          "dark:bg-base-800 dark:shadow-base-900/50",
        )}
      >
        {/* Logo */}
        <div class="mb-8 flex justify-center">
          <img src="logo-landscape.png" alt="SIMPLYSM" class="h-10 w-auto" />
        </div>

        {/* Form */}
        <div class="space-y-4">
          <div class="space-y-1">
            <label class="text-sm font-medium text-base-700 dark:text-base-300">아이디</label>
            <TextInput placeholder="아이디를 입력하세요" />
          </div>
          <div class="space-y-1">
            <label class="text-sm font-medium text-base-700 dark:text-base-300">비밀번호</label>
            <TextInput type="password" placeholder="비밀번호를 입력하세요" />
          </div>
        </div>

        {/* Login Button */}
        <div class="mt-6">
          <Button
            theme="primary"
            variant="solid"
            class="w-full"
            onClick={() => navigate("/home")}
          >
            로그인
          </Button>
        </div>

        {/* Links */}
        <div
          class={clsx(
            "mt-4 flex items-center justify-center gap-3",
            "text-sm text-base-500 dark:text-base-400",
          )}
        >
          <span class="cursor-pointer hover:text-primary-500" onClick={() => alert("비밀번호 변경")}>
            비밀번호 변경
          </span>
          <span class="text-base-300 dark:text-base-600">|</span>
          <span class="cursor-pointer hover:text-primary-500" onClick={() => alert("회원가입")}>
            회원가입
          </span>
        </div>
      </div>

      {/* Theme Toggle */}
      <div class="fixed bottom-4 right-4">
        <ThemeToggle size="sm" />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/solid-demo/src/pages/LoginPage.tsx
git commit -m "feat(solid-demo): add LoginPage component"
```

---

### Task 2: main.tsx에 /login 라우트 추가

**Files:**
- Modify: `packages/solid-demo/src/main.tsx:13-24`

**Step 1: Update main.tsx**

변경 사항:
1. `/login` 라우트를 Home 레이아웃 외부에 추가 (기존 `mobile-layout-demo` 패턴)
2. 루트 리다이렉트를 `/home` → `/login`으로 변경

```tsx
// Before (line 13-24):
<Route path="/" component={App}>
  {/* Home 레이아웃 외부 라우트 */}
  <Route path="/mobile-layout-demo" component={lazy(() => import("./pages/mobile/MobileLayoutDemoPage"))} />
  {/* Home 레이아웃 내부 */}
  <Route path="/home" component={Home}>
    <Route path="/" component={() => <Navigate href="/home/main" />} />
    <For each={appStructure.routes}>{(r) => <Route path={r.path} component={r.component} />}</For>
    <Route path="/*" component={NotFoundPage} />
  </Route>
  {/* 루트 리다이렉트 */}
  <Route path="/" component={() => <Navigate href="/home" />} />
</Route>

// After:
<Route path="/" component={App}>
  {/* Home 레이아웃 외부 라우트 */}
  <Route path="/login" component={lazy(() => import("./pages/LoginPage"))} />
  <Route path="/mobile-layout-demo" component={lazy(() => import("./pages/mobile/MobileLayoutDemoPage"))} />
  {/* Home 레이아웃 내부 */}
  <Route path="/home" component={Home}>
    <Route path="/" component={() => <Navigate href="/home/main" />} />
    <For each={appStructure.routes}>{(r) => <Route path={r.path} component={r.component} />}</For>
    <Route path="/*" component={NotFoundPage} />
  </Route>
  {/* 루트 리다이렉트 */}
  <Route path="/" component={() => <Navigate href="/login" />} />
</Route>
```

**Step 2: Commit**

```bash
git add packages/solid-demo/src/main.tsx
git commit -m "feat(solid-demo): add /login route and update root redirect"
```

---

### Task 3: Home.tsx 로그아웃 navigate 연결

**Files:**
- Modify: `packages/solid-demo/src/pages/Home.tsx:1-5,19`

**Step 1: Update Home.tsx**

변경 사항:
1. `useNavigate` import 추가
2. "로그아웃" onClick에서 `alert("로그아웃")` → `navigate("/login")` 변경

```tsx
// Before (line 1):
import { Show, Suspense } from "solid-js";
import type { RouteSectionProps } from "@solidjs/router";

// After:
import { Show, Suspense } from "solid-js";
import { useNavigate, type RouteSectionProps } from "@solidjs/router";

// Before (line 8-9):
export function Home(props: RouteSectionProps) {
  return (

// After:
export function Home(props: RouteSectionProps) {
  const navigate = useNavigate();
  return (

// Before (line 19):
{ title: "로그아웃", onClick: () => alert("로그아웃") },

// After:
{ title: "로그아웃", onClick: () => navigate("/login") },
```

**Step 2: Commit**

```bash
git add packages/solid-demo/src/pages/Home.tsx
git commit -m "feat(solid-demo): connect logout to /login navigation"
```

---

### Task 4: 검증

**Step 1: Lint**

```bash
pnpm lint packages/solid-demo
```

Expected: No errors

**Step 2: Typecheck**

```bash
pnpm typecheck packages/solid-demo
```

Expected: No errors

**Step 3: Visual check (dev server)**

```bash
pnpm dev
```

확인 항목:
- `/login` 페이지에 로고, ID/PW 필드, 로그인 버튼, 링크 표시
- 로그인 버튼 클릭 → `/home/main` 이동
- "비밀번호 변경" 클릭 → alert
- "회원가입" 클릭 → alert
- Home에서 "로그아웃" 클릭 → `/login` 이동
- 다크 모드 토글 작동
