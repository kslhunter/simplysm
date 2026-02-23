# SharedData 컴포넌트 마이그레이션 설계

v12 Angular의 shared-data 관련 컴포넌트를 v13 SolidJS로 마이그레이션한다.

## 배경

v12에는 공유 데이터(코드성 데이터)를 Select/List/Button 형태로 선택하는 전용 컴포넌트 3종이 있다.
이 패턴은 실무에서 매우 자주 사용되므로 마이그레이션이 필요하다.

## 아키텍처

```
범용 컴포넌트 (기능 내장)          SharedData Thin Wrappers
┌─────────────────────┐          ┌──────────────────────────┐
│ Select              │ ◀─────── │ SharedDataSelect         │
│  (검색/전체선택/숨김)│          │  (accessor → Select prop)│
├─────────────────────┤          ├──────────────────────────┤
│ SelectList          │ ◀─────── │ SharedDataSelectList     │
│  (검색/페이지네이션) │          │  (accessor → SelectList) │
├─────────────────────┤          ├──────────────────────────┤
│ DataSelectButton    │ ◀─────── │ SharedDataSelectButton   │
│  (key→display/모달) │          │  (accessor → load 자동)  │
└─────────────────────┘          └──────────────────────────┘
                                          │
                                          ▼
                                 SharedDataProvider
                                 (accessor에 메타 함수 포함)
```

## 변경 1: SharedDataDefinition/Accessor 확장

### SharedDataDefinition (옵셔널 메타 함수 추가)

```ts
interface SharedDataDefinition<TData> {
  // 기존
  serviceKey: string;
  fetch: (changeKeys?: Array<string | number>) => Promise<TData[]>;
  getKey: (item: TData) => string | number;
  orderBy: [(item: TData) => unknown, "asc" | "desc"][];
  filter?: unknown;

  // 신규
  getSearchText?: (item: TData) => string;
  getIsHidden?: (item: TData) => boolean;
  getParentKey?: (item: TData) => string | number | undefined;
}
```

### SharedDataAccessor (메타 함수 노출)

```ts
interface SharedDataAccessor<TData> {
  // 기존
  items: Accessor<TData[]>;
  get: (key: string | number | undefined) => TData | undefined;
  emit: (changeKeys?: Array<string | number>) => Promise<void>;

  // 신규
  getKey: (item: TData) => string | number;
  getSearchText?: (item: TData) => string;
  getIsHidden?: (item: TData) => boolean;
  getParentKey?: (item: TData) => string | number | undefined;
}
```

### SharedDataProvider 수정

configure 시 Definition의 메타 함수들을 accessor 객체에 복사한다.

**변경 파일:** `SharedDataContext.ts`, `SharedDataProvider.tsx`

## 변경 2: Select 컴포넌트 기능 확장

현재 Select에 없는 기능들을 내장한다.

### 검색

```tsx
<Select items={users()} getSearchText={(item) => `${item.name} ${item.dept}`}>
```

- `getSearchText`가 있으면 드롭다운 상단에 검색 필드 자동 표시
- 공백 분리 AND 검색 (v12 로직 동일)
- 닫힐 때 검색어 자동 초기화
- 계층 구조일 때 자식 매칭 시 부모도 표시

### 미지정 항목

- 단일 선택 + `required` 아님 → "미지정" 항목 자동 표시
- 추가 prop 없음

### 전체선택/해제

- `multiple` 모드일 때 드롭다운 상단에 전체선택/해제 버튼 자동 표시
- 기존 `hideSelectAll` prop으로 숨기기 가능

### 숨김 처리

```tsx
<Select items={users()} getIsHidden={(item) => !item.isActive}>
```

- 숨김 항목은 목록에서 제외하되, 이미 선택된 값이면 취소선으로 표시 (v12 동작 동일)

**변경 파일:** `Select.tsx`, `SelectContext.ts`

## 변경 3: SelectList 범용 컴포넌트 (신규)

사이드 패널/마스터-디테일용 리스트형 선택 컴포넌트.

```tsx
<SelectList
  items={users()}
  value={selectedUser()}
  onValueChange={setSelectedUser}
  getSearchText={(item) => item.name}
  pageSize={20}
>
  <SelectList.Header>카테고리</SelectList.Header>
  <SelectList.ItemTemplate>
    {(item) => <>{item.name}</>}
  </SelectList.ItemTemplate>
</SelectList>
```

### 내장 기능

- 검색 (`getSearchText` → 텍스트필드 자동 표시)
- 페이지네이션 (`pageSize` → Pagination 자동 표시)
- 숨김 필터 (`getIsHidden`)
- 선택/토글
- 선택 가드 (`canChange`)
- 미지정 항목 (`required` 아닐 때)
- 헤더 (텍스트 또는 슬롯)
- 커스텀 필터 UI (슬롯)

**변경:** 신규 파일 `SelectList.tsx`

## 변경 4: DataSelectButton 범용 컴포넌트 (신규)

key만 저장하고 모달로 선택하는 Lookup/Picker 컴포넌트.

```tsx
<DataSelectButton
  value={userId()}
  onValueChange={setUserId}
  load={(keys) => fetchUsersByIds(keys)}
  modal={(props) => <UserSelectModal {...props} />}
  renderItem={(item) => <>{item.name}</>}
>
```

### 내장 기능

- value 변경 → `load(keys)` → 선택된 항목 자동 조회/표시
- 모달 열기 → selectMode/selectedKeys 전달 → 결과 반영 (`useDialog().show()` 활용)
- 값 초기화 (지우기 버튼, `required` 아니면 표시)
- 단일/다중 선택 (`multiple`)
- 유효성 검사 (`required`)
- disabled 상태
- 선택된 항목 렌더링 (`renderItem`, 다중일 때 쉼표 구분)

**변경:** 신규 파일 `DataSelectButton.tsx`

## 변경 5: SharedData Thin Wrappers (신규 3종)

SharedDataProvider의 accessor를 받아서 범용 컴포넌트에 연결하는 래퍼.

### SharedDataSelect

```tsx
const shared = useSharedData<MyData>();

<SharedDataSelect data={shared.user} value={userId()} onValueChange={setUserId}>
  {(item) => <>{item.name}</>}
</SharedDataSelect>
```

- `data.items()`, `data.getSearchText`, `data.getIsHidden`, `data.getParentKey`를 Select에 전달
- v12의 `modal`, `editModal`도 prop으로 전달 가능 (Select.Action 활용)

### SharedDataSelectButton

```tsx
<SharedDataSelectButton
  data={shared.user}
  value={userId()}
  onValueChange={setUserId}
  modal={(props) => <UserSelectModal {...props} />}
>
  {(item) => <>{item.name}</>}
</SharedDataSelectButton>
```

- `load`를 `data.items().filter(key 매칭)`으로 자동 구현
- DataSelectButton에 전달

### SharedDataSelectList

```tsx
<SharedDataSelectList data={shared.user} value={selectedUser()} onValueChange={setSelectedUser}>
  {(item) => <>{item.name}</>}
</SharedDataSelectList>
```

- `data.items()`, `data.getSearchText`, `data.getIsHidden`을 SelectList에 전달

**변경:** 신규 파일 3개

## v12 → v13 기능 매핑 요약

### SdSharedDataSelect → SharedDataSelect (via Select)

| v12 기능 | v13 대응 |
|---------|---------|
| 검색 (searchText + __searchText) | Select `getSearchText` prop |
| 계층 구조 (parentKeyProp) | Select `getChildren` + accessor `getParentKey` |
| 정렬 (displayOrderKeyProp) | SharedDataDefinition `orderBy` |
| 필터링 (filterFn) | SharedDataSelect `filterFn` prop (Select에 전달) |
| 숨김 처리 (getIsHiddenFn) | Select `getIsHidden` prop |
| 미지정 항목 | Select 자동 (required 아닐 때) |
| 모달 검색 (modal) | SharedDataSelect `modal` prop → Select.Action |
| 모달 편집 (editModal) | SharedDataSelect `editModal` prop → Select.Action |
| 단일/다중 선택 | Select `multiple` prop |

### AbsSdDataSelectButton → DataSelectButton

| v12 기능 | v13 대응 |
|---------|---------|
| key→display 변환 | `load` prop |
| 모달 선택 | `modal` prop + `useDialog().show()` |
| 값 초기화 | 지우기 버튼 내장 |
| 유효성 검사 | `required` prop |

### SdSharedDataSelectList → SharedDataSelectList (via SelectList)

| v12 기능 | v13 대응 |
|---------|---------|
| 검색 (searchText + __searchText) | SelectList `getSearchText` prop |
| 페이지네이션 (pageItemCount) | SelectList `pageSize` prop |
| 필터링 (__isHidden + filterFn) | SelectList `getIsHidden` + `filterFn` |
| 선택/토글 | SelectList 내장 |
| 선택 가드 (canChangeFn) | SelectList `canChange` prop |
| 자동 동기화 | SelectList 내부에서 items 변경 시 value 재매칭 |
| 미지정 항목 (useUndefined) | SelectList 자동 (required 아닐 때) |
| 모달 자세히 (modal) | SharedDataSelectList `modal` prop |
| 커스텀 헤더 | SelectList.Header 슬롯 |
| 커스텀 필터 UI | SelectList.Filter 슬롯 |
