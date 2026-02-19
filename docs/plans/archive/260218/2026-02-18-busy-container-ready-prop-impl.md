# BusyContainer `ready` Prop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Add a `ready` prop to BusyContainer that hides children and shows loading when not ready.

**Architecture:** Add `ready` to props, change the overlay trigger to `ready === false || busy`, wrap children in `<Show when={ready !== false}>`, and update keyboard blocking condition.

**Tech Stack:** SolidJS, TypeScript, Vitest, @solidjs/testing-library

---

### Task 1: Add `ready` prop to BusyContainer

**Files:**
- Modify: `packages/solid/src/components/feedback/busy/BusyContainer.tsx`

**Step 1: Add `ready` to interface and splitProps**

In `BusyContainerProps` interface, add `ready?: boolean` after `busy`:

```typescript
export interface BusyContainerProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  busy?: boolean;
  ready?: boolean;
  variant?: BusyVariant;
  message?: string;
  progressPercent?: number;
  children?: JSX.Element;
}
```

In `splitProps`, add `"ready"` to the local props array:

```typescript
const [local, rest] = splitProps(props, [
  "busy",
  "ready",
  "variant",
  "message",
  "progressPercent",
  "class",
  "children",
]);
```

**Step 2: Change overlay trigger**

Change `createMountTransition` trigger (line 71) from:

```typescript
const { mounted, animating, unmount } = createMountTransition(() => !!local.busy);
```

to:

```typescript
const { mounted, animating, unmount } = createMountTransition(
  () => local.ready === false || !!local.busy,
);
```

**Step 3: Change handleTransitionEnd condition**

Change `handleTransitionEnd` (line 75) from:

```typescript
if (!local.busy) {
  unmount();
}
```

to:

```typescript
if (local.ready !== false && !local.busy) {
  unmount();
}
```

**Step 4: Change keyboard blocking condition**

Change the keyboard handler condition (line 85) from:

```typescript
if (local.busy) {
```

to:

```typescript
if (local.ready === false || local.busy) {
```

**Step 5: Wrap children in Show**

Change `{local.children}` (line 158) from:

```tsx
{local.children}
```

to:

```tsx
<Show when={local.ready !== false}>{local.children}</Show>
```

**Step 6: Change bar variant condition**

The bar indicator (line 120) currently checks `local.busy`:

```tsx
<Show when={currVariant() === "bar" && local.busy}>
```

Change to include `ready === false`:

```tsx
<Show when={currVariant() === "bar" && (local.ready === false || local.busy)}>
```

**Step 7: Typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

---

### Task 2: Write tests for `ready` prop

**Files:**
- Create: `packages/solid/tests/components/feedback/busy/BusyContainer.spec.tsx`

**Step 1: Write the test file**

```tsx
import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { createSignal } from "solid-js";
import { BusyContainer } from "../../../../src/components/feedback/busy/BusyContainer";

describe("BusyContainer", () => {
  describe("기본 렌더링", () => {
    it("children이 표시된다", () => {
      const { getByText } = render(() => (
        <BusyContainer>
          <span>Content</span>
        </BusyContainer>
      ));
      expect(getByText("Content")).toBeTruthy();
    });

    it("busy가 false이면 오버레이가 표시되지 않는다", () => {
      const { container } = render(() => (
        <BusyContainer busy={false}>
          <span>Content</span>
        </BusyContainer>
      ));
      const overlay = container.querySelector(".z-busy");
      expect(overlay).toBeNull();
    });
  });

  describe("ready prop", () => {
    it("ready가 false이면 children이 DOM에서 제거된다", () => {
      const { queryByText } = render(() => (
        <BusyContainer ready={false}>
          <span>Content</span>
        </BusyContainer>
      ));
      expect(queryByText("Content")).toBeNull();
    });

    it("ready가 true이면 children이 표시된다", () => {
      const { getByText } = render(() => (
        <BusyContainer ready={true}>
          <span>Content</span>
        </BusyContainer>
      ));
      expect(getByText("Content")).toBeTruthy();
    });

    it("ready가 undefined이면 children이 표시된다", () => {
      const { getByText } = render(() => (
        <BusyContainer>
          <span>Content</span>
        </BusyContainer>
      ));
      expect(getByText("Content")).toBeTruthy();
    });

    it("ready가 false이면 오버레이가 마운트된다", async () => {
      const { container } = render(() => (
        <BusyContainer ready={false}>
          <span>Content</span>
        </BusyContainer>
      ));
      // createMountTransition uses double rAF, wait for it
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const overlay = container.querySelector(".z-busy");
      expect(overlay).toBeTruthy();
    });

    it("ready가 false에서 true로 변경되면 children이 다시 표시된다", async () => {
      const [ready, setReady] = createSignal(false);
      const { queryByText } = render(() => (
        <BusyContainer ready={ready()}>
          <span>Content</span>
        </BusyContainer>
      ));
      expect(queryByText("Content")).toBeNull();
      setReady(true);
      expect(queryByText("Content")).toBeTruthy();
    });
  });
});
```

**Step 2: Run tests**

Run: `pnpm vitest packages/solid/tests/components/feedback/busy/BusyContainer.spec.tsx --project=solid --run`
Expected: PASS

---

### Task 3: Update demo page

**Files:**
- Modify: `packages/solid-demo/src/pages/feedback/BusyPage.tsx`

**Step 1: Add ready demo section**

Add a new section after the last section (진행률 표시) demonstrating the `ready` prop.
Add a `readyState` signal that starts as `false`, then toggles via button.

Add this section inside the `BusyDemo` component:

Signal (add near the top with other signals):
```typescript
const [readyState, setReadyState] = createSignal(false);
```

Section JSX (add after the Progress section):
```tsx
{/* Ready */}
<section>
  <h2 class="mb-4 text-xl font-semibold">Ready 상태</h2>
  <p class="mb-4 text-sm text-base-600 dark:text-base-400">
    ready가 false이면 children을 숨기고 로딩 오버레이를 표시합니다.
  </p>
  <Button theme="base" variant="outline" onClick={() => setReadyState((v) => !v)}>
    {readyState() ? "ready=false로 변경" : "ready=true로 변경"}
  </Button>
  <BusyContainer
    ready={readyState()}
    variant="spinner"
    message="데이터 준비 중..."
    class="mt-4 h-40 rounded border border-base-200 dark:border-base-700"
  >
    <div class="flex h-full items-center justify-center text-base-500">준비 완료된 콘텐츠</div>
  </BusyContainer>
</section>
```

**Step 2: Typecheck**

Run: `pnpm typecheck packages/solid-demo`
Expected: PASS
