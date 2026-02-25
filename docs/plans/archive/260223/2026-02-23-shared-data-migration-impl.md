# SharedData 컴포넌트 마이그레이션 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** v12 SharedData 선택 컴포넌트를 v13 SolidJS로 마이그레이션 — 범용 컴포넌트 기능 확장 + SharedData thin wrapper 3종 구현

**Architecture:**
- Select 컴포넌트에 검색/미지정/전체선택/숨김 기능 내장
- SelectList, DataSelectButton 범용 컴포넌트 신규 생성
- SharedDataSelect/SelectButton/SelectList는 accessor를 받아 범용 컴포넌트에 연결하는 thin wrapper
- SharedDataDefinition/Accessor에 메타 함수(getSearchText, getIsHidden, getParentKey) 추가

**Tech Stack:** SolidJS, Tailwind CSS, @tabler/icons-solidjs, useDialog()

---

### Task 1: SharedDataDefinition/Accessor 확장

**Files:**
- Modify: `packages/solid/src/providers/shared-data/SharedDataContext.ts`
- Modify: `packages/solid/src/providers/shared-data/SharedDataProvider.tsx`
- Modify: `packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx`

**Step 1: SharedDataContext.ts — 인터페이스 확장**

`SharedDataDefinition`에 옵셔널 메타 함수 3개 추가:

```ts
interface SharedDataDefinition<TData> {
  // 기존 필드 유지

  // 신규
  getSearchText?: (item: TData) => string;
  getIsHidden?: (item: TData) => boolean;
  getParentKey?: (item: TData) => string | number | undefined;
}
```

`SharedDataAccessor`에 메타 함수 노출:

```ts
interface SharedDataAccessor<TData> {
  // 기존 필드 유지

  // 신규
  getKey: (item: TData) => string | number;
  getSearchText?: (item: TData) => string;
  getIsHidden?: (item: TData) => boolean;
  getParentKey?: (item: TData) => string | number | undefined;
}
```

**Step 2: SharedDataProvider.tsx — accessor 생성 시 메타 함수 복사**

`configure()` 내부, accessor 생성 부분:

```ts
accessors[name] = {
  items,
  get: (key) => { ... },
  emit: async (changeKeys) => { ... },
  // 신규
  getKey: def.getKey,
  getSearchText: def.getSearchText,
  getIsHidden: def.getIsHidden,
  getParentKey: def.getParentKey,
};
```

**Step 3: 테스트 추가 — 메타 함수가 accessor에 노출되는지 검증**

기존 테스트 파일에 케이스 추가:
- `getSearchText`를 포함한 configure → accessor에서 함수 접근 가능 확인
- 메타 함수 미지정 시 undefined 확인

**Step 4: 검증**

```bash
pnpm vitest packages/solid/tests/providers/shared-data --project=solid
```

---

### Task 2: Select 기능 확장 (검색, 미지정, 전체선택, 숨김)

**Files:**
- Modify: `packages/solid/src/components/form-control/select/Select.tsx`
- Modify: `packages/solid/src/components/form-control/select/SelectContext.ts`
- Test: `packages/solid/tests/components/select/Select.spec.tsx`

**기존 rename:** `getValue`/`setInternalValue` → `value`/`setValue` (no-shadow 충돌 없음, splitProps 이후)

**Sub-step A: Props 추가**

Select props에 추가:

```ts
// SelectCommonProps에 추가
getSearchText?: (item: TValue) => string;
getIsHidden?: (item: TValue) => boolean;
```

splitProps에 `getSearchText`, `getIsHidden` 추가.

**Sub-step B: 검색**

- 내부 `searchText` signal 생성
- `getSearchText`가 있으면 Dropdown.Content 상단에 TextInput 자동 렌더링
- items를 `createMemo`로 필터링 (공백 분리 AND 매칭)
- 계층 구조: 자식 매칭 시 부모도 표시 (재귀 검색)
- open → false 시 searchText 초기화
- 필터된 items를 `renderItems()`에 전달

```ts
const filteredItems = createMemo(() => {
  if (!local.getSearchText || !searchText()) return local.items;
  const terms = searchText()!.trim().split(" ").filter(Boolean);
  return local.items?.filter((item) => {
    const text = local.getSearchText!(item).toLowerCase();
    return terms.every((t) => text.includes(t.toLowerCase()));
  });
});
```

**Sub-step C: 미지정 항목 + 전체선택/해제**

미지정:
- 단일 선택 + `required` 아님 → List 최상단에 "미지정" SelectItem 추가 (value = undefined)

전체선택/해제:
- `multiple` + `hideSelectAll` 아님 → 검색 아래, 목록 위에 "전체선택 / 전체해제" 버튼 2개
- 전체선택: `setValue(filteredItems)`, 전체해제: `setValue([])`

**Sub-step D: 숨김 처리**

- `getIsHidden`이 있으면 목록에서 숨김 항목 제외
- 단, 이미 선택된 값이면 취소선(`line-through`)으로 표시
- SelectItem 렌더링 시 `getIsHidden(item)` 체크

**Step 5: 테스트**

- 검색: getSearchText 설정 → 검색어 입력 → 필터 결과 확인
- 미지정: required=false 단일 선택 → "미지정" 항목 존재 확인
- 전체선택: multiple → 전체선택 클릭 → 모든 값 선택 확인
- 숨김: getIsHidden → 숨김 항목 미표시, 선택된 숨김 항목은 취소선 확인

```bash
pnpm vitest packages/solid/tests/components/select --project=solid
```

---

### Task 3: SelectList 범용 컴포넌트 (신규)

**Files:**
- Create: `packages/solid/src/components/form-control/select-list/SelectList.tsx`
- Test: `packages/solid/tests/components/select-list/SelectList.spec.tsx`

**Props:**

```ts
interface SelectListProps<TValue> {
  items: TValue[];
  value?: TValue;
  onValueChange?: (value: TValue | undefined) => void;

  required?: boolean;
  disabled?: boolean;

  getSearchText?: (item: TValue) => string;
  getIsHidden?: (item: TValue) => boolean;
  filterFn?: (item: TValue, index: number) => boolean;
  canChange?: (item: TValue | undefined) => boolean | Promise<boolean>;

  pageSize?: number;
  header?: string;

  children?: JSX.Element; // 서브 컴포넌트용
}
```

**서브 컴포넌트:** `SelectList.Header`, `SelectList.Filter`, `SelectList.ItemTemplate`

**내부 로직:**
- `searchText` signal → `getSearchText` 있으면 TextInput 자동 표시
- `page` signal → `pageSize` 있으면 Pagination 자동 표시
- `displayItems` memo: `getIsHidden` 필터 → 검색 필터 → `filterFn` → 페이지 슬라이스
- 선택/토글: click 시 `canChange` 확인 후 `onValueChange` 호출
- items 변경 시 value 자동 재매칭 (객체 참조 갱신)
- 미지정: `required` 아니면 목록 최상단 "미지정" ListItem

**UI 구조:**

```
[header 텍스트 또는 Header 슬롯]
[Filter 슬롯 또는 검색 TextInput]
[Pagination (pageSize 있을 때)]
[List inset]
  [미지정 항목 (required 아닐 때)]
  [For each displayItems → ListItem]
```

**사용하는 기존 컴포넌트:** `List`, `List.Item`, `Pagination`, `TextInput`

**테스트:**
- 검색 필터링 동작
- 페이지네이션 동작
- 선택/토글 + canChange 가드
- items 변경 시 value 재매칭

```bash
pnpm vitest packages/solid/tests/components/select-list --project=solid
```

---

### Task 4: DataSelectButton 범용 컴포넌트 (신규)

**Files:**
- Create: `packages/solid/src/components/form-control/data-select-button/DataSelectButton.tsx`
- Test: `packages/solid/tests/components/data-select-button/DataSelectButton.spec.tsx`

**Props:**

```ts
interface DataSelectButtonProps<TItem, TKey = string | number> {
  value?: TKey | TKey[];
  onValueChange?: (value: TKey | TKey[] | undefined) => void;

  load: (keys: TKey[]) => TItem[] | Promise<TItem[]>;
  modal: () => JSX.Element;
  renderItem: (item: TItem) => JSX.Element;

  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  size?: ComponentSize;
  inset?: boolean;

  validate?: (value: unknown) => string | undefined;
  touchMode?: boolean;
}
```

**내부 로직:**
- `selectedItems` signal: value 변경 → `load(keys)` 호출 → 자동 업데이트
- 모달 열기: `useDialog().show(modal, options)` → 결과에서 selectedKeys 추출 → `onValueChange` 호출
- 값 초기화: `required` 아니고 값 있으면 지우기 버튼 표시 → value를 undefined/[]로 설정
- 유효성 검사: `required` + value 없으면 에러

**모달 인터페이스 — 모달 컴포넌트가 받는 props:**

모달 내부에서 `useDialogInstance()`로 결과 반환:

```ts
interface DataSelectModalResult<TKey> {
  selectedKeys: TKey[];
}
```

**UI 구조:**

```
[선택된 항목 표시 (renderItem, 쉼표 구분)]
[지우기 버튼 (required 아니고 값 있을 때)]
[검색 버튼 (disabled 아닐 때) → 모달 열기]
```

**테스트:**
- value 변경 → load 호출 → selectedItems 표시
- 모달 열기/결과 반영
- 지우기 동작
- required 유효성 검사

```bash
pnpm vitest packages/solid/tests/components/data-select-button --project=solid
```

---

### Task 5: SharedDataSelect wrapper (신규)

**Files:**
- Create: `packages/solid/src/components/form-control/shared-data/SharedDataSelect.tsx`

**Props:**

```ts
interface SharedDataSelectProps<TItem> {
  data: SharedDataAccessor<TItem>;

  // Select에 전달
  value?: unknown;
  onValueChange?: (value: unknown) => void;
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  size?: ComponentSize;
  inset?: boolean;

  // SharedData 전용
  filterFn?: (item: TItem, index: number) => boolean;
  modal?: () => JSX.Element;
  editModal?: () => JSX.Element;

  children: (item: TItem, index: number, depth: number) => JSX.Element;
}
```

**내부 로직:**
- `data.items()` → Select `items`
- `data.getSearchText` → Select `getSearchText`
- `data.getIsHidden` → Select `getIsHidden`
- `data.getParentKey` → Select `getChildren` 변환 (parentKey 기반 트리 구축)
- `modal` → Select.Action (🔍 버튼)
- `editModal` → Select.Action (✏️ 버튼)
- `children` → Select.ItemTemplate

**parentKey → getChildren 변환:**

```ts
const getChildren = data.getParentKey
  ? (item: TItem) => {
      const key = data.getKey(item);
      return data.items().filter(child => data.getParentKey!(child) === key);
    }
  : undefined;
```

---

### Task 6: SharedDataSelectButton wrapper (신규)

**Files:**
- Create: `packages/solid/src/components/form-control/shared-data/SharedDataSelectButton.tsx`

**Props:**

```ts
interface SharedDataSelectButtonProps<TItem> {
  data: SharedDataAccessor<TItem>;

  // DataSelectButton에 전달
  value?: unknown;
  onValueChange?: (value: unknown) => void;
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  size?: ComponentSize;
  inset?: boolean;

  modal: () => JSX.Element;
  children: (item: TItem) => JSX.Element; // renderItem
}
```

**내부 로직:**
- `load` 자동 구현: `data.items().filter(item => keys.includes(data.getKey(item)))`
- `children` → DataSelectButton `renderItem`
- 나머지 props는 DataSelectButton에 그대로 전달

```tsx
<DataSelectButton
  load={(keys) => data.items().filter(item => keys.includes(data.getKey(item)))}
  renderItem={props.children}
  modal={props.modal}
  {...rest}
/>
```

---

### Task 7: SharedDataSelectList wrapper (신규) + index.ts export

**Files:**
- Create: `packages/solid/src/components/form-control/shared-data/SharedDataSelectList.tsx`
- Modify: `packages/solid/src/index.ts`

**Props:**

```ts
interface SharedDataSelectListProps<TItem> {
  data: SharedDataAccessor<TItem>;

  // SelectList에 전달
  value?: TItem;
  onValueChange?: (value: TItem | undefined) => void;
  required?: boolean;
  disabled?: boolean;

  filterFn?: (item: TItem, index: number) => boolean;
  canChange?: (item: TItem | undefined) => boolean | Promise<boolean>;
  pageSize?: number;
  header?: string;
  modal?: () => JSX.Element;

  children: JSX.Element; // 서브 컴포넌트 (ItemTemplate 등)
}
```

**내부 로직:**
- `data.items()` → SelectList `items`
- `data.getSearchText` → SelectList `getSearchText`
- `data.getIsHidden` → SelectList `getIsHidden`
- `modal` → 헤더 영역에 🔗 아이콘 버튼 추가 → `useDialog().show()`
- 나머지 props는 SelectList에 전달

**index.ts export 추가 (Task 3~7 공통):**

```ts
export * from "./components/form-control/select-list/SelectList";
export * from "./components/form-control/data-select-button/DataSelectButton";
export * from "./components/form-control/shared-data/SharedDataSelect";
export * from "./components/form-control/shared-data/SharedDataSelectButton";
export * from "./components/form-control/shared-data/SharedDataSelectList";
```
