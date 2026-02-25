# Topbar Actions Slot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Add `Topbar.Actions` slot outlet and `createTopbarActions` primitive so child pages can inject action buttons into the Topbar without per-project Provider boilerplate.

**Architecture:** `TopbarContainer` wraps children with a `TopbarContext.Provider` holding a reactive signal of `JSX.Element`. `Topbar.Actions` reads and renders that signal (slot outlet). `createTopbarActions()` writes to the signal with automatic `onCleanup`.

**Tech Stack:** SolidJS (createContext, createSignal, onCleanup), TypeScript

---

### Task 1: TopbarContext — Context definition + createTopbarActions primitive

**Files:**
- Create: `packages/solid/src/components/layout/topbar/TopbarContext.ts`
- Test: `packages/solid/tests/components/layout/topbar/createTopbarActions.spec.tsx`

**Step 1: Write the failing test**

```tsx
import { render, cleanup } from "@solidjs/testing-library";
import { describe, it, expect, afterEach } from "vitest";
import { createSignal, type Accessor } from "solid-js";
import { Topbar, createTopbarActions, useTopbarActionsAccessor } from "../../../../src";

// Helper: TopbarContext에서 actions accessor를 추출
function ActionsReader(props: { onCapture: (actions: Accessor<JSX.Element | undefined>) => void }) {
  const actions = useTopbarActionsAccessor();
  props.onCapture(actions);
  return null;
}

describe("createTopbarActions", () => {
  afterEach(() => {
    cleanup();
  });

  it("등록한 actions가 context를 통해 전달된다", () => {
    let actionsAccessor!: Accessor<JSX.Element | undefined>;

    render(() => (
      <Topbar.Container>
        <ActionsReader onCapture={(a) => (actionsAccessor = a)} />
        <TestChild />
      </Topbar.Container>
    ));

    function TestChild() {
      createTopbarActions(() => <button>저장</button>);
      return null;
    }

    expect(actionsAccessor()).toBeTruthy();
  });

  it("컴포넌트 언마운트 시 actions가 자동 해제된다", () => {
    let actionsAccessor!: Accessor<JSX.Element | undefined>;
    const [show, setShow] = createSignal(true);

    render(() => (
      <Topbar.Container>
        <ActionsReader onCapture={(a) => (actionsAccessor = a)} />
        {show() && <TestChild />}
      </Topbar.Container>
    ));

    function TestChild() {
      createTopbarActions(() => <button>저장</button>);
      return null;
    }

    expect(actionsAccessor()).toBeTruthy();

    setShow(false);
    expect(actionsAccessor()).toBeUndefined();
  });

  it("TopbarContainer 없이 호출하면 에러가 발생한다", () => {
    expect(() => {
      render(() => {
        createTopbarActions(() => <button>저장</button>);
        return null;
      });
    }).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/layout/topbar/createTopbarActions.spec.tsx --project=solid`
Expected: FAIL — `createTopbarActions` and `useTopbarActionsAccessor` do not exist

**Step 3: Write minimal implementation**

`packages/solid/src/components/layout/topbar/TopbarContext.ts`:
```typescript
import { createContext, useContext, onCleanup, type Accessor, type JSX, type Setter } from "solid-js";

export interface TopbarContextValue {
  actions: Accessor<JSX.Element | undefined>;
  setActions: Setter<JSX.Element | undefined>;
}

export const TopbarContext = createContext<TopbarContextValue>();

export function useTopbarActionsAccessor(): Accessor<JSX.Element | undefined> {
  const context = useContext(TopbarContext);
  if (!context) {
    throw new Error("useTopbarActionsAccessor는 Topbar.Container 내부에서만 사용할 수 있습니다");
  }
  return context.actions;
}

export function createTopbarActions(accessor: () => JSX.Element): void {
  const context = useContext(TopbarContext);
  if (!context) {
    throw new Error("createTopbarActions는 Topbar.Container 내부에서만 사용할 수 있습니다");
  }

  context.setActions(() => accessor());

  onCleanup(() => {
    context.setActions(undefined);
  });
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/components/layout/topbar/createTopbarActions.spec.tsx --project=solid`
Expected: PASS

**Step 5: Commit**

```
feat(solid): add TopbarContext and createTopbarActions primitive
```

---

### Task 2: TopbarContainer — Provider 추가 + TopbarActions slot outlet

**Files:**
- Modify: `packages/solid/src/components/layout/topbar/TopbarContainer.tsx`
- Create: `packages/solid/src/components/layout/topbar/TopbarActions.tsx`
- Modify: `packages/solid/src/components/layout/topbar/Topbar.tsx` (compound component에 Actions 추가)
- Modify: `packages/solid/src/index.ts` (export 추가)
- Test: `packages/solid/tests/components/layout/topbar/TopbarContainer.spec.tsx`
- Test: `packages/solid/tests/components/layout/topbar/TopbarActions.spec.tsx`

**Step 1: Write the failing tests**

`packages/solid/tests/components/layout/topbar/TopbarContainer.spec.tsx`:
```tsx
import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Topbar } from "../../../../src";

describe("TopbarContainer 컴포넌트", () => {
  it("children이 컨테이너 내부에 표시된다", () => {
    const { getByText } = render(() => (
      <Topbar.Container>
        <span>콘텐츠</span>
      </Topbar.Container>
    ));

    expect(getByText("콘텐츠")).toBeTruthy();
  });

  it("사용자 정의 class가 병합된다", () => {
    const { container } = render(() => (
      // eslint-disable-next-line tailwindcss/no-custom-classname
      <Topbar.Container class="my-custom-class">
        <div>Content</div>
      </Topbar.Container>
    ));

    const el = container.firstElementChild as HTMLElement;
    expect(el.classList.contains("my-custom-class")).toBe(true);
  });

  it("data-topbar-container 속성이 존재한다", () => {
    const { container } = render(() => (
      <Topbar.Container>
        <div>Content</div>
      </Topbar.Container>
    ));

    const el = container.firstElementChild as HTMLElement;
    expect(el.hasAttribute("data-topbar-container")).toBe(true);
  });
});
```

`packages/solid/tests/components/layout/topbar/TopbarActions.spec.tsx`:
```tsx
import { render, cleanup } from "@solidjs/testing-library";
import { describe, it, expect, afterEach } from "vitest";
import { createSignal, Show } from "solid-js";
import { Topbar, createTopbarActions } from "../../../../src";

describe("Topbar.Actions 컴포넌트", () => {
  afterEach(() => {
    cleanup();
  });

  it("createTopbarActions로 등록한 내용이 Topbar.Actions 위치에 렌더링된다", () => {
    function PageWithActions() {
      createTopbarActions(() => <button>저장</button>);
      return <div>Page Content</div>;
    }

    const { getByText } = render(() => (
      <Topbar.Container>
        <Topbar>
          <span>타이틀</span>
          <Topbar.Actions />
        </Topbar>
        <PageWithActions />
      </Topbar.Container>
    ));

    expect(getByText("저장")).toBeTruthy();
  });

  it("actions가 없으면 아무것도 렌더링하지 않는다", () => {
    const { container } = render(() => (
      <Topbar.Container>
        <Topbar>
          <span>타이틀</span>
          <Topbar.Actions />
        </Topbar>
        <div>콘텐츠</div>
      </Topbar.Container>
    ));

    const actionsSlot = container.querySelector("[data-topbar-actions]");
    expect(actionsSlot?.childNodes.length ?? 0).toBe(0);
  });

  it("컴포넌트 전환 시 이전 actions가 해제되고 새 actions가 표시된다", () => {
    function PageA() {
      createTopbarActions(() => <button>저장</button>);
      return <div>Page A</div>;
    }

    function PageB() {
      createTopbarActions(() => <button>삭제</button>);
      return <div>Page B</div>;
    }

    const [page, setPage] = createSignal<"a" | "b">("a");

    const { getByText, queryByText } = render(() => (
      <Topbar.Container>
        <Topbar>
          <Topbar.Actions />
        </Topbar>
        <Show when={page() === "a"} fallback={<PageB />}>
          <PageA />
        </Show>
      </Topbar.Container>
    ));

    expect(getByText("저장")).toBeTruthy();
    expect(queryByText("삭제")).toBeNull();

    setPage("b");

    expect(queryByText("저장")).toBeNull();
    expect(getByText("삭제")).toBeTruthy();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest packages/solid/tests/components/layout/topbar/ --project=solid`
Expected: FAIL — `Topbar.Actions` does not exist

**Step 3: Write minimal implementation**

Modify `packages/solid/src/components/layout/topbar/TopbarContainer.tsx`:
```typescript
import { type JSX, type ParentComponent, splitProps, createSignal } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { TopbarContext } from "./TopbarContext";

const containerClass = clsx("flex h-full flex-col");

export interface TopbarContainerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

export const TopbarContainer: ParentComponent<TopbarContainerProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);
  const [actions, setActions] = createSignal<JSX.Element | undefined>(undefined);

  const getClassName = () => twMerge(containerClass, local.class);

  return (
    <TopbarContext.Provider value={{ actions, setActions }}>
      <div {...rest} data-topbar-container class={getClassName()}>
        {local.children}
      </div>
    </TopbarContext.Provider>
  );
};
```

Create `packages/solid/src/components/layout/topbar/TopbarActions.tsx`:
```typescript
import { type Component, useContext } from "solid-js";
import { TopbarContext } from "./TopbarContext";

export const TopbarActions: Component = () => {
  const context = useContext(TopbarContext);

  return <span data-topbar-actions>{context?.actions()}</span>;
};
```

Modify `packages/solid/src/components/layout/topbar/Topbar.tsx` — compound component interface에 Actions 추가:
```typescript
// interface 수정
interface TopbarComponent extends ParentComponent<TopbarProps> {
  Container: typeof TopbarContainer;
  Menu: typeof TopbarMenu;
  User: typeof TopbarUser;
  Actions: typeof TopbarActions;
}

// import 추가
import { TopbarActions } from "./TopbarActions";

// export type 추가 (없음 — TopbarActions에 props 없음)

// 하단에 할당 추가
Topbar.Actions = TopbarActions;
```

Modify `packages/solid/src/index.ts` — Layout region에 export 추가:
```typescript
//#region ========== Layout ==========

export * from "./components/layout/FormGroup";
export * from "./components/layout/FormTable";
export * from "./components/layout/sidebar/Sidebar";
export * from "./components/layout/sidebar/SidebarContext";
export * from "./components/layout/topbar/Topbar";
export * from "./components/layout/topbar/TopbarContext";  // 추가

//#endregion
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest packages/solid/tests/components/layout/topbar/ --project=solid`
Expected: PASS

**Step 5: Commit**

```
feat(solid): add Topbar.Actions slot outlet and TopbarContainer context provider
```

---

### Task 3: Demo page 업데이트

**Files:**
- Modify: `packages/solid-demo/src/pages/layout/TopbarPage.tsx`

**Step 1: No test needed (demo page)**

**Step 2: Add demo section**

`TopbarPage.tsx`에 "Topbar.Actions slot" 데모 섹션 추가:
```tsx
import { createTopbarActions } from "@simplysm/solid";

// 하위 페이지 시뮬레이션 컴포넌트
function UserPageSimulation() {
  createTopbarActions(() => (
    <div class="flex gap-1">
      <Button size="sm" theme="success">저장</Button>
      <Button size="sm" theme="danger" variant="outline">삭제</Button>
    </div>
  ));
  return (
    <div class="rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
      <p class="text-sm text-base-600 dark:text-base-400">
        이 페이지는 createTopbarActions로 저장/삭제 버튼을 등록합니다
      </p>
    </div>
  );
}
```

섹션 코드:
```tsx
{/* N. Topbar.Actions slot */}
<section>
  <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
    Topbar.Actions slot
  </h2>
  <p class="mb-4 text-sm text-base-600 dark:text-base-400">
    하위 페이지에서 createTopbarActions()로 Topbar에 액션 버튼을 주입합니다.
    Topbar.Actions가 slot outlet 역할을 합니다.
  </p>
  <div class="h-48 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">사용자 관리</h1>
        <Topbar.Actions />
        <div class="flex-1" />
        <Topbar.User>홍길동</Topbar.User>
      </Topbar>
      <div class="flex-1 overflow-auto p-4">
        <UserPageSimulation />
      </div>
    </Topbar.Container>
  </div>
</section>
```

**Step 3: Commit**

```
feat(solid-demo): add Topbar.Actions slot demo section
```

---

### Task 4: README 업데이트

**Files:**
- Modify: `packages/solid/README.md`

**Step 1: Update documentation**

Layout > Topbar 섹션에 다음 내용 추가:
- `Topbar.Actions` 컴포넌트 설명
- `createTopbarActions()` hook 설명 및 사용 예제
- `useTopbarActionsAccessor()` 설명
- `TopbarContext` export 안내

**Step 2: Commit**

```
docs(solid): add Topbar.Actions and createTopbarActions to README
```
