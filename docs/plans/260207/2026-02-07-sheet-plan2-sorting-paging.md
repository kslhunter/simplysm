# Sheet Plan 2: 정렬 + 페이지네이션 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Sheet 컴포넌트에 정렬(단일/다중, 자동정렬) + 페이지네이션(클라이언트/서버 사이드) 기능을 추가한다.

**Architecture:** `sheetUtils.ts`에 순수 함수 `applySorting`을 추가하고, `Sheet.tsx`에서 `createPropSignal`로 정렬/페이지 상태를 양방향 바인딩한다. 헤더 클릭으로 정렬 토글, 상단 툴바에 `Pagination` 컴포넌트를 자동 배치한다.

**Tech Stack:** SolidJS, createPropSignal, Tailwind CSS, @tabler/icons-solidjs, Vitest + @solidjs/testing-library

**참조 문서:** `docs/plans/2026-02-07-sheet-migration-design.md` (섹션 4, 5)

**작업 디렉토리:** `/home/kslhunter/projects/simplysm/.worktrees/sheet-sorting-paging`

---

## Task 1: `applySorting` 유틸 함수 테스트 작성

**Files:**

- Modify: `packages/solid/tests/sheet/Sheet.spec.tsx` (테스트 추가)

**Step 1: 테스트 작성**

`Sheet.spec.tsx` 하단에 `applySorting` 테스트 블록을 추가한다.
`applySorting`은 아직 미구현이므로 이 단계에서는 import만 준비한다.

```tsx
// Sheet.spec.tsx 하단에 추가

import { applySorting } from "../../src/components/data/sheet/sheetUtils";

describe("applySorting", () => {
  interface Item {
    name: string;
    age: number;
  }

  const items: Item[] = [
    { name: "다", age: 30 },
    { name: "가", age: 25 },
    { name: "나", age: 28 },
  ];

  it("빈 sorts면 원본 순서 유지", () => {
    const result = applySorting(items, []);
    expect(result.map((i) => i.name)).toEqual(["다", "가", "나"]);
  });

  it("단일 오름차순 정렬", () => {
    const result = applySorting(items, [{ key: "name", desc: false }]);
    expect(result.map((i) => i.name)).toEqual(["가", "나", "다"]);
  });

  it("단일 내림차순 정렬", () => {
    const result = applySorting(items, [{ key: "age", desc: true }]);
    expect(result.map((i) => i.age)).toEqual([30, 28, 25]);
  });

  it("다중 정렬: 첫 번째 키 우선, 동일 값은 두 번째 키로", () => {
    const data: Item[] = [
      { name: "가", age: 30 },
      { name: "나", age: 25 },
      { name: "가", age: 20 },
    ];
    const result = applySorting(data, [
      { key: "name", desc: false },
      { key: "age", desc: false },
    ]);
    expect(result).toEqual([
      { name: "가", age: 20 },
      { name: "가", age: 30 },
      { name: "나", age: 25 },
    ]);
  });

  it("원본 배열을 변경하지 않는다", () => {
    const original = [...items];
    applySorting(items, [{ key: "name", desc: false }]);
    expect(items).toEqual(original);
  });
});
```

**Step 2: 테스트 실패 확인**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/sheet-sorting-paging
pnpm vitest packages/solid/tests/sheet/Sheet.spec.tsx --project=solid --run
```

Expected: FAIL — `applySorting` is not exported from sheetUtils

---

## Task 2: `applySorting` 유틸 함수 구현

**Files:**

- Modify: `packages/solid/src/components/data/sheet/sheetUtils.ts`

**Step 1: 구현**

`sheetUtils.ts` 하단에 추가한다. `@simplysm/core-common`의 `objGetChainValue`와 배열 확장 메서드 `orderBy`/`orderByDesc`를 사용한다.

```tsx
// sheetUtils.ts 상단 import 추가
import type { HeaderDef, SheetColumnDef, SortingDef } from "./types";
import { objGetChainValue } from "@simplysm/core-common";

// 기존 코드 유지...

// 하단에 추가
export function applySorting<T>(items: T[], sorts: SortingDef[]): T[] {
  if (sorts.length === 0) return items;

  let result = [...items];
  for (const sort of [...sorts].reverse()) {
    const selector = (item: T) => objGetChainValue(item, sort.key) as string | number | undefined;
    result = sort.desc ? result.orderByDesc(selector) : result.orderBy(selector);
  }
  return result;
}
```

> **주의:** `orderBy`는 방향 파라미터를 받지 않는다. 내림차순은 `orderByDesc()`를 사용한다.
> `@simplysm/core-common`을 import하면 배열 확장 메서드(`orderBy`, `orderByDesc`)가 자동 활성화된다.
> 단, `sheetUtils.ts`는 타입만 사용하고 실제 확장 메서드는 런타임에 이미 로드되어 있으므로, 확장 메서드 등록을 위한 별도 import는 불필요하다. `objGetChainValue` import만 추가하면 된다.

**Step 2: 테스트 통과 확인**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/sheet-sorting-paging
pnpm vitest packages/solid/tests/sheet/Sheet.spec.tsx --project=solid --run
```

Expected: 모든 `applySorting` 테스트 PASS

**Step 3: 타입체크**

```bash
pnpm typecheck packages/solid
```

Expected: 에러 없음

**Step 4: 커밋**

```bash
git add packages/solid/src/components/data/sheet/sheetUtils.ts packages/solid/tests/sheet/Sheet.spec.tsx
git commit -m "feat(solid): Sheet applySorting 유틸 함수 및 테스트"
```

---

## Task 3: Sheet.styles.ts에 정렬/툴바 스타일 추가

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.styles.ts`

**Step 1: 스타일 상수 추가**

```tsx
// Sheet.styles.ts 하단에 추가

// 정렬 가능 헤더 — 클릭 가능 표시
export const sortableThClass = clsx("cursor-pointer", "hover:underline");

// 정렬 아이콘 영역
export const sortIconClass = clsx("px-1 py-0.5", "bg-base-100 dark:bg-base-700");

// 상단 툴바 (설정 버튼 + 페이지네이션)
export const toolbarClass = clsx(
  "flex items-center gap-2",
  "px-2 py-1",
  "bg-base-50 dark:bg-base-800",
  "border-b border-base-300 dark:border-base-600",
);
```

**Step 2: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.styles.ts
git commit -m "feat(solid): Sheet 정렬/툴바 스타일 상수 추가"
```

---

## Task 4: Sheet.tsx — #region Sorting 구현

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx`

이 Task에서는 정렬 상태 관리, 헤더 클릭 토글, 정렬 아이콘을 구현한다. 페이지네이션은 Task 5에서 한다.

**Step 1: import 추가**

`Sheet.tsx` 상단 import를 수정한다.

기존:

```tsx
import { children, createMemo, For, type JSX, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import type { FlatItem, SheetColumnDef, SheetProps } from "./types";
import { SheetColumn, isSheetColumnDef } from "./SheetColumn";
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
```

변경:

```tsx
import { children, createMemo, For, type JSX, Show, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconArrowsSort, IconSortAscending, IconSortDescending } from "@tabler/icons-solidjs";
import type { FlatItem, SheetColumnDef, SheetProps, SortingDef } from "./types";
import { SheetColumn, isSheetColumnDef } from "./SheetColumn";
import { applySorting, buildHeaderTable } from "./sheetUtils";
import { createPropSignal } from "../../../utils/createPropSignal";
import { Icon } from "../../display/Icon";
import {
  defaultContainerClass,
  insetContainerClass,
  sheetContainerClass,
  sortableThClass,
  sortIconClass,
  summaryThClass,
  tableClass,
  tdClass,
  thClass,
  thContentClass,
} from "./Sheet.styles";
```

**Step 2: splitProps 수정**

기존:

```tsx
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
```

변경:

```tsx
const [local] = splitProps(props, [
  "items",
  "trackByFn",
  "key",
  "hideConfigBar",
  "inset",
  "contentStyle",
  "sorts",
  "onSortsChange",
  "useAutoSort",
  "class",
  "children",
]);
```

**Step 3: #region Sorting 구현**

기존 스텁:

```tsx
// #region Sorting (스텁 — Plan 2에서 구현)
const sortedItems = createMemo(() => {
  return local.items ?? [];
});
```

변경:

```tsx
// #region Sorting
const [sorts, setSorts] = createPropSignal({
  value: () => local.sorts ?? [],
  onChange: () => local.onSortsChange,
});

function toggleSort(key: string, multiple: boolean): void {
  const current = sorts();
  const existing = current.find((s) => s.key === key);

  if (existing) {
    if (!existing.desc) {
      // asc → desc
      const updated = current.map((s) => (s.key === key ? { ...s, desc: true } : s));
      setSorts(multiple ? updated : [{ key, desc: true }]);
    } else {
      // desc → 제거
      const updated = current.filter((s) => s.key !== key);
      setSorts(multiple ? updated : []);
    }
  } else {
    // 없음 → asc 추가
    const newSort: SortingDef = { key, desc: false };
    setSorts(multiple ? [...current, newSort] : [newSort]);
  }
}

function getSortDef(key: string): SortingDef | undefined {
  return sorts().find((s) => s.key === key);
}

function getSortIndex(key: string): number | undefined {
  if (sorts().length <= 1) return undefined;
  const idx = sorts().findIndex((s) => s.key === key);
  return idx >= 0 ? idx + 1 : undefined;
}

const sortedItems = createMemo(() => {
  if (!local.useAutoSort) return local.items ?? [];
  return applySorting(local.items ?? [], sorts());
});
```

**Step 4: 헤더 렌더링 수정**

기존 헤더 셀 렌더링 (`<thead>` 내부):

```tsx
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
                  <div class={thContentClass}>
                    {c().headerContent?.() ?? c().text}
                  </div>
                </th>
              )}
            </Show>
          )}
        </For>
      </tr>
    )}
  </For>
```

변경:

```tsx
<thead>
  <For each={headerTable()}>
    {(row) => (
      <tr>
        <For each={row}>
          {(cell) => (
            <Show when={cell}>
              {(c) => {
                const isSortable = () =>
                  c().isLastRow && c().colIndex != null && !columnDefs()[c().colIndex!].disableSorting;
                const colKey = () =>
                  c().colIndex != null ? columnDefs()[c().colIndex!].key : undefined;

                return (
                  <th
                    class={twMerge(thClass, isSortable() ? sortableThClass : undefined)}
                    classList={{ help: c().isLastRow && c().colIndex != null && !!columnDefs()[c().colIndex!].tooltip }}
                    colspan={c().colspan > 1 ? c().colspan : undefined}
                    rowspan={c().rowspan > 1 ? c().rowspan : undefined}
                    title={c().isLastRow && c().colIndex != null
                      ? (columnDefs()[c().colIndex!].tooltip ?? c().text)
                      : c().text}
                    onClick={(e) => {
                      if (!isSortable()) return;
                      const key = colKey();
                      if (key == null) return;
                      toggleSort(key, e.shiftKey || e.ctrlKey);
                    }}
                  >
                    <div class={clsx("flex items-center", thContentClass)}>
                      <div class="flex-1" style={c().style != null ? { style: c().style } : undefined}>
                        {c().headerContent?.() ?? c().text}
                      </div>
                      <Show when={isSortable() && colKey()}>
                        {(key) => {
                          const sortDef = () => getSortDef(key());
                          const sortIndex = () => getSortIndex(key());
                          return (
                            <div class={sortIconClass}>
                              <Show when={sortDef()?.desc === false}>
                                <Icon icon={IconSortAscending} size="1em" />
                              </Show>
                              <Show when={sortDef()?.desc === true}>
                                <Icon icon={IconSortDescending} size="1em" />
                              </Show>
                              <Show when={sortDef() == null}>
                                <Icon icon={IconArrowsSort} size="1em" class="opacity-30" />
                              </Show>
                              <Show when={sortIndex()}>
                                {(idx) => <sub>{idx()}</sub>}
                              </Show>
                            </div>
                          );
                        }}
                      </Show>
                    </div>
                  </th>
                );
              }}
            </Show>
          )}
        </For>
      </tr>
    )}
  </For>
```

**Step 5: 타입체크 + 린트**

```bash
pnpm typecheck packages/solid
pnpm lint packages/solid/src/components/data/sheet/Sheet.tsx
```

Expected: 에러 없음

**Step 6: 기존 테스트 통과 확인**

```bash
pnpm vitest packages/solid/tests/sheet/Sheet.spec.tsx --project=solid --run
```

Expected: 기존 테스트 + applySorting 테스트 모두 PASS

**Step 7: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.tsx
git commit -m "feat(solid): Sheet 정렬 기능 (#region Sorting)"
```

---

## Task 5: Sheet.tsx — #region Paging + 상단 툴바 구현

**Files:**

- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx`

**Step 1: splitProps에 페이지네이션 props 추가**

splitProps 배열에 추가:

```tsx
"currentPage",
"onCurrentPageChange",
"totalPageCount",
"itemsPerPage",
"displayPageCount",
```

**Step 2: import에 Pagination 추가**

```tsx
import { Pagination } from "../Pagination";
```

그리고 Sheet.styles.ts에서 `toolbarClass` import 추가.

**Step 3: #region Paging 구현**

기존 스텁:

```tsx
// #region Paging (스텁 — Plan 2에서 구현)
const pagedItems = createMemo(() => {
  return sortedItems();
});
```

변경:

```tsx
// #region Paging
const [currentPage, setCurrentPage] = createPropSignal({
  value: () => local.currentPage ?? 0,
  onChange: () => local.onCurrentPageChange,
});

const effectivePageCount = createMemo(() => {
  const ipp = local.itemsPerPage;
  if (ipp != null && ipp !== 0 && (local.items ?? []).length > 0) {
    return Math.ceil((local.items ?? []).length / ipp);
  }
  return local.totalPageCount ?? 0;
});

const pagedItems = createMemo(() => {
  const ipp = local.itemsPerPage;
  if (ipp == null || ipp === 0) return sortedItems();
  if ((local.items ?? []).length <= 0) return sortedItems();

  const page = currentPage();
  return sortedItems().slice(page * ipp, (page + 1) * ipp);
});
```

**Step 4: 렌더링에 상단 툴바 추가**

기존 return문의 최상위 div:

```tsx
return (
  <div data-sheet={local.key} class={getContainerClassName()}>
    <table class={tableClass}>
```

변경: `<table>` 위에 툴바를 추가하고, 테이블을 스크롤 가능한 영역으로 감싼다.

```tsx
return (
  <div
    data-sheet={local.key}
    class={twMerge("flex flex-col", local.inset ? insetContainerClass : defaultContainerClass, local.class)}
  >
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
    <div class={sheetContainerClass} style={local.contentStyle}>
      <table class={tableClass}>{/* ... 기존 colgroup, thead, tbody ... */}</table>
    </div>
  </div>
);
```

> **구조 변경 설명:**
>
> - 최상위 div: `flex flex-col` + 외곽 테두리/라운딩 (기존 `sheetContainerClass`에서 분리)
> - 툴바: `effectivePageCount > 1`일 때만 표시
> - 스크롤 영역: `sheetContainerClass` (overflow-auto, 배경색)
> - `sheetContainerClass`에서 테두리/라운딩 관련 클래스는 이미 별도(`defaultContainerClass`, `insetContainerClass`)이므로 충돌 없음

**Step 5: `sheetContainerClass` 조정 확인**

현재 `sheetContainerClass`는 `relative bg-white dark:bg-base-800 overflow-auto`이므로 스크롤 영역으로 적합하다.
최상위 div에서는 `sheetContainerClass`를 빼고 flex-col + 외곽 스타일만 적용한다.

**Step 6: 타입체크 + 린트**

```bash
pnpm typecheck packages/solid
pnpm lint packages/solid/src/components/data/sheet/Sheet.tsx
```

Expected: 에러 없음

**Step 7: 기존 테스트 통과 확인**

```bash
pnpm vitest packages/solid/tests/sheet/Sheet.spec.tsx --project=solid --run
```

Expected: 모든 테스트 PASS (기존 테스트는 페이지네이션 미사용이므로 영향 없음)

**Step 8: 커밋**

```bash
git add packages/solid/src/components/data/sheet/Sheet.tsx packages/solid/src/components/data/sheet/Sheet.styles.ts
git commit -m "feat(solid): Sheet 페이지네이션 + 상단 툴바 (#region Paging)"
```

---

## Task 6: 정렬 + 페이지네이션 컴포넌트 테스트

**Files:**

- Modify: `packages/solid/tests/sheet/Sheet.spec.tsx`

**Step 1: 정렬 렌더링 테스트 추가**

```tsx
import { createSignal } from "solid-js";
import type { SortingDef } from "../../src/components/data/sheet/types";

// describe("Sheet") 블록 내에 추가

it("정렬: 헤더 클릭 시 onSortsChange가 호출된다", () => {
  let capturedSorts: SortingDef[] = [];
  const { container } = render(() => (
    <Sheet
      items={testData}
      key="test-sort"
      sorts={[]}
      onSortsChange={(s) => {
        capturedSorts = s;
      }}
    >
      <Sheet.Column<TestItem> key="name" header="이름">
        {(ctx) => <div>{ctx.item.name}</div>}
      </Sheet.Column>
      <Sheet.Column<TestItem> key="age" header="나이">
        {(ctx) => <div>{ctx.item.age}</div>}
      </Sheet.Column>
    </Sheet>
  ));

  // "이름" 헤더 클릭
  const ths = container.querySelectorAll("thead th");
  (ths[0] as HTMLElement).click();
  expect(capturedSorts).toEqual([{ key: "name", desc: false }]);
});

it("정렬: disableSorting 컬럼은 클릭해도 정렬되지 않는다", () => {
  let capturedSorts: SortingDef[] = [];
  const { container } = render(() => (
    <Sheet
      items={testData}
      key="test-no-sort"
      sorts={[]}
      onSortsChange={(s) => {
        capturedSorts = s;
      }}
    >
      <Sheet.Column<TestItem> key="name" header="이름" disableSorting>
        {(ctx) => <div>{ctx.item.name}</div>}
      </Sheet.Column>
    </Sheet>
  ));

  const th = container.querySelector("thead th") as HTMLElement;
  th.click();
  expect(capturedSorts).toEqual([]);
});

it("자동정렬: useAutoSort가 true면 데이터가 정렬된다", () => {
  const { container } = render(() => (
    <Sheet items={testData} key="test-auto-sort" sorts={[{ key: "name", desc: false }]} useAutoSort>
      <Sheet.Column<TestItem> key="name" header="이름">
        {(ctx) => <div class="name">{ctx.item.name}</div>}
      </Sheet.Column>
    </Sheet>
  ));

  const cells = container.querySelectorAll("tbody .name");
  const names = Array.from(cells).map((c) => c.textContent);
  expect(names).toEqual(["김철수", "이영희", "홍길동"]);
});
```

**Step 2: 페이지네이션 테스트 추가**

```tsx
it("페이지네이션: itemsPerPage로 데이터가 잘린다", () => {
  const { container } = render(() => (
    <Sheet items={testData} key="test-paging" itemsPerPage={2} currentPage={0}>
      <Sheet.Column<TestItem> key="name" header="이름">
        {(ctx) => <div>{ctx.item.name}</div>}
      </Sheet.Column>
    </Sheet>
  ));

  const rows = container.querySelectorAll("tbody tr");
  expect(rows.length).toBe(2);
});

it("페이지네이션: 2페이지 이상일 때 Pagination이 표시된다", () => {
  const { container } = render(() => (
    <Sheet items={testData} key="test-paging-nav" itemsPerPage={2} currentPage={0}>
      <Sheet.Column<TestItem> key="name" header="이름">
        {(ctx) => <div>{ctx.item.name}</div>}
      </Sheet.Column>
    </Sheet>
  ));

  const pagination = container.querySelector("[data-pagination]");
  expect(pagination).toBeTruthy();
});

it("페이지네이션: 1페이지면 Pagination이 표시되지 않는다", () => {
  const { container } = render(() => (
    <Sheet items={testData} key="test-no-paging" itemsPerPage={10} currentPage={0}>
      <Sheet.Column<TestItem> key="name" header="이름">
        {(ctx) => <div>{ctx.item.name}</div>}
      </Sheet.Column>
    </Sheet>
  ));

  const pagination = container.querySelector("[data-pagination]");
  expect(pagination).toBeFalsy();
});
```

**Step 3: 테스트 실행**

```bash
pnpm vitest packages/solid/tests/sheet/Sheet.spec.tsx --project=solid --run
```

Expected: 모든 테스트 PASS

**Step 4: 커밋**

```bash
git add packages/solid/tests/sheet/Sheet.spec.tsx
git commit -m "test(solid): Sheet 정렬/페이지네이션 컴포넌트 테스트"
```

---

## Task 7: 데모 페이지 — 정렬 + 페이지네이션 예제

**Files:**

- Modify: `packages/solid-demo/src/pages/data/SheetPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/SheetFullPage.tsx`

**Step 1: SheetPage.tsx에 정렬 데모 섹션 추가**

기존 "합계 행" 섹션 아래에 추가한다.

```tsx
// SheetPage.tsx 상단 import 수정
import { createSignal } from "solid-js";
import { Sheet, Topbar, TopbarContainer, type SortingDef } from "@simplysm/solid";

// 컴포넌트 내부, return 이전에 시그널 추가
const [sorts, setSorts] = createSignal<SortingDef[]>([]);
const [page, setPage] = createSignal(0);

// "합계 행" 섹션 아래에 추가

{
  /* 정렬 */
}
<section>
  <h2 class="mb-4 text-xl font-semibold">정렬</h2>
  <p class="mb-4 text-sm text-base-600 dark:text-base-400">
    헤더 클릭으로 정렬 토글. Shift+Click으로 다중 정렬. useAutoSort로 자동 정렬 적용.
  </p>
  <Sheet items={users} key="sorting" sorts={sorts()} onSortsChange={setSorts} useAutoSort>
    <Sheet.Column<User> key="name" header="이름" width="120px">
      {(ctx) => <div class="px-2 py-1">{ctx.item.name}</div>}
    </Sheet.Column>
    <Sheet.Column<User> key="age" header="나이" width="80px">
      {(ctx) => <div class="px-2 py-1">{ctx.item.age}</div>}
    </Sheet.Column>
    <Sheet.Column<User> key="salary" header="급여" width="120px">
      {(ctx) => <div class="px-2 py-1 text-right">{ctx.item.salary.toLocaleString()}원</div>}
    </Sheet.Column>
    <Sheet.Column<User> key="email" header="이메일 (정렬 불가)" width="200px" disableSorting>
      {(ctx) => <div class="px-2 py-1">{ctx.item.email}</div>}
    </Sheet.Column>
  </Sheet>
</section>;

{
  /* 페이지네이션 */
}
<section>
  <h2 class="mb-4 text-xl font-semibold">페이지네이션</h2>
  <p class="mb-4 text-sm text-base-600 dark:text-base-400">
    itemsPerPage를 설정하면 자동으로 페이지네이션이 표시됩니다.
  </p>
  <Sheet items={users} key="paging" itemsPerPage={2} currentPage={page()} onCurrentPageChange={setPage}>
    <Sheet.Column<User> key="name" header="이름" width="120px">
      {(ctx) => <div class="px-2 py-1">{ctx.item.name}</div>}
    </Sheet.Column>
    <Sheet.Column<User> key="age" header="나이" width="80px">
      {(ctx) => <div class="px-2 py-1">{ctx.item.age}</div>}
    </Sheet.Column>
    <Sheet.Column<User> key="salary" header="급여" width="120px">
      {(ctx) => <div class="px-2 py-1 text-right">{ctx.item.salary.toLocaleString()}원</div>}
    </Sheet.Column>
  </Sheet>
</section>;
```

**Step 2: SheetFullPage.tsx에 정렬 + 페이지네이션 적용**

```tsx
// SheetFullPage.tsx 상단 import 수정
import { createSignal } from "solid-js";
import { Sheet, Topbar, TopbarContainer, type SortingDef } from "@simplysm/solid";

// 컴포넌트 내부에 시그널 추가
const [sorts, setSorts] = createSignal<SortingDef[]>([]);
const [page, setPage] = createSignal(0);

// <Sheet> props에 추가
<Sheet
  items={employees}
  key="full"
  class="h-full"
  inset
  sorts={sorts()}
  onSortsChange={setSorts}
  useAutoSort
  itemsPerPage={20}
  currentPage={page()}
  onCurrentPageChange={setPage}
>
```

**Step 3: 타입체크**

```bash
pnpm typecheck packages/solid-demo
```

Expected: 에러 없음

**Step 4: 커밋**

```bash
git add packages/solid-demo/src/pages/data/SheetPage.tsx packages/solid-demo/src/pages/data/SheetFullPage.tsx
git commit -m "feat(solid-demo): Sheet 정렬/페이지네이션 데모 추가"
```

---

## Task 8: 수동 검증 (dev 서버)

**Step 1: dev 서버 실행**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/sheet-sorting-paging
pnpm dev
```

출력에서 `localhost:XXXXX` 주소를 확인한다.

**Step 2: Playwright MCP로 수동 검증**

브라우저로 데모 페이지를 열고 다음 항목을 확인한다:

1. **정렬 데모 (SheetPage)**
   - 이름 헤더 클릭 → 오름차순 정렬, 아이콘 변경
   - 다시 클릭 → 내림차순, 아이콘 변경
   - 다시 클릭 → 정렬 해제, 기본 아이콘(반투명)
   - Shift+Click으로 두 번째 컬럼 추가 → 다중 정렬, 순서 번호 표시
   - 이메일 컬럼(disableSorting) → 클릭해도 반응 없음, 아이콘 없음

2. **페이지네이션 데모 (SheetPage)**
   - 5건 / 2건씩 → 3페이지, 상단에 페이지네이션 표시
   - 페이지 버튼 클릭 → 데이터 변경

3. **SheetFullPage**
   - 200건 / 20건씩 → 10페이지
   - 정렬 + 페이지네이션 동시 동작 확인
   - 정렬 후 페이지 변경 시 데이터 일관성 확인

**Step 3: 문제 발견 시 수정 후 재검증**

---

## 주의사항

- `@simplysm/core-common`의 `orderBy`/`orderByDesc`는 방향 파라미터를 받지 않는다. 별도 메서드로 분리되어 있다.
- `objGetChainValue`는 `@simplysm/core-common`에서 직접 export되는 독립 함수이다 (`ObjectUtils.getChainValue` 아님).
- `Pagination` 컴포넌트의 `page`는 0-indexed이다.
- Sheet의 최상위 구조가 변경된다: 단일 div → flex-col div (툴바 + 스크롤 영역).
- 기존 테스트가 최상위 구조 변경으로 깨질 수 있다 — `container.querySelector("thead th")` 등은 중첩 깊이와 무관하므로 괜찮다.
