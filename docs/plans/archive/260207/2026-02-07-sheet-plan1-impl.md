# Sheet Plan 1: 기반 구조 + 기본 테이블 렌더링 — 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Sheet 컴포넌트의 기반 구조(타입, 유틸, 스타일)와 기본 테이블 렌더링(다단계 헤더, 합계 행)을 구현한다.

**Architecture:** Compound Component 패턴(`Sheet.Column`)으로 컬럼을 선언하고, `children()` resolve로 plain object를 수집하여 테이블을 렌더링한다. 데이터 파이프라인은 전체 스텁으로 선언하되 Plan 1에서는 pass-through로 동작한다.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS, clsx, tailwind-merge, @solidjs/testing-library, vitest

**설계 문서:** `docs/plans/2026-02-07-sheet-plan1-design.md`

---

### Task 1: 타입 정의 (types.ts)

**Files:**

- Create: `packages/solid/src/components/data/sheet/types.ts`

**Step 1: 타입 파일 생성**

설계 문서의 전체 타입을 `types.ts`에 작성한다. 모든 Plan에서 공용으로 사용하므로 한번에 전체를 정의한다.

```typescript
import type { JSX } from "solid-js";

export interface SheetProps<T> {
  // 데이터
  items?: T[];
  trackByFn?: (item: T, index: number) => unknown;

  // 설정
  key: string;
  hideConfigBar?: boolean;
  inset?: boolean;
  contentStyle?: JSX.CSSProperties | string;
  focusMode?: "row" | "cell";

  // 정렬
  sorts?: SortingDef[];
  onSortsChange?: (sorts: SortingDef[]) => void;
  useAutoSort?: boolean;

  // 페이지네이션
  currentPage?: number;
  onCurrentPageChange?: (page: number) => void;
  totalPageCount?: number;
  itemsPerPage?: number;
  displayPageCount?: number;

  // 선택
  selectMode?: "single" | "multi";
  selectedItems?: T[];
  onSelectedItemsChange?: (items: T[]) => void;
  autoSelect?: "click" | "focus";
  getItemSelectableFn?: (item: T) => boolean | string;

  // 트리 확장
  expandedItems?: T[];
  onExpandedItemsChange?: (items: T[]) => void;
  getChildrenFn?: (item: T, index: number) => T[] | undefined;

  // 셀 스타일
  getItemCellClassFn?: (item: T, colKey: string) => string | undefined;
  getItemCellStyleFn?: (item: T, colKey: string) => string | undefined;

  // 이벤트
  onItemKeydown?: (param: SheetItemKeydownParam<T>) => void;
  onCellKeydown?: (param: SheetItemKeydownParam<T>) => void;

  // 기타
  class?: string;
  children: JSX.Element;
}

export interface SheetColumnProps<T> {
  key: string;
  header?: string | string[];
  headerContent?: () => JSX.Element;
  headerStyle?: string;
  summary?: () => JSX.Element;
  tooltip?: string;
  fixed?: boolean;
  hidden?: boolean;
  collapse?: boolean;
  width?: string;
  disableSorting?: boolean;
  disableResizing?: boolean;
  children: (ctx: SheetCellContext<T>) => JSX.Element;
}

export interface SheetCellContext<T> {
  item: T;
  index: number;
  depth: number;
  edit: boolean;
}

export interface SortingDef {
  key: string;
  desc: boolean;
}

export interface SheetItemKeydownParam<T> {
  item: T;
  key?: string;
  event: KeyboardEvent;
}

export interface SheetConfig {
  columnRecord?: Record<string, SheetConfigColumn>;
}

export interface SheetConfigColumn {
  fixed?: boolean;
  width?: string;
  displayOrder?: number;
  hidden?: boolean;
}

export interface SheetColumnDef<T> {
  __type: "sheet-column";
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
  disableSorting: boolean;
  disableResizing: boolean;
  cell: (ctx: SheetCellContext<T>) => JSX.Element;
}

export interface HeaderDef {
  text: string;
  colspan: number;
  rowspan: number;
  isLastRow: boolean;
  colIndex?: number;
  fixed?: boolean;
  width?: string;
  style?: string;
  headerContent?: () => JSX.Element;
}

export interface FlatItem<T> {
  item: T;
  index: number;
  depth: number;
  hasChildren: boolean;
  parent?: T;
}
```

**Step 2: 커밋**

```bash
git add packages/solid/src/components/data/sheet/types.ts
git commit -m "feat(solid): Sheet 전체 타입 정의"
```

---

### Task 2: 순수 유틸 함수 (sheetUtils.ts)

**Files:**

- Create: `packages/solid/src/components/data/sheet/sheetUtils.ts`

**Step 1: sheetUtils.ts 작성**

`normalizeHeader`와 `buildHeaderTable` 두 함수를 구현한다.

```typescript
import type { HeaderDef, SheetColumnDef } from "./types";

export function normalizeHeader(header?: string | string[]): string[] {
  if (header == null) return [""];
  if (typeof header === "string") return [header];
  return header;
}

export function buildHeaderTable<T>(columns: SheetColumnDef<T>[]): (HeaderDef | null)[][] {
  if (columns.length === 0) return [];

  const maxDepth = Math.max(...columns.map((c) => c.header.length));
  if (maxDepth === 0) return [];

  // 각 컬럼의 헤더를 maxDepth까지 패딩 (마지막 값 반복)
  const padded = columns.map((col) => {
    const h = col.header;
    const result: string[] = [];
    for (let d = 0; d < maxDepth; d++) {
      result.push(d < h.length ? h[d] : h[h.length - 1]);
    }
    return result;
  });

  // 2D 배열 초기화
  const table: (HeaderDef | null)[][] = [];
  for (let r = 0; r < maxDepth; r++) {
    const row: (HeaderDef | null)[] = [];
    for (let c = 0; c < columns.length; c++) {
      row.push(null);
    }
    table.push(row);
  }

  // 셀 채우기
  for (let c = 0; c < columns.length; c++) {
    for (let r = 0; r < maxDepth; r++) {
      // 이전 행에서 rowspan으로 이미 병합된 경우 건너뛰기
      if (table[r][c] !== null) continue;

      const text = padded[c][r];
      const isLastRow = r === maxDepth - 1 || padded[c][r] !== padded[c][r + 1];

      // colspan 계산: 같은 행에서 같은 텍스트를 가진 연속 컬럼
      let colspan = 1;
      if (!isLastRow) {
        while (
          c + colspan < columns.length &&
          padded[c + colspan][r] === text &&
          // 이전 행의 병합 그룹이 같아야 함
          (r === 0 || isSameGroup(padded, c, c + colspan, 0, r))
        ) {
          colspan++;
        }
      }

      // rowspan 계산: 마지막 행이면 나머지 depth까지 확장
      let rowspan = 1;
      if (isLastRow) {
        rowspan = maxDepth - r;
      }

      const col = columns[c];
      table[r][c] = {
        text,
        colspan,
        rowspan,
        isLastRow,
        colIndex: isLastRow ? c : undefined,
        fixed: isLastRow ? col.fixed : undefined,
        width: isLastRow ? col.width : undefined,
        style: isLastRow ? col.headerStyle : undefined,
        headerContent: isLastRow ? col.headerContent : undefined,
      };

      // colspan으로 병합된 셀은 null로 유지 (이미 null)
      // rowspan으로 병합된 셀도 null로 유지하되, 마킹 필요
      for (let dr = 1; dr < rowspan; dr++) {
        for (let dc = 0; dc < colspan; dc++) {
          // 이미 null이므로 그대로 둠 — 단, 다른 셀이 이 위치를 사용하지 않도록 "사용됨" 표시 필요
          // null은 "병합됨" 또는 "아직 미처리"를 모두 나타내므로, 별도 마킹이 필요
          // → 빈 HeaderDef 대신 특별한 값은 사용하지 않고, 아래 루프에서 건너뛰도록 처리
        }
      }

      // 실제로 rowspan/colspan 영역을 마킹 — 점유된 영역에 placeholder 배치
      for (let dr = 0; dr < rowspan; dr++) {
        for (let dc = 0; dc < colspan; dc++) {
          if (dr === 0 && dc === 0) continue; // 원본 셀은 건너뛰기
          if (r + dr < maxDepth && c + dc < columns.length) {
            // null이 아닌 값으로 마킹하여 다른 셀이 이 위치를 사용하지 않도록
            // "사용됨" 표시로 빈 HeaderDef 배치 후 렌더링 시 null 체크로 건너뛰기
            // → 그냥 "occupied" 마커로 사용하되 렌더링에서는 null만 건너뜀
            // 접근 방식 변경: table[r][c]에 HeaderDef를 넣고, 나머지는 모두 null로 남김
            // 대신 순회 시 이미 처리된 셀은 건너뛰어야 함
          }
        }
      }
    }
  }

  return table;
}

// 같은 병합 그룹에 속하는지 확인 (행 0~endRow까지 같은 텍스트 시퀀스)
function isSameGroup(padded: string[][], colA: number, colB: number, startRow: number, endRow: number): boolean {
  for (let r = startRow; r < endRow; r++) {
    if (padded[colA][r] !== padded[colB][r]) return false;
  }
  return true;
}
```

> **주의**: 위 `buildHeaderTable` 구현은 복잡한 엣지 케이스가 있으므로, 테스트에서 검증 후 수정이 필요할 수 있다. 핵심 로직을 먼저 구현하고 테스트로 보완한다.
>
> 구현 시 `buildHeaderTable`의 정확한 동작을 보장하기 위해 아래의 더 간결한 접근을 고려한다:

```typescript
export function buildHeaderTable<T>(columns: SheetColumnDef<T>[]): (HeaderDef | null)[][] {
  if (columns.length === 0) return [];

  const maxDepth = Math.max(...columns.map((c) => c.header.length));
  if (maxDepth === 0) return [];

  // occupied[r][c] = true이면 이미 다른 셀의 병합 영역
  const occupied: boolean[][] = Array.from({ length: maxDepth }, () =>
    Array.from({ length: columns.length }, () => false),
  );
  const table: (HeaderDef | null)[][] = Array.from({ length: maxDepth }, () =>
    Array.from({ length: columns.length }, () => null),
  );

  // 각 컬럼의 헤더를 maxDepth까지 패딩
  const padded = columns.map((col) => {
    const h = col.header;
    const result: string[] = [];
    for (let d = 0; d < maxDepth; d++) {
      result.push(d < h.length ? h[d] : h[h.length - 1]);
    }
    return result;
  });

  for (let r = 0; r < maxDepth; r++) {
    for (let c = 0; c < columns.length; c++) {
      if (occupied[r][c]) continue;

      const text = padded[c][r];
      const isLastRow = r === maxDepth - 1 || padded[c][r] !== padded[c][r + 1];

      // colspan: 같은 행에서 같은 텍스트 + 같은 상위 그룹
      let colspan = 1;
      if (!isLastRow) {
        while (
          c + colspan < columns.length &&
          !occupied[r][c + colspan] &&
          padded[c + colspan][r] === text &&
          isSameGroup(padded, c, c + colspan, 0, r)
        ) {
          colspan++;
        }
      }

      // rowspan: isLastRow이면 남은 깊이만큼
      const rowspan = isLastRow ? maxDepth - r : 1;

      const col = columns[c];
      table[r][c] = {
        text,
        colspan,
        rowspan,
        isLastRow,
        colIndex: isLastRow ? c : undefined,
        fixed: isLastRow ? col.fixed : undefined,
        width: isLastRow ? col.width : undefined,
        style: isLastRow ? col.headerStyle : undefined,
        headerContent: isLastRow ? col.headerContent : undefined,
      };

      // 병합 영역 마킹
      for (let dr = 0; dr < rowspan; dr++) {
        for (let dc = 0; dc < colspan; dc++) {
          if (dr === 0 && dc === 0) continue;
          occupied[r + dr][c + dc] = true;
        }
      }
    }
  }

  return table;
}
```

> 두 번째 버전(`occupied` 배열 사용)이 더 명확하므로 이것을 사용한다.

**Step 2: 커밋**

```bash
git add packages/solid/src/components/data/sheet/sheetUtils.ts
git commit -m "feat(solid): Sheet 순수 유틸 함수 (normalizeHeader, buildHeaderTable)"
```

---

### Task 3: 스타일 상수 (Sheet.styles.ts)

**Files:**

- Create: `packages/solid/src/components/data/sheet/Sheet.styles.ts`

**Step 1: 스타일 파일 작성**

기존 `ListItem.styles.ts` 패턴을 따른다. `clsx`로 의미 단위별 분리.

```typescript
import clsx from "clsx";

export const sheetContainerClass = clsx("relative", "bg-white dark:bg-base-800", "overflow-auto");

export const tableClass = clsx("border-separate border-spacing-0", "table-fixed");

export const thClass = clsx(
  "relative",
  "bg-base-100 dark:bg-base-700",
  "border-r border-b border-base-300 dark:border-base-600",
  "whitespace-nowrap overflow-hidden",
  "p-0",
  "text-left font-semibold",
  "align-middle",
);

export const thContentClass = clsx("px-2 py-1");

export const tdClass = clsx(
  "bg-white dark:bg-base-800",
  "border-r border-b border-base-200 dark:border-base-700",
  "whitespace-nowrap overflow-hidden",
  "p-0",
  "align-top",
);

export const summaryThClass = clsx("bg-warning-50 dark:bg-warning-900/20");

export const insetContainerClass = clsx("border-none", "rounded-none");

export const defaultContainerClass = clsx("border border-base-300 dark:border-base-600", "rounded");
```

**Step 2: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.styles.ts
git commit -m "feat(solid): Sheet Tailwind 스타일 상수"
```

---

### Task 4: SheetColumn 컴포넌트 (SheetColumn.tsx)

**Files:**

- Create: `packages/solid/src/components/data/sheet/SheetColumn.tsx`

**Step 1: SheetColumn 작성**

`children()` resolve 패턴으로 plain object를 반환한다. DOM은 렌더링하지 않는다.

```tsx
import type { JSX } from "solid-js";
import type { SheetColumnDef, SheetColumnProps } from "./types";
import { normalizeHeader } from "./sheetUtils";

export function isSheetColumnDef(value: unknown): value is SheetColumnDef<unknown> {
  return value != null && typeof value === "object" && (value as Record<string, unknown>).__type === "sheet-column";
}

export function SheetColumn<T>(props: SheetColumnProps<T>): JSX.Element {
  return {
    __type: "sheet-column",
    key: props.key,
    header: normalizeHeader(props.header),
    headerContent: props.headerContent,
    headerStyle: props.headerStyle,
    summary: props.summary,
    tooltip: props.tooltip,
    cell: props.children,
    fixed: props.fixed ?? false,
    hidden: props.hidden ?? false,
    collapse: props.collapse ?? false,
    width: props.width,
    disableSorting: props.disableSorting ?? false,
    disableResizing: props.disableResizing ?? false,
  } as unknown as JSX.Element;
}
```

**Step 2: 커밋**

```bash
git add packages/solid/src/components/data/sheet/SheetColumn.tsx
git commit -m "feat(solid): SheetColumn compound component (plain object 반환)"
```

---

### Task 5: Sheet 메인 컴포넌트 (Sheet.tsx)

**Files:**

- Create: `packages/solid/src/components/data/sheet/Sheet.tsx`

**Step 1: Sheet.tsx 작성**

컬럼 수집, 데이터 파이프라인 스텁, 다단계 헤더, 합계 행, 기본 바디 렌더링을 구현한다.

```tsx
import { children, createMemo, For, type JSX, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import type { FlatItem, SheetColumnDef, SheetProps } from "./types";
import { SheetColumn } from "./SheetColumn";
import { isSheetColumnDef } from "./SheetColumn";
import { buildHeaderTable } from "./sheetUtils";
import {
  defaultContainerClass,
  insetContainerClass,
  sheetContainerClass,
  summaryThClass,
  tableClass,
  tdClass,
  thClass,
  thContentClass,
} from "./Sheet.styles";

interface SheetComponent {
  <T>(props: SheetProps<T>): JSX.Element;
  Column: typeof SheetColumn;
}

export const Sheet: SheetComponent = <T,>(props: SheetProps<T>) => {
  const [local] = splitProps(props, [
    "items",
    "trackByFn",
    "key",
    "hideConfigBar",
    "inset",
    "contentStyle",
    "class",
    "children",
  ]);

  // #region Column Collection
  const resolved = children(() => local.children);
  const columnDefs = createMemo(() =>
    (resolved.toArray().filter(isSheetColumnDef) as SheetColumnDef<T>[]).filter((col) => !col.hidden),
  );

  // #region Header
  const headerTable = createMemo(() => buildHeaderTable(columnDefs()));
  const hasSummary = createMemo(() => columnDefs().some((col) => col.summary != null));

  // #region Sorting (스텁 — Plan 2에서 구현)
  const sortedItems = createMemo(() => {
    return local.items ?? [];
  });

  // #region Paging (스텁 — Plan 2에서 구현)
  const pagedItems = createMemo(() => {
    return sortedItems();
  });

  // #region Expanding (스텁 — Plan 4에서 구현)
  const flatItems = createMemo((): FlatItem<T>[] => {
    return pagedItems().map((item, i) => ({
      item,
      index: i,
      depth: 0,
      hasChildren: false,
    }));
  });

  // #region Display
  const displayItems = createMemo(() => flatItems());

  // #region Styles
  const getContainerClassName = () =>
    twMerge(sheetContainerClass, local.inset ? insetContainerClass : defaultContainerClass, local.class);

  return (
    <div data-sheet={local.key} class={getContainerClassName()}>
      <table class={tableClass}>
        <colgroup>
          <For each={columnDefs()}>{(col) => <col style={col.width ? { width: col.width } : undefined} />}</For>
        </colgroup>
        <thead>
          <For each={headerTable()}>
            {(row) => (
              <tr>
                <For each={row}>
                  {(cell) => (
                    <Show when={cell}>
                      {(c) => (
                        <th
                          class={thClass}
                          colspan={c().colspan > 1 ? c().colspan : undefined}
                          rowspan={c().rowspan > 1 ? c().rowspan : undefined}
                        >
                          <div class={thContentClass}>{c().headerContent?.() ?? c().text}</div>
                        </th>
                      )}
                    </Show>
                  )}
                </For>
              </tr>
            )}
          </For>
          <Show when={hasSummary()}>
            <tr>
              <For each={columnDefs()}>
                {(col) => (
                  <th class={twMerge(thClass, summaryThClass)}>
                    <div class={thContentClass}>{col.summary?.()}</div>
                  </th>
                )}
              </For>
            </tr>
          </Show>
        </thead>
        <tbody>
          <For each={displayItems()}>
            {(flat) => (
              <tr>
                <For each={columnDefs()}>
                  {(col) => (
                    <td class={tdClass}>
                      {col.cell({
                        item: flat.item,
                        index: flat.index,
                        depth: flat.depth,
                        edit: false,
                      })}
                    </td>
                  )}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
};

Sheet.Column = SheetColumn;
```

**Step 2: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.tsx
git commit -m "feat(solid): Sheet 메인 컴포넌트 (다단계 헤더, 합계 행, 파이프라인 스텁)"
```

---

### Task 6: index.ts export 추가

**Files:**

- Modify: `packages/solid/src/index.ts`

**Step 1: export 추가**

`// data` 섹션의 `Pagination` 아래에 Sheet 관련 export를 추가한다.

```typescript
// 기존 data 섹션 끝 (Pagination 아래)에 추가:
export * from "./components/data/sheet/Sheet";
export * from "./components/data/sheet/SheetColumn";
export * from "./components/data/sheet/types";
```

**Step 2: 타입체크 실행**

```bash
pnpm typecheck packages/solid
```

Expected: 에러 없이 통과. 에러가 있으면 수정 후 재실행.

**Step 3: 커밋**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): Sheet 컴포넌트 export 추가"
```

---

### Task 7: 컴포넌트 테스트

**Files:**

- Create: `packages/solid/tests/sheet/Sheet.spec.tsx`

**Step 1: 테스트 파일 작성**

`@solidjs/testing-library`로 Sheet 컴포넌트를 렌더링하고 DOM을 검증한다.
테스트 프로젝트: `--project=solid` (Playwright + vite-plugin-solid 환경).

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Sheet } from "../../src/components/data/sheet/Sheet";

interface TestItem {
  name: string;
  age: number;
  email: string;
}

const testData: TestItem[] = [
  { name: "홍길동", age: 30, email: "hong@test.com" },
  { name: "김철수", age: 25, email: "kim@test.com" },
  { name: "이영희", age: 28, email: "lee@test.com" },
];

describe("Sheet", () => {
  it("기본 렌더링: 컬럼 헤더와 데이터 행이 표시된다", () => {
    const { container } = render(() => (
      <Sheet items={testData} key="test">
        <Sheet.Column<TestItem> key="name" header="이름">
          {(ctx) => <div>{ctx.item.name}</div>}
        </Sheet.Column>
        <Sheet.Column<TestItem> key="age" header="나이">
          {(ctx) => <div>{ctx.item.age}</div>}
        </Sheet.Column>
        <Sheet.Column<TestItem> key="email" header="이메일">
          {(ctx) => <div>{ctx.item.email}</div>}
        </Sheet.Column>
      </Sheet>
    ));

    const ths = container.querySelectorAll("thead th");
    expect(ths.length).toBe(3);
    expect(ths[0].textContent).toContain("이름");
    expect(ths[1].textContent).toContain("나이");
    expect(ths[2].textContent).toContain("이메일");

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(3);
  });

  it("다단계 헤더: colspan과 rowspan이 올바르게 적용된다", () => {
    const { container } = render(() => (
      <Sheet items={testData} key="test-multi">
        <Sheet.Column<TestItem> key="name" header={["기본정보", "이름"]}>
          {(ctx) => <div>{ctx.item.name}</div>}
        </Sheet.Column>
        <Sheet.Column<TestItem> key="age" header={["기본정보", "나이"]}>
          {(ctx) => <div>{ctx.item.age}</div>}
        </Sheet.Column>
        <Sheet.Column<TestItem> key="email" header="이메일">
          {(ctx) => <div>{ctx.item.email}</div>}
        </Sheet.Column>
      </Sheet>
    ));

    const headerRows = container.querySelectorAll("thead tr");
    // 2행: 첫 행에 "기본정보"(colspan=2) + "이메일"(rowspan=2), 둘째 행에 "이름" + "나이"
    expect(headerRows.length).toBeGreaterThanOrEqual(2);

    const firstRowThs = headerRows[0].querySelectorAll("th");
    // "기본정보" th는 colspan=2
    const groupTh = Array.from(firstRowThs).find((th) => th.textContent?.includes("기본정보"));
    expect(groupTh).toBeTruthy();
    expect(groupTh!.getAttribute("colspan")).toBe("2");

    // "이메일" th는 rowspan=2
    const emailTh = Array.from(firstRowThs).find((th) => th.textContent?.includes("이메일"));
    expect(emailTh).toBeTruthy();
    expect(emailTh!.getAttribute("rowspan")).toBe("2");
  });

  it("합계 행: summary가 있으면 thead에 합계 행이 표시된다", () => {
    const { container } = render(() => (
      <Sheet items={testData} key="test-summary">
        <Sheet.Column<TestItem> key="name" header="이름">
          {(ctx) => <div>{ctx.item.name}</div>}
        </Sheet.Column>
        <Sheet.Column<TestItem> key="age" header="나이" summary={() => <span>합계: 83</span>}>
          {(ctx) => <div>{ctx.item.age}</div>}
        </Sheet.Column>
      </Sheet>
    ));

    const theadRows = container.querySelectorAll("thead tr");
    // 헤더 1행 + 합계 1행 = 2행
    expect(theadRows.length).toBe(2);

    const summaryRow = theadRows[theadRows.length - 1];
    expect(summaryRow.textContent).toContain("합계: 83");
  });

  it("빈 데이터: tbody가 비어있다", () => {
    const { container } = render(() => (
      <Sheet items={[] as TestItem[]} key="test-empty">
        <Sheet.Column<TestItem> key="name" header="이름">
          {(ctx) => <div>{ctx.item.name}</div>}
        </Sheet.Column>
      </Sheet>
    ));

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(0);

    // 헤더는 여전히 표시
    const ths = container.querySelectorAll("thead th");
    expect(ths.length).toBe(1);
  });

  it("hidden 컬럼은 렌더링되지 않는다", () => {
    const { container } = render(() => (
      <Sheet items={testData} key="test-hidden">
        <Sheet.Column<TestItem> key="name" header="이름">
          {(ctx) => <div>{ctx.item.name}</div>}
        </Sheet.Column>
        <Sheet.Column<TestItem> key="age" header="나이" hidden>
          {(ctx) => <div>{ctx.item.age}</div>}
        </Sheet.Column>
      </Sheet>
    ));

    const ths = container.querySelectorAll("thead th");
    expect(ths.length).toBe(1);
    expect(ths[0].textContent).toContain("이름");
  });
});
```

**Step 2: 테스트 실행**

```bash
pnpm vitest packages/solid/tests/sheet/Sheet.spec.tsx --project=solid --run
```

Expected: 모든 테스트 PASS. 실패 시 Sheet.tsx 또는 sheetUtils.ts를 수정하고 재실행.

**Step 3: 커밋**

```bash
git add packages/solid/tests/sheet/Sheet.spec.tsx
git commit -m "test(solid): Sheet 컴포넌트 테스트 (기본, 다단계 헤더, 합계, 빈 데이터, hidden)"
```

---

### Task 8: 데모 페이지

**Files:**

- Create: `packages/solid-demo/src/pages/data/SheetPage.tsx`
- Modify: `packages/solid-demo/src/main.tsx`
- Modify: `packages/solid-demo/src/pages/Home.tsx`

**Step 1: SheetPage.tsx 작성**

기존 `TablePage.tsx` 패턴을 따른다. `TopbarContainer` + `Topbar` + 스크롤 영역 + 섹션 구조.

```tsx
import { Sheet, Topbar, TopbarContainer } from "@simplysm/solid";

interface User {
  name: string;
  age: number;
  email: string;
  salary: number;
}

const users: User[] = [
  { name: "홍길동", age: 30, email: "hong@example.com", salary: 5000 },
  { name: "김철수", age: 25, email: "kim@example.com", salary: 4200 },
  { name: "이영희", age: 28, email: "lee@example.com", salary: 4800 },
  { name: "박민수", age: 35, email: "park@example.com", salary: 5500 },
  { name: "최지영", age: 22, email: "choi@example.com", salary: 3800 },
];

export default function SheetPage() {
  const totalSalary = () => users.reduce((sum, u) => sum + u.salary, 0);

  return (
    <TopbarContainer>
      <Topbar>
        <h1 class="m-0 text-base">Sheet</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* 기본 테이블 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">기본 테이블</h2>
            <Sheet items={users} key="basic">
              <Sheet.Column<User> key="name" header="이름" width="120px">
                {(ctx) => <div class="px-2 py-1">{ctx.item.name}</div>}
              </Sheet.Column>
              <Sheet.Column<User> key="age" header="나이" width="80px">
                {(ctx) => <div class="px-2 py-1">{ctx.item.age}</div>}
              </Sheet.Column>
              <Sheet.Column<User> key="email" header="이메일" width="200px">
                {(ctx) => <div class="px-2 py-1">{ctx.item.email}</div>}
              </Sheet.Column>
            </Sheet>
          </section>

          {/* 다단계 헤더 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">다단계 헤더</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              header에 배열을 전달하면 다단계 헤더가 생성됩니다. 같은 그룹명은 자동으로 병합됩니다.
            </p>
            <Sheet items={users} key="multi-header">
              <Sheet.Column<User> key="name" header={["기본정보", "이름"]} width="120px">
                {(ctx) => <div class="px-2 py-1">{ctx.item.name}</div>}
              </Sheet.Column>
              <Sheet.Column<User> key="age" header={["기본정보", "나이"]} width="80px">
                {(ctx) => <div class="px-2 py-1">{ctx.item.age}</div>}
              </Sheet.Column>
              <Sheet.Column<User> key="email" header={["연락처", "이메일"]} width="200px">
                {(ctx) => <div class="px-2 py-1">{ctx.item.email}</div>}
              </Sheet.Column>
              <Sheet.Column<User> key="salary" header="급여" width="120px">
                {(ctx) => <div class="px-2 py-1 text-right">{ctx.item.salary.toLocaleString()}원</div>}
              </Sheet.Column>
            </Sheet>
          </section>

          {/* 합계 행 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">합계 행</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              summary prop으로 합계 행을 추가합니다. thead 내에 배치되어 스크롤 시 상단에 고정됩니다.
            </p>
            <Sheet items={users} key="summary">
              <Sheet.Column<User> key="name" header="이름" width="120px">
                {(ctx) => <div class="px-2 py-1">{ctx.item.name}</div>}
              </Sheet.Column>
              <Sheet.Column<User>
                key="salary"
                header="급여"
                width="150px"
                summary={() => <span class="font-bold">합계: {totalSalary().toLocaleString()}원</span>}
              >
                {(ctx) => <div class="px-2 py-1 text-right">{ctx.item.salary.toLocaleString()}원</div>}
              </Sheet.Column>
            </Sheet>
          </section>
        </div>
      </div>
    </TopbarContainer>
  );
}
```

**Step 2: main.tsx 라우팅 추가**

`/home/data/pagination` 라우트 아래에 추가:

```tsx
<Route path="/home/data/sheet" component={lazy(() => import("./pages/data/SheetPage"))} />
```

**Step 3: Home.tsx 메뉴 추가**

`Data` 카테고리의 `children` 배열에 추가:

```typescript
{ title: "Sheet", href: "/home/data/sheet" },
```

**Step 4: 커밋**

```bash
git add packages/solid-demo/src/pages/data/SheetPage.tsx packages/solid-demo/src/main.tsx packages/solid-demo/src/pages/Home.tsx
git commit -m "feat(solid-demo): Sheet 데모 페이지 (기본, 다단계 헤더, 합계 행)"
```

---

### Task 9: 타입체크 + 린트 검증

**Step 1: 타입체크**

```bash
pnpm typecheck packages/solid
```

Expected: 에러 없이 통과. 에러 있으면 수정.

**Step 2: 린트**

```bash
pnpm lint packages/solid
```

Expected: 에러 없이 통과. 에러 있으면 `pnpm lint --fix packages/solid` 후 잔여 에러 수동 수정.

**Step 3: 데모 린트**

```bash
pnpm lint packages/solid-demo
```

Expected: 에러 없이 통과.

**Step 4: 수정 사항 있으면 커밋**

```bash
git add -A
git commit -m "fix(solid): 타입체크 및 린트 수정"
```

---

### Task 10: 수동 검증 (Playwright MCP)

**Step 1: dev 서버 시작**

```bash
pnpm dev
```

출력에서 포트 번호를 확인한다 (보통 `http://localhost:40081`이지만 달라질 수 있음).

**Step 2: Playwright MCP로 검증**

1. 데모 페이지 열기: `http://localhost:{port}/#/home/data/sheet`
2. **기본 테이블**: 3개 컬럼 × 5개 행이 올바르게 표시되는지 확인
3. **다단계 헤더**: "기본정보"가 2개 컬럼에 걸쳐 병합(colspan)되어 있는지, "급여"가 rowspan으로 확장되어 있는지 확인
4. **합계 행**: "합계: 23,300원"이 thead 내에 표시되는지 확인
5. 스크린샷 저장: `.playwright-mcp/` 디렉토리

**Step 3: dev 서버 종료**

검증 완료 후 dev 서버 프로세스를 종료한다.
