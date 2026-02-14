# StatePreset Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 필터/정렬 등 UI 상태를 이름 붙여 저장하고 한 번 클릭으로 복원하는 StatePreset 컴포넌트 구현

**Architecture:** `usePersisted` 훅으로 localStorage에 프리셋 배열을 저장. 인라인 칩(pill) UI로 프리셋 목록 표시. 삭제/덮어쓰기는 즉시 실행 + NotificationProvider undo 패턴.

**Tech Stack:** SolidJS, Tailwind CSS (clsx + twMerge), @tabler/icons-solidjs, @simplysm/core-common (objClone, objEqual)

---

### Task 1: StatePreset 컴포넌트 작성

**Files:**

- Create: `packages/solid/src/components/form-control/state-preset/StatePreset.tsx`

**Step 1: 컴포넌트 파일 작성**

```tsx
import { type Component, createSignal, For, Show, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import { IconDeviceFloppy, IconStar, IconX } from "@tabler/icons-solidjs";
import { objClone, objEqual } from "@simplysm/core-common";
import { usePersisted } from "../../../contexts/usePersisted";
import { useNotification } from "../../feedback/notification/NotificationContext";
import { Icon } from "../../display/Icon";
import type { ComponentSize } from "../../../styles/tokens.styles";

export type StatePresetSize = ComponentSize;

interface StatePresetItem<T> {
  name: string;
  state: T;
}

export interface StatePresetProps<T> {
  key: string;
  value: T;
  onValueChange: (value: T) => void;
  size?: StatePresetSize;
  class?: string;
  style?: JSX.CSSProperties;
}

// --- 스타일 ---

const baseClass = clsx("inline-flex items-center gap-1.5", "flex-wrap");

const chipClass = clsx(
  "inline-flex items-center gap-1",
  "rounded-full",
  "bg-base-200 dark:bg-base-700",
  "hover:bg-base-300 dark:hover:bg-base-600",
  "transition-colors",
  "px-3 py-1",
);

const chipSizeClasses: Record<StatePresetSize, string> = {
  sm: "px-2 py-0.5 text-sm",
  lg: "px-4 py-2",
};

const iconButtonClass = clsx(
  "inline-flex items-center justify-center",
  "rounded-full",
  "hover:bg-base-300 dark:hover:bg-base-600",
  "transition-colors",
  "cursor-pointer",
  "p-0.5",
);

const starButtonClass = clsx(
  "inline-flex items-center justify-center",
  "rounded-full",
  "text-warning-500",
  "hover:bg-warning-100 dark:hover:bg-warning-900/40",
  "transition-colors",
  "cursor-pointer",
  "p-1",
);

const inputClass = clsx(
  "rounded-full",
  "bg-base-200 dark:bg-base-700",
  "px-3 py-1",
  "outline-none",
  "focus:ring-1 focus:ring-primary-400",
  "min-w-0 w-24",
);

const inputSizeClasses: Record<StatePresetSize, string> = {
  sm: "px-2 py-0.5 text-sm w-20",
  lg: "px-4 py-2 w-32",
};

// --- 컴포넌트 ---

function StatePresetInner<T>(props: StatePresetProps<T>): JSX.Element {
  const [local, rest] = splitProps(props, ["key", "value", "onValueChange", "size", "class", "style"]);

  const notification = useNotification();

  const [presets, setPresets] = usePersisted<StatePresetItem<T>[]>(`state-preset.${local.key}`, []);

  const [showInput, setShowInput] = createSignal(false);
  const [inputValue, setInputValue] = createSignal("");

  // 프리셋 추가
  const handleAdd = () => {
    const name = inputValue().trim();
    if (name === "") return;

    setPresets((prev) => [...prev, { name, state: objClone(local.value) }]);
    setInputValue("");
    setShowInput(false);
    notification.info(`'${name}'에 저장되었습니다`);
  };

  // 프리셋 복원
  const handleRestore = (preset: StatePresetItem<T>) => {
    if (!objEqual(local.value, preset.state)) {
      local.onValueChange(objClone(preset.state));
    }
  };

  // 프리셋 덮어쓰기
  const handleSave = (index: number) => {
    const preset = presets()[index];
    const prevState = objClone(preset.state);

    setPresets((prev) => prev.map((item, i) => (i === index ? { ...item, state: objClone(local.value) } : item)));

    notification.info(`'${preset.name}'에 저장되었습니다`, undefined, {
      action: {
        label: "실행 취소",
        onClick: () => {
          setPresets((prev) => prev.map((item, i) => (i === index ? { ...item, state: prevState } : item)));
        },
      },
    });
  };

  // 프리셋 삭제
  const handleRemove = (index: number) => {
    const removed = presets()[index];
    const removedIndex = index;

    setPresets((prev) => prev.filter((_, i) => i !== index));

    notification.info(`'${removed.name}'이(가) 삭제되었습니다`, undefined, {
      action: {
        label: "실행 취소",
        onClick: () => {
          setPresets((prev) => {
            const next = [...prev];
            next.splice(removedIndex, 0, removed);
            return next;
          });
        },
      },
    });
  };

  // 입력 키 핸들러
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd();
    } else if (e.key === "Escape") {
      setInputValue("");
      setShowInput(false);
    }
  };

  return (
    <div class={twMerge(baseClass, local.class)} style={local.style}>
      {/* 추가 버튼 */}
      <button type="button" class={starButtonClass} onClick={() => setShowInput(true)} title="프리셋 추가">
        <Icon icon={IconStar} size="1.25em" />
      </button>

      {/* 프리셋 목록 */}
      <For each={presets()}>
        {(preset, index) => (
          <div class={twMerge(chipClass, local.size && chipSizeClasses[local.size])}>
            <button
              type="button"
              class={clsx("cursor-pointer", "hover:underline")}
              onClick={() => handleRestore(preset)}
            >
              {preset.name}
            </button>
            <button type="button" class={iconButtonClass} onClick={() => handleSave(index())} title="현재 상태 저장">
              <Icon icon={IconDeviceFloppy} size="0.875em" />
            </button>
            <button type="button" class={iconButtonClass} onClick={() => handleRemove(index())} title="삭제">
              <Icon icon={IconX} size="0.875em" />
            </button>
          </div>
        )}
      </For>

      {/* 이름 입력 */}
      <Show when={showInput()}>
        <input
          ref={(el) => setTimeout(() => el.focus())}
          type="text"
          class={twMerge(inputClass, local.size && inputSizeClasses[local.size])}
          placeholder="이름 입력"
          value={inputValue()}
          onInput={(e) => setInputValue(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setInputValue("");
            setShowInput(false);
          }}
        />
      </Show>
    </div>
  );
}

export const StatePreset = StatePresetInner as <T>(props: StatePresetProps<T>) => JSX.Element;
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS (에러 없음)

**Step 3: 린트**

Run: `pnpm lint packages/solid/src/components/form-control/state-preset/StatePreset.tsx`
Expected: PASS

**Step 4: 커밋**

```bash
git add packages/solid/src/components/form-control/state-preset/StatePreset.tsx
git commit -m "feat(solid): StatePreset 컴포넌트 구현"
```

---

### Task 2: index.ts에 StatePreset export 추가

**Files:**

- Modify: `packages/solid/src/index.ts`

**Step 1: export 추가**

`form-control` 섹션의 마지막 줄 (`export * from "./components/form-control/editor/RichTextEditor";`) 뒤에 추가:

```typescript
export * from "./components/form-control/state-preset/StatePreset";
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): index.ts에 StatePreset export 추가"
```

---

### Task 3: 데모 페이지 작성

**Files:**

- Create: `packages/solid-demo/src/pages/form-control/StatePresetPage.tsx`
- Modify: `packages/solid-demo/src/main.tsx` (라우트 추가)
- Modify: `packages/solid-demo/src/pages/Home.tsx` (메뉴 추가)

**Step 1: 데모 페이지 작성**

```tsx
import { createSignal } from "solid-js";
import { StatePreset, Topbar } from "@simplysm/solid";

interface FilterState {
  search: string;
  category: string;
  sortBy: string;
}

export default function StatePresetPage() {
  const [filter, setFilter] = createSignal<FilterState>({
    search: "",
    category: "all",
    sortBy: "name",
  });

  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">StatePreset</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-12">
          {/* 기본 사용 */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">기본 사용</h2>
            <div class="space-y-6">
              <div>
                <h3 class="mb-3 text-lg font-semibold">필터 상태 저장/복원</h3>
                <StatePreset<FilterState> key="demo-filter" value={filter()} onValueChange={setFilter} />
                <div class="mt-4 space-y-2">
                  <div class="flex items-center gap-2">
                    <label class="text-sm font-medium">검색:</label>
                    <input
                      type="text"
                      class="rounded border border-base-300 px-2 py-1 dark:border-base-700 dark:bg-base-800"
                      value={filter().search}
                      onInput={(e) => setFilter((prev) => ({ ...prev, search: e.currentTarget.value }))}
                    />
                  </div>
                  <div class="flex items-center gap-2">
                    <label class="text-sm font-medium">카테고리:</label>
                    <select
                      class="rounded border border-base-300 px-2 py-1 dark:border-base-700 dark:bg-base-800"
                      value={filter().category}
                      onChange={(e) => setFilter((prev) => ({ ...prev, category: e.currentTarget.value }))}
                    >
                      <option value="all">전체</option>
                      <option value="food">음식</option>
                      <option value="drink">음료</option>
                    </select>
                  </div>
                  <div class="flex items-center gap-2">
                    <label class="text-sm font-medium">정렬:</label>
                    <select
                      class="rounded border border-base-300 px-2 py-1 dark:border-base-700 dark:bg-base-800"
                      value={filter().sortBy}
                      onChange={(e) => setFilter((prev) => ({ ...prev, sortBy: e.currentTarget.value }))}
                    >
                      <option value="name">이름</option>
                      <option value="price">가격</option>
                      <option value="date">날짜</option>
                    </select>
                  </div>
                </div>
                <p class="mt-2 text-sm text-base-600 dark:text-base-400">
                  현재 상태: <code class="rounded bg-base-200 px-1 dark:bg-base-700">{JSON.stringify(filter())}</code>
                </p>
              </div>
            </div>
          </section>

          {/* 크기 변형 */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">크기</h2>
            <div class="space-y-6">
              <div>
                <h3 class="mb-3 text-lg font-semibold">sm</h3>
                <StatePreset<FilterState> key="demo-filter-sm" value={filter()} onValueChange={setFilter} size="sm" />
              </div>
              <div>
                <h3 class="mb-3 text-lg font-semibold">기본 (md)</h3>
                <StatePreset<FilterState> key="demo-filter-md" value={filter()} onValueChange={setFilter} />
              </div>
              <div>
                <h3 class="mb-3 text-lg font-semibold">lg</h3>
                <StatePreset<FilterState> key="demo-filter-lg" value={filter()} onValueChange={setFilter} size="lg" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
```

**Step 2: main.tsx에 라우트 추가**

`/home/form-control/rich-text-editor` 라우트 뒤에 추가:

```tsx
<Route path="/home/form-control/state-preset" component={lazy(() => import("./pages/form-control/StatePresetPage"))} />
```

**Step 3: Home.tsx 메뉴에 항목 추가**

`Form Control` children 배열의 마지막 (`RichTextEditor` 항목 뒤)에 추가:

```typescript
{ title: "StatePreset", href: "/home/form-control/state-preset" },
```

**Step 4: 타입체크**

Run: `pnpm typecheck packages/solid-demo`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid-demo/src/pages/form-control/StatePresetPage.tsx packages/solid-demo/src/main.tsx packages/solid-demo/src/pages/Home.tsx
git commit -m "feat(solid-demo): StatePreset 데모 페이지 추가"
```

---

### Task 4: 시각적 검증

**Step 1: dev 서버 실행**

Run: `pnpm dev`

**Step 2: 데모 페이지 열기**

브라우저에서 데모 페이지 열고 다음을 검증:

- ⭐ 버튼이 표시되는지
- 프리셋 추가가 작동하는지 (⭐ → 이름 입력 → Enter)
- 프리셋 클릭 시 상태가 복원되는지
- 💾 클릭 시 덮어쓰기 + undo 토스트가 나오는지
- ✕ 클릭 시 삭제 + undo 토스트가 나오는지
- 크기 변형(sm, md, lg)이 올바르게 표시되는지
- 다크모드에서 스타일이 올바른지
- 새로고침 후 프리셋이 유지되는지

**Step 3: 스크린샷**

Playwright MCP로 스크린샷 촬영하여 `.playwright-mcp/`에 저장

**Step 4: 필요시 스타일 조정 후 커밋**

```bash
git add -A
git commit -m "fix(solid): StatePreset 스타일 조정"
```
