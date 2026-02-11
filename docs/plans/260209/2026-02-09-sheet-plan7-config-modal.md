# Sheet 설정 모달 + 행 드래그 재정렬 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Sheet 컴포넌트에 설정 모달(SheetConfigModal)과 행 드래그 재정렬 기능을 추가한다.

**Architecture:** 행 드래그 재정렬은 Sheet의 범용 기능(`onItemsReorder` prop)으로 추가한다. 설정 모달은 별도 파일(`SheetConfigModal.tsx`)에 구현하며 Sheet를 내부에서 사용한다. 순환 참조 방지를 위해 Sheet에서 SheetConfigModal을 동적 import한다. effectiveColumns를 확장하여 config의 hidden/fixed/displayOrder를 반영한다.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS, @tabler/icons-solidjs

---

## Task 1: 타입 추가 (types.ts)

**Files:**

- Modify: `packages/solid/src/components/data/sheet/types.ts:1-123`

**Step 1: 타입 추가**

`types.ts` 파일 끝에 다음 타입을 추가한다:

```tsx
// SheetProps에 onItemsReorder 추가 (기존 SheetProps 인터페이스의 "기타" 섹션, 43번째 줄 근처)
onItemsReorder?: (event: SheetReorderEvent<T>) => void;
```

파일 끝에 새 타입을 추가한다:

```tsx
// 드래그 앤 드롭 위치
export type SheetDragPosition = "before" | "after" | "inside";

// 재정렬 이벤트
export interface SheetReorderEvent<T> {
  item: T;
  targetItem: T;
  position: SheetDragPosition;
}

// 설정 모달에 전달할 컬럼 정보
export interface SheetConfigColumnInfo {
  key: string;
  header: string[];
  fixed: boolean;
  hidden: boolean;
  collapse: boolean;
  width?: string;
}
```

**Step 2: typecheck 확인**

Run: `pnpm typecheck packages/solid`
Expected: PASS (타입만 추가했으므로 사용하는 곳이 없어도 통과)

**Step 3: 커밋**

```bash
git add packages/solid/src/components/data/sheet/types.ts
git commit -m "feat(solid): Sheet 드래그 재정렬 및 설정 모달 타입 추가"
```

---

## Task 2: 스타일 추가 (Sheet.styles.ts + Sheet.css)

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.styles.ts:1-152`
- Modify: `packages/solid/src/components/data/sheet/Sheet.css:1-17`

**Step 1: Sheet.styles.ts에 스타일 클래스 추가**

파일 끝에 다음 클래스를 추가한다:

```tsx
// 드래그 핸들 기능 컬럼
export const reorderHandleClass = clsx(
  "flex items-center justify-center",
  "size-6",
  "cursor-grab",
  "text-base-400 dark:text-base-500",
  "hover:text-base-600 dark:hover:text-base-400",
);

// 드래그 인디케이터 (before/after 수평선)
export const reorderIndicatorClass = clsx(
  "absolute left-0 right-0",
  "h-0 border-t-2 border-primary-500",
  "pointer-events-none",
  "z-[7]",
);

// 설정 버튼
export const configButtonClass = clsx(
  "flex items-center justify-center",
  "size-6 rounded",
  "text-base-500 dark:text-base-400",
  "hover:bg-base-200 dark:hover:bg-base-700",
  "cursor-pointer",
);
```

**Step 2: Sheet.css에 드래그 시각 효과 추가**

파일 끝에 다음 CSS를 추가한다:

```css
/* 드래그 중인 행 */
[data-sheet] tbody tr[data-dragging] > td {
  opacity: 0.5;
}

/* inside 드롭 대상 행 */
[data-sheet] tbody tr[data-drag-over="inside"] > td {
  box-shadow: inset 0 0 0 9999px rgba(59, 130, 246, 0.1);
}
```

**Step 3: lint 확인**

Run: `pnpm lint packages/solid/src/components/data/sheet/Sheet.styles.ts`
Expected: PASS

**Step 4: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.styles.ts packages/solid/src/components/data/sheet/Sheet.css
git commit -m "feat(solid): Sheet 드래그 핸들/인디케이터/설정 버튼 스타일 추가"
```

---

## Task 3: effectiveColumns 확장 (Sheet.tsx)

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx:92-103`

**Step 1: effectiveColumns에 hidden 필터링, fixed 오버라이드, displayOrder 정렬 추가**

기존 코드 (92-103줄):

```tsx
const effectiveColumns = createMemo(() => {
  const cols = columnDefs();
  const record = config().columnRecord ?? {};
  return cols.map((col) => {
    const saved = record[col.key];
    if (saved == null) return col;
    return {
      ...col,
      width: saved.width ?? col.width,
    };
  });
});
```

변경 후:

```tsx
const effectiveColumns = createMemo(() => {
  const cols = columnDefs(); // 이미 col.hidden (코드 설정) 필터링됨
  const record = config().columnRecord ?? {};

  return cols
    .filter((col) => {
      // config에서 hidden으로 설정된 컬럼 제외
      const saved = record[col.key];
      return !saved?.hidden;
    })
    .map((col) => {
      const saved = record[col.key];
      if (saved == null) return col;
      return {
        ...col,
        fixed: saved.fixed ?? col.fixed,
        width: saved.width ?? col.width,
      };
    })
    .sort((a, b) => {
      const orderA = record[a.key]?.displayOrder ?? Infinity;
      const orderB = record[b.key]?.displayOrder ?? Infinity;
      return orderA - orderB;
    });
});
```

**핵심:**

- `columnDefs()`는 코드에서 `hidden` 설정된 컬럼을 이미 필터링 (81줄)
- 추가로 config의 `hidden`을 필터링 (사용자가 모달에서 숨긴 컬럼)
- `displayOrder`가 없는 컬럼은 `Infinity`로 처리 → 원래 순서 유지
- `fixed` 오버라이드: config에서 고정 변경 가능

**Step 2: typecheck 확인**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.tsx
git commit -m "feat(solid): effectiveColumns에 hidden/fixed/displayOrder config 적용"
```

---

## Task 4: 행 드래그 재정렬 (#region Reorder) — Sheet.tsx

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx`

### 개요

`onItemsReorder`가 설정되면 **드래그 핸들 기능 컬럼**이 자동 추가된다.

- 위치: 기능 컬럼 중 가장 우측 (확장 → 선택 → 드래그 순)
- 아이콘: `IconGripVertical` (6개 점 수직 핸들)
- 스타일: `cursor-grab` (드래그 중 `cursor-grabbing`)
- 헤더: 빈 셀 (rowspan = 전체 헤더 행 수 + 합계 행)
- 너비: `featureColTotalWidth`에 포함

**Step 1: import 추가**

`Sheet.tsx` 상단의 import에 추가:

```tsx
// 5줄 — @tabler/icons-solidjs에 IconGripVertical 추가
import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronRight,
  IconGripVertical,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-solidjs";

// types.ts import에 SheetReorderEvent 추가
import type { FlatItem, SheetColumnDef, SheetConfig, SheetProps, SheetReorderEvent, SortingDef } from "./types";
```

styles import에 추가:

```tsx
import {
  // ... 기존 import들 ...
  reorderHandleClass,
  reorderIndicatorClass,
} from "./Sheet.styles";
```

**Step 2: splitProps에 onItemsReorder 추가**

48줄의 `splitProps` 배열에 `"onItemsReorder"` 추가:

```tsx
const [local] = splitProps(props, [
  // ... 기존 props ...
  "getItemCellStyleFn",
  "onItemsReorder", // 추가
  "class",
  "children",
]);
```

**Step 3: 드래그 기능 컬럼 감지 및 너비 추적 — #region Feature Column Setup 내에 추가**

기존 `hasSelectFeature` (185줄) 바로 아래에:

```tsx
const hasReorderFeature = () => local.onItemsReorder != null;

// 드래그 컬럼의 고정 너비 추적
const [reorderColWidth, setReorderColWidth] = createSignal(0);

function registerReorderColRef(el: HTMLElement): void {
  createResizeObserver(el, () => {
    setReorderColWidth(el.offsetWidth);
  });
}
```

**Step 4: featureColTotalWidth에 드래그 컬럼 추가**

`featureColTotalWidth` (213줄)를 수정:

```tsx
const featureColTotalWidth = createMemo(() => {
  let w = 0;
  if (hasExpandFeature()) w += expandColWidth();
  if (hasSelectFeature()) w += selectColWidth();
  if (hasReorderFeature()) w += reorderColWidth();
  return w;
});
```

**Step 5: 드래그 관련 "마지막 고정" 판단 수정**

기존 `isExpandColLastFixed`와 `isSelectColLastFixed` (488-493줄)를 수정:

```tsx
// 확장 기능 컬럼이 "마지막 고정"인지
const isExpandColLastFixed = () =>
  hasExpandFeature() && !hasSelectFeature() && !hasReorderFeature() && lastFixedIndex() < 0;

// 선택 기능 컬럼이 "마지막 고정"인지
const isSelectColLastFixed = () => hasSelectFeature() && !hasReorderFeature() && lastFixedIndex() < 0;

// 드래그 기능 컬럼이 "마지막 고정"인지
const isReorderColLastFixed = () => hasReorderFeature() && lastFixedIndex() < 0;
```

**Step 6: #region Reorder — 드래그 상태 + 로직 추가**

`#region AutoSelect` (439줄 근처) 뒤에 `#region Reorder` 추가:

```tsx
// #region Reorder
const [dragState, setDragState] = createSignal<{
  draggingItem: T;
  targetItem: T | null;
  position: "before" | "after" | "inside" | null;
} | null>(null);

function isDescendant(parent: T, child: T): boolean {
  if (!local.getChildrenFn) return false;
  const children = local.getChildrenFn(parent, 0);
  if (!children) return false;
  for (const c of children) {
    if (c === child) return true;
    if (isDescendant(c, child)) return true;
  }
  return false;
}

function onReorderMouseDown(e: MouseEvent, item: T): void {
  e.preventDefault();

  const tableEl = (e.target as HTMLElement).closest("table")!;
  const tbody = tableEl.querySelector("tbody")!;
  const rows = Array.from(tbody.rows);

  setDragState({ draggingItem: item, targetItem: null, position: null });

  const onMouseMove = (ev: MouseEvent) => {
    let foundTarget: T | null = null;
    let foundPosition: "before" | "after" | "inside" | null = null;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rect = row.getBoundingClientRect();
      if (ev.clientY < rect.top || ev.clientY > rect.bottom) continue;

      const flat = displayItems()[i];
      if (!flat || flat.item === item) break;

      // 자기 자신의 하위 항목으로는 드롭 불가
      if (isDescendant(item, flat.item)) break;

      const relY = ev.clientY - rect.top;
      const third = rect.height / 3;

      if (relY < third) {
        foundPosition = "before";
      } else if (relY > third * 2) {
        foundPosition = "after";
      } else {
        foundPosition = local.getChildrenFn ? "inside" : relY < rect.height / 2 ? "before" : "after";
      }
      foundTarget = flat.item;
      break;
    }

    setDragState({ draggingItem: item, targetItem: foundTarget, position: foundPosition });

    // 인디케이터 DOM 업데이트
    for (let i = 0; i < rows.length; i++) {
      const flat = displayItems()[i];
      rows[i].removeAttribute("data-dragging");
      rows[i].removeAttribute("data-drag-over");

      if (flat?.item === item) {
        rows[i].setAttribute("data-dragging", "");
      }
      if (flat?.item === foundTarget && foundPosition === "inside") {
        rows[i].setAttribute("data-drag-over", "inside");
      }
    }

    // before/after 인디케이터
    const indicatorEl = tableEl
      .closest("[data-sheet-scroll]")
      ?.querySelector("[data-reorder-indicator]") as HTMLElement | null;
    if (indicatorEl) {
      if (foundTarget && foundPosition && foundPosition !== "inside") {
        const targetIdx = displayItems().findIndex((f) => f.item === foundTarget);
        if (targetIdx >= 0) {
          const targetRow = rows[targetIdx];
          const containerRect = tableEl.closest("[data-sheet-scroll]")!.getBoundingClientRect();
          const rowRect = targetRow.getBoundingClientRect();
          const scrollEl = tableEl.closest("[data-sheet-scroll]") as HTMLElement;

          const top =
            foundPosition === "before"
              ? rowRect.top - containerRect.top + scrollEl.scrollTop
              : rowRect.bottom - containerRect.top + scrollEl.scrollTop;

          indicatorEl.style.display = "block";
          indicatorEl.style.top = `${top}px`;
        }
      } else {
        indicatorEl.style.display = "none";
      }
    }
  };

  const onMouseUp = () => {
    const state = dragState();
    if (state?.targetItem && state.position) {
      local.onItemsReorder?.({
        item: state.draggingItem,
        targetItem: state.targetItem,
        position: state.position,
      } as SheetReorderEvent<T>);
    }

    // 클린업
    for (const row of rows) {
      row.removeAttribute("data-dragging");
      row.removeAttribute("data-drag-over");
    }
    const indicatorEl = tableEl
      .closest("[data-sheet-scroll]")
      ?.querySelector("[data-reorder-indicator]") as HTMLElement | null;
    if (indicatorEl) {
      indicatorEl.style.display = "none";
    }

    setDragState(null);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}
```

**Step 7: colgroup에 드래그 컬럼 col 추가**

colgroup 내 (533-535줄, 선택 컬럼 `<col />` 바로 뒤):

```tsx
<Show when={hasReorderFeature()}>
  <col />
</Show>
```

**Step 8: thead에 드래그 기능 컬럼 헤더 추가**

선택 기능 컬럼 헤더 `</Show>` (609줄) 바로 뒤에:

```tsx
{
  /* 드래그 재정렬 기능 컬럼 헤더 — 첫 번째 행에만 표시 */
}
<Show when={hasReorderFeature() && rowIndex() === 0}>
  <th
    class={twMerge(featureThClass, fixedClass, "z-[5]", isReorderColLastFixed() ? fixedLastClass : undefined)}
    rowspan={featureHeaderRowspan()}
    style={{
      top: "0",
      left: (() => {
        let left = 0;
        if (hasExpandFeature()) left += expandColWidth();
        if (hasSelectFeature()) left += selectColWidth();
        return `${left}px`;
      })(),
    }}
    ref={registerReorderColRef}
  />
</Show>;
```

**Step 9: tbody에 드래그 기능 컬럼 바디 셀 추가**

선택 기능 컬럼 바디 셀 `</Show>` (890줄) 바로 뒤에:

```tsx
{
  /* 드래그 재정렬 기능 컬럼 바디 셀 */
}
<Show when={hasReorderFeature()}>
  <td
    class={twMerge(featureTdClass, fixedClass, "z-[2]", isReorderColLastFixed() ? fixedLastClass : undefined)}
    style={{
      left: (() => {
        let left = 0;
        if (hasExpandFeature()) left += expandColWidth();
        if (hasSelectFeature()) left += selectColWidth();
        return `${left}px`;
      })(),
    }}
  >
    <div class="flex h-full items-center justify-center px-1" onMouseDown={(e) => onReorderMouseDown(e, flat.item)}>
      <div class={reorderHandleClass}>
        <Icon icon={IconGripVertical} size="1em" />
      </div>
    </div>
  </td>
</Show>;
```

**Step 10: 드래그 인디케이터 엘리먼트 추가**

`resizeIndicatorClass` div (916줄) 바로 아래에:

```tsx
<div data-reorder-indicator class={reorderIndicatorClass} style={{ display: "none" }} />
```

**Step 11: typecheck + lint 확인**

Run: `pnpm typecheck packages/solid && pnpm lint packages/solid`
Expected: PASS

**Step 12: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.tsx
git commit -m "feat(solid): Sheet 행 드래그 재정렬 기능 추가"
```

---

## Task 5: SheetConfigModal (신규 파일)

**Files:**

- Create: `packages/solid/src/components/data/sheet/SheetConfigModal.tsx`

### 개요

설정 모달은 Sheet를 내부에서 사용하여 컬럼 순서/고정/숨김/너비를 편집하는 UI이다.

**중요 — 순환 참조 방지:**

- `SheetConfigModal`은 `Sheet`를 import한다
- `Sheet`는 `SheetConfigModal`을 **동적 import**한다 (Task 6에서 구현)

**중요 — modal.show extra props 전달 패턴:**
현재 `ModalProvider`의 `Dynamic`은 `close`만 전달한다. extra props(`columnInfos`, `currentConfig`)는 `modal.show`에 클로저를 사용하여 래핑한 컴포넌트를 전달한다:

```tsx
// Sheet.tsx에서 호출 시 (Task 6에서 구현):
const result = await modal.show<SheetConfig>(
  (modalProps) => SheetConfigModal({ ...modalProps, columnInfos, currentConfig: config() }),
  { title: "시트 설정", ... }
);
```

**Step 1: SheetConfigModal.tsx 작성**

```tsx
import { type Component, createSignal, For } from "solid-js";
import type { ModalContentProps } from "../../disclosure/ModalContext";
import type { SheetConfig, SheetConfigColumn, SheetConfigColumnInfo, SheetReorderEvent } from "./types";
import { Sheet } from "./Sheet";
import { SheetColumn } from "./SheetColumn";
import { CheckBox } from "../../form-control/checkbox/CheckBox";
import { TextField } from "../../form-control/field/TextField";
import { Button } from "../../form-control/Button";

interface EditColumnItem {
  key: string;
  headerText: string;
  fixed: boolean;
  hidden: boolean;
  width: string;
}

export interface SheetConfigModalProps extends ModalContentProps<SheetConfig> {
  columnInfos: SheetConfigColumnInfo[];
  currentConfig: SheetConfig;
}

export const SheetConfigModal: Component<SheetConfigModalProps> = (props) => {
  const initialItems: EditColumnItem[] = props.columnInfos
    .filter((info) => !info.collapse)
    .map((info) => {
      const saved = props.currentConfig.columnRecord?.[info.key];
      return {
        key: info.key,
        headerText: info.header.join(" > "),
        fixed: saved?.fixed ?? info.fixed,
        hidden: saved?.hidden ?? info.hidden,
        width: saved?.width ?? info.width ?? "",
      };
    })
    .sort((a, b) => {
      const orderA = props.currentConfig.columnRecord?.[a.key]?.displayOrder ?? Infinity;
      const orderB = props.currentConfig.columnRecord?.[b.key]?.displayOrder ?? Infinity;
      return orderA - orderB;
    });

  const [editItems, setEditItems] = createSignal<EditColumnItem[]>(initialItems);

  function handleReorder(event: SheetReorderEvent<EditColumnItem>): void {
    const items = [...editItems()];
    const fromIndex = items.findIndex((i) => i.key === event.item.key);
    if (fromIndex < 0) return;

    const [moved] = items.splice(fromIndex, 1);
    let toIndex = items.findIndex((i) => i.key === event.targetItem.key);
    if (toIndex < 0) return;

    if (event.position === "after") toIndex++;
    items.splice(toIndex, 0, moved);
    setEditItems(items);
  }

  function updateItem(key: string, field: keyof EditColumnItem, value: unknown): void {
    setEditItems((prev) => prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)));
  }

  function handleOk(): void {
    const columnRecord: Record<string, SheetConfigColumn> = {};
    const items = editItems();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const info = props.columnInfos.find((c) => c.key === item.key)!;

      const entry: SheetConfigColumn = {};

      if (item.fixed !== info.fixed) entry.fixed = item.fixed;
      if (item.hidden !== info.hidden) entry.hidden = item.hidden;
      if (item.width && item.width !== (info.width ?? "")) entry.width = item.width;
      entry.displayOrder = i;

      if (Object.keys(entry).length > 0) {
        columnRecord[item.key] = entry;
      }
    }

    props.close({ columnRecord });
  }

  function handleReset(): void {
    if (!confirm("모든 시트 설정을 초기화하시겠습니까?")) return;
    props.close({ columnRecord: {} });
  }

  return (
    <div class="flex flex-col gap-2 p-2">
      <Sheet items={editItems()} key="__sheet-config-modal__" hideConfigBar onItemsReorder={handleReorder}>
        <Sheet.Column<EditColumnItem> key="header" header="컬럼" class="px-2 py-1">
          {(ctx) => ctx.item.headerText}
        </Sheet.Column>
        <Sheet.Column<EditColumnItem> key="fixed" header="고정" width="60px">
          {(ctx) => (
            <div class="flex items-center justify-center">
              <CheckBox value={ctx.item.fixed} onValueChange={(v) => updateItem(ctx.item.key, "fixed", v)} />
            </div>
          )}
        </Sheet.Column>
        <Sheet.Column<EditColumnItem> key="hidden" header="숨김" width="60px">
          {(ctx) => (
            <div class="flex items-center justify-center">
              <CheckBox value={ctx.item.hidden} onValueChange={(v) => updateItem(ctx.item.key, "hidden", v)} />
            </div>
          )}
        </Sheet.Column>
        <Sheet.Column<EditColumnItem> key="width" header="너비" width="100px">
          {(ctx) => (
            <TextField
              value={ctx.item.width}
              onValueChange={(v) => updateItem(ctx.item.key, "width", v ?? "")}
              inset
              placeholder="auto"
            />
          )}
        </Sheet.Column>
      </Sheet>

      <div class="flex justify-end gap-2">
        <Button onClick={handleReset} theme="warning">
          초기화
        </Button>
        <Button onClick={() => props.close(undefined)}>취소</Button>
        <Button onClick={handleOk} theme="primary">
          확인
        </Button>
      </div>
    </div>
  );
};
```

**Step 2: typecheck 확인**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/src/components/data/sheet/SheetConfigModal.tsx
git commit -m "feat(solid): SheetConfigModal 컴포넌트 추가"
```

---

## Task 6: 설정 바 + openConfigModal (Sheet.tsx)

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx`

**Step 1: import 추가**

```tsx
// @tabler/icons-solidjs에 IconSettings 추가
import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronRight,
  IconGripVertical,
  IconSettings,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-solidjs";

// types import에 SheetConfigColumnInfo 추가
import type {
  FlatItem,
  SheetColumnDef,
  SheetConfig,
  SheetConfigColumnInfo,
  SheetProps,
  SheetReorderEvent,
  SortingDef,
} from "./types";

// useModal import 추가
import { useModal } from "../../disclosure/ModalContext";

// styles import에 configButtonClass 추가
import {
  // ... 기존 ...
  configButtonClass,
} from "./Sheet.styles";
```

**Step 2: useModal 호출 추가**

컴포넌트 함수 내부 (splitProps 뒤)에:

```tsx
const modal = useModal();
```

**Step 3: openConfigModal 함수 추가**

`#region Config` 섹션 내 (`saveColumnWidth` 함수 뒤, 110줄 근처)에:

```tsx
async function openConfigModal(): Promise<void> {
  const { SheetConfigModal } = await import("./SheetConfigModal");

  const allCols = resolved.toArray().filter(isSheetColumnDef) as unknown as SheetColumnDef<T>[];

  const columnInfos: SheetConfigColumnInfo[] = allCols
    .filter((col) => !col.collapse)
    .map((col) => ({
      key: col.key,
      header: col.header,
      fixed: col.fixed,
      hidden: col.hidden,
      collapse: col.collapse,
      width: col.width,
    }));

  const currentConfig = config();

  const result = await modal.show<SheetConfig>(
    (modalProps) => {
      const mod = SheetConfigModal;
      return mod({ ...modalProps, columnInfos, currentConfig });
    },
    {
      title: "시트 설정",
      useCloseByBackdrop: true,
      useCloseByEscapeKey: true,
    },
  );

  if (result) {
    setConfig(result);
  }
}
```

**Step 4: toolbar 표시 조건 변경 + 설정 버튼 추가**

기존 toolbar (511-522줄):

```tsx
<Show when={!local.hideConfigBar && effectivePageCount() > 1}>
  <div class={toolbarClass}>
    <Pagination
      class="flex-1"
      page={currentPage()}
      onPageChange={setCurrentPage}
      totalPages={effectivePageCount()}
      displayPages={local.displayPageCount}
      size="sm"
    />
  </div>
</Show>
```

변경 후:

```tsx
<Show when={!local.hideConfigBar && (local.key != null || effectivePageCount() > 1)}>
  <div class={toolbarClass}>
    <Show when={effectivePageCount() > 1}>
      <Pagination
        page={currentPage()}
        onPageChange={setCurrentPage}
        totalPages={effectivePageCount()}
        displayPages={local.displayPageCount}
        size="sm"
      />
    </Show>
    <div class="flex-1" />
    <Show when={local.key != null}>
      <button class={configButtonClass} onClick={openConfigModal} title="시트 설정" type="button">
        <Icon icon={IconSettings} size="1em" />
      </button>
    </Show>
  </div>
</Show>
```

**Step 5: typecheck + lint 확인**

Run: `pnpm typecheck packages/solid && pnpm lint packages/solid`
Expected: PASS

**Step 6: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.tsx
git commit -m "feat(solid): Sheet 설정 바에 설정 모달 버튼 추가"
```

---

## Task 7: 데모 페이지 — 드래그 재정렬 + 설정 모달 예제

**Files:**

- Modify: `packages/solid-demo/src/pages/data/SheetPage.tsx`

**Step 1: 드래그 재정렬 예제 추가**

SheetPage.tsx의 기존 섹션들 뒤에 (508줄 `</section>` 뒤, `</div>` 닫기 전) 새 섹션 추가:

```tsx
{
  /* 드래그 재정렬 */
}
<section>
  <h2 class="mb-4 text-xl font-semibold">드래그 재정렬</h2>
  <p class="mb-4 text-sm text-base-600 dark:text-base-400">
    onItemsReorder를 설정하면 드래그 핸들 컬럼이 자동 추가됩니다. 핸들을 잡고 드래그하여 행 순서를 변경할 수 있습니다.
  </p>
  <Sheet
    items={reorderItems()}
    key="reorder"
    onItemsReorder={(event) => {
      const items = [...reorderItems()];
      const fromIndex = items.indexOf(event.item);
      if (fromIndex < 0) return;

      const [moved] = items.splice(fromIndex, 1);
      let toIndex = items.indexOf(event.targetItem);
      if (toIndex < 0) return;

      if (event.position === "after") toIndex++;
      items.splice(toIndex, 0, moved);
      setReorderItems(items);
    }}
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
</section>;
```

`reorderItems` 시그널을 컴포넌트 상단에 추가:

```tsx
const [reorderItems, setReorderItems] = createSignal([...users]);
```

**Step 2: 설정 모달 예제는 별도 추가 불필요**

설정 모달은 `key` prop이 있는 모든 Sheet에서 자동으로 설정 버튼이 표시된다.
기존 데모의 모든 Sheet가 이미 `key` prop을 가지고 있으므로 설정 버튼이 자동 노출된다.

**Step 3: 데모 페이지가 ModalProvider 내부에 있는지 확인**

SheetPage가 ModalProvider 내부에서 렌더링되는지 확인 필요. 만약 없다면 SheetPage 또는 앱 루트에 ModalProvider를 추가해야 한다.

앱 루트의 Provider 구성을 확인하여 ModalProvider가 있는지 확인한다.

**Step 4: typecheck + lint 확인**

Run: `pnpm typecheck packages/solid packages/solid-demo && pnpm lint packages/solid packages/solid-demo`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid-demo/src/pages/data/SheetPage.tsx
git commit -m "feat(solid-demo): Sheet 드래그 재정렬 데모 예제 추가"
```

---

## Task 8: 수동 검증 (Playwright MCP)

**Step 1: dev 서버 실행**

Run: `pnpm dev` (별도 터미널)
URL: http://localhost:40081 (포트가 달라질 수 있음)

**Step 2: Playwright MCP로 검증**

다음 항목을 수동 검증한다:

1. **드래그 재정렬 섹션:**
   - 드래그 핸들 컬럼이 표시되는지
   - 핸들 드래그로 행 순서가 변경되는지

2. **설정 버튼:**
   - key가 있는 Sheet에 설정 아이콘이 표시되는지
   - 클릭 시 설정 모달이 열리는지

3. **설정 모달 내부:**
   - 컬럼 목록이 Sheet로 표시되는지
   - 드래그로 컬럼 순서 변경 가능한지
   - 고정/숨김 체크박스가 동작하는지
   - 너비 입력 필드가 동작하는지
   - 확인 → 설정 적용 확인
   - 취소 → 변경 없음 확인
   - 초기화 → 모든 설정 제거 확인

4. **페이지 새로고침 후 설정 유지 확인**

**Step 3: 문제 발견 시 수정 후 재검증**

---

## 핵심 참조 정보

### 파일 위치 & 줄 번호

| 파일                                                               | 설명               |
| ------------------------------------------------------------------ | ------------------ |
| `packages/solid/src/components/data/sheet/types.ts` (123줄)        | 타입 정의          |
| `packages/solid/src/components/data/sheet/Sheet.tsx` (923줄)       | 메인 컴포넌트      |
| `packages/solid/src/components/data/sheet/Sheet.styles.ts` (152줄) | 스타일 클래스      |
| `packages/solid/src/components/data/sheet/Sheet.css` (17줄)        | CSS 효과           |
| `packages/solid/src/components/data/sheet/SheetColumn.tsx`         | 컬럼 컴포넌트      |
| `packages/solid/src/components/data/sheet/sheetUtils.ts`           | 유틸리티 함수      |
| `packages/solid/src/components/disclosure/ModalContext.ts`         | Modal 타입/훅      |
| `packages/solid/src/components/disclosure/ModalProvider.tsx`       | Modal Provider     |
| `packages/solid/src/index.ts` (32-33줄)                            | Sheet/types export |
| `packages/solid-demo/src/pages/data/SheetPage.tsx` (513줄)         | 데모 페이지        |

### 아이콘

- `IconGripVertical`: `@tabler/icons-solidjs` — 6개 점 수직 핸들 (존재 확인됨)
- `IconSettings`: `@tabler/icons-solidjs` — 톱니바퀴 설정 아이콘 (존재 확인됨)

### Modal 사용 패턴

```tsx
// ModalContext.ts
export interface ModalContentProps<T = undefined> {
  close: (result?: T) => void;
}

// modal.show는 options만 받고, Dynamic에는 close만 전달
// → extra props 전달 시 클로저로 래핑
const result = await modal.show<SheetConfig>(
  (modalProps) => SheetConfigModal({ ...modalProps, columnInfos, currentConfig }),
  { title: "시트 설정", ... },
);
```

### Sheet 기능 컬럼 순서

확장 → 선택 → **드래그** (가장 우측)

각 기능 컬럼은:

- 너비 추적: `createSignal` + `createResizeObserver`
- `featureColTotalWidth`에 합산
- 고정 컬럼 left 오프셋에 사용
- "마지막 고정" 판단에 사용

### effectiveColumns 흐름

```
columnDefs() — code hidden 필터링
  → effectiveColumns() — config hidden 필터링 + fixed 오버라이드 + displayOrder 정렬
    → 헤더/바디/합계 행에서 사용
```
