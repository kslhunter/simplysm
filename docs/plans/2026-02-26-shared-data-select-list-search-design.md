# SharedDataSelectList 검색 기능 추가 설계

## 개요

Angular 원본 `sd-shared-data-select-list.control.ts`에서 누락된 검색 기능을 SolidJS `SharedDataSelectList`에 추가한다.

## 변경 사항

1. **Compound component 패턴 전환**: `children` render function → `ItemTemplate` sub-component
2. **검색 기능 추가**: 내장 검색 input (`TextInput`) + `getSearchText` 기반 필터링
3. **Filter sub-component 추가**: 커스텀 필터 UI 슬롯

## 사용 예시

### 기본 (내장 검색)

```tsx
<SharedDataSelectList data={sharedData.department} value={selected()} onValueChange={setSelected}>
  <SharedDataSelectList.ItemTemplate>
    {(item, index) => <div>{item.name}</div>}
  </SharedDataSelectList.ItemTemplate>
</SharedDataSelectList>
```

### 커스텀 필터

```tsx
<SharedDataSelectList data={sharedData.department} filterFn={myFilter}>
  <SharedDataSelectList.Filter>
    <MyCustomFilterUI />
  </SharedDataSelectList.Filter>
  <SharedDataSelectList.ItemTemplate>
    {(item, index) => <div>{item.name}</div>}
  </SharedDataSelectList.ItemTemplate>
</SharedDataSelectList>
```

## 내부 구현

### Context 및 Slot 구조

`Select` 컴포넌트와 동일한 패턴으로 Context + slot signal 사용.

```typescript
interface SharedDataSelectListContextValue {
  setItemTemplate: (fn: ((item: unknown, index: number) => JSX.Element) | undefined) => void;
  setFilter: (content: SlotAccessor) => void;
}
```

- `ItemTemplate`: render function을 signal로 저장 (Select.ItemTemplate과 동일 패턴)
- `Filter`: `createSlotComponent` 헬퍼로 생성 (프로젝트 기존 패턴)

### 검색 필터링 로직

```typescript
const [searchText, setSearchText] = createSignal("");

const filteredItems = createMemo(() => {
  let result = local.data.items();

  // 1. getIsHidden 필터
  const isHidden = local.data.getIsHidden;
  if (isHidden) {
    result = result.filter((item) => !isHidden(item));
  }

  // 2. 검색 필터 (Filter compound 없고 getSearchText 있을 때만)
  const getSearchText = local.data.getSearchText;
  if (!hasFilter() && getSearchText && searchText()) {
    const terms = searchText().trim().split(" ").filter(Boolean);
    if (terms.length > 0) {
      result = result.filter((item) => {
        const text = getSearchText(item).toLowerCase();
        return terms.every((t) => text.includes(t.toLowerCase()));
      });
    }
  }

  // 3. filterFn
  if (local.filterFn) {
    const fn = local.filterFn;
    result = result.filter((item, index) => fn(item, index));
  }

  return result;
});
```

- Filter compound 있으면 → 내장 검색 비활성화 (`hasFilter()` 체크)
- `getSearchText` 없으면 → 검색 input 숨김
- 공백 분리 + 대소문자 무시 (Select와 통일)

### 렌더링 구조

```tsx
<div data-shared-data-select-list ...>
  {/* Header + Modal 버튼 */}
  <Show when={local.header != null || local.modal != null}>...</Show>

  {/* 검색 input: Filter compound 없고 getSearchText 있을 때 */}
  <Show when={!filter() && local.data.getSearchText}>
    <TextInput
      value={searchText()}
      onValueChange={setSearchText}
      placeholder={i18n?.t("sharedDataSelectList.searchPlaceholder") ?? "Search..."}
      size="sm"
      inset
    />
  </Show>

  {/* 커스텀 Filter */}
  <Show when={filter()}>{filter()!()}</Show>

  {/* Pagination */}
  ...

  {/* List */}
  ...
</div>
```

### i18n

각 locale 파일에 `sharedDataSelectList.searchPlaceholder` 키 추가.

## 수정 파일 목록

1. `SharedDataSelectList.tsx` — 핵심 변경
2. `SharedDataSelectListContext.ts` (신규) — Context + sub-component 정의
3. i18n locale 파일들 — 키 추가
4. 테스트 파일 — ItemTemplate 패턴에 맞게 업데이트

## 설계 결정 사항

| 결정 | 선택 | 근거 |
|------|------|------|
| 검색 매칭 방식 | 공백 분리 + 대소문자 무시 | Select와 통일 |
| 커스텀 필터 방식 | Filter compound + filterFn 외부 관리 | 내부 검색과 분리 |
| 아이템 렌더링 | ItemTemplate compound sub-component | Select 패턴과 통일 |
| 검색 input 컴포넌트 | TextInput | 프로젝트 기존 컴포넌트 |
| 검색 결과 0건 | 빈 리스트 표시 | 별도 empty state 불필요 |
| getSearchText 없을 때 | 검색 input 숨김 | 검색 불가능하므로 |
| i18n 키 | `sharedDataSelectList.searchPlaceholder` | 별도 키 |
| 사용처 영향 | 없음 | 아직 사용 전 |
