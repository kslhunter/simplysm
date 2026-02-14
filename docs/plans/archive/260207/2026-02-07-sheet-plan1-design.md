# Sheet Plan 1: 기반 구조 + 기본 테이블 렌더링

상위 설계: `docs/plans/2026-02-07-sheet-migration-design.md`

## 범위

- 전체 타입 정의 (`types.ts`)
- 순수 함수 (`sheetUtils.ts`) — `buildHeaderTable`, `normalizeHeader`
- `SheetColumn.tsx` — Compound component (DOM 없음, `children()` resolve 패턴)
- `Sheet.styles.ts` — Tailwind 스타일 상수
- `Sheet.tsx` — 기본 테이블 렌더링 (다단계 헤더 + 합계 행 + 데이터 파이프라인 스텁)
- `index.ts` export 추가
- 컴포넌트 테스트
- 데모 페이지

## 핵심 결정 사항

| 항목               | 결정                                                                      |
| ------------------ | ------------------------------------------------------------------------- |
| Compound Component | `Sheet.Column` 정적 속성 패턴                                             |
| 컬럼 등록          | `children()` resolve로 plain object 수집 (Context 불필요)                 |
| 데이터 파이프라인  | 전체 스텁 선언 (pass-through, 이후 Plan에서 로직 채움)                    |
| Props 범위         | `types.ts`에 전체 `SheetProps` 선언, Sheet.tsx에서는 Plan 1 해당분만 사용 |
| 데모 구성          | 기본 테이블 + 다단계 헤더 + 합계 행                                       |

## 1. 파일 구조

```
packages/solid/src/components/data/sheet/
├── types.ts           # 전체 타입/인터페이스 (모든 Plan용)
├── sheetUtils.ts      # buildHeaderTable, normalizeHeader
├── SheetColumn.tsx     # Compound component (plain object 반환, DOM 없음)
├── Sheet.styles.ts     # Tailwind 스타일 상수
└── Sheet.tsx           # 메인 컴포넌트 (Sheet.Column 정적 속성)
```

`SheetContext.ts`는 불필요 — `children()` resolve 패턴 사용.

## 2. 컬럼 등록 방식

SheetColumn이 plain object를 반환하고, Sheet가 `children()`으로 수집한다.

```tsx
// SheetColumn — plain object 반환
const SheetColumn = <T,>(props: SheetColumnProps<T>) => {
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
};

// Sheet — children()으로 수집
const resolved = children(() => props.children);
const columnDefs = createMemo(() => resolved.toArray().filter(isSheetColumnDef) as SheetColumnDef<T>[]);
```

## 3. 데이터 파이프라인 (전체 스텁)

```tsx
// #region Sorting
const sortedItems = createMemo(() => {
  // Plan 2에서 구현
  return props.items ?? [];
});

// #region Paging
const pagedItems = createMemo(() => {
  // Plan 2에서 구현
  return sortedItems();
});

// #region Expanding
const flatItems = createMemo(() => {
  // Plan 4에서 구현
  return pagedItems().map((item, i) => ({
    item,
    index: i,
    depth: 0,
    hasChildren: false,
  }));
});

// #region Display
const displayItems = createMemo(() => flatItems());
```

## 4. 렌더링 구조

```tsx
<div class={containerClass}>
  <table class={tableClass}>
    <colgroup>
      <For each={columnDefs()}>{(col) => <col style={{ width: col.width }} />}</For>
    </colgroup>
    <thead>
      {/* 다단계 헤더 행들 */}
      <For each={headerTable()}>
        {(row) => (
          <tr>
            <For each={row}>
              {(cell) =>
                cell && (
                  <th class={thClass} colspan={cell.colspan} rowspan={cell.rowspan}>
                    {cell.headerContent?.() ?? cell.text}
                  </th>
                )
              }
            </For>
          </tr>
        )}
      </For>
      {/* 합계 행 (하나라도 summary가 있으면) */}
      <Show when={hasSummary()}>
        <tr class={summaryRowClass}>
          <For each={columnDefs()}>{(col) => <th class={thClass}>{col.summary?.()}</th>}</For>
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
```

## 5. 컴포넌트 테스트

파일: `packages/solid/tests/sheet/Sheet.spec.tsx` (`--project=solid`)

- **기본 렌더링**: Sheet + Column 3개 → `<th>` 3개, 데이터 행 수 확인
- **다단계 헤더**: `["기본", "이름"]`, `["기본", "나이"]` → colspan=2인 `<th>` 존재, rowspan 확인
- **합계 행**: summary prop → `<thead>` 내 합계 행 렌더링 확인
- **빈 데이터**: `items={[]}` → `<tbody>` 비어있음

## 6. 데모 페이지

파일: `packages/solid-demo/src/pages/data/SheetPage.tsx`

라우팅: `main.tsx`에 `/home/data/sheet` 추가, `Home.tsx` 메뉴에 "Sheet" 항목 추가

3개 섹션:

1. **기본 테이블** — 이름/나이/이메일 정적 데이터
2. **다단계 헤더** — `["기본정보", "이름"]`, `["기본정보", "나이"]`, `["연락처"]`로 colspan/rowspan 확인
3. **합계 행** — 숫자 컬럼에 `summary` prop으로 합계 표시

## 7. 수동 검증 (Playwright MCP)

1. 데모 페이지 열어 3개 섹션 렌더링 확인
2. 다단계 헤더의 셀 병합이 정확한지 확인
3. 합계 행이 thead 내에 위치하는지 확인
