# Sheet 컬럼 고정 + 리사이징 구현 계획서 (Plan 3)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Sheet 컴포넌트에 컬럼 고정(sticky)과 컬럼 리사이징 기능을 추가한다.

**Architecture:** `fixed` prop이 true인 컬럼은 `position: sticky; left: Npx`로 고정하며, ResizeObserver로 각 고정 컬럼의 실제 너비를 추적하여 left 값을 누적 계산한다. 리사이징은 헤더 셀 우측에 드래그 핸들을 배치하고, 드래그 중 세로 점선 인디케이터를 표시하며, mouseup 시 usePersisted로 컬럼 너비를 저장한다.

**Tech Stack:** SolidJS, `@solid-primitives/resize-observer` (createResizeObserver), Tailwind CSS, `usePersisted`

---

## 현재 상태 요약

### 구현 완료 (Plan 1 + Plan 2)

- 기본 테이블 렌더링, 다단계 헤더, 합계 행
- 정렬 (단일/다중, 자동 정렬)
- 페이지네이션 (클라이언트 사이드)
- 스타일 상수 (`Sheet.styles.ts`)

### Plan 3에서 추가할 기능

1. **컬럼 고정 (sticky)**: `fixed` prop이 true인 컬럼을 좌측에 고정
2. **고정/비고정 경계 시각 효과**: 진한 우측 테두리
3. **컬럼 리사이징**: 드래그로 너비 변경 + 더블클릭 초기화
4. **리사이즈 인디케이터**: 드래그 중 세로 점선
5. **컬럼 설정 저장**: usePersisted로 너비 설정 localStorage 저장

### 핵심 파일 경로 (worktree)

- `packages/solid/src/components/data/sheet/Sheet.tsx` (267줄)
- `packages/solid/src/components/data/sheet/Sheet.styles.ts` (69줄)
- `packages/solid/src/components/data/sheet/types.ts` (133줄)
- `packages/solid/src/components/data/sheet/sheetUtils.ts` (102줄)
- `packages/solid/src/components/data/sheet/SheetColumn.tsx` (33줄)
- `packages/solid/tests/sheet/Sheet.spec.tsx` (287줄)
- `packages/solid-demo/src/pages/data/SheetPage.tsx` (165줄)
- `packages/solid-demo/src/pages/data/SheetFullPage.tsx` (136줄)

---

## Task 1: 스타일 상수 추가

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.styles.ts:69` (파일 끝에 추가)

**Step 1: Sheet.styles.ts에 고정 컬럼 + 리사이징 스타일 상수 추가**

파일 끝에 다음 상수들을 추가한다:

```typescript
// 고정 컬럼 기본 (sticky)
export const fixedClass = "sticky";

// 고정/비고정 경계 시각 효과 — 고정 컬럼의 마지막 셀에 적용
export const fixedLastClass = clsx("border-r-2 border-r-base-400", "dark:border-r-base-500");

// 리사이저 핸들 (헤더 셀 우측 드래그 영역)
export const resizerClass = clsx(
  "absolute top-0 right-0 bottom-0",
  "w-1",
  "cursor-ew-resize",
  "hover:bg-primary-300 dark:hover:bg-primary-600",
);

// 드래그 중 세로 점선 인디케이터
export const resizeIndicatorClass = clsx(
  "absolute top-0 bottom-0",
  "w-0 border-l-2 border-dashed border-primary-500",
  "pointer-events-none",
  "z-[7]",
);
```

**Step 2: 검증**

Run: `pnpm lint packages/solid/src/components/data/sheet/Sheet.styles.ts`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.styles.ts
git commit -m "feat(solid): Sheet 고정 컬럼/리사이징 스타일 상수 추가"
```

---

## Task 2: 컬럼 설정 저장 (usePersisted 연동)

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx`

Sheet.tsx에 usePersisted를 연동하여 컬럼 너비 설정을 localStorage에 저장/복원한다.

**Step 1: Sheet.tsx에 config 상태 및 effectiveColumns 추가**

Sheet.tsx의 import 영역에 추가:

```typescript
import { usePersisted } from "../../../contexts/usePersisted";
import type { FlatItem, SheetColumnDef, SheetConfig, SheetProps, SortingDef } from "./types";
```

`// #region Column Collection` 직후, `columnDefs` 계산 다음에 config 상태를 추가한다:

```typescript
// #region Config (usePersisted)
const [config, setConfig] = usePersisted<SheetConfig>(`sheet.${local.key}`, { columnRecord: {} });

// 설정이 적용된 최종 컬럼 — config의 width 오버라이드 적용
const effectiveColumns = createMemo(() => {
  const cols = columnDefs();
  const record = config().columnRecord ?? {};
  return cols.map((col) => {
    const saved = record[col.key];
    if (!saved) return col;
    return {
      ...col,
      width: saved.width ?? col.width,
    };
  });
});

function saveColumnWidth(colKey: string, width: string | undefined): void {
  const prev = config();
  const record = { ...prev.columnRecord };
  record[colKey] = { ...record[colKey], width };
  setConfig({ ...prev, columnRecord: record });
}
```

**Step 2: columnDefs() → effectiveColumns()로 교체**

Sheet.tsx 전체에서 `columnDefs()`를 사용하는 곳을 `effectiveColumns()`로 교체한다. 단, `columnDefs` 정의 자체와 `effectiveColumns` 내부의 `columnDefs()` 호출은 그대로 둔다.

교체 대상:

- `headerTable` 계산: `buildHeaderTable(columnDefs())` → `buildHeaderTable(effectiveColumns())`
- `hasSummary` 계산: `columnDefs().some(...)` → `effectiveColumns().some(...)`
- `colgroup`의 `<For each={columnDefs()}>` → `<For each={effectiveColumns()}>`
- thead 내 정렬 관련 `columnDefs()[c().colIndex!]` → `effectiveColumns()[c().colIndex!]`
- tbody의 `<For each={columnDefs()}>` → `<For each={effectiveColumns()}>`
- 합계 행의 `<For each={columnDefs()}>` → `<For each={effectiveColumns()}>`

**Step 3: splitProps에 SheetConfig 관련 props는 이미 key가 포함되어 있으므로 추가 없음**

`local.key`는 이미 splitProps에 포함되어 있다.

**Step 4: 검증**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

Run: `pnpm vitest packages/solid/tests/sheet/Sheet.spec.tsx --project=solid --run`
Expected: 모든 테스트 통과

> 참고: usePersisted는 ConfigContext.Provider가 필요하다. 테스트 환경에서 Provider가 없으면 에러가 발생할 수 있다. 이 경우 테스트에 Provider를 감싸거나, config 로직을 조건부로 처리해야 한다. 테스트 실행 결과에 따라 대응한다.

**Step 5: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.tsx
git commit -m "feat(solid): Sheet 컬럼 설정 저장 (usePersisted 연동)"
```

---

## Task 3: 컬럼 고정 (sticky) 구현

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx`

**Step 1: Sheet.tsx에 #region ColumnFixing 추가**

`// #region Expanding` 앞에 다음 코드를 추가한다:

```typescript
// #region ColumnFixing
// 각 컬럼 셀의 ref → 너비 측정용
const columnRefs = new Map<number, HTMLElement>();

// 각 컬럼의 측정된 너비
const [columnWidths, setColumnWidths] = createSignal<Map<number, number>>(new Map());

// 고정 컬럼의 left 위치 계산
const fixedLeftMap = createMemo(() => {
  const map = new Map<number, number>();
  const cols = effectiveColumns();
  const widths = columnWidths();
  let left = 0;
  for (let c = 0; c < cols.length; c++) {
    if (!cols[c].fixed) break; // 고정 컬럼은 앞쪽에 연속 배치
    map.set(c, left);
    left += widths.get(c) ?? 0;
  }
  return map;
});

// 마지막 고정 컬럼 인덱스
const lastFixedIndex = createMemo(() => {
  const cols = effectiveColumns();
  let last = -1;
  for (let c = 0; c < cols.length; c++) {
    if (cols[c].fixed) last = c;
    else break;
  }
  return last;
});

function getFixedStyle(colIndex: number): string | undefined {
  const leftVal = fixedLeftMap().get(colIndex);
  if (leftVal == null) return undefined;
  return `left: ${leftVal}px`;
}

function isLastFixed(colIndex: number): boolean {
  return colIndex === lastFixedIndex();
}
```

**Step 2: import 추가**

```typescript
import { createResizeObserver } from "@solid-primitives/resize-observer";
```

**Step 3: ResizeObserver로 고정 컬럼 너비 추적**

`#region ColumnFixing` 내에 추가:

```typescript
// 고정 컬럼 셀에 ResizeObserver 등록
function registerColumnRef(colIndex: number, el: HTMLElement): void {
  columnRefs.set(colIndex, el);
  createResizeObserver(el, (rect) => {
    setColumnWidths((prev) => {
      const next = new Map(prev);
      next.set(colIndex, rect.width);
      return next;
    });
  });
}
```

**Step 4: thead에 고정 컬럼 스타일 적용**

Sheet.styles.ts에서 import 추가:

```typescript
import {
  // ... 기존 import ...
  fixedClass,
  fixedLastClass,
  resizerClass,
  resizeIndicatorClass,
} from "./Sheet.styles";
```

thead의 마지막 depth 헤더 셀 (`isLastRow === true`)에 고정 스타일을 적용한다. `<th>` 렌더링 부분을 수정:

기존 `<th>` 태그에 class와 style을 추가:

- `class`: 고정 컬럼이면 `fixedClass` + `z-[4]` (thead + fixed) 추가, 마지막 고정이면 `fixedLastClass` 추가
- `style`: 고정 컬럼이면 `left: Npx` 추가

비-마지막 depth 헤더 셀 (그룹 헤더)은 고정 컬럼에 속하는 셀이면 `fixedClass` + `z-[4]`를 적용한다.

**Step 5: thead의 `<th>` 렌더링 수정**

`<th>` 태그를 다음과 같이 수정한다:

```tsx
<th
  class={twMerge(
    thClass,
    isSortable() ? sortableThClass : undefined,
    c().isLastRow && c().colIndex != null && effectiveColumns()[c().colIndex!].fixed
      ? clsx(fixedClass, "z-[4]")
      : c().fixed ? clsx(fixedClass, "z-[4]") : undefined,
    c().isLastRow && c().colIndex != null && isLastFixed(c().colIndex!)
      ? fixedLastClass
      : undefined,
  )}
  colspan={c().colspan > 1 ? c().colspan : undefined}
  rowspan={c().rowspan > 1 ? c().rowspan : undefined}
  style={
    c().isLastRow && c().colIndex != null
      ? getFixedStyle(c().colIndex!)
      : undefined
  }
  ref={(el: HTMLElement) => {
    if (c().isLastRow && c().colIndex != null && effectiveColumns()[c().colIndex!].fixed) {
      registerColumnRef(c().colIndex!, el);
    }
  }}
  // ... 기존 title, onClick ...
>
```

**Step 6: 합계 행에도 고정 스타일 적용**

합계 행의 `<th>` 렌더링에서 각 컬럼의 인덱스를 받아 고정 스타일을 적용한다:

기존:

```tsx
<For each={effectiveColumns()}>
  {(col) => (
    <th class={twMerge(thClass, summaryThClass)}>
```

변경:

```tsx
<For each={effectiveColumns()}>
  {(col, colIndex) => (
    <th
      class={twMerge(
        thClass,
        summaryThClass,
        col.fixed ? clsx(fixedClass, "z-[4]") : undefined,
        isLastFixed(colIndex()) ? fixedLastClass : undefined,
      )}
      style={getFixedStyle(colIndex())}
    >
```

**Step 7: tbody td에 고정 스타일 적용**

기존:

```tsx
<For each={effectiveColumns()}>
  {(col) => (
    <td class={tdClass}>
```

변경:

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
```

**Step 8: thead의 비-마지막 depth 그룹 헤더에도 sticky 적용**

그룹 헤더(isLastRow가 false인 셀)도 고정 컬럼에 속하면 sticky가 필요하다.

`buildHeaderTable`의 결과인 `HeaderDef`에는 이미 `fixed` 필드가 있다. 하지만 그룹 헤더는 여러 컬럼에 걸쳐 colspan이 있으므로, 해당 그룹의 모든 하위 컬럼이 fixed인 경우에만 그룹 헤더도 fixed로 처리한다.

`HeaderDef`의 `fixed` 필드는 현재 `isLastRow`일 때만 설정되므로, 그룹 헤더의 고정 여부를 판단하는 로직이 필요하다. 이를 `<th>` 렌더링에서 직접 계산한다:

```tsx
// 그룹 헤더의 고정 여부: colspan 범위 내 모든 컬럼이 fixed인지 확인
const isGroupFixed = () => {
  if (c().isLastRow) return false; // 마지막 행은 colIndex로 판단
  // 현재 셀의 열 위치를 찾아야 함 — headerTable에서의 위치
  // buildHeaderTable의 2D 배열에서 현재 셀이 위치한 열 인덱스가 필요
  // For 루프의 인덱스가 곧 열 인덱스이므로 이를 사용
  ...
};
```

이 로직은 복잡해질 수 있으므로, **headerTable의 각 행을 `<For>`로 순회할 때 인덱스를 활용**한다. 현재 코드:

```tsx
<For each={row}>
  {(cell) => (
```

을 다음으로 변경:

```tsx
<For each={row}>
  {(cell, cellColIndex) => (
```

`cellColIndex()`는 headerTable 2D 배열에서의 열 인덱스이다. null이 아닌 셀일 때, `effectiveColumns()`에서 `cellColIndex()` ~ `cellColIndex() + colspan - 1` 범위의 모든 컬럼이 fixed인지 확인하면 된다.

그룹 헤더의 고정/left 스타일:

```typescript
const isGroupFixed = (): boolean => {
  const start = cellColIndex();
  const span = c().colspan;
  const cols = effectiveColumns();
  for (let i = start; i < start + span && i < cols.length; i++) {
    if (!cols[i].fixed) return false;
  }
  return true;
};

const groupFixedStyle = (): string | undefined => {
  if (!isGroupFixed()) return undefined;
  return getFixedStyle(cellColIndex());
};
```

**Step 9: 검증**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

Run: `pnpm vitest packages/solid/tests/sheet/Sheet.spec.tsx --project=solid --run`
Expected: 기존 테스트 모두 통과

**Step 10: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.tsx
git commit -m "feat(solid): Sheet 컬럼 고정 (sticky) 구현"
```

---

## Task 4: 컬럼 리사이징 구현

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx`

**Step 1: Sheet.tsx에 #region Resizing 추가**

`#region ColumnFixing` 다음에 추가한다:

```typescript
// #region Resizing
const [resizeIndicatorStyle, setResizeIndicatorStyle] = createSignal<JSX.CSSProperties>({
  display: "none",
});

function onResizerMousedown(event: MouseEvent, colKey: string): void {
  event.preventDefault();
  const th = (event.target as HTMLElement).closest("th")!;
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

  const onMouseMove = (e: MouseEvent) => {
    const delta = e.clientX - startX;
    const newWidth = Math.max(30, startWidth + delta);
    setResizeIndicatorStyle({
      display: "block",
      left: `${th.getBoundingClientRect().left - containerRect.left + container.scrollLeft + newWidth}px`,
      top: "0",
      height: `${container.scrollHeight}px`,
    });
  };

  const onMouseUp = (e: MouseEvent) => {
    const delta = e.clientX - startX;
    const newWidth = Math.max(30, startWidth + delta);
    saveColumnWidth(colKey, `${newWidth}px`);
    setResizeIndicatorStyle({ display: "none" });
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}

function onResizerDoubleClick(colKey: string): void {
  saveColumnWidth(colKey, undefined);
}
```

**Step 2: 스크롤 컨테이너에 data-sheet-scroll 속성 추가**

기존:

```tsx
<div class={twMerge(sheetContainerClass, "flex-1 min-h-0")} style={local.contentStyle}>
```

변경:

```tsx
<div data-sheet-scroll class={twMerge(sheetContainerClass, "flex-1 min-h-0")} style={local.contentStyle}>
```

**Step 3: 리사이즈 인디케이터 JSX 추가**

스크롤 컨테이너 내부, `<table>` 태그 다음에 (형제로) 추가:

```tsx
<div class={resizeIndicatorClass} style={resizeIndicatorStyle()} />
```

**Step 4: 헤더 셀에 리사이저 핸들 추가**

마지막 depth 헤더 셀(`isLastRow === true`)에만 리사이저를 추가한다. `disableResizing`이 false인 컬럼에만 표시한다.

`<th>` 내부의 `<div class={clsx("flex items-center", thContentClass)}>` 다음에 (형제로):

```tsx
<Show when={c().isLastRow && c().colIndex != null && !effectiveColumns()[c().colIndex!].disableResizing}>
  <div
    class={resizerClass}
    onMouseDown={(e) => onResizerMousedown(e, effectiveColumns()[c().colIndex!].key)}
    onDblClick={() => onResizerDoubleClick(effectiveColumns()[c().colIndex!].key)}
  />
</Show>
```

**Step 5: 검증**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

Run: `pnpm vitest packages/solid/tests/sheet/Sheet.spec.tsx --project=solid --run`
Expected: 모든 테스트 통과

**Step 6: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.tsx
git commit -m "feat(solid): Sheet 컬럼 리사이징 구현 (드래그 + 더블클릭 초기화)"
```

---

## Task 5: 컬럼 고정/리사이징 단위 테스트

**Files:**

- Modify: `packages/solid/tests/sheet/Sheet.spec.tsx`

**Step 1: 고정 컬럼 테스트 추가**

Sheet describe 블록 내부에 추가:

```tsx
it("고정 컬럼: fixed 컬럼의 td에 sticky 클래스가 적용된다", () => {
  const { container } = render(() => (
    <Sheet items={testData} key="test-fixed">
      <Sheet.Column<TestItem> key="name" header="이름" fixed width="100px">
        {(ctx) => <div>{ctx.item.name}</div>}
      </Sheet.Column>
      <Sheet.Column<TestItem> key="age" header="나이">
        {(ctx) => <div>{ctx.item.age}</div>}
      </Sheet.Column>
    </Sheet>
  ));

  const tds = container.querySelectorAll("tbody tr:first-child td");
  expect(tds[0].classList.contains("sticky")).toBe(true);
  expect(tds[1].classList.contains("sticky")).toBe(false);
});

it("고정 컬럼: 마지막 고정 컬럼에 경계 테두리 클래스가 적용된다", () => {
  const { container } = render(() => (
    <Sheet items={testData} key="test-fixed-border">
      <Sheet.Column<TestItem> key="name" header="이름" fixed width="100px">
        {(ctx) => <div>{ctx.item.name}</div>}
      </Sheet.Column>
      <Sheet.Column<TestItem> key="age" header="나이">
        {(ctx) => <div>{ctx.item.age}</div>}
      </Sheet.Column>
    </Sheet>
  ));

  const tds = container.querySelectorAll("tbody tr:first-child td");
  // fixedLastClass에 포함된 클래스 확인
  expect(tds[0].classList.contains("border-r-2")).toBe(true);
});

it("리사이저: disableResizing이 아닌 컬럼에 리사이저 핸들이 있다", () => {
  const { container } = render(() => (
    <Sheet items={testData} key="test-resizer">
      <Sheet.Column<TestItem> key="name" header="이름">
        {(ctx) => <div>{ctx.item.name}</div>}
      </Sheet.Column>
      <Sheet.Column<TestItem> key="age" header="나이" disableResizing>
        {(ctx) => <div>{ctx.item.age}</div>}
      </Sheet.Column>
    </Sheet>
  ));

  const resizers = container.querySelectorAll(".cursor-ew-resize");
  // 첫 번째 컬럼에만 리사이저가 있어야 함
  expect(resizers.length).toBe(1);
});
```

**Step 2: 테스트 실행**

Run: `pnpm vitest packages/solid/tests/sheet/Sheet.spec.tsx --project=solid --run`
Expected: 모든 테스트 통과 (기존 + 신규)

**Step 3: 커밋**

```bash
git add packages/solid/tests/sheet/Sheet.spec.tsx
git commit -m "test(solid): Sheet 컬럼 고정/리사이징 테스트 추가"
```

---

## Task 6: 데모 페이지에 고정 컬럼 + 리사이징 예제 추가

**Files:**

- Modify: `packages/solid-demo/src/pages/data/SheetPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/SheetFullPage.tsx`

**Step 1: SheetPage.tsx에 고정 컬럼 섹션 추가**

`{/* 페이지네이션 */}` 섹션 다음에 추가:

```tsx
{
  /* 고정 컬럼 + 리사이징 */
}
<section>
  <h2 class="mb-4 text-xl font-semibold">고정 컬럼 + 리사이징</h2>
  <p class="mb-4 text-sm text-base-600 dark:text-base-400">
    fixed 컬럼은 스크롤 시 좌측에 고정됩니다. 헤더 우측 드래그로 너비 변경, 더블클릭으로 초기화.
  </p>
  <div style={{ width: "500px" }}>
    <Sheet items={users} key="fixed-resize">
      <Sheet.Column<User> key="name" header="이름" width="120px" fixed>
        {(ctx) => <div class="px-2 py-1 font-medium">{ctx.item.name}</div>}
      </Sheet.Column>
      <Sheet.Column<User> key="age" header="나이" width="80px" fixed>
        {(ctx) => <div class="px-2 py-1">{ctx.item.age}</div>}
      </Sheet.Column>
      <Sheet.Column<User> key="email" header="이메일" width="200px">
        {(ctx) => <div class="px-2 py-1">{ctx.item.email}</div>}
      </Sheet.Column>
      <Sheet.Column<User> key="salary" header="급여" width="150px">
        {(ctx) => <div class="px-2 py-1 text-right">{ctx.item.salary.toLocaleString()}원</div>}
      </Sheet.Column>
    </Sheet>
  </div>
</section>;
```

**Step 2: SheetFullPage.tsx에 고정 컬럼 적용**

기존 SheetFullPage에서 id, name, department 컬럼에 `fixed`를 추가한다:

```tsx
<Sheet.Column<Employee> key="id" header="No." width="60px" fixed>
```

```tsx
<Sheet.Column<Employee> key="name" header={["인사정보", "이름"]} width="100px" fixed>
```

```tsx
<Sheet.Column<Employee> key="department" header={["인사정보", "부서"]} width="90px" fixed>
```

**Step 3: 검증**

Run: `pnpm typecheck packages/solid-demo`
Expected: 에러 없음

**Step 4: 커밋**

```bash
git add packages/solid-demo/src/pages/data/SheetPage.tsx packages/solid-demo/src/pages/data/SheetFullPage.tsx
git commit -m "feat(solid-demo): Sheet 고정 컬럼/리사이징 데모 추가"
```

---

## Task 7: 수동 검증 (Playwright MCP)

**Files:** 없음 (검증만)

**Step 1: dev 서버 시작**

Run: `pnpm dev`
Expected: Vite dev server 시작 (포트 확인)

**Step 2: Playwright MCP로 SheetPage 확인**

브라우저로 `http://localhost:{port}/data/sheet` 접속:

- "고정 컬럼 + 리사이징" 섹션이 보이는지 확인
- 테이블을 가로 스크롤하여 이름/나이 컬럼이 고정되는지 확인
- 고정/비고정 경계에 진한 테두리가 있는지 확인
- 헤더 셀 우측에 리사이저 핸들이 있는지 확인

**Step 3: SheetFullPage 확인**

`http://localhost:{port}/data/sheet-full` 접속:

- No., 이름, 부서 3개 컬럼이 고정되는지 확인
- 가로 스크롤 시 정상 동작 확인
- 고정 컬럼의 다단계 헤더(인사정보 그룹)도 sticky인지 확인

**Step 4: 리사이징 테스트**

- 컬럼 헤더 우측 영역을 드래그하여 너비 변경 확인
- 드래그 중 세로 점선 인디케이터가 표시되는지 확인
- 드래그 종료 후 너비가 적용되는지 확인
- 헤더 우측 더블클릭으로 너비가 초기화되는지 확인
- 페이지 새로고침 후 변경된 너비가 유지되는지 확인 (usePersisted)

**Step 5: 문제 발견 시 수정 → 커밋**

발견된 이슈를 수정한 후:

```bash
git add -A
git commit -m "fix(solid): Sheet 고정/리사이징 수동 검증 이슈 수정"
```

---

## Task 8: 최종 검증

**Step 1: 전체 테스트 실행**

Run: `pnpm vitest packages/solid/tests/sheet/Sheet.spec.tsx --project=solid --run`
Expected: 모든 테스트 통과

**Step 2: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

**Step 3: 린트**

Run: `pnpm lint packages/solid/src/components/data/sheet`
Expected: 에러 없음

---

## 요약

| Task | 설명                          | 예상 변경 파일                   |
| ---- | ----------------------------- | -------------------------------- |
| 1    | 스타일 상수 추가              | Sheet.styles.ts                  |
| 2    | 컬럼 설정 저장 (usePersisted) | Sheet.tsx                        |
| 3    | 컬럼 고정 (sticky) 구현       | Sheet.tsx                        |
| 4    | 컬럼 리사이징 구현            | Sheet.tsx                        |
| 5    | 단위 테스트 추가              | Sheet.spec.tsx                   |
| 6    | 데모 페이지 업데이트          | SheetPage.tsx, SheetFullPage.tsx |
| 7    | 수동 검증 (Playwright)        | -                                |
| 8    | 최종 검증                     | -                                |
