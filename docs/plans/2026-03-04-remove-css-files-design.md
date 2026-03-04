# CSS 파일 제거 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** solid 패키지에서 컴포넌트별 .css 파일 3개(BusyContainer.css, Kanban.css, DataSheet.css)를 제거하고 Web Animations API / Tailwind arbitrary variant로 대체한다.

**Architecture:** BusyContainer와 Kanban의 @keyframes 애니메이션은 Web Animations API(`el.animate()`)로 전환. DataSheet의 hover/selected/drag 시각 효과는 Tailwind arbitrary variant + clsx로 `<tr>` 요소에 직접 클래스 적용. editor.css와 tailwind.css는 유지.

**Tech Stack:** Web Animations API, Tailwind CSS arbitrary variants, clsx, SolidJS

---

### Task 1: BusyContainer — Web Animations API로 @keyframes 대체

**Files:**
- Modify: `packages/solid/src/components/feedback/busy/BusyContainer.tsx:14,131-151`
- Delete: `packages/solid/src/components/feedback/busy/BusyContainer.css`
- Test: `packages/solid/tests/components/feedback/busy/BusyContainer.spec.tsx`

**Step 1: Write the failing test**

기존 BusyContainer 테스트에 bar variant 테스트를 추가한다. SolidJS에서 `render()`는 `@solidjs/testing-library`의 함수로, 컴포넌트를 DOM에 렌더링한다. `createMountTransition`은 mount/unmount를 CSS transition과 연동하는 훅으로, 내부적으로 double rAF를 사용하므로 테스트에서 rAF 대기가 필요하다 (`packages/solid/src/hooks/createMountTransition.ts`).

```typescript
// BusyContainer.spec.tsx에 추가
it("bar variant: starts Web Animations on indicator bars", async () => {
  const { container } = render(() => (
    <BusyContainer busy variant="bar">
      <span>Content</span>
    </BusyContainer>
  ));
  // createMountTransition uses double rAF
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const barIndicator = container.querySelector("[data-busy-bar]");
  expect(barIndicator).toBeTruthy();

  const bars = barIndicator!.children;
  expect(bars.length).toBe(2);

  // Web Animations API — getAnimations() returns active animations
  const anim0 = (bars[0] as HTMLElement).getAnimations();
  const anim1 = (bars[1] as HTMLElement).getAnimations();
  expect(anim0.length).toBeGreaterThan(0);
  expect(anim1.length).toBeGreaterThan(0);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/feedback/busy/BusyContainer.spec.tsx --run`
Expected: FAIL — `data-busy-bar` attribute not found, no animations on elements.

**Step 3: Write minimal implementation**

BusyContainer.tsx를 수정한다:

1. `import "./BusyContainer.css"` 라인(14행)을 제거
2. `onCleanup` import 추가 (이미 있음)
3. bar variant 렌더링 영역(131~151행)을 수정:

```typescript
// 기존 (131~151행):
<Show when={currVariant() === "bar" && (local.ready === false || local.busy)}>
  <div class={barIndicatorClass}>
    <div
      class={clsx(
        "absolute left-0 top-0 h-1 w-full origin-left",
        "bg-primary-500 dark:bg-primary-400",
      )}
      style={{
        animation: "sd-busy-bar-before 2s infinite ease-in",
      }}
    />
    <div
      class={clsx(
        "absolute left-0 top-0 h-1 w-full origin-left",
        bg.surface,
      )}
      style={{
        animation: "sd-busy-bar-after 2s infinite ease-out",
      }}
    />
  </div>
</Show>

// 변경 후:
<Show when={currVariant() === "bar" && (local.ready === false || local.busy)}>
  <div data-busy-bar class={barIndicatorClass}>
    <div
      ref={(el: HTMLElement) => {
        // sd-busy-bar-before: scaleX(0) → scaleX(1), 60%에서 완료
        const anim = el.animate(
          [
            { transform: "scaleX(0)", offset: 0 },
            { transform: "scaleX(1)", offset: 0.6 },
            { transform: "scaleX(1)", offset: 1 },
          ],
          { duration: 2000, iterations: Infinity, easing: "ease-in" },
        );
        onCleanup(() => anim.cancel());
      }}
      class={clsx(
        "absolute left-0 top-0 h-1 w-full origin-left",
        "bg-primary-500 dark:bg-primary-400",
      )}
    />
    <div
      ref={(el: HTMLElement) => {
        // sd-busy-bar-after: scaleX(0) → scaleX(1), 50%에서 시작
        const anim = el.animate(
          [
            { transform: "scaleX(0)", offset: 0 },
            { transform: "scaleX(0)", offset: 0.5 },
            { transform: "scaleX(1)", offset: 1 },
          ],
          { duration: 2000, iterations: Infinity, easing: "ease-out" },
        );
        onCleanup(() => anim.cancel());
      }}
      class={clsx(
        "absolute left-0 top-0 h-1 w-full origin-left",
        bg.surface,
      )}
    />
  </div>
</Show>
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/components/feedback/busy/BusyContainer.spec.tsx --run`
Expected: PASS

**Step 5: Delete CSS file**

```bash
rm packages/solid/src/components/feedback/busy/BusyContainer.css
```

**Step 6: Commit**

```bash
git add packages/solid/src/components/feedback/busy/BusyContainer.tsx \
  packages/solid/tests/components/feedback/busy/BusyContainer.spec.tsx
git rm packages/solid/src/components/feedback/busy/BusyContainer.css
git commit -m "refactor(solid): replace BusyContainer.css with Web Animations API"
```

---

### Task 2: Kanban — Web Animations API로 @keyframes 대체

**Files:**
- Modify: `packages/solid/src/components/data/kanban/Kanban.tsx:29,332-337,466-492`
- Delete: `packages/solid/src/components/data/kanban/Kanban.css`
- Test: manual verification (placeholder는 `document.createElement`로 생성되는 DOM 요소로, drag-and-drop 인터랙션 중에만 나타남)

**Step 1: Write minimal implementation**

Kanban.tsx를 수정한다:

1. `import "./Kanban.css"` 라인(29행)을 제거
2. `placeholderBaseClass`(332~337행)에서 `animate-[kanban-ph-in_200ms_ease-out]`를 제거:

```typescript
// 기존 (332~337행):
const placeholderBaseClass = clsx(
  "rounded-lg",
  "bg-primary-100/60 dark:bg-primary-900/30",
  "origin-top",
  "animate-[kanban-ph-in_200ms_ease-out]",
);

// 변경 후:
const placeholderBaseClass = clsx(
  "rounded-lg",
  "bg-primary-100/60 dark:bg-primary-900/30",
  "origin-top",
);
```

3. placeholder DOM 삽입 후 `el.animate()` 호출 추가. `bodyRef.insertBefore(placeholderEl, referenceNode)` 직후(492행):

```typescript
// 기존 (492행):
bodyRef.insertBefore(placeholderEl, referenceNode);

// 변경 후:
bodyRef.insertBefore(placeholderEl, referenceNode);
// kanban-ph-in: opacity 0 + height 0 → opacity 1 + auto height
placeholderEl.animate(
  [
    { opacity: 0, height: "0px" },
    { opacity: 1, height: `${dc.heightOnDrag}px` },
  ],
  { duration: 200, easing: "ease-out", fill: "forwards" },
);
```

**Step 2: Delete CSS file**

```bash
rm packages/solid/src/components/data/kanban/Kanban.css
```

**Step 3: Manual verification**

1. solid-demo 앱을 실행 (`pnpm --filter @simplysm/solid-demo dev`)
2. Kanban 데모 페이지로 이동
3. 카드를 드래그하여 다른 레인이나 카드 사이에 놓을 때 placeholder가 fade-in + height 확장 애니메이션으로 나타나는지 확인

**Step 4: Commit**

```bash
git add packages/solid/src/components/data/kanban/Kanban.tsx
git rm packages/solid/src/components/data/kanban/Kanban.css
git commit -m "refactor(solid): replace Kanban.css with Web Animations API"
```

---

### Task 3: DataSheet — arbitrary variant + clsx로 CSS 대체

**Files:**
- Modify: `packages/solid/src/components/data/sheet/DataSheet.styles.ts` (new export 추가)
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx:44,1105-1113`
- Delete: `packages/solid/src/components/data/sheet/DataSheet.css`
- Test: `packages/solid/tests/components/data/sheet/DataSheet.spec.tsx`

**Step 1: Write the failing test**

DataSheet.spec.tsx에 tr의 Tailwind 클래스 적용 테스트를 추가한다:

```typescript
// DataSheet.spec.tsx에 추가
it("body rows have hover/selected overlay classes", () => {
  const { container } = render(() => (
    <ConfigProvider clientName="test"><I18nProvider>
      <TestWrapper>
      <DataSheet items={testData} persistKey="test">
        <DataSheet.Column<TestItem> key="name" header="이름">
          {(ctx) => <div>{ctx.item.name}</div>}
        </DataSheet.Column>
      </DataSheet>
    </TestWrapper>
    </I18nProvider></ConfigProvider>
  ));
  const row = container.querySelector("tbody tr");
  expect(row).toBeTruthy();
  // tr should have the relative class for ::after positioning
  expect(row!.className).toContain("relative");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/data/sheet/DataSheet.spec.tsx --run`
Expected: FAIL — tbody tr does not have "relative" class (currently provided by DataSheet.css).

**Step 3: Add trRowClass to DataSheet.styles.ts**

`DataSheet.styles.ts`에 새로운 export를 추가한다. `clsx`는 조건부 클래스명 문자열 생성 유틸리티 (`clsx` npm 패키지).

```typescript
// DataSheet.styles.ts 맨 아래에 추가:

// Body row — hover/selected/drag overlay via ::after pseudo-element
export const trRowClass = clsx(
  "relative",
  // ::after base positioning (content is set per-state so it only renders when needed)
  "after:absolute after:inset-0 after:pointer-events-none after:z-10",
  // hover overlay
  "hover:after:content-[''] hover:after:bg-black/[0.03]",
  "dark:hover:after:bg-white/[0.04]",
  // selected row overlay
  "[&[data-selected]]:after:content-[''] [&[data-selected]]:after:bg-black/[0.05]",
  "dark:[&[data-selected]]:after:bg-white/[0.06]",
  // dragging row
  "[&[data-dragging]>td]:opacity-50",
  // drop target (inside) overlay
  "[&[data-drag-over=inside]]:after:content-[''] [&[data-drag-over=inside]]:after:bg-blue-500/10",
);
```

**Step 4: Apply trRowClass to DataSheet.tsx**

1. `import "./DataSheet.css"` 라인(44행)을 제거
2. import 목록에 `trRowClass` 추가 (DataSheet.styles.ts에서 import하는 블록에 추가)
3. `<tr` 요소(1105행)에 class 적용:

```typescript
// 기존 (1105~1113행):
<tr
  data-selected={selectedItems().includes(flat.item) ? "" : undefined}
  onClick={() => {
    if (local.autoSelect === "click") {
      selectItem(flat.item);
    }
  }}
  class={local.autoSelect === "click" ? "cursor-pointer" : undefined}
>

// 변경 후:
<tr
  data-selected={selectedItems().includes(flat.item) ? "" : undefined}
  onClick={() => {
    if (local.autoSelect === "click") {
      selectItem(flat.item);
    }
  }}
  class={clsx(trRowClass, local.autoSelect === "click" && "cursor-pointer")}
>
```

**Step 5: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/components/data/sheet/DataSheet.spec.tsx --run`
Expected: PASS

**Step 6: Delete CSS file**

```bash
rm packages/solid/src/components/data/sheet/DataSheet.css
```

**Step 7: Commit**

```bash
git add packages/solid/src/components/data/sheet/DataSheet.styles.ts \
  packages/solid/src/components/data/sheet/DataSheet.tsx \
  packages/solid/tests/components/data/sheet/DataSheet.spec.tsx
git rm packages/solid/src/components/data/sheet/DataSheet.css
git commit -m "refactor(solid): replace DataSheet.css with Tailwind arbitrary variants"
```
