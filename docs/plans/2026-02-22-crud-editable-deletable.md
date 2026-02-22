# CrudDetail/CrudSheet: editable/deletable Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** CrudDetail에 `deletable`, CrudSheet에 `itemEditable`/`itemDeletable` prop을 추가하고, 기존 `canEdit`을 `editable`로 rename한다.

**Architecture:** CrudDetail은 단일 아이템이므로 `deletable?: () => boolean`, CrudSheet는 행 단위이므로 `itemEditable/itemDeletable?: (item) => boolean` 시그니처를 사용한다. 미지정 시 기본값은 `true`(하위 호환).

**Tech Stack:** SolidJS, TypeScript, Vitest

---

### Task 1: CrudDetail — `canEdit` → `editable` rename + `deletable` 추가

**Files:**
- Modify: `packages/solid/src/components/data/crud-detail/types.ts`
- Modify: `packages/solid/src/components/data/crud-detail/CrudDetail.tsx`
- Modify: `packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx`

**Step 1: Write the failing tests**

`packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx` — 기존 `canEdit` 테스트를 `editable`로 rename하고, `deletable` 테스트를 추가:

```typescript
// 기존 테스트 rename: "canEdit=false" → "editable=false"
it("editable=false 시 toolbar이 표시되지 않는다", async () => {
  const { container } = render(() => (
    <TestWrapper>
      <CrudDetail<TestData>
        load={() =>
          Promise.resolve({
            data: { id: 1, name: "홍길동" },
            info: { isNew: false, isDeleted: false },
          })
        }
        submit={() => Promise.resolve(true)}
        editable={() => false}
      >
        {(ctx) => <div>{ctx.data.name}</div>}
      </CrudDetail>
    </TestWrapper>
  ));

  await new Promise((r) => setTimeout(r, 100));
  expect(container.textContent).not.toContain("저장");
  expect(container.textContent).not.toContain("새로고침");
});

// 새 테스트 추가
it("deletable=false 시 toggleDelete 제공해도 삭제 버튼이 표시되지 않는다", async () => {
  const { container } = render(() => (
    <TestWrapper>
      <CrudDetail<TestData>
        load={() =>
          Promise.resolve({
            data: { id: 1, name: "홍길동" },
            info: { isNew: false, isDeleted: false },
          })
        }
        toggleDelete={() => Promise.resolve(true)}
        deletable={() => false}
      >
        {(ctx) => <div>{ctx.data.name}</div>}
      </CrudDetail>
    </TestWrapper>
  ));

  await new Promise((r) => setTimeout(r, 100));
  expect(container.textContent).not.toContain("삭제");
  expect(container.textContent).not.toContain("복구");
});

it("deletable 미지정 시 toggleDelete 있으면 삭제 버튼 표시된다", async () => {
  const { container } = render(() => (
    <TestWrapper>
      <CrudDetail<TestData>
        load={() =>
          Promise.resolve({
            data: { id: 1, name: "홍길동" },
            info: { isNew: false, isDeleted: false },
          })
        }
        toggleDelete={() => Promise.resolve(true)}
      >
        {(ctx) => <div>{ctx.data.name}</div>}
      </CrudDetail>
    </TestWrapper>
  ));

  await new Promise((r) => setTimeout(r, 100));
  expect(container.textContent).toContain("삭제");
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx --project=solid --run`
Expected: FAIL — `editable` prop 미존재, `deletable` prop 미존재

**Step 3: Update types.ts**

`packages/solid/src/components/data/crud-detail/types.ts` — `canEdit` → `editable`, `deletable` 추가:

```typescript
export interface CrudDetailProps<TData extends object> {
  load: () => Promise<{ data: TData; info: CrudDetailInfo }>;
  children: (ctx: CrudDetailContext<TData>) => JSX.Element;

  submit?: (data: TData) => Promise<boolean | undefined>;
  toggleDelete?: (del: boolean) => Promise<boolean | undefined>;
  editable?: () => boolean;    // renamed from canEdit
  deletable?: () => boolean;   // NEW

  data?: TData;
  onDataChange?: (data: TData) => void;

  class?: string;
}
```

**Step 4: Update CrudDetail.tsx**

4a. `splitProps`에서 `canEdit` → `editable`, `deletable` 추가:

```typescript
// 기존
"canEdit",
// 변경
"editable",
"deletable",
```

4b. 내부 `canEdit` 헬퍼를 `editable` 기반으로 변경:

```typescript
// 기존
const canEdit = () => local.canEdit?.() ?? true;
// 변경
const canEdit = () => local.editable?.() ?? true;
```

4c. 삭제/복구 버튼 조건 변경 — 페이지 모드 toolbar (line 276 부근):

```typescript
// 기존
<Show when={local.toggleDelete && info()}>
// 변경
<Show when={local.toggleDelete && info() && !info()!.isNew && (local.deletable?.() ?? true)}>
```

4d. 삭제/복구 버튼 조건 변경 — 모달 하단 바 (line 318 부근):

```typescript
// 기존
<Show when={local.toggleDelete && info()}>
// 변경
<Show when={local.toggleDelete && info() && !info()!.isNew && (local.deletable?.() ?? true)}>
```

**Step 5: Run tests to verify they pass**

Run: `pnpm vitest packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx --project=solid --run`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/solid/src/components/data/crud-detail/types.ts packages/solid/src/components/data/crud-detail/CrudDetail.tsx packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx
git commit -m "feat(solid): rename canEdit to editable, add deletable prop to CrudDetail"
```

---

### Task 2: CrudSheet — `canEdit` → `editable` rename + `itemEditable`/`itemDeletable` 추가

**Files:**
- Modify: `packages/solid/src/components/data/crud-sheet/types.ts`
- Modify: `packages/solid/src/components/data/crud-sheet/CrudSheet.tsx`
- Modify: `packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx`

**Step 1: Write the failing tests**

`packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx` — 새 테스트 추가:

```typescript
describe("CrudSheet itemDeletable", () => {
  it("itemDeletable=false인 아이템의 인라인 삭제 버튼이 disabled이다", async () => {
    const searchFn = () =>
      Promise.resolve({
        items: [
          { id: 1, name: "홍길동", isDeleted: false },
          { id: 2, name: "김철수", isDeleted: false },
        ],
        pageCount: 1,
      });

    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={searchFn}
          getItemKey={(item) => item.id}
          itemDeletable={(item) => item.id !== 1}
          inlineEdit={{
            submit: () => Promise.resolve(),
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

    // 삭제 컬럼의 링크들
    const deleteLinks = container.querySelectorAll("a[aria-disabled]");
    expect(deleteLinks.length).toBe(1); // id=1인 아이템만 disabled
  });
});

describe("CrudSheet editable (renamed from canEdit)", () => {
  it("editable=false 시 인라인 편집 버튼이 숨겨진다", async () => {
    const searchFn = () =>
      Promise.resolve({
        items: [{ id: 1, name: "홍길동", isDeleted: false }],
        pageCount: 1,
      });

    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={searchFn}
          getItemKey={(item) => item.id}
          editable={() => false}
          inlineEdit={{
            submit: () => Promise.resolve(),
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
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx --project=solid --run`
Expected: FAIL — `editable`/`itemDeletable` prop 미존재

**Step 3: Update types.ts**

`packages/solid/src/components/data/crud-sheet/types.ts` — `canEdit` → `editable`, `itemEditable`/`itemDeletable` 추가:

```typescript
interface CrudSheetBaseProps<TItem, TFilter extends Record<string, any>> {
  search: (filter: TFilter, page: number, sorts: SortingDef[]) => Promise<SearchResult<TItem>>;
  getItemKey: (item: TItem) => string | number | undefined;
  persistKey?: string;
  itemsPerPage?: number;
  editable?: () => boolean;                    // renamed from canEdit
  itemEditable?: (item: TItem) => boolean;     // NEW
  itemDeletable?: (item: TItem) => boolean;    // NEW
  filterInitial?: TFilter;
  items?: TItem[];
  onItemsChange?: (items: TItem[]) => void;
  excel?: ExcelConfig<TItem>;
  selectMode?: "single" | "multi";
  onSelect?: (result: SelectResult<TItem>) => void;
  hideAutoTools?: boolean;
  class?: string;
  children: JSX.Element;
}
```

**Step 4: Update CrudSheet.tsx**

4a. `splitProps`에서 `canEdit` → `editable`, 새 props 추가:

```typescript
// 기존
"canEdit",
// 변경
"editable",
"itemEditable",
"itemDeletable",
```

4b. 내부 `canEdit` 헬퍼:

```typescript
// 기존
const canEdit = () => (isSelectMode() ? false : (local.canEdit?.() ?? true));
// 변경
const canEdit = () => (isSelectMode() ? false : (local.editable?.() ?? true));
```

4c. 인라인 삭제 버튼 — `handleToggleDelete` 함수에 guard 추가:

```typescript
function handleToggleDelete(item: TItem, index: number) {
  if (!(local.itemDeletable?.(item) ?? true)) return;  // NEW guard
  if (local.inlineEdit?.deleteProp == null) return;
  // ... 기존 로직
```

4d. 인라인 삭제 컬럼 Link에 `disabled` prop 추가:

```typescript
<Link
  theme="danger"
  disabled={!(local.itemDeletable?.(dsCtx.item) ?? true)}
  onClick={() => handleToggleDelete(dsCtx.item, dsCtx.index)}
>
```

4e. 모달 editable 컬럼 링크 — `itemEditable` 체크 추가:

```typescript
// 기존
if (local.modalEdit && col.editable && canEdit()) {
// 변경
if (local.modalEdit && col.editable && canEdit() && (local.itemEditable?.(dsCtx.item) ?? true)) {
```

4f. 모달 "선택 삭제" 버튼 — `itemDeletable` 체크 추가:

```typescript
// 기존
disabled={selectedItems().length === 0}
// 변경
disabled={
  selectedItems().length === 0 ||
  !selectedItems().some((item) => local.itemDeletable?.(item) ?? true)
}
```

**Step 5: Run tests to verify they pass**

Run: `pnpm vitest packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx --project=solid --run`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/solid/src/components/data/crud-sheet/types.ts packages/solid/src/components/data/crud-sheet/CrudSheet.tsx packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx
git commit -m "feat(solid): rename canEdit to editable, add itemEditable/itemDeletable props to CrudSheet"
```
