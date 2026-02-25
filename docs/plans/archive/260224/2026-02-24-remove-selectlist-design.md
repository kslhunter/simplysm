# SelectList 제거 및 SharedDataSelectList 흡수 설계

## 배경

SelectList는 List 위에 선택/검색/페이지네이션/슬롯 등 편의 기능을 합친 래퍼 컴포넌트인데,
실제 소비자가 SharedDataSelectList 1곳뿐이고, 각 기능이 단순하여 별도 컴포넌트로 존재할 이유가 부족하다.

또한 기존 설계에 문제가 있었다:
- `header?: string` prop과 `SelectList.Header` 슬롯의 이중 API
- `SelectList.Header` 슬롯 사용 시 기본 스타일(`headerClass`) 누락
- `SelectList.Filter` 슬롯이 없으면 자동으로 TextInput을 생성하는 과잉 기능
- 검색 기능이 UI 컴포넌트에 내장되어 있어 관심사 분리 위반

## 변경 범위

### 삭제

- `packages/solid/src/components/form-control/select-list/SelectList.tsx`
- `packages/solid/src/components/form-control/select-list/SelectListContext.ts`
- `packages/solid/tests/components/form-control/select-list/SelectList.spec.tsx`
- `select-list/` 디렉토리 자체

### 수정

- `packages/solid/src/index.ts` — SelectList export 제거
- `packages/solid/docs/form-controls.md` — SelectList 섹션 제거

### 신규

- `packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx`

## SharedDataSelectList 변경

### Props

```tsx
interface SharedDataSelectListProps<TItem> {
  data: SharedDataAccessor<TItem>;
  value?: TItem;
  onValueChange?: (value: TItem | undefined) => void;
  required?: boolean;
  disabled?: boolean;
  filterFn?: (item: TItem, index: number) => boolean;
  canChange?: (item: TItem | undefined) => boolean | Promise<boolean>;
  pageSize?: number;
  header?: string;
  modal?: () => JSX.Element;
  children: (item: TItem, index: number) => JSX.Element; // render function
  class?: string;
  style?: JSX.CSSProperties;
}
```

- `children`: `JSX.Element` → `(item: TItem, index: number) => JSX.Element` (render function)
- `class`, `style` 추가
- SelectList 경유 제거

### 내부 로직

SelectList에서 흡수할 로직:
- 선택 토글 (value/onValueChange, required 시 토글 비활성)
- "미지정" 항목 (required 아닐 때)
- `canChange` 가드
- 페이지네이션 (`pageSize` + `Pagination` 컴포넌트)
- `getIsHidden` 필터 (SharedDataAccessor에서)
- `filterFn` (외부 필터)

제거할 기능:
- 검색 (searchText, getSearchText 기반 내부 검색)
- Filter 슬롯
- Header 슬롯 시스템 (SelectListContext 전체)

### 렌더링

```tsx
return (
  <div
    {...rest}
    data-shared-data-select-list
    class={twMerge(clsx("flex-col gap-1"), local.class)}
    style={local.style}
  >
    {/* Header */}
    <Show when={local.header != null || local.modal != null}>
      <div class={clsx("px-2 py-1 text-sm font-semibold flex items-center gap-1")}>
        <Show when={local.header != null}>
          {local.header}
        </Show>
        <Show when={local.modal != null}>
          <Button size="sm" onClick={() => void handleOpenModal()}>
            <Icon icon={IconExternalLink} />
          </Button>
        </Show>
      </div>
    </Show>

    {/* Pagination */}
    <Show when={local.pageSize != null && totalPageCount() > 1}>
      <Pagination
        page={page()}
        onPageChange={setPage}
        totalPageCount={totalPageCount()}
        size="sm"
      />
    </Show>

    {/* List */}
    <List inset>
      <Show when={!local.required}>
        <List.Item
          selected={local.value === undefined}
          disabled={local.disabled}
          onClick={() => handleSelect(undefined)}
        >
          <span class={textMuted}>미지정</span>
        </List.Item>
      </Show>

      <For each={displayItems()}>
        {(item, index) => (
          <List.Item
            selected={item === local.value}
            disabled={local.disabled}
            onClick={() => handleSelect(item)}
          >
            {local.children(item, index())}
          </List.Item>
        )}
      </For>
    </List>
  </div>
);
```

## 테스트 범위

SharedDataSelectList.spec.tsx:
- 아이템 목록 렌더링
- 선택/토글 동작 (required, canChange)
- "미지정" 항목 표시/숨김
- 페이지네이션 (pageSize)
- getIsHidden, filterFn 필터링
- header + modal 아이콘 표시
