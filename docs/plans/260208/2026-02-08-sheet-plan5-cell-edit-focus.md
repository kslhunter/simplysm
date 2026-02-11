# Sheet 셀 편집 + 포커스 인디케이터 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Sheet 컴포넌트에 Excel 스타일 셀 편집 모드와 포커스 인디케이터를 추가하여, 키보드 네비게이션과 인라인 편집을 지원한다.

**Architecture:** 기존 Sheet.tsx에 CellAgent(포커스/편집 상태 관리 + 키보드 네비게이션)와 FocusIndicator(overlay div로 행/셀 하이라이트) 두 개의 region을 추가한다. 셀에 `tabindex`/`data-r`/`data-c` 속성을 부여하고, 컨테이너의 `focusin`/`focusout`/`keydown` 이벤트로 포커스를 추적하며, `edit` prop 변경으로 셀 렌더러가 편집/표시 모드를 전환한다.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS, `@solid-primitives/resize-observer`, `tabbable`

---

### Task 1: `findFirstFocusableChild` 구현 (core-browser)

**Files:**

- Modify: `packages/core-browser/src/extensions/element-ext.ts:65` (선언만 있고 구현 없음)

**Step 1: 구현 추가**

`element-ext.ts`에서 `findFocusableParent` 구현(line 112-121) 아래에 `findFirstFocusableChild` 구현을 추가한다:

```typescript
Element.prototype.findFirstFocusableChild = function (): HTMLElement | undefined {
  const walker = document.createTreeWalker(this, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node !== null) {
    if (node instanceof HTMLElement && isFocusable(node)) {
      return node;
    }
    node = walker.nextNode();
  }
  return undefined;
};
```

위치: `findFocusableParent` 구현(line 121) 바로 다음.

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/core-browser`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/core-browser/src/extensions/element-ext.ts
git commit -m "feat(core-browser): findFirstFocusableChild 구현 추가"
```

---

### Task 2: Sheet splitProps에 신규 props 추가

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx:42-62`

**Step 1: splitProps 배열에 props 추가**

`splitProps(props, [...])` 호출에 아래 키들을 추가한다. `"class"` 바로 앞에 삽입:

```typescript
const [local] = splitProps(props, [
  // ... 기존 props ...
  "getChildrenFn",
  // ↓ 여기에 추가 ↓
  "getItemCellClassFn",
  "getItemCellStyleFn",
  "focusMode",
  "onItemKeydown",
  "onCellKeydown",
  // ↑ 여기까지 ↑
  "class",
  "children",
]);
```

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.tsx
git commit -m "feat(solid): Sheet splitProps에 focusMode, 이벤트, 셀 스타일 props 추가"
```

---

### Task 3: CellAgent — 포커스/편집 상태 Signal + 셀 조회 함수

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx`

**Step 1: containerRef 변수 선언**

`// #region Display` 다음, `return (` 이전에 `containerRef`를 선언한다:

```typescript
// #region CellAgent
let containerRef: HTMLDivElement | undefined;
```

**Step 2: Signal + 헬퍼 함수 추가**

```typescript
const [focusedAddr, setFocusedAddr] = createSignal<{ r: number; c: number } | null>(null);
const [editCellAddr, setEditCellAddr] = createSignal<{ r: number; c: number } | null>(null);

function getIsCellEditMode(r: number, c: number): boolean {
  const addr = editCellAddr();
  return addr != null && addr.r === r && addr.c === c;
}

function getCell(r: number, c: number): HTMLTableCellElement | null {
  return containerRef?.querySelector(`td[data-r="${r}"][data-c="${c}"]`) ?? null;
}
```

**Step 3: `data-sheet-scroll` div에 ref 연결**

기존 JSX (Sheet.tsx line 385):

```tsx
<div data-sheet-scroll class={twMerge(sheetContainerClass, "flex-1 min-h-0")} style={local.contentStyle}>
```

변경:

```tsx
<div data-sheet-scroll ref={containerRef} class={twMerge(sheetContainerClass, "flex-1 min-h-0")} style={local.contentStyle}>
```

**Step 4: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.tsx
git commit -m "feat(solid): Sheet CellAgent region — 포커스/편집 상태 Signal 추가"
```

---

### Task 4: 데이터 셀 td에 tabindex/data 속성 부여 + edit prop 연결

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx:633-651` (tbody의 데이터 셀 렌더링)

**Step 1: td 속성 및 edit prop 변경**

기존 데이터 셀 `<td>` (Sheet.tsx line 634-650):

```tsx
<For each={effectiveColumns()}>
  {(col, colIndex) => (
    <td
      class={twMerge(
        tdClass,
        col.fixed ? clsx(fixedClass, "z-[2]") : undefined,
        isLastFixed(colIndex()) ? fixedLastClass : undefined,
      )}
      style={getFixedStyle(colIndex())}
    >
      {col.cell({
        item: flat.item,
        index: flat.index,
        depth: flat.depth,
        edit: false,
      })}
    </td>
  )}
</For>
```

변경:

```tsx
<For each={effectiveColumns()}>
  {(col, colIndex) => {
    const displayIndex = () => displayItems().indexOf(flat);
    return (
      <td
        tabindex="-1"
        data-r={displayIndex()}
        data-c={colIndex()}
        class={twMerge(
          tdClass,
          col.fixed ? clsx(fixedClass, "z-[2]") : undefined,
          isLastFixed(colIndex()) ? fixedLastClass : undefined,
          local.getItemCellClassFn?.(flat.item, col.key),
        )}
        style={
          [getFixedStyle(colIndex()), local.getItemCellStyleFn?.(flat.item, col.key)].filter(Boolean).join("; ") ||
          undefined
        }
        onDblClick={() => enterEditMode(displayIndex(), colIndex())}
      >
        {col.cell({
          item: flat.item,
          index: flat.index,
          depth: flat.depth,
          edit: getIsCellEditMode(displayIndex(), colIndex()),
        })}
      </td>
    );
  }}
</For>
```

**주의:** `displayIndex()`는 `<For>`의 반복 안에서 현재 `flat` 객체의 인덱스를 얻기 위해 사용한다. `<For>`는 인덱스를 콜백 두 번째 인자로 제공하므로, 실제로는 `<For each={displayItems()}>` 콜백의 두 번째 인자 `(flat, flatIndex)`를 사용하는 것이 더 효율적이다.

수정된 접근 — `<For>` 콜백에서 인덱스 활용:

기존 line 589:

```tsx
<For each={displayItems()}>
  {(flat) => (
```

변경:

```tsx
<For each={displayItems()}>
  {(flat, flatIndex) => (
```

그리고 `displayIndex()` 대신 `flatIndex()`를 사용:

```tsx
data-r={flatIndex()}
data-c={colIndex()}
onDblClick={() => enterEditMode(flatIndex(), colIndex())}
edit: getIsCellEditMode(flatIndex(), colIndex()),
```

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS (enterEditMode은 Task 6에서 구현하므로 여기서는 에러 가능 → Task 4~6을 함께 구현 후 체크)

**Step 3: 커밋** (Task 6 완료 후 함께 커밋)

---

### Task 5: 포커스 이벤트 캡처 (focusin/focusout)

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx` — CellAgent region

**Step 1: 이벤트 핸들러 함수 추가**

CellAgent region의 `getCell` 함수 뒤에 추가:

```typescript
function onFocusCapture(e: FocusEvent): void {
  const td = (e.target as HTMLElement).closest("td[data-r]") as HTMLElement | null;
  if (!td) return;
  const r = Number(td.dataset.r);
  const c = Number(td.dataset.c);
  setFocusedAddr({ r, c });
}

function onBlurCapture(e: FocusEvent): void {
  const relatedTarget = e.relatedTarget as HTMLElement | null;
  const container = containerRef!;

  if (!relatedTarget || !container.contains(relatedTarget)) {
    setFocusedAddr(null);
    setEditCellAddr(null);
    return;
  }

  const editAddr = editCellAddr();
  if (editAddr) {
    const editTd = getCell(editAddr.r, editAddr.c);
    if (editTd && !editTd.contains(relatedTarget)) {
      setEditCellAddr(null);
    }
  }
}
```

**Step 2: JSX에 이벤트 바인딩**

`data-sheet-scroll` div에 이벤트 추가:

```tsx
<div
  data-sheet-scroll
  ref={containerRef}
  class={twMerge(sheetContainerClass, "flex-1 min-h-0")}
  style={local.contentStyle}
  onFocusIn={onFocusCapture}
  onFocusOut={onBlurCapture}
>
```

**Step 3: 커밋** (Task 6 완료 후 함께 커밋)

---

### Task 6: 키보드 네비게이션 + 편집 모드 진입/해제

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx` — CellAgent region

**Step 1: 편집/이동 함수 추가**

```typescript
function enterEditMode(r: number, c: number): void {
  setEditCellAddr({ r, c });
  requestAnimationFrame(() => {
    const td = getCell(r, c);
    if (td) {
      const focusable = td.findFirstFocusableChild();
      focusable?.focus();
    }
  });
}

function exitEditMode(): void {
  const addr = editCellAddr();
  setEditCellAddr(null);
  if (addr) {
    const td = getCell(addr.r, addr.c);
    td?.focus();
  }
}

function moveFocus(r: number, c: number, dr: number, dc: number): void {
  const newR = Math.max(0, Math.min(r + dr, displayItems().length - 1));
  const newC = Math.max(0, Math.min(c + dc, effectiveColumns().length - 1));
  const td = getCell(newR, newC);
  if (td) {
    containerRef!.scrollIntoViewIfNeeded(
      { top: td.offsetTop, left: td.offsetLeft },
      {
        top: summaryRowTop() + (headerRowHeights().reduce((a, b) => a + b, 0) - summaryRowTop()),
        left:
          featureColTotalWidth() + fixedLeftMap().size > 0
            ? [...fixedLeftMap().values()].pop()! + (columnWidths().get(lastFixedIndex()) ?? 0)
            : 0,
      },
    );
    td.focus();
  }
}

function moveFocusWithEdit(r: number, c: number, dr: number, dc: number): void {
  setEditCellAddr(null);
  const newR = Math.max(0, Math.min(r + dr, displayItems().length - 1));
  const newC = Math.max(0, Math.min(c + dc, effectiveColumns().length - 1));
  enterEditMode(newR, newC);
}
```

**참고 - `moveFocus`의 `scrollIntoViewIfNeeded` offset 계산:**

- `top` offset: 헤더 총 높이 (합계행 포함) → `headerRowHeights()`를 합산
- `left` offset: 기능 컬럼 너비 + 고정 컬럼 총 너비

offset 계산을 단순화하여 가독성 향상:

```typescript
function getScrollOffset(): { top: number; left: number } {
  const totalHeaderHeight = headerRowHeights().reduce((sum, h) => sum + (h ?? 0), 0);

  let fixedColWidth = featureColTotalWidth();
  const widths = columnWidths();
  for (const [, w] of widths) {
    // fixedLeftMap에 포함된 컬럼만 합산
    fixedColWidth += w;
  }
  // fixedLeftMap의 크기로 고정 컬럼 수 판단
  const fixedCount = fixedLeftMap().size;
  let totalFixedWidth = featureColTotalWidth();
  for (let i = 0; i < fixedCount; i++) {
    totalFixedWidth += widths.get(i) ?? 0;
  }

  return { top: totalHeaderHeight, left: totalFixedWidth };
}

function moveFocus(r: number, c: number, dr: number, dc: number): void {
  const newR = Math.max(0, Math.min(r + dr, displayItems().length - 1));
  const newC = Math.max(0, Math.min(c + dc, effectiveColumns().length - 1));
  const td = getCell(newR, newC);
  if (td) {
    const offset = getScrollOffset();
    containerRef!.scrollIntoViewIfNeeded({ top: td.offsetTop, left: td.offsetLeft }, offset);
    td.focus();
  }
}
```

**Step 2: onKeyDown 핸들러 추가**

```typescript
function onKeyDown(e: KeyboardEvent): void {
  const target = e.target as HTMLElement;
  const td = target.closest("td[data-r]") as HTMLElement | null;
  if (!td) return;

  const r = Number(td.dataset.r);
  const c = Number(td.dataset.c);
  const isEditing = editCellAddr() != null;

  if (!isEditing) {
    switch (e.key) {
      case "ArrowUp":
        moveFocus(r, c, -1, 0);
        e.preventDefault();
        break;
      case "ArrowDown":
        moveFocus(r, c, 1, 0);
        e.preventDefault();
        break;
      case "ArrowLeft":
        moveFocus(r, c, 0, -1);
        e.preventDefault();
        break;
      case "ArrowRight":
        moveFocus(r, c, 0, 1);
        e.preventDefault();
        break;
      case "Enter":
        if (e.shiftKey) {
          moveFocus(r, c, -1, 0);
        } else {
          moveFocus(r, c, 1, 0);
        }
        e.preventDefault();
        break;
      case "Tab":
        if (e.shiftKey) {
          moveFocus(r, c, 0, -1);
        } else {
          moveFocus(r, c, 0, 1);
        }
        e.preventDefault();
        break;
      case "F2":
        enterEditMode(r, c);
        e.preventDefault();
        break;
    }
  } else {
    switch (e.key) {
      case "Escape":
        exitEditMode();
        e.preventDefault();
        break;
      case "Enter":
        if (e.shiftKey) {
          moveFocusWithEdit(r, c, -1, 0);
        } else {
          moveFocusWithEdit(r, c, 1, 0);
        }
        e.preventDefault();
        break;
      case "Tab":
        if (e.shiftKey) {
          moveFocusWithEdit(r, c, 0, -1);
        } else {
          moveFocusWithEdit(r, c, 0, 1);
        }
        e.preventDefault();
        break;
    }
  }

  local.onCellKeydown?.({ item: displayItems()[r].item, key: effectiveColumns()[c].key, event: e });
  local.onItemKeydown?.({ item: displayItems()[r].item, event: e });
}
```

**Step 3: JSX에 onKeyDown 바인딩**

`data-sheet-scroll` div에 추가:

```tsx
<div
  data-sheet-scroll
  ref={containerRef}
  class={twMerge(sheetContainerClass, "flex-1 min-h-0")}
  style={local.contentStyle}
  onFocusIn={onFocusCapture}
  onFocusOut={onBlurCapture}
  onKeyDown={onKeyDown}
>
```

**Step 4: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 5: 린트 실행**

Run: `pnpm lint packages/solid`
Expected: PASS

**Step 6: 커밋** (Task 4~6 통합)

```bash
git add packages/solid/src/components/data/sheet/Sheet.tsx
git commit -m "feat(solid): Sheet 셀 포커스/편집 모드 + 키보드 네비게이션 구현"
```

---

### Task 7: 포커스 인디케이터 (overlay div)

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx`
- Modify: `packages/solid/src/components/data/sheet/Sheet.styles.ts`

**Step 1: Sheet.styles.ts에 인디케이터 스타일 추가**

파일 끝에 추가:

```typescript
// 포커스 인디케이터 — 행 하이라이트
export const focusRowIndicatorClass = clsx("absolute pointer-events-none", "bg-base-500/10", "z-[6]");

// 포커스 인디케이터 — 셀 테두리
export const focusCellIndicatorClass = clsx(
  "absolute",
  "border-2 border-primary-500",
  "rounded",
  "pointer-events-none",
);
```

**Step 2: Sheet.tsx에 스타일 import 추가**

기존 import (line 13-34)에 추가:

```typescript
import {
  // ... 기존 imports ...
  focusRowIndicatorClass,
  focusCellIndicatorClass,
} from "./Sheet.styles";
```

**Step 3: FocusIndicator region 추가**

CellAgent region 다음에 추가:

```typescript
// #region FocusIndicator
const [focusIndicatorStyle, setFocusIndicatorStyle] = createSignal<JSX.CSSProperties>({
  display: "none",
});
const [focusCellStyle, setFocusCellStyle] = createSignal<JSX.CSSProperties>({
  display: "none",
});

function redrawFocusIndicator(): void {
  const addr = focusedAddr();
  if (!addr) {
    setFocusIndicatorStyle({ display: "none" });
    setFocusCellStyle({ display: "none" });
    return;
  }

  const td = getCell(addr.r, addr.c);
  const tr = td?.parentElement;
  const container = containerRef!;
  if (!td || !tr) return;

  // 행 인디케이터
  setFocusIndicatorStyle({
    display: "block",
    top: `${tr.offsetTop}px`,
    left: `${container.scrollLeft}px`,
    width: `${container.clientWidth}px`,
    height: `${tr.offsetHeight}px`,
  });

  // 셀 인디케이터 (편집 중이거나 focusMode="row"이면 숨김)
  const isEditing = editCellAddr() != null;
  const isRowMode = local.focusMode === "row";
  if (isEditing || isRowMode) {
    setFocusCellStyle({ display: "none" });
    return;
  }

  const isFixed = td.classList.contains("sticky");
  setFocusCellStyle({
    "display": "block",
    "position": isFixed ? "sticky" : "absolute",
    "top": `${td.offsetTop}px`,
    "left": isFixed ? td.style.left || "0px" : `${td.offsetLeft}px`,
    "width": `${td.offsetWidth}px`,
    "height": `${td.offsetHeight}px`,
    "z-index": "6",
  });
}
```

**Step 4: 이벤트에 redraw 트리거 연결**

`onFocusCapture` 함수 끝에 추가:

```typescript
function onFocusCapture(e: FocusEvent): void {
  // ... 기존 코드 ...
  redrawFocusIndicator();
}
```

`onBlurCapture` 함수의 각 return/끝에 추가:

```typescript
function onBlurCapture(e: FocusEvent): void {
  // ... 기존 코드 ...
  redrawFocusIndicator();
}
```

**Step 5: 스크롤 이벤트에 연결**

`data-sheet-scroll` div에 `onScroll` 추가:

```tsx
<div
  data-sheet-scroll
  ref={containerRef}
  // ... 기존 속성 ...
  onScroll={() => requestAnimationFrame(() => redrawFocusIndicator())}
>
```

**Step 6: ResizeObserver로 컨테이너 리사이즈 시 재그리기**

CellAgent/FocusIndicator region 마지막에 추가 (JSX 밖, 함수 선언 뒤):

이 부분은 JSX 안에서 `ref` 콜백으로 처리하는 것이 더 적합하다. `containerRef` 설정 시점에 observer를 등록한다:

```typescript
// data-sheet-scroll div의 ref 콜백으로 변경
function setContainerRef(el: HTMLDivElement): void {
  containerRef = el;
  createResizeObserver(el, () => {
    redrawFocusIndicator();
  });
}
```

JSX에서:

```tsx
ref = { setContainerRef };
```

**Step 7: overlay div를 JSX에 추가**

`resizeIndicatorClass` div 바로 앞 (table 닫는 태그 뒤, `</div>` 전)에 추가:

```tsx
</table>
{/* 포커스 인디케이터 */}
<div class={focusRowIndicatorClass} style={focusIndicatorStyle()}>
  <div class={focusCellIndicatorClass} style={focusCellStyle()} />
</div>
<div class={resizeIndicatorClass} style={resizeIndicatorStyle()} />
```

**Step 8: 타입체크 + 린트 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS

Run: `pnpm lint packages/solid`
Expected: PASS

**Step 9: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.styles.ts packages/solid/src/components/data/sheet/Sheet.tsx
git commit -m "feat(solid): Sheet 포커스 인디케이터 (행 + 셀 overlay) 구현"
```

---

### Task 8: 데모 페이지에 셀 편집 섹션 추가

**Files:**

- Modify: `packages/solid-demo/src/pages/data/SheetPage.tsx`

**Step 1: import에 TextField 추가**

기존 import (line 2):

```typescript
import { Sheet, Topbar, TopbarContainer, type SortingDef } from "@simplysm/solid";
```

변경:

```typescript
import { Sheet, TextField, Topbar, TopbarContainer, type SortingDef } from "@simplysm/solid";
```

**Step 2: 편집용 users 데이터를 signal로 변경**

함수 본문 상단에 추가:

```typescript
const [editUsers, setEditUsers] = createSignal<User[]>([
  { name: "홍길동", age: 30, email: "hong@example.com", salary: 5000 },
  { name: "김철수", age: 25, email: "kim@example.com", salary: 4200 },
  { name: "이영희", age: 28, email: "lee@example.com", salary: 4800 },
  { name: "박민수", age: 35, email: "park@example.com", salary: 5500 },
  { name: "최지영", age: 22, email: "choi@example.com", salary: 3800 },
]);

function updateEditUser(index: number, field: keyof User, value: string | number): void {
  setEditUsers((prev) => prev.map((u, i) => (i === index ? { ...u, [field]: value } : u)));
}
```

**Step 3: 셀 편집 섹션 추가**

"고정 컬럼 + 리사이징" section 뒤에 추가:

```tsx
{
  /* 셀 편집 */
}
<section>
  <h2 class="mb-4 text-xl font-semibold">셀 편집</h2>
  <p class="mb-4 text-sm text-base-600 dark:text-base-400">
    셀을 클릭하여 포커스 후, F2 또는 더블클릭으로 편집 모드 진입. Arrow/Enter/Tab으로 네비게이션. Escape로 편집 해제.
  </p>
  <Sheet items={editUsers()} key="cell-edit" focusMode="cell">
    <Sheet.Column<User> key="name" header="이름">
      {(ctx) => (
        <Show when={ctx.edit} fallback={<div class="px-2 py-1">{ctx.item.name}</div>}>
          <TextField value={ctx.item.name} onValueChange={(v) => updateEditUser(ctx.index, "name", v)} inset />
        </Show>
      )}
    </Sheet.Column>
    <Sheet.Column<User> key="age" header="나이">
      {(ctx) => (
        <Show when={ctx.edit} fallback={<div class="px-2 py-1">{ctx.item.age}</div>}>
          <TextField
            value={String(ctx.item.age)}
            onValueChange={(v) => updateEditUser(ctx.index, "age", Number(v))}
            inset
          />
        </Show>
      )}
    </Sheet.Column>
    <Sheet.Column<User> key="email" header="이메일">
      {(ctx) => <div class="px-2 py-1">{ctx.item.email}</div>}
    </Sheet.Column>
    <Sheet.Column<User> key="salary" header="급여">
      {(ctx) => <div class="px-2 py-1 text-right">{ctx.item.salary.toLocaleString()}원</div>}
    </Sheet.Column>
  </Sheet>
</section>;

{
  /* 행 포커스 모드 */
}
<section>
  <h2 class="mb-4 text-xl font-semibold">행 포커스 모드</h2>
  <p class="mb-4 text-sm text-base-600 dark:text-base-400">
    focusMode="row"일 때 셀 인디케이터 대신 행 인디케이터만 표시됩니다.
  </p>
  <Sheet items={users} key="row-focus" focusMode="row">
    <Sheet.Column<User> key="name" header="이름">
      {(ctx) => <div class="px-2 py-1">{ctx.item.name}</div>}
    </Sheet.Column>
    <Sheet.Column<User> key="age" header="나이">
      {(ctx) => <div class="px-2 py-1">{ctx.item.age}</div>}
    </Sheet.Column>
    <Sheet.Column<User> key="email" header="이메일">
      {(ctx) => <div class="px-2 py-1">{ctx.item.email}</div>}
    </Sheet.Column>
  </Sheet>
</section>;
```

**Step 4: Show import 추가**

파일 상단 import에 `Show` 추가:

```typescript
import { createSignal, Show } from "solid-js";
```

**Step 5: 타입체크 + 린트 실행**

Run: `pnpm typecheck packages/solid-demo`
Expected: PASS

Run: `pnpm lint packages/solid-demo`
Expected: PASS

**Step 6: 커밋**

```bash
git add packages/solid-demo/src/pages/data/SheetPage.tsx
git commit -m "feat(solid-demo): Sheet 셀 편집 + 행 포커스 모드 데모 추가"
```

---

### Task 9: 통합 검증

**Files:** (수정 없음, 검증만)

**Step 1: 전체 타입체크**

Run: `pnpm typecheck`
Expected: PASS

**Step 2: 전체 린트**

Run: `pnpm lint`
Expected: PASS

**Step 3: dev 서버 실행 + 수동 검증**

Run: `pnpm dev`

데모 페이지 (Sheet)에서 아래 시나리오 확인:

1. 셀 클릭 → 포커스 인디케이터(행 배경 + 셀 테두리) 표시
2. Arrow 키 → 인접 셀로 이동, 인디케이터 추적
3. Enter/Tab → 셀 이동
4. F2 → 편집 모드 진입, TextField에 포커스
5. 더블클릭 → 편집 모드 진입
6. Escape → 편집 해제, td에 포커스 복귀
7. 편집 중 Enter → 아래 셀로 이동 + 편집 모드 유지
8. 편집 중 Tab → 오른쪽 셀로 이동 + 편집 모드 유지
9. `focusMode="row"` → 셀 인디케이터 숨김, 행 인디케이터만 표시
10. 스크롤 시 인디케이터 위치 추적
11. 컨테이너 밖 클릭 → 포커스/편집 모두 해제

**Step 4: 최종 커밋** (필요시)

```bash
git add -A
git commit -m "fix(solid): Sheet 셀 편집/포커스 통합 검증 수정"
```

---

## 파일 변경 요약

| 파일                                                       | 변경 내용                                                                | Task |
| ---------------------------------------------------------- | ------------------------------------------------------------------------ | ---- |
| `packages/core-browser/src/extensions/element-ext.ts`      | `findFirstFocusableChild` 구현 추가                                      | 1    |
| `packages/solid/src/components/data/sheet/Sheet.tsx`       | splitProps 확장, CellAgent region, FocusIndicator region, td 속성/이벤트 | 2-7  |
| `packages/solid/src/components/data/sheet/Sheet.styles.ts` | `focusRowIndicatorClass`, `focusCellIndicatorClass` 추가                 | 7    |
| `packages/solid-demo/src/pages/data/SheetPage.tsx`         | 셀 편집 + 행 포커스 모드 데모 섹션 추가                                  | 8    |
