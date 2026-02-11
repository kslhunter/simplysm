# Progress 컴포넌트 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 프로그레스 바 컴포넌트를 구현하고 데모 페이지를 추가한다.

**Architecture:** Label/Note 패턴을 따르는 단순 display 컴포넌트. 루트 div 위에 콘텐츠(텍스트)와 바(절대 위치)를 z-index로 겹치는 구조. themeTokens의 solid 변형으로 바 색상을 결정한다.

**Tech Stack:** SolidJS, Tailwind CSS, clsx, tailwind-merge

---

### Task 1: Progress 컴포넌트 구현

**Files:**

- Create: `packages/solid/src/components/display/Progress.tsx`

**Step 1: 컴포넌트 파일 작성**

```tsx
import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { type SemanticTheme, themeTokens } from "../../styles/tokens.styles";

export type ProgressTheme = SemanticTheme;
export type ProgressSize = "sm" | "lg";

export interface ProgressProps extends JSX.HTMLAttributes<HTMLDivElement> {
  value: number;
  theme?: ProgressTheme;
  size?: ProgressSize;
  inset?: boolean;
}

const baseClass = clsx(
  "relative block w-full",
  "overflow-hidden",
  "rounded",
  "bg-base-200 dark:bg-base-700",
  "border border-base-200 dark:border-base-700",
);

const insetClass = clsx("rounded-none border-0", "bg-transparent");

const contentBaseClass = clsx("relative z-[2]", "text-right", "py-1 px-2");

const sizeClasses: Record<ProgressSize, string> = {
  sm: "py-0.5 px-2",
  lg: "py-2 px-3",
};

const barBaseClass = clsx("absolute top-0 left-0 h-full", "z-[1]");

const barThemeClasses: Record<ProgressTheme, string> = Object.fromEntries(
  Object.entries(themeTokens).map(([theme, t]) => [theme, t.solid]),
) as Record<ProgressTheme, string>;

const formatPercent = (value: number): string => {
  return `${(value * 100).toFixed(2)}%`;
};

export const Progress: ParentComponent<ProgressProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "theme", "size", "inset", "value"]);

  const getRootClass = () => {
    return twMerge(baseClass, local.inset && insetClass, local.class);
  };

  const getContentClass = () => {
    return twMerge(contentBaseClass, local.size && sizeClasses[local.size]);
  };

  const getBarClass = () => {
    const theme = local.theme ?? "primary";
    return twMerge(barBaseClass, barThemeClasses[theme]);
  };

  return (
    <div data-progress class={getRootClass()} {...rest}>
      <div class={getContentClass()}>{local.children ?? formatPercent(local.value)}</div>
      <div class={getBarClass()} style={{ width: `${local.value * 100}%` }} />
    </div>
  );
};
```

**Step 2: 커밋**

```bash
git add packages/solid/src/components/display/Progress.tsx
git commit -m "feat(solid): Progress 컴포넌트 구현"
```

---

### Task 2: index.ts에 export 추가

**Files:**

- Modify: `packages/solid/src/index.ts:45-49` (display 섹션)

**Step 1: export 추가**

`// display` 섹션의 마지막(`export * from "./components/display/Note";` 다음)에 추가:

```typescript
export * from "./components/display/Progress";
```

**Step 2: 커밋**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): Progress export 추가"
```

---

### Task 3: 타입체크 및 린트 검증

**Step 1: 타입체크 실행**

```bash
pnpm typecheck packages/solid
```

Expected: 에러 없음

**Step 2: 린트 실행**

```bash
pnpm lint packages/solid/src/components/display/Progress.tsx
```

Expected: 에러 없음

---

### Task 4: 데모 페이지 작성

**Files:**

- Create: `packages/solid-demo/src/pages/display/ProgressPage.tsx`

**Step 1: 데모 페이지 작성**

LabelPage.tsx 패턴을 따른다. 섹션:

1. 테마 — 6가지 테마별 Progress (value 0.75)
2. 사이즈 — 기본 / sm / lg
3. inset — inset 적용 예시
4. 커스텀 콘텐츠 — children으로 텍스트 대체
5. 다양한 진행률 — 0%, 25%, 50%, 75%, 100%

```tsx
import { For } from "solid-js";
import { Progress, type ProgressTheme, Topbar } from "@simplysm/solid";

const themes: ProgressTheme[] = ["primary", "info", "success", "warning", "danger", "base"];

export default function ProgressPage() {
  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Progress</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* 테마 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">테마</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              Progress 컴포넌트는 6가지 테마를 지원합니다. 기본값은 primary입니다.
            </p>
            <div class="space-y-2">
              <For each={themes}>{(theme) => <Progress theme={theme} value={0.75} />}</For>
            </div>
          </section>

          {/* 사이즈 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">사이즈</h2>
            <div class="space-y-2">
              <Progress value={0.6} size="sm" />
              <Progress value={0.6} />
              <Progress value={0.6} size="lg" />
            </div>
          </section>

          {/* Inset */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">Inset</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              inset을 사용하면 테두리와 둥근 모서리가 제거됩니다.
            </p>
            <div class="rounded border border-base-300 dark:border-base-700">
              <Progress value={0.5} inset />
            </div>
          </section>

          {/* 커스텀 콘텐츠 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">커스텀 콘텐츠</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              children을 전달하면 백분율 대신 커스텀 텍스트를 표시합니다.
            </p>
            <div class="space-y-2">
              <Progress value={0.3} theme="info">
                3/10 완료
              </Progress>
              <Progress value={0.75} theme="success">
                다운로드 중...
              </Progress>
            </div>
          </section>

          {/* 다양한 진행률 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">진행률</h2>
            <div class="space-y-2">
              <Progress value={0} />
              <Progress value={0.25} />
              <Progress value={0.5} />
              <Progress value={0.75} />
              <Progress value={1} />
            </div>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
```

**Step 2: 커밋**

```bash
git add packages/solid-demo/src/pages/display/ProgressPage.tsx
git commit -m "feat(solid-demo): Progress 데모 페이지 추가"
```

---

### Task 5: 라우터 및 사이드바 메뉴 등록

**Files:**

- Modify: `packages/solid-demo/src/main.tsx` (라우터)
- Modify: `packages/solid-demo/src/pages/Home.tsx` (사이드바 메뉴)

**Step 1: 라우터에 경로 추가**

`main.tsx`에서 `/home/display/barcode` 라우트 다음에 추가:

```typescript
<Route path="/home/display/progress" component={lazy(() => import("./pages/display/ProgressPage"))} />
```

**Step 2: 사이드바 메뉴에 항목 추가**

`Home.tsx`의 Display 카테고리 children에서 `Barcode` 다음에 추가:

```typescript
{ title: "Progress", href: "/home/display/progress" },
```

**Step 3: 커밋**

```bash
git add packages/solid-demo/src/main.tsx packages/solid-demo/src/pages/Home.tsx
git commit -m "feat(solid-demo): Progress 데모 라우터 및 메뉴 등록"
```

---

### Task 6: 최종 검증

**Step 1: 타입체크**

```bash
pnpm typecheck packages/solid packages/solid-demo
```

Expected: 에러 없음

**Step 2: 린트**

```bash
pnpm lint packages/solid/src/components/display/Progress.tsx packages/solid-demo/src/pages/display/ProgressPage.tsx
```

Expected: 에러 없음

**Step 3: dev 서버 확인**

```bash
pnpm dev
```

브라우저에서 Display > Progress 메뉴 클릭하여 데모 페이지 확인.
