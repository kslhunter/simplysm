# CrudSheet Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** DataSheet 위에 CRUD 비즈니스 로직을 얹는 Compound Component로, ERP 데이터 화면의 boilerplate를 75% 줄인다.

**Architecture:** CrudSheet는 BusyContainer > Filter form > Toolbar > DataSheet 구조를 자동 렌더링한다. Feature-grouped props(`inlineEdit`, `modalEdit`, `excel`, `selectMode`)로 기능을 opt-in하며, 내부에서 상태 관리, diff 추적, 자동 조회, 키보드 단축키, topbar 연동을 처리한다.

**Tech Stack:** SolidJS, solid-js/store (`createStore`, `produce`, `reconcile`), `@simplysm/core-common` (`objClone`, `oneWayDiffs`), `@simplysm/solid` (DataSheet, BusyContainer, useNotification, createTopbarActions, FormGroup, Button, Icon, Link)

**Design Doc:** `docs/plans/2026-02-22-crud-sheet-design.md`

**Reference:** `D:\workspaces-13\simplysm-opus\packages\client-admin\src\pages\home\base\user\UserPage.tsx` (현재 수동 CRUD 패턴)

---

### Task 1: Types and Sub-components

**Files:**
- Create: `packages/solid/src/components/data/crud-sheet/types.ts`
- Create: `packages/solid/src/components/data/crud-sheet/CrudSheetColumn.tsx`
- Create: `packages/solid/src/components/data/crud-sheet/CrudSheetFilter.tsx`
- Create: `packages/solid/src/components/data/crud-sheet/CrudSheetTools.tsx`
- Create: `packages/solid/src/components/data/crud-sheet/CrudSheetHeader.tsx`
- Test: `packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx`

**Step 1: Write the failing test**

```tsx
// packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx
import { describe, it, expect } from "vitest";
import {
  type CrudSheetProps,
  type InlineEditConfig,
  type ModalEditConfig,
  type ExcelConfig,
  type SearchResult,
  type CrudSheetCellContext,
  type CrudSheetContext,
  type SelectResult,
} from "../../../../src/components/data/crud-sheet/types";
import { CrudSheetColumn, isCrudSheetColumnDef } from "../../../../src/components/data/crud-sheet/CrudSheetColumn";
import { CrudSheetFilter, isCrudSheetFilterDef } from "../../../../src/components/data/crud-sheet/CrudSheetFilter";
import { CrudSheetTools, isCrudSheetToolsDef } from "../../../../src/components/data/crud-sheet/CrudSheetTools";
import { CrudSheetHeader, isCrudSheetHeaderDef } from "../../../../src/components/data/crud-sheet/CrudSheetHeader";

interface TestItem {
  id?: number;
  name: string;
  isDeleted: boolean;
}

describe("CrudSheet types", () => {
  it("CrudSheetColumn: plain object를 반환하고 type guard로 식별 가능하다", () => {
    const def = CrudSheetColumn<TestItem>({
      key: "name",
      header: "이름",
      children: (ctx) => <div>{ctx.item.name}</div>,
    });

    expect(isCrudSheetColumnDef(def)).toBe(true);
    expect((def as any).key).toBe("name");
  });

  it("CrudSheetFilter: plain object를 반환하고 type guard로 식별 가능하다", () => {
    const def = CrudSheetFilter({
      children: (_filter, _setFilter) => <div>filter</div>,
    });

    expect(isCrudSheetFilterDef(def)).toBe(true);
  });

  it("CrudSheetTools: plain object를 반환하고 type guard로 식별 가능하다", () => {
    const def = CrudSheetTools({
      children: (_ctx) => <div>tools</div>,
    });

    expect(isCrudSheetToolsDef(def)).toBe(true);
  });

  it("CrudSheetHeader: plain object를 반환하고 type guard로 식별 가능하다", () => {
    const def = CrudSheetHeader({
      children: <div>header</div>,
    });

    expect(isCrudSheetHeaderDef(def)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx --project=solid --run`
Expected: FAIL — modules not found

**Step 3: Write implementation**

`types.ts` — 설계 문서의 타입 정의를 구현하되, `ArrayDiffs2Result`를 `@simplysm/core-common`에서 재사용:

```typescript
// packages/solid/src/components/data/crud-sheet/types.ts
import type { JSX } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import type { ArrayDiffs2Result } from "@simplysm/core-common";
import type { DataSheetColumnProps, SortingDef } from "../sheet/types";

// ── Search ──

export interface SearchResult<TItem> {
  items: TItem[];
  pageCount?: number;
}

// ── Feature Configs ──

export interface InlineEditConfig<TItem> {
  submit: (diffs: ArrayDiffs2Result<TItem>[]) => Promise<void>;
  newItem: () => TItem;
  deleteProp?: keyof TItem & string;
}

export interface ModalEditConfig<TItem> {
  editItem: (item?: TItem) => Promise<boolean>;
  deleteItems?: (items: TItem[]) => Promise<boolean>;
}

export interface ExcelConfig<TItem> {
  download: (items: TItem[]) => Promise<void>;
  upload?: (file: File) => Promise<void>;
}

export interface SelectResult<TItem> {
  items: TItem[];
  keys: (string | number)[];
}

// ── Cell Context ──

export interface CrudSheetCellContext<TItem> {
  item: TItem;
  index: number;
  row: number;
  depth: number;
  setItem: <TKey extends keyof TItem>(key: TKey, value: TItem[TKey]) => void;
}

// ── CrudSheet Context (for Tools render prop) ──

export interface CrudSheetContext<TItem> {
  items(): TItem[];
  selectedItems(): TItem[];
  page(): number;
  sorts(): SortingDef[];
  busy(): boolean;
  hasChanges(): boolean;

  save(): Promise<void>;
  refresh(): Promise<void>;
  addItem(): void;
  setPage(page: number): void;
  setSorts(sorts: SortingDef[]): void;
}

// ── Props ──

export type CrudSheetProps<TItem, TFilter extends Record<string, any>> =
  CrudSheetBaseProps<TItem, TFilter> &
    (
      | { inlineEdit: InlineEditConfig<TItem>; modalEdit?: never }
      | { modalEdit: ModalEditConfig<TItem>; inlineEdit?: never }
      | { inlineEdit?: never; modalEdit?: never }
    );

interface CrudSheetBaseProps<TItem, TFilter extends Record<string, any>> {
  // Required
  search: (filter: TFilter, page: number, sorts: SortingDef[]) => Promise<SearchResult<TItem>>;
  getItemKey: (item: TItem) => string | number | undefined;

  // Config
  persistKey?: string;
  itemsPerPage?: number;
  canEdit?: () => boolean;
  filterInitial?: TFilter;

  // Features
  excel?: ExcelConfig<TItem>;
  selectMode?: "single" | "multi";
  onSelect?: (result: SelectResult<TItem>) => void;

  // Customization
  hideAutoTools?: boolean;

  // Style
  class?: string;
  children: JSX.Element;
}

// ── Sub-component Defs ──

export interface CrudSheetColumnDef<TItem> {
  __type: "crud-sheet-column";
  key: string;
  header: string[];
  headerContent?: () => JSX.Element;
  headerStyle?: string;
  summary?: () => JSX.Element;
  tooltip?: string;
  fixed: boolean;
  hidden: boolean;
  collapse: boolean;
  width?: string;
  class?: string;
  sortable: boolean;
  resizable: boolean;
  editable: boolean;
  cell: (ctx: CrudSheetCellContext<TItem>) => JSX.Element;
}

export interface CrudSheetColumnProps<TItem> extends Omit<DataSheetColumnProps<TItem>, "children"> {
  editable?: boolean;
  children: (ctx: CrudSheetCellContext<TItem>) => JSX.Element;
}

export interface CrudSheetFilterDef<TFilter> {
  __type: "crud-sheet-filter";
  children: (filter: TFilter, setFilter: SetStoreFunction<TFilter>) => JSX.Element;
}

export interface CrudSheetToolsDef<TItem> {
  __type: "crud-sheet-tools";
  children: (ctx: CrudSheetContext<TItem>) => JSX.Element;
}

export interface CrudSheetHeaderDef {
  __type: "crud-sheet-header";
  children: JSX.Element;
}
```

Sub-components는 DataSheetColumn 패턴을 따름 (plain object 반환 + type guard):

```tsx
// packages/solid/src/components/data/crud-sheet/CrudSheetColumn.tsx
import type { JSX } from "solid-js";
import type { CrudSheetColumnDef, CrudSheetColumnProps } from "./types";
import { normalizeHeader } from "../sheet/sheetUtils";

export function isCrudSheetColumnDef(value: unknown): value is CrudSheetColumnDef<unknown> {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-sheet-column"
  );
}

/* eslint-disable solid/reactivity -- plain object 반환 패턴으로 reactive context 불필요 */
export function CrudSheetColumn<TItem>(props: CrudSheetColumnProps<TItem>): JSX.Element {
  return {
    __type: "crud-sheet-column",
    key: props.key,
    header: normalizeHeader(props.header),
    headerContent: props.headerContent,
    headerStyle: props.headerStyle,
    summary: props.summary,
    tooltip: props.tooltip,
    cell: props.children,
    class: props.class,
    fixed: props.fixed ?? false,
    hidden: props.hidden ?? false,
    collapse: props.collapse ?? false,
    width: props.width,
    sortable: props.sortable ?? true,
    resizable: props.resizable ?? true,
    editable: props.editable ?? false,
  } as unknown as JSX.Element;
}
/* eslint-enable solid/reactivity */
```

```tsx
// packages/solid/src/components/data/crud-sheet/CrudSheetFilter.tsx
import type { JSX } from "solid-js";
import type { CrudSheetFilterDef } from "./types";

export function isCrudSheetFilterDef(value: unknown): value is CrudSheetFilterDef<any> {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-sheet-filter"
  );
}

/* eslint-disable solid/reactivity */
export function CrudSheetFilter<TFilter>(props: {
  children: (filter: TFilter, setFilter: any) => JSX.Element;
}): JSX.Element {
  return {
    __type: "crud-sheet-filter",
    children: props.children,
  } as unknown as JSX.Element;
}
/* eslint-enable solid/reactivity */
```

```tsx
// packages/solid/src/components/data/crud-sheet/CrudSheetTools.tsx
import type { JSX } from "solid-js";
import type { CrudSheetToolsDef } from "./types";

export function isCrudSheetToolsDef(value: unknown): value is CrudSheetToolsDef<any> {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-sheet-tools"
  );
}

/* eslint-disable solid/reactivity */
export function CrudSheetTools<TItem>(props: {
  children: (ctx: any) => JSX.Element;
}): JSX.Element {
  return {
    __type: "crud-sheet-tools",
    children: props.children,
  } as unknown as JSX.Element;
}
/* eslint-enable solid/reactivity */
```

```tsx
// packages/solid/src/components/data/crud-sheet/CrudSheetHeader.tsx
import type { JSX } from "solid-js";
import type { CrudSheetHeaderDef } from "./types";

export function isCrudSheetHeaderDef(value: unknown): value is CrudSheetHeaderDef {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-sheet-header"
  );
}

/* eslint-disable solid/reactivity */
export function CrudSheetHeader(props: { children: JSX.Element }): JSX.Element {
  return {
    __type: "crud-sheet-header",
    children: props.children,
  } as unknown as JSX.Element;
}
/* eslint-enable solid/reactivity */
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/data/crud-sheet/ packages/solid/tests/components/data/crud-sheet/
git commit -m "feat(solid): add CrudSheet types and sub-components"
```

---

### Task 2: CrudSheet Core — State, Children Resolution, Rendering

**Files:**
- Create: `packages/solid/src/components/data/crud-sheet/CrudSheet.tsx`
- Modify: `packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx`

**Dependencies:** Task 1

**Step 1: Write the failing test**

```tsx
// 기존 테스트 파일에 추가
import { render } from "@solidjs/testing-library";
import { CrudSheet } from "../../../../src/components/data/crud-sheet/CrudSheet";
import { ConfigContext } from "../../../../src/providers/ConfigContext";
import { NotificationProvider } from "../../../../src/components/feedback/notification/NotificationProvider";

function TestWrapper(props: { children: JSX.Element }) {
  return (
    <ConfigContext.Provider value={{ clientName: "test" }}>
      <NotificationProvider>{props.children}</NotificationProvider>
    </ConfigContext.Provider>
  );
}

describe("CrudSheet rendering", () => {
  it("기본 렌더링: 컬럼, 필터, BusyContainer가 표시된다", async () => {
    const searchFn = async () => ({
      items: [{ id: 1, name: "홍길동", isDeleted: false }],
      pageCount: 1,
    });

    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, { searchText?: string }>
          search={searchFn}
          getItemKey={(item) => item.id}
          filterInitial={{ searchText: "" }}
        >
          <CrudSheet.Filter>
            {(filter, setFilter) => <input value={filter.searchText ?? ""} />}
          </CrudSheet.Filter>

          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    // 비동기 조회 대기
    await new Promise((r) => setTimeout(r, 100));

    // DataSheet가 렌더링됨
    const ths = container.querySelectorAll("thead th");
    expect(ths.length).toBeGreaterThanOrEqual(1);
    expect(ths[0].textContent).toContain("이름");

    // 데이터 행이 표시됨
    expect(container.textContent).toContain("홍길동");
  });

  it("filterInitial 없으면 빈 객체로 초기화된다", async () => {
    const searchFn = async () => ({ items: [] as TestItem[] });

    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={searchFn}
          getItemKey={(item) => item.id}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.querySelector("thead")).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx --project=solid --run`
Expected: FAIL — CrudSheet module not found

**Step 3: Write implementation**

`CrudSheet.tsx` — 핵심 구현. 상태 관리, children 해석, auto-refresh, 기본 렌더링:

```tsx
// packages/solid/src/components/data/crud-sheet/CrudSheet.tsx
import {
  children,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { createStore, produce, reconcile } from "solid-js/store";
import { objClone } from "@simplysm/core-common";
import type { SortingDef } from "../sheet/types";
import { DataSheet } from "../sheet/DataSheet";
import { DataSheetColumn } from "../sheet/DataSheetColumn";
import { BusyContainer } from "../../feedback/busy/BusyContainer";
import { useNotification } from "../../feedback/notification/NotificationContext";
import { Button } from "../../form-control/Button";
import { Icon } from "../../display/Icon";
import { FormGroup } from "../../layout/FormGroup";
import { TopbarContext } from "../../layout/topbar/TopbarContext";
import { createTopbarActions } from "../../layout/topbar/TopbarContext";
import { isCrudSheetColumnDef } from "./CrudSheetColumn";
import { isCrudSheetFilterDef } from "./CrudSheetFilter";
import { isCrudSheetToolsDef } from "./CrudSheetTools";
import { isCrudSheetHeaderDef } from "./CrudSheetHeader";
import { CrudSheetColumn } from "./CrudSheetColumn";
import { CrudSheetFilter } from "./CrudSheetFilter";
import { CrudSheetTools } from "./CrudSheetTools";
import { CrudSheetHeader } from "./CrudSheetHeader";
import type {
  CrudSheetColumnDef,
  CrudSheetContext,
  CrudSheetFilterDef,
  CrudSheetHeaderDef,
  CrudSheetProps,
  CrudSheetToolsDef,
  SearchResult,
} from "./types";
import {
  IconDeviceFloppy,
  IconFileExcel,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconTrashOff,
  IconUpload,
} from "@tabler/icons-solidjs";
import { Link } from "../../display/Link";
import { createEventListener } from "@solid-primitives/event-listener";
import clsx from "clsx";

interface CrudSheetComponent {
  <TItem, TFilter extends Record<string, any>>(props: CrudSheetProps<TItem, TFilter>): JSX.Element;
  Column: typeof CrudSheetColumn;
  Filter: typeof CrudSheetFilter;
  Tools: typeof CrudSheetTools;
  Header: typeof CrudSheetHeader;
}

const CrudSheetBase = <TItem, TFilter extends Record<string, any>>(
  props: CrudSheetProps<TItem, TFilter>,
) => {
  const [local, _rest] = splitProps(props, [
    "search",
    "getItemKey",
    "persistKey",
    "itemsPerPage",
    "canEdit",
    "filterInitial",
    "inlineEdit",
    "modalEdit",
    "excel",
    "selectMode",
    "onSelect",
    "hideAutoTools",
    "class",
    "children",
  ]);

  const noti = useNotification();
  const topbarCtx = useContext(TopbarContext);
  const isSelectMode = () => local.selectMode != null;
  const canEdit = () => (isSelectMode() ? false : (local.canEdit?.() ?? true));

  // ── Children Resolution ──
  const resolved = children(() => local.children);
  const defs = createMemo(() => {
    const arr = resolved.toArray();
    return {
      filter: arr.find(isCrudSheetFilterDef) as CrudSheetFilterDef<TFilter> | undefined,
      columns: arr.filter(isCrudSheetColumnDef) as unknown as CrudSheetColumnDef<TItem>[],
      tools: arr.find(isCrudSheetToolsDef) as CrudSheetToolsDef<TItem> | undefined,
      header: arr.find(isCrudSheetHeaderDef) as CrudSheetHeaderDef | undefined,
    };
  });

  // ── State ──
  const [items, setItems] = createStore<TItem[]>([]);
  let originalItems: TItem[] = [];

  const [filter, setFilter] = createStore<TFilter>(
    (local.filterInitial ?? {}) as TFilter,
  );
  const [lastFilter, setLastFilter] = createSignal<TFilter>(objClone(filter));

  const [page, setPage] = createSignal(1);
  const [totalPageCount, setTotalPageCount] = createSignal(0);
  const [sorts, setSorts] = createSignal<SortingDef[]>([]);

  const [busyCount, setBusyCount] = createSignal(0);
  const [ready, setReady] = createSignal(false);

  const [selectedItems, setSelectedItems] = createSignal<TItem[]>([]);

  let formRef: HTMLFormElement | undefined;

  // ── Auto Refresh Effect ──
  createEffect(() => {
    const currLastFilter = lastFilter();
    const currSorts = sorts();
    const currPage = page();

    queueMicrotask(async () => {
      setBusyCount((c) => c + 1);
      await noti.try(async () => {
        await refresh(currLastFilter, currSorts, currPage);
      }, "조회 실패");
      setBusyCount((c) => c - 1);
      setReady(true);
    });
  });

  async function refresh(
    currLastFilter: TFilter,
    currSorts: SortingDef[],
    currPage: number,
  ) {
    const usePagination = local.itemsPerPage != null;
    const result: SearchResult<TItem> = await local.search(
      currLastFilter,
      usePagination ? currPage : 0,
      currSorts,
    );
    setItems(reconcile(result.items));
    originalItems = objClone(result.items);
    setTotalPageCount(result.pageCount ?? 0);
  }

  // ── Filter ──
  function handleFilterSubmit(e: Event) {
    e.preventDefault();
    setPage(1);
    setLastFilter(objClone(filter));
  }

  function handleRefresh() {
    setLastFilter({ ...lastFilter() });
  }

  // ── Inline Edit ──
  function handleAddRow() {
    if (!local.inlineEdit) return;
    setItems(
      produce((draft) => {
        (draft as TItem[]).unshift(local.inlineEdit!.newItem());
      }),
    );
  }

  function handleToggleDelete(item: TItem, index: number) {
    if (!local.inlineEdit?.deleteProp) return;
    const deleteProp = local.inlineEdit.deleteProp;

    if (local.getItemKey(item) == null) {
      setItems(
        produce((draft) => {
          (draft as TItem[]).splice(index, 1);
        }),
      );
      return;
    }

    setItems(index as any, deleteProp as any, !(item[deleteProp] as boolean) as any);
  }

  async function handleSave() {
    if (busyCount() > 0) return;
    if (!canEdit()) return;
    if (!local.inlineEdit) return;

    const diffs = (items as TItem[]).oneWayDiffs(originalItems, (item) => {
      const key = local.getItemKey(item);
      return key as any;
    });

    if (diffs.length === 0) {
      noti.info("안내", "변경사항이 없습니다.");
      return;
    }

    const currLastFilter = lastFilter();
    const currSorts = sorts();
    const currPage = page();

    setBusyCount((c) => c + 1);
    await noti.try(async () => {
      await local.inlineEdit!.submit(diffs);
      noti.success("저장 완료", "저장되었습니다.");
      await refresh(currLastFilter, currSorts, currPage);
    }, "저장 실패");
    setBusyCount((c) => c - 1);
  }

  async function handleFormSubmit(e: Event) {
    e.preventDefault();
    await handleSave();
  }

  // ── Modal Edit ──
  async function handleEditItem(item?: TItem) {
    if (!local.modalEdit) return;
    const result = await local.modalEdit.editItem(item);
    if (!result) return;

    setBusyCount((c) => c + 1);
    await noti.try(async () => {
      await refresh(lastFilter(), sorts(), page());
    }, "조회 실패");
    setBusyCount((c) => c - 1);
  }

  async function handleDeleteItems() {
    if (!local.modalEdit?.deleteItems) return;
    const result = await local.modalEdit.deleteItems(selectedItems());
    if (!result) return;

    setBusyCount((c) => c + 1);
    await noti.try(async () => {
      await refresh(lastFilter(), sorts(), page());
      noti.success("삭제 완료", "삭제되었습니다.");
    }, "삭제 실패");
    setBusyCount((c) => c - 1);
  }

  // ── Excel ──
  async function handleExcelDownload() {
    if (!local.excel) return;

    setBusyCount((c) => c + 1);
    await noti.try(async () => {
      const result = await local.search(lastFilter(), 0, sorts());
      await local.excel!.download(result.items);
    }, "엑셀 다운로드 실패");
    setBusyCount((c) => c - 1);
  }

  function handleExcelUpload() {
    if (!local.excel?.upload) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file == null) return;

      setBusyCount((c) => c + 1);
      await noti.try(async () => {
        await local.excel!.upload!(file);
        noti.success("완료", "엑셀 업로드가 완료되었습니다.");
        await refresh(lastFilter(), sorts(), page());
      }, "엑셀 업로드 실패");
      setBusyCount((c) => c - 1);
    };
    input.click();
  }

  // ── Select Mode ──
  function handleSelectConfirm() {
    local.onSelect?.({
      items: selectedItems(),
      keys: selectedItems()
        .map((item) => local.getItemKey(item))
        .filter((k): k is string | number => k != null),
    });
  }

  function handleSelectCancel() {
    local.onSelect?.({ items: [], keys: [] });
  }

  // ── Keyboard Shortcuts ──
  createEventListener(document, "keydown", (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === "s" && !isSelectMode()) {
      e.preventDefault();
      formRef?.requestSubmit();
    }
    if (e.ctrlKey && e.altKey && e.key === "l") {
      e.preventDefault();
      handleRefresh();
    }
  });

  // ── Topbar Actions ──
  if (topbarCtx) {
    createTopbarActions(() => (
      <>
        <Show when={canEdit() && local.inlineEdit}>
          <Button size="lg" variant="ghost" theme="primary" onClick={() => formRef?.requestSubmit()}>
            <Icon icon={IconDeviceFloppy} class="mr-1" />
            저장
          </Button>
        </Show>
        <Button size="lg" variant="ghost" theme="info" onClick={handleRefresh}>
          <Icon icon={IconRefresh} class="mr-1" />
          새로고침
        </Button>
      </>
    ));
  }

  // ── Context for Tools ──
  const ctx: CrudSheetContext<TItem> = {
    items: () => items as TItem[],
    selectedItems,
    page,
    sorts,
    busy: () => busyCount() > 0,
    hasChanges: () => {
      if (!local.inlineEdit) return false;
      const diffs = (items as TItem[]).oneWayDiffs(originalItems, (item) => {
        const key = local.getItemKey(item);
        return key as any;
      });
      return diffs.length > 0;
    },
    save: handleSave,
    refresh: async () => handleRefresh(),
    addItem: handleAddRow,
    setPage,
    setSorts,
  };

  // ── Render ──
  const deleteProp = () => local.inlineEdit?.deleteProp;

  return (
    <BusyContainer
      ready={ready()}
      busy={busyCount() > 0}
      class={clsx("flex h-full flex-col", local.class)}
    >
      {/* Header (optional) */}
      <Show when={defs().header}>{(headerDef) => headerDef().children}</Show>

      {/* Filter */}
      <Show when={defs().filter}>
        {(filterDef) => (
          <form class="p-2" onSubmit={handleFilterSubmit}>
            <FormGroup inline>
              <FormGroup.Item>
                <Button type="submit" theme="info" variant="solid">
                  <Icon icon={IconSearch} class="mr-1" />
                  조회
                </Button>
              </FormGroup.Item>
              {filterDef().children(filter, setFilter)}
            </FormGroup>
          </form>
        )}
      </Show>

      {/* Toolbar */}
      <Show when={!isSelectMode()}>
        <div class="flex gap-2 p-2 pb-0">
          <Show when={!local.hideAutoTools}>
            {/* Inline edit buttons */}
            <Show when={canEdit() && local.inlineEdit}>
              <Button size="sm" theme="primary" variant="ghost" onClick={handleAddRow}>
                <Icon icon={IconPlus} class="mr-1" />행 추가
              </Button>
            </Show>

            {/* Modal edit buttons */}
            <Show when={canEdit() && local.modalEdit}>
              <Button size="sm" theme="primary" variant="ghost" onClick={() => handleEditItem()}>
                <Icon icon={IconPlus} class="mr-1" />등록
              </Button>
            </Show>
            <Show when={canEdit() && local.modalEdit?.deleteItems}>
              <Button
                size="sm"
                theme="danger"
                variant="ghost"
                onClick={handleDeleteItems}
                disabled={selectedItems().length === 0}
              >
                <Icon icon={IconTrash} class="mr-1" />선택 삭제
              </Button>
            </Show>

            {/* Excel buttons */}
            <Show when={canEdit() && local.excel?.upload}>
              <Button size="sm" theme="success" variant="ghost" onClick={handleExcelUpload}>
                <Icon icon={IconUpload} class="mr-1" />엑셀 업로드
              </Button>
            </Show>
            <Show when={local.excel}>
              <Button size="sm" theme="success" variant="ghost" onClick={handleExcelDownload}>
                <Icon icon={IconFileExcel} class="mr-1" />엑셀 다운로드
              </Button>
            </Show>
          </Show>

          {/* Custom tools */}
          <Show when={defs().tools}>{(toolsDef) => toolsDef().children(ctx)}</Show>
        </div>
      </Show>

      {/* DataSheet */}
      <form
        ref={formRef}
        class="flex-1 overflow-hidden p-2 pt-1"
        onSubmit={handleFormSubmit}
      >
        <DataSheet
          class="h-full"
          items={items}
          persistKey={local.persistKey ? `${local.persistKey}-sheet` : undefined}
          page={local.itemsPerPage != null ? page() : undefined}
          onPageChange={setPage}
          totalPageCount={totalPageCount()}
          itemsPerPage={local.itemsPerPage}
          sorts={sorts()}
          onSortsChange={setSorts}
          selectMode={
            isSelectMode()
              ? local.selectMode === "multi"
                ? "multiple"
                : "single"
              : local.modalEdit?.deleteItems
                ? "multiple"
                : undefined
          }
          selectedItems={selectedItems()}
          onSelectedItemsChange={setSelectedItems}
          autoSelect={
            isSelectMode() && local.selectMode === "single" ? "click" : undefined
          }
          cellClass={(item, _colKey) =>
            deleteProp() && (item as any)[deleteProp()!]
              ? clsx("line-through")
              : undefined
          }
        >
          {/* Auto delete column */}
          <Show when={canEdit() && deleteProp()}>
            <DataSheetColumn<TItem>
              key="__delete"
              header=""
              fixed
              sortable={false}
              resizable={false}
            >
              {(dsCtx) => (
                <div class="flex items-center justify-center px-1 py-0.5">
                  <Link
                    theme="danger"
                    onClick={() => handleToggleDelete(dsCtx.item, dsCtx.index)}
                  >
                    <Icon
                      icon={
                        (dsCtx.item as any)[deleteProp()!] ? IconTrashOff : IconTrash
                      }
                    />
                  </Link>
                </div>
              )}
            </DataSheetColumn>
          </Show>

          {/* User-defined columns — map CrudSheetColumn to DataSheetColumn */}
          {createMemo(() =>
            defs().columns.map((col) => (
              <DataSheetColumn<TItem>
                key={col.key}
                header={col.header}
                headerContent={col.headerContent}
                headerStyle={col.headerStyle}
                summary={col.summary}
                tooltip={col.tooltip}
                fixed={col.fixed}
                hidden={col.hidden}
                collapse={col.collapse}
                width={col.width}
                class={col.class}
                sortable={col.sortable}
                resizable={col.resizable}
              >
                {(dsCtx) => {
                  const crudCtx = {
                    ...dsCtx,
                    setItem: <TKey extends keyof TItem>(key: TKey, value: TItem[TKey]) => {
                      setItems(dsCtx.index as any, key as any, value as any);
                    },
                  };

                  // modalEdit editable column — wrap with edit link
                  if (local.modalEdit && col.editable && canEdit()) {
                    return (
                      <Link
                        class="flex w-full"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEditItem(dsCtx.item);
                        }}
                      >
                        {col.cell(crudCtx)}
                      </Link>
                    );
                  }

                  return col.cell(crudCtx);
                }}
              </DataSheetColumn>
            )),
          )}
        </DataSheet>
      </form>

      {/* Select mode bottom bar */}
      <Show when={isSelectMode()}>
        <div class="flex gap-2 border-t p-2">
          <div class="flex-1" />
          <Show when={selectedItems().length > 0}>
            <Button size="sm" theme="danger" onClick={handleSelectCancel}>
              {local.selectMode === "multi" ? "모두" : "선택"} 해제
            </Button>
          </Show>
          <Show when={local.selectMode === "multi"}>
            <Button size="sm" theme="primary" onClick={handleSelectConfirm}>
              확인({selectedItems().length})
            </Button>
          </Show>
        </div>
      </Show>
    </BusyContainer>
  );
};

export const CrudSheet = CrudSheetBase as unknown as CrudSheetComponent;
CrudSheet.Column = CrudSheetColumn;
CrudSheet.Filter = CrudSheetFilter;
CrudSheet.Tools = CrudSheetTools;
CrudSheet.Header = CrudSheetHeader;
```

**주의사항:**
- `@tabler/icons-solidjs`가 solid 패키지의 dependency에 있는지 확인. 없으면 아이콘을 `@simplysm/solid`의 Icon 컴포넌트 + svg string 방식으로 교체
- `@solid-primitives/event-listener`가 dependency에 있는지 확인
- `oneWayDiffs`는 `@simplysm/core-common`의 Array 확장 메서드. solid 패키지에서 `@simplysm/core-common`이 import되어야 확장 메서드가 등록됨
- 타입 캐스팅(`as any`)은 SolidJS store proxy와 generic의 호환성 문제. 런타임에는 정상 동작

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/data/crud-sheet/CrudSheet.tsx packages/solid/tests/components/data/crud-sheet/
git commit -m "feat(solid): add CrudSheet core component with state management and rendering"
```

---

### Task 3: Inline Edit Tests

**Files:**
- Modify: `packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx`

**Dependencies:** Task 2

**Step 1: Write tests for inline edit features**

```tsx
describe("CrudSheet inline edit", () => {
  const searchFn = async () => ({
    items: [
      { id: 1, name: "홍길동", isDeleted: false },
      { id: 2, name: "김철수", isDeleted: false },
    ],
    pageCount: 1,
  });

  it("inlineEdit 제공 시 행추가 버튼이 표시된다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={searchFn}
          getItemKey={(item) => item.id}
          inlineEdit={{
            submit: async () => {},
            newItem: () => ({ name: "", isDeleted: false }),
          }}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("행 추가");
  });

  it("inlineEdit 미제공 시 행추가/저장 버튼이 없다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={searchFn}
          getItemKey={(item) => item.id}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("행 추가");
  });

  it("deleteProp 제공 시 삭제 컬럼이 자동 생성된다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={searchFn}
          getItemKey={(item) => item.id}
          inlineEdit={{
            submit: async () => {},
            newItem: () => ({ name: "", isDeleted: false }),
            deleteProp: "isDeleted",
          }}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    // 삭제 컬럼이 첫 번째 fixed 컬럼으로 추가됨
    const columns = container.querySelectorAll("thead th");
    expect(columns.length).toBe(2); // 삭제 컬럼 + 이름 컬럼
  });
});
```

**Step 2: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx --project=solid --run`
Expected: PASS (Task 2에서 이미 구현됨)

**Step 3: Commit**

```bash
git add packages/solid/tests/components/data/crud-sheet/
git commit -m "test(solid): add CrudSheet inline edit rendering tests"
```

---

### Task 4: Select Mode Tests

**Files:**
- Modify: `packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx`

**Dependencies:** Task 2

**Step 1: Write tests**

```tsx
describe("CrudSheet select mode", () => {
  it("selectMode 설정 시 toolbar이 숨겨진다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={async () => ({ items: [{ id: 1, name: "홍길동", isDeleted: false }] })}
          getItemKey={(item) => item.id}
          selectMode="single"
          onSelect={() => {}}
          inlineEdit={{
            submit: async () => {},
            newItem: () => ({ name: "", isDeleted: false }),
          }}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("행 추가");
    expect(container.textContent).not.toContain("저장");
  });

  it("selectMode='multi' 시 확인 버튼이 표시된다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={async () => ({ items: [{ id: 1, name: "홍길동", isDeleted: false }] })}
          getItemKey={(item) => item.id}
          selectMode="multi"
          onSelect={() => {}}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("확인");
  });
});
```

**Step 2: Run test**

Run: `pnpm vitest packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx --project=solid --run`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/tests/components/data/crud-sheet/
git commit -m "test(solid): add CrudSheet select mode tests"
```

---

### Task 5: Exports and Index

**Files:**
- Modify: `packages/solid/src/index.ts`

**Dependencies:** Task 2

**Step 1: Write failing test**

```bash
# TypeScript import가 resolve되는지 확인
pnpm typecheck packages/solid
```

**Step 2: Add exports**

`packages/solid/src/index.ts`의 `Data` region에 추가:

```typescript
// 기존 Data region 안에:
export * from "./components/data/sheet/DataSheet";
export * from "./components/data/sheet/DataSheet.styles";
export * from "./components/data/sheet/types";
// ↓ 여기에 추가
export * from "./components/data/crud-sheet/CrudSheet";
export * from "./components/data/crud-sheet/types";
```

**Step 3: Verify**

Run: `pnpm typecheck packages/solid`
Expected: PASS (타입 에러 없음)

**Step 4: Commit**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): export CrudSheet from package index"
```

---

### Task 6: Demo Page

**Files:**
- Create: `packages/solid-demo/src/pages/data/CrudSheetPage.tsx`
- Modify: 라우트/메뉴에 등록 (기존 패턴 따라)

**Dependencies:** Task 5

**Step 1: Check existing demo structure**

기존 `SheetPage.tsx`와 동일한 패턴으로 데모 페이지 작성. 라우트 등록 파일을 확인하여 동일한 방식으로 추가.

**Step 2: Write demo page**

인라인 편집, 필터, 엑셀 다운로드 등을 보여주는 데모:

```tsx
// packages/solid-demo/src/pages/data/CrudSheetPage.tsx
import { createMemo, Show } from "solid-js";
import { CrudSheet, FormGroup, TextInput, Checkbox, NumberInput } from "@simplysm/solid";

interface DemoItem {
  id?: number;
  name: string;
  age: number;
  email: string;
  isDeleted: boolean;
}

interface DemoFilter {
  searchText?: string;
  isIncludeDeleted: boolean;
}

let nextId = 4;
let mockData: DemoItem[] = [
  { id: 1, name: "홍길동", age: 30, email: "hong@test.com", isDeleted: false },
  { id: 2, name: "김철수", age: 25, email: "kim@test.com", isDeleted: false },
  { id: 3, name: "이영희", age: 28, email: "lee@test.com", isDeleted: false },
];

export function CrudSheetPage() {
  return (
    <CrudSheet<DemoItem, DemoFilter>
      search={async (filter, page, _sorts) => {
        let items = [...mockData];
        if (filter.searchText) {
          items = items.filter((i) => i.name.includes(filter.searchText!));
        }
        if (!filter.isIncludeDeleted) {
          items = items.filter((i) => !i.isDeleted);
        }
        return { items };
      }}
      getItemKey={(item) => item.id}
      filterInitial={{ isIncludeDeleted: false }}
      inlineEdit={{
        submit: async (diffs) => {
          for (const diff of diffs) {
            if (diff.type === "create") {
              diff.item.id = nextId++;
              mockData.push(diff.item);
            } else if (diff.type === "update") {
              const idx = mockData.findIndex((i) => i.id === diff.item.id);
              if (idx >= 0) mockData[idx] = diff.item;
            }
          }
        },
        newItem: () => ({ name: "", age: 0, email: "", isDeleted: false }),
        deleteProp: "isDeleted",
      }}
      persistKey="crud-sheet-demo"
    >
      <CrudSheet.Filter>
        {(filter, setFilter) => (
          <>
            <FormGroup.Item label="검색어">
              <TextInput
                value={filter.searchText ?? ""}
                onValueChange={(v) => setFilter("searchText", v)}
              />
            </FormGroup.Item>
            <FormGroup.Item>
              <Checkbox
                value={filter.isIncludeDeleted}
                onValueChange={(v) => setFilter("isIncludeDeleted", v)}
              >
                삭제항목 포함
              </Checkbox>
            </FormGroup.Item>
          </>
        )}
      </CrudSheet.Filter>

      <CrudSheet.Column<DemoItem> key="id" header="#" fixed>
        {(ctx) => <div class="px-2 py-1 text-right">{ctx.item.id}</div>}
      </CrudSheet.Column>

      <CrudSheet.Column<DemoItem> key="name" header="이름">
        {(ctx) => (
          <TextInput
            inset
            size="sm"
            required
            value={ctx.item.name}
            onValueChange={(v) => ctx.setItem("name", v)}
          />
        )}
      </CrudSheet.Column>

      <CrudSheet.Column<DemoItem> key="age" header="나이">
        {(ctx) => (
          <NumberInput
            inset
            size="sm"
            value={ctx.item.age}
            onValueChange={(v) => ctx.setItem("age", v ?? 0)}
          />
        )}
      </CrudSheet.Column>

      <CrudSheet.Column<DemoItem> key="email" header="이메일">
        {(ctx) => (
          <TextInput
            inset
            size="sm"
            type="email"
            value={ctx.item.email}
            onValueChange={(v) => ctx.setItem("email", v)}
          />
        )}
      </CrudSheet.Column>
    </CrudSheet>
  );
}
```

**Step 3: Register route**

기존 데모 라우트 파일을 읽고 동일 패턴으로 CrudSheetPage를 등록.

**Step 4: Verify**

Run: `pnpm typecheck packages/solid-demo`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid-demo/src/pages/data/CrudSheetPage.tsx
git commit -m "feat(solid-demo): add CrudSheet demo page"
```

---

### Task 7: Final Verification

**Files:** None (verification only)

**Dependencies:** Tasks 1-6

**Step 1: Full typecheck**

Run: `pnpm typecheck packages/solid packages/solid-demo`
Expected: PASS

**Step 2: Full test suite**

Run: `pnpm vitest packages/solid/tests/components/data/crud-sheet/ --project=solid --run`
Expected: All tests PASS

**Step 3: Lint**

Run: `pnpm lint packages/solid/src/components/data/crud-sheet/`
Expected: PASS (또는 fixable warnings only)

**Step 4: Final commit if needed**

Fix any lint issues and commit.
