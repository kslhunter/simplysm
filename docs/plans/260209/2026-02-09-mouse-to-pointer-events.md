# Mouse → Pointer Events 전환 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** solid 패키지의 mouse 이벤트를 pointer 이벤트로 전환하여 모바일 터치 입력을 네이티브로 지원한다.

**Architecture:** 드래그 패턴(Sheet 컬럼 리사이저, Modal 이동/리사이즈)은 `setPointerCapture`를 활용하여 document 리스너 패턴을 제거하고, 단순 핸들러는 타입만 교체한다. 터치 기기에서 `pointercancel` 방지를 위해 드래그 요소에 `touch-action: none` CSS를 적용한다.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS

**변경 범위:** 파일 2개 (Sheet.tsx, Modal.tsx), 스타일 1개 (Sheet.styles.ts)

**변경하지 않는 것:**

- `onClick` 이벤트 (79곳) — 마우스/터치 모두 자동 발생하는 고수준 이벤트
- `useRouterLink.ts`의 `MouseEvent` 타입 — `onClick` 핸들러의 타입이므로 유지
- `ListItem.tsx`의 `onClick?: (e: MouseEvent) => void` — 같은 이유로 유지
- `ripple.ts`, `Dropdown.tsx` — 이미 pointer 이벤트 사용 중

---

### Task 1: Sheet 컬럼 리사이저 드래그 — pointer 이벤트 전환

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx:288-329` (드래그 함수)
- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx:549-553` (테이블 onMouseDown)
- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx:759` (리사이저 onMouseDown)
- Modify: `packages/solid/src/components/data/sheet/Sheet.styles.ts:80-85` (resizerClass)

**Step 1: `resizerClass`에 `touch-action: none` 추가**

`packages/solid/src/components/data/sheet/Sheet.styles.ts:80-85`를 수정:

```typescript
export const resizerClass = clsx(
  "absolute inset-y-0 right-0",
  "w-1",
  "cursor-ew-resize",
  "touch-none",
  "hover:bg-primary-300 dark:hover:bg-primary-600",
);
```

**Step 2: `onResizerMousedown` 함수를 pointer 이벤트로 전환**

`packages/solid/src/components/data/sheet/Sheet.tsx:288-329`를 수정:

```typescript
function onResizerPointerdown(event: PointerEvent, colKey: string): void {
  event.preventDefault();
  const target = event.target as HTMLElement;
  target.setPointerCapture(event.pointerId);

  const th = target.closest("th")!;
  const container = th.closest("[data-sheet]")!.querySelector("[data-sheet-scroll]") as HTMLElement;
  const startX = event.clientX;
  const startWidth = th.offsetWidth;

  // 리사이즈 인디케이터 표시
  const containerRect = container.getBoundingClientRect();
  setResizeIndicatorStyle({
    display: "block",
    left: `${th.getBoundingClientRect().right - containerRect.left + container.scrollLeft}px`,
    top: "0",
    height: `${container.scrollHeight}px`,
  });

  const onPointerMove = (e: PointerEvent) => {
    const delta = e.clientX - startX;
    const newWidth = Math.max(30, startWidth + delta);
    setResizeIndicatorStyle({
      display: "block",
      left: `${th.getBoundingClientRect().left - containerRect.left + container.scrollLeft + newWidth}px`,
      top: "0",
      height: `${container.scrollHeight}px`,
    });
  };

  const onPointerUp = (e: PointerEvent) => {
    const delta = e.clientX - startX;
    // 실제 드래그가 발생한 경우에만 너비 저장 (더블클릭 시 DOM 재생성으로 dblclick 유실 방지)
    if (delta !== 0) {
      const newWidth = Math.max(30, startWidth + delta);
      saveColumnWidth(colKey, `${newWidth}px`);
    }
    setResizeIndicatorStyle({ display: "none" });
    target.removeEventListener("pointermove", onPointerMove);
    target.removeEventListener("pointerup", onPointerUp);
  };

  target.addEventListener("pointermove", onPointerMove);
  target.addEventListener("pointerup", onPointerUp);
}
```

**Step 3: 테이블의 `onMouseDown`을 `onPointerDown`으로 교체**

`packages/solid/src/components/data/sheet/Sheet.tsx:549`를 수정:

```tsx
onPointerDown={(e) => {
  if (e.shiftKey && hasSelectFeature()) {
    e.preventDefault();
  }
}}
```

**Step 4: 리사이저 JSX의 `onMouseDown`을 `onPointerDown`으로 교체**

`packages/solid/src/components/data/sheet/Sheet.tsx:759`를 수정:

```tsx
onPointerDown={(e) => onResizerPointerdown(e, effectiveColumns()[c().colIndex!].key)}
```

**Step 5: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 6: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.tsx packages/solid/src/components/data/sheet/Sheet.styles.ts
git commit -m "refactor(solid): Sheet 컬럼 리사이저 mouse → pointer 이벤트 전환

setPointerCapture를 활용하여 document 리스너 패턴 제거.
touch-action: none으로 터치 기기 pointercancel 방지."
```

---

### Task 2: Modal 드래그 이동 — pointer 이벤트 전환

**Files:**

- Modify: `packages/solid/src/components/disclosure/Modal.tsx:267-316` (handleHeaderMouseDown 함수)
- Modify: `packages/solid/src/components/disclosure/Modal.tsx:518` (JSX 바인딩)

**Step 1: `handleHeaderMouseDown`을 pointer 이벤트로 전환**

`packages/solid/src/components/disclosure/Modal.tsx:267-316`를 수정:

```typescript
const handleHeaderPointerDown = (event: PointerEvent) => {
  // movable 기본값은 true
  if (local.movable === false) return;
  if (!dialogRef || !wrapperRef) return;

  const target = event.currentTarget as HTMLElement;
  target.setPointerCapture(event.pointerId);

  const dialogEl = dialogRef;
  const wrapperEl = wrapperRef;

  const startX = event.clientX;
  const startY = event.clientY;
  const startTop = dialogEl.offsetTop;
  const startLeft = dialogEl.offsetLeft;

  const doDrag = (e: PointerEvent): void => {
    e.stopPropagation();
    e.preventDefault();

    dialogEl.style.position = "absolute";
    dialogEl.style.left = `${startLeft + e.clientX - startX}px`;
    dialogEl.style.top = `${startTop + e.clientY - startY}px`;
    dialogEl.style.right = "auto";
    dialogEl.style.bottom = "auto";
    dialogEl.style.margin = "0";

    // 화면 밖 방지
    if (dialogEl.offsetLeft > wrapperEl.offsetWidth - 100) {
      dialogEl.style.left = wrapperEl.offsetWidth - 100 + "px";
    }
    if (dialogEl.offsetTop > wrapperEl.offsetHeight - 100) {
      dialogEl.style.top = wrapperEl.offsetHeight - 100 + "px";
    }
    if (dialogEl.offsetTop < 0) {
      dialogEl.style.top = "0";
    }
    if (dialogEl.offsetLeft < -dialogEl.offsetWidth + 100) {
      dialogEl.style.left = -dialogEl.offsetWidth + 100 + "px";
    }
  };

  const stopDrag = (e: PointerEvent): void => {
    e.stopPropagation();
    e.preventDefault();

    target.removeEventListener("pointermove", doDrag);
    target.removeEventListener("pointerup", stopDrag);
  };

  target.addEventListener("pointermove", doDrag);
  target.addEventListener("pointerup", stopDrag);
};
```

**Step 2: JSX 바인딩 교체**

`packages/solid/src/components/disclosure/Modal.tsx:518`를 수정:

```tsx
onPointerDown = { handleHeaderPointerDown };
```

**Step 3: 헤더에 `touch-action: none` 추가**

Modal 헤더의 `headerClass`에 `touch-none`을 추가해야 한다. `headerClass()`가 어떻게 정의되어 있는지 확인 후, JSX에 직접 추가:

```tsx
<div
  data-modal-header
  class={clsx(headerClass(), "touch-none")}
  ...
  onPointerDown={handleHeaderPointerDown}
>
```

> **주의:** `headerClass()`가 `twMerge`를 쓴다면 그 안에 넣고, 아니면 JSX에서 `clsx`로 감싸서 추가한다. 구현 시 기존 패턴을 따를 것.

**Step 4: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid/src/components/disclosure/Modal.tsx
git commit -m "refactor(solid): Modal 헤더 드래그 mouse → pointer 이벤트 전환

setPointerCapture를 활용하여 document.documentElement 리스너 패턴 제거."
```

---

### Task 3: Modal 리사이즈 바 — pointer 이벤트 전환

**Files:**

- Modify: `packages/solid/src/components/disclosure/Modal.tsx:319-373` (handleResizeBarMouseDown 함수)
- Modify: `packages/solid/src/components/disclosure/Modal.tsx:566` (JSX 바인딩)

**Step 1: `handleResizeBarMouseDown`을 pointer 이벤트로 전환**

`packages/solid/src/components/disclosure/Modal.tsx:319-373`를 수정:

```typescript
const handleResizeBarPointerDown = (event: PointerEvent, direction: ResizeDirection) => {
  if (!local.resizable) return;
  if (!dialogRef) return;

  const target = event.currentTarget as HTMLElement;
  target.setPointerCapture(event.pointerId);

  const dialogEl = dialogRef;

  const startX = event.clientX;
  const startY = event.clientY;
  const startHeight = dialogEl.clientHeight;
  const startWidth = dialogEl.clientWidth;
  const startTop = dialogEl.offsetTop;
  const startLeft = dialogEl.offsetLeft;

  const doDrag = (e: PointerEvent): void => {
    e.stopPropagation();
    e.preventDefault();

    if (direction === "top" || direction === "top-right" || direction === "top-left") {
      if (dialogEl.style.position === "absolute") {
        dialogEl.style.top = startTop + (e.clientY - startY) + "px";
        dialogEl.style.bottom = "auto";
      }
      dialogEl.style.height = `${Math.max(startHeight - (e.clientY - startY), local.minHeightPx ?? 0)}px`;
    }
    if (direction === "bottom" || direction === "bottom-right" || direction === "bottom-left") {
      dialogEl.style.height = `${Math.max(startHeight + e.clientY - startY, local.minHeightPx ?? 0)}px`;
    }
    if (direction === "right" || direction === "bottom-right" || direction === "top-right") {
      dialogEl.style.width = `${Math.max(
        startWidth + (e.clientX - startX) * (dialogEl.style.position === "absolute" ? 1 : 2),
        local.minWidthPx ?? 0,
      )}px`;
    }
    if (direction === "left" || direction === "bottom-left" || direction === "top-left") {
      if (dialogEl.style.position === "absolute") {
        dialogEl.style.left = startLeft + (e.clientX - startX) + "px";
      }
      dialogEl.style.width = `${Math.max(
        startWidth - (e.clientX - startX) * (dialogEl.style.position === "absolute" ? 1 : 2),
        local.minWidthPx ?? 0,
      )}px`;
    }
  };

  const stopDrag = (e: PointerEvent): void => {
    e.stopPropagation();
    e.preventDefault();

    target.removeEventListener("pointermove", doDrag);
    target.removeEventListener("pointerup", stopDrag);
  };

  target.addEventListener("pointermove", doDrag);
  target.addEventListener("pointerup", stopDrag);
};
```

**Step 2: 리사이즈 바 JSX 교체 + `touch-action: none` 추가**

`packages/solid/src/components/disclosure/Modal.tsx:559-567`를 수정:

```tsx
<div
  data-resize-bar={direction}
  class={clsx("absolute", "touch-none", resizePositionMap[direction], resizeCursorMap[direction])}
  onPointerDown={(e) => handleResizeBarPointerDown(e, direction)}
/>
```

**Step 3: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 4: 커밋**

```bash
git add packages/solid/src/components/disclosure/Modal.tsx
git commit -m "refactor(solid): Modal 리사이즈 바 mouse → pointer 이벤트 전환

setPointerCapture를 활용하여 document.documentElement 리스너 패턴 제거."
```

---

### Task 4: 최종 검증

**Step 1: 린트**

Run: `pnpm lint packages/solid`
Expected: PASS

**Step 2: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: mouse 이벤트 잔존 확인**

Run: `grep -rn "onMouseDown\|onMouseUp\|onMouseMove\|addEventListener.*mouse" packages/solid/src/`
Expected: 결과 없음 (mouse 이벤트가 남아있지 않아야 함)

**Step 4: 수동 테스트 (dev 서버)**

Run: `pnpm dev`

확인 항목:

1. Sheet 컬럼 리사이저 드래그 — 마우스로 정상 동작
2. Sheet 컬럼 리사이저 더블클릭 — 너비 초기화 정상 동작
3. Sheet Shift+Click 텍스트 선택 방지 — 정상 동작
4. Modal 헤더 드래그 이동 — 마우스로 정상 동작
5. Modal 리사이즈 바 드래그 — 8방향 모두 정상 동작
6. Modal 화면 밖 방지 — 정상 동작
