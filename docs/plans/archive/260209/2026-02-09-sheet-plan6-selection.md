# Sheet Plan 6: 행 선택 + 선택 기능 컬럼 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Sheet 컴포넌트에 단일/다중 행 선택, Shift+Click 범위 선택, autoSelect, 선택 기능 컬럼을 구현한다.

**Architecture:** Selection 상태는 `createPropSignal`로 관리하며, 기존 데이터 파이프라인(`displayItems`)을 읽기만 한다. 선택 기능 컬럼은 확장 컬럼 뒤에 렌더링되고, 확장 컬럼과 동일한 sticky 패턴을 따른다. CheckBox는 `pointer-events-none`으로 표시용으로만 사용하고, 감싸는 요소에서 onClick으로 shiftKey를 감지한다.

**Tech Stack:** SolidJS, Tailwind CSS, @tabler/icons-solidjs, createPropSignal

**설계 문서:** `docs/plans/2026-02-07-sheet-migration-design.md` §6, §8, §12, §14

---

## Task 1: types.ts — autoSelect 타입 수정

**Files:**

- Modify: `packages/solid/src/components/data/sheet/types.ts:30`

**Step 1: autoSelect 타입을 "click"만으로 변경**

```typescript
// 변경 전
autoSelect?: "click" | "focus";

// 변경 후
autoSelect?: "click";
```

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS (autoSelect를 "focus"로 사용하는 곳이 없음)

**Step 3: 커밋**

```bash
git add packages/solid/src/components/data/sheet/types.ts
git commit -m "refactor(solid): Sheet autoSelect 타입에서 focus 옵션 제거"
```

---

## Task 2: Sheet.styles.ts — 선택 컬럼 스타일 추가

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.styles.ts` (파일 끝에 추가)

**Step 1: 선택 컬럼 스타일 상수 추가**

파일 끝(line 131 이후)에 추가:

```typescript
// 선택 컬럼 — single 모드 아이콘 래퍼
export const selectSingleClass = clsx("flex items-center justify-center", "size-6", "cursor-pointer", "rounded");

// single 모드 — 선택됨
export const selectSingleSelectedClass = clsx("text-primary-500", "dark:text-primary-400");

// single 모드 — 미선택
export const selectSingleUnselectedClass = clsx("text-base-300", "dark:text-base-600");
```

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.styles.ts
git commit -m "feat(solid): Sheet 선택 컬럼 스타일 상수 추가"
```

---

## Task 3: Sheet.css — 선택 행 시각 효과 추가

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.css` (파일 끝에 추가)

**Step 1: 선택 행 box-shadow 스타일 추가**

파일 끝(line 7 이후)에 추가:

```css
/* 선택 행 시각 효과 — 호버보다 약간 더 진하게 */
[data-sheet] tbody tr[data-selected] > td {
  box-shadow: inset 0 0 0 9999px rgba(0, 0, 0, 0.05);
}

.dark [data-sheet] tbody tr[data-selected] > td {
  box-shadow: inset 0 0 0 9999px rgba(255, 255, 255, 0.06);
}
```

**Step 2: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.css
git commit -m "feat(solid): Sheet 선택 행 box-shadow 시각 효과 추가"
```

---

## Task 4: Sheet.tsx — Selection 상태 + 로직 추가

이 태스크에서 Sheet.tsx에 선택 관련 상태와 로직 함수들을 추가한다. 렌더링(JSX)은 Task 5에서 수정한다.

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx`

**Step 1: import 추가**

line 5 수정 — `IconChevronRight` 추가:

```typescript
// 변경 전
import { IconArrowsSort, IconChevronDown, IconSortAscending, IconSortDescending } from "@tabler/icons-solidjs";

// 변경 후
import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronRight,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-solidjs";
```

line 15-36의 Sheet.styles.ts import에 선택 스타일 추가:

```typescript
import {
  defaultContainerClass,
  expandIndentGuideClass,
  expandIndentGuideLineClass,
  expandToggleClass,
  featureTdClass,
  featureThClass,
  fixedClass,
  fixedLastClass,
  insetContainerClass,
  resizerClass,
  resizeIndicatorClass,
  selectSingleClass,
  selectSingleSelectedClass,
  selectSingleUnselectedClass,
  sheetContainerClass,
  sortableThClass,
  sortIconClass,
  summaryThClass,
  tableClass,
  tdClass,
  thClass,
  thContentClass,
  toolbarClass,
} from "./Sheet.styles";
```

CheckBox import 추가 (기존 import 영역에):

```typescript
import { CheckBox } from "../../form-control/checkbox/CheckBox";
```

**Step 2: splitProps에 선택 관련 props 추가**

line 44-66의 splitProps 배열에 추가 (`"getChildrenFn"` 뒤, `"getItemCellClassFn"` 앞):

```typescript
"selectMode",
"selectedItems",
"onSelectedItemsChange",
"autoSelect",
"getItemSelectableFn",
```

**Step 3: `#region Feature Column Setup` 확장 (line 174-198)**

`hasExpandFeature` 뒤(line 175 이후)에 선택 기능 관련 코드 추가:

```typescript
const hasSelectFeature = () => local.selectMode != null;

// 선택 컬럼의 고정 너비 추적
const [selectColWidth, setSelectColWidth] = createSignal(0);

function registerSelectColRef(el: HTMLElement): void {
  createResizeObserver(el, () => {
    setSelectColWidth(el.offsetWidth);
  });
}
```

`featureColTotalWidth` (기존 line 194-198) 수정 — 선택 컬럼 너비 추가:

```typescript
const featureColTotalWidth = createMemo(() => {
  let w = 0;
  if (hasExpandFeature()) w += expandColWidth();
  if (hasSelectFeature()) w += selectColWidth();
  return w;
});
```

**Step 4: `#region Selection` 추가 (Expanding 영역 뒤, line 355 이후)**

```typescript
// #region Selection
const [selectedItems, setSelectedItems] = createPropSignal({
  value: () => local.selectedItems ?? [],
  onChange: () => local.onSelectedItemsChange,
});

const [lastClickedRow, setLastClickedRow] = createSignal<number | null>(null);

function getItemSelectable(item: T): boolean | string {
  if (!local.getItemSelectableFn) return true;
  return local.getItemSelectableFn(item);
}

function toggleSelect(item: T): void {
  if (local.selectMode === "single") {
    const isSelected = selectedItems().includes(item);
    setSelectedItems(isSelected ? [] : [item]);
  } else {
    const isSelected = selectedItems().includes(item);
    setSelectedItems(isSelected ? selectedItems().filter((i) => i !== item) : [...selectedItems(), item]);
  }
}

function toggleSelectAll(): void {
  const selectableItems = displayItems()
    .map((flat) => flat.item)
    .filter((item) => getItemSelectable(item) === true);
  const isAllSelected = selectableItems.every((item) => selectedItems().includes(item));
  setSelectedItems(isAllSelected ? [] : selectableItems);
}

function rangeSelect(targetRow: number): void {
  const lastRow = lastClickedRow();
  if (lastRow == null) return;

  const start = Math.min(lastRow, targetRow);
  const end = Math.max(lastRow, targetRow);

  // 기준 행(마지막 클릭 행)의 선택 상태를 따름
  const baseItem = displayItems()[lastRow]?.item;
  const shouldSelect = baseItem != null && !selectedItems().includes(baseItem);

  const rangeItems = displayItems()
    .slice(start, end + 1)
    .map((flat) => flat.item)
    .filter((item) => getItemSelectable(item) === true);

  if (shouldSelect) {
    const newItems = [...selectedItems()];
    for (const item of rangeItems) {
      if (!newItems.includes(item)) newItems.push(item);
    }
    setSelectedItems(newItems);
  } else {
    setSelectedItems(selectedItems().filter((item) => !rangeItems.includes(item)));
  }
}
```

**Step 5: `#region AutoSelect` 추가 (Selection 뒤)**

```typescript
// #region AutoSelect
function selectItem(item: T): void {
  if (getItemSelectable(item) !== true) return;
  if (local.selectMode === "single") {
    setSelectedItems([item]);
  } else {
    if (!selectedItems().includes(item)) {
      setSelectedItems([...selectedItems(), item]);
    }
  }
}
```

**Step 6: Display 영역에 선택 관련 memo 추가**

기존 `isExpandColLastFixed` (line 394) 근처에 추가:

```typescript
// 선택 기능 컬럼이 "마지막 고정"인지 (일반 고정 컬럼이 없고, 선택 컬럼이 가장 오른쪽 기능 컬럼일 때)
const isSelectColLastFixed = () => hasSelectFeature() && lastFixedIndex() < 0;

// 확장 컬럼은 선택 컬럼이 있으면 마지막 고정이 아님
```

기존 `isExpandColLastFixed`를 수정:

```typescript
// 변경 전
const isExpandColLastFixed = () => hasExpandFeature() && lastFixedIndex() < 0;

// 변경 후
const isExpandColLastFixed = () => hasExpandFeature() && !hasSelectFeature() && lastFixedIndex() < 0;
```

**Step 7: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS (JSX에서 아직 사용하지 않지만, 타입은 통과해야 함)

**Step 8: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.tsx
git commit -m "feat(solid): Sheet Selection/AutoSelect 상태 및 로직 추가"
```

---

## Task 5: Sheet.tsx — 선택 기능 컬럼 렌더링 (JSX)

이 태스크에서 Sheet.tsx의 JSX를 수정하여 선택 컬럼 헤더/바디/colgroup을 렌더링한다.

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx`

**Step 1: colgroup에 선택 컬럼 col 추가**

확장 컬럼 `<col />` 뒤에 추가:

```tsx
<Show when={hasSelectFeature()}>
  <col />
</Show>
```

**Step 2: thead — 선택 기능 컬럼 헤더 추가**

확장 기능 컬럼 헤더 `</Show>` 뒤 (기존 line 474 근처), 일반 컬럼 `<For each={row}>` 앞에 추가:

```tsx
{
  /* 선택 기능 컬럼 헤더 — 첫 번째 행에만 표시 (rowspan으로 전체 덮기) */
}
<Show when={hasSelectFeature() && rowIndex() === 0}>
  <th
    class={twMerge(featureThClass, fixedClass, "z-[5]", isSelectColLastFixed() ? fixedLastClass : undefined)}
    rowspan={featureHeaderRowspan()}
    style={{
      top: "0",
      left: hasExpandFeature() ? `${expandColWidth()}px` : "0",
    }}
    ref={registerSelectColRef}
  >
    <Show when={local.selectMode === "multi"}>
      <div class="flex items-center justify-center px-1 py-0.5 cursor-pointer" onClick={() => toggleSelectAll()}>
        <CheckBox
          value={(() => {
            const selectableItems = displayItems()
              .map((flat) => flat.item)
              .filter((item) => getItemSelectable(item) === true);
            return selectableItems.length > 0 && selectableItems.every((item) => selectedItems().includes(item));
          })()}
          class="pointer-events-none"
        />
      </div>
    </Show>
  </th>
</Show>;
```

**Step 3: tbody — 선택 기능 컬럼 바디 셀 추가**

확장 기능 컬럼 바디 `</Show>` 뒤 (기존 line 683 근처), 일반 컬럼 `<For each={effectiveColumns()}>` 앞에 추가.

`<tr>` 태그도 수정하여 `data-selected` 속성과 `onClick`(autoSelect)을 추가해야 한다.

`<tr>` 수정:

```tsx
{/* 변경 전 */}
<tr>

{/* 변경 후 */}
<tr
  data-selected={selectedItems().includes(flat.item) ? "" : undefined}
  onClick={() => {
    if (local.autoSelect === "click") {
      selectItem(flat.item);
    }
  }}
  class={local.autoSelect === "click" ? "cursor-pointer" : undefined}
>
```

선택 컬럼 바디 셀 (확장 컬럼 바디 `</Show>` 뒤에 추가):

```tsx
{
  /* 선택 기능 컬럼 바디 셀 */
}
<Show when={hasSelectFeature()}>
  {(() => {
    const selectable = () => getItemSelectable(flat.item);
    const isSelected = () => selectedItems().includes(flat.item);
    const rowIndex = () => displayItems().indexOf(flat);

    return (
      <td
        class={twMerge(featureTdClass, fixedClass, "z-[2]", isSelectColLastFixed() ? fixedLastClass : undefined)}
        style={{
          left: hasExpandFeature() ? `${expandColWidth()}px` : "0",
        }}
      >
        <Show
          when={local.selectMode === "multi"}
          fallback={
            /* single 모드 */
            <Show when={selectable() === true}>
              <div
                class="flex items-center justify-center px-1 h-full cursor-pointer"
                onClick={() => toggleSelect(flat.item)}
              >
                <div
                  class={twMerge(
                    selectSingleClass,
                    isSelected() ? selectSingleSelectedClass : selectSingleUnselectedClass,
                  )}
                >
                  <Icon icon={IconChevronRight} size="1em" />
                </div>
              </div>
            </Show>
          }
        >
          {/* multi 모드 */}
          <div
            class="flex items-center justify-center px-1 h-full cursor-pointer"
            onClick={(e) => {
              if (e.shiftKey) {
                rangeSelect(rowIndex());
              } else {
                toggleSelect(flat.item);
              }
              setLastClickedRow(rowIndex());
            }}
            title={typeof selectable() === "string" ? (selectable() as string) : undefined}
          >
            <CheckBox value={isSelected()} disabled={selectable() !== true} class="pointer-events-none" />
          </div>
        </Show>
      </td>
    );
  })()}
</Show>;
```

**Step 4: 타입체크 + 린트 실행**

Run: `pnpm typecheck packages/solid && pnpm lint packages/solid`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.tsx
git commit -m "feat(solid): Sheet 선택 기능 컬럼 렌더링 구현"
```

---

## Task 6: 데모 페이지 — 선택 예제 추가

**Files:**

- Modify: `packages/solid-demo/src/pages/data/SheetPage.tsx`

**Step 1: import에 Sheet 관련 시그널 확인 (이미 있음)**

`createSignal`은 이미 import됨.

**Step 2: 컴포넌트 내부에 선택 상태 시그널 추가**

`SheetPage` 함수 내부, 기존 시그널들(`expanded` 뒤) 뒤에:

```typescript
const [multiSelected, setMultiSelected] = createSignal<User[]>([]);
const [singleSelected, setSingleSelected] = createSignal<User[]>([]);
const [disabledSelected, setDisabledSelected] = createSignal<User[]>([]);
```

**Step 3: 인라인 편집 `</section>` 뒤에 3개 예제 추가**

```tsx
{
  /* 다중 선택 */
}
<section>
  <h2 class="mb-4 text-xl font-semibold">다중 선택</h2>
  <p class="mb-4 text-sm text-base-600 dark:text-base-400">
    selectMode="multi"로 체크박스 기반 다중 선택. Shift+Click으로 범위 선택.
  </p>
  <Sheet
    items={users}
    key="select-multi"
    selectMode="multi"
    selectedItems={multiSelected()}
    onSelectedItemsChange={setMultiSelected}
  >
    <Sheet.Column<User> key="name" header="이름" class="px-2 py-1">
      {(ctx) => ctx.item.name}
    </Sheet.Column>
    <Sheet.Column<User> key="age" header="나이" class="px-2 py-1">
      {(ctx) => ctx.item.age}
    </Sheet.Column>
    <Sheet.Column<User> key="email" header="이메일" class="px-2 py-1">
      {(ctx) => ctx.item.email}
    </Sheet.Column>
  </Sheet>
  <p class="mt-2 text-sm text-base-500">
    선택된 항목:{" "}
    {multiSelected()
      .map((u) => u.name)
      .join(", ") || "(없음)"}
  </p>
</section>;

{
  /* 단일 선택 + autoSelect */
}
<section>
  <h2 class="mb-4 text-xl font-semibold">단일 선택 + autoSelect</h2>
  <p class="mb-4 text-sm text-base-600 dark:text-base-400">
    selectMode="single"로 화살표 아이콘 기반 단일 선택. autoSelect="click"으로 행 클릭 시 자동 선택.
  </p>
  <Sheet
    items={users}
    key="select-single"
    selectMode="single"
    selectedItems={singleSelected()}
    onSelectedItemsChange={setSingleSelected}
    autoSelect="click"
  >
    <Sheet.Column<User> key="name" header="이름" class="px-2 py-1">
      {(ctx) => ctx.item.name}
    </Sheet.Column>
    <Sheet.Column<User> key="age" header="나이" class="px-2 py-1">
      {(ctx) => ctx.item.age}
    </Sheet.Column>
    <Sheet.Column<User> key="salary" header="급여" class="px-2 py-1 text-right">
      {(ctx) => <>{ctx.item.salary.toLocaleString()}원</>}
    </Sheet.Column>
  </Sheet>
  <p class="mt-2 text-sm text-base-500">
    선택된 항목:{" "}
    {singleSelected()
      .map((u) => u.name)
      .join(", ") || "(없음)"}
  </p>
</section>;

{
  /* 선택 불가 항목 */
}
<section>
  <h2 class="mb-4 text-xl font-semibold">선택 불가 항목</h2>
  <p class="mb-4 text-sm text-base-600 dark:text-base-400">
    getItemSelectableFn으로 특정 항목의 선택을 비활성화합니다. 비활성 사유가 tooltip으로 표시됩니다.
  </p>
  <Sheet
    items={users}
    key="select-disabled"
    selectMode="multi"
    selectedItems={disabledSelected()}
    onSelectedItemsChange={setDisabledSelected}
    getItemSelectableFn={(item) => (item.salary >= 4500 ? true : "급여 4,500 미만은 선택 불가")}
  >
    <Sheet.Column<User> key="name" header="이름" class="px-2 py-1">
      {(ctx) => ctx.item.name}
    </Sheet.Column>
    <Sheet.Column<User> key="salary" header="급여" class="px-2 py-1 text-right">
      {(ctx) => <>{ctx.item.salary.toLocaleString()}원</>}
    </Sheet.Column>
    <Sheet.Column<User> key="email" header="이메일" class="px-2 py-1">
      {(ctx) => ctx.item.email}
    </Sheet.Column>
  </Sheet>
  <p class="mt-2 text-sm text-base-500">
    선택된 항목:{" "}
    {disabledSelected()
      .map((u) => u.name)
      .join(", ") || "(없음)"}
  </p>
</section>;
```

**Step 4: 타입체크 + 린트 실행**

Run: `pnpm typecheck packages/solid-demo && pnpm lint packages/solid-demo`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid-demo/src/pages/data/SheetPage.tsx
git commit -m "feat(solid-demo): Sheet 선택 데모 예제 추가 — multi/single/disabled"
```

---

## Task 7: 수동 검증 (브라우저)

**Step 1: dev 서버 실행**

Run: `pnpm dev`
데모 앱이 실행되면 Playwright MCP로 Sheet 데모 페이지에 접속한다.

**Step 2: 다중 선택 검증**

- 체크박스 클릭으로 개별 선택/해제 확인
- 전체 선택 체크박스 동작 확인
- Shift+Click 범위 선택 확인
- 선택 행의 box-shadow 시각 효과 확인

**Step 3: 단일 선택 + autoSelect 검증**

- 화살표 아이콘 클릭으로 선택 확인
- 행 클릭(autoSelect="click")으로 자동 선택 확인
- 이미 선택된 행 재선택 시 교체 확인

**Step 4: 선택 불가 검증**

- 비활성 체크박스 disabled 상태 확인
- tooltip 사유 표시 확인
- 전체 선택 시 비활성 항목 제외 확인

**Step 5: 기능 컬럼 sticky 검증**

- 선택 컬럼이 스크롤 시 좌측에 고정되는지 확인
- 확장+선택 컬럼 동시 사용 시 순서(확장→선택)와 sticky 위치 확인
- 고정/비고정 경계 시각 효과(fixedLastClass) 확인

**Step 6: 문제 발견 시 수정 후 재커밋**
