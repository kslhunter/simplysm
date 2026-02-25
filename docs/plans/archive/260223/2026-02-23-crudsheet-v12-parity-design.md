# CrudSheet v12 Parity Design

v12 `AbsSdDataSheet` → v13 `CrudSheet` 마이그레이션에서 누락된 기능 복원 설계.

## 변경 대상

- `packages/solid/src/components/data/crud-sheet/CrudSheet.tsx`
- `packages/solid/src/components/data/crud-sheet/types.ts`

## 결정 요약

| # | 항목 | 결정 |
|---|------|------|
| 1 | Summary | 변경 없음 (컬럼별 summary prop 이미 동작) |
| 2 | lastModified 자동 컬럼 | 추가 |
| 3 | checkIgnoreChanges | 추가 (내부 동작 + 라우트, 모달 제외) |
| 4 | itemSelectable | DataSheet로 패스스루 추가 |
| 5 | diffsExcludes | 추가 |
| 6 | 복구 기능 | 추가 |
| 7 | submitted 이벤트 | 추가 (onSubmitted 콜백) |
| 8 | 키 기반 누적 선택 | 추가 (CrudSheet 내부 + clearSelection) |
| 9 | itemsPerPage | CrudSheet에서 제거, search 시그니처 변경 |
| 10 | hideAutoTools | 변경 없음 |

---

## 2. lastModified 자동 컬럼

### Props 추가

```typescript
interface CrudSheetBaseProps<TItem, TFilter> {
  lastModifiedAtProp?: keyof TItem & string;
  lastModifiedByProp?: keyof TItem & string;
}
```

### 동작

- prop이 설정되면 DataSheetColumn을 자동 생성 (hidden, 컬럼 설정에서 보이기 토글 가능)
- `lastModifiedAtProp` → header "수정일시", `DateTime` 포맷 `yyyy-MM-dd HH:mm`
- `lastModifiedByProp` → header "수정자", 텍스트 그대로 표시
- v12의 `itemPropInfo.lastModifiedAt/lastModifiedBy`와 동일

---

## 3. checkIgnoreChanges

### 동작

inline edit 모드에서 변경사항(`getItemDiffs().length > 0`)이 있을 때:

1. **새로고침 버튼 클릭** → `confirm("변경사항이 있습니다. 무시하시겠습니까?")` → 취소 시 중단
2. **필터 제출** → 동일한 confirm → 취소 시 중단
3. **라우트 이동** → `useBeforeLeave`로 차단, confirm 표시
4. **모달** → 체크 안 함 (v12 동일: `viewType() === "modal"` 시 skip)

### 구현

- CrudSheet 내부에 `hasChanges()` 함수 이미 있음 (`getItemDiffs().length > 0`)
- `handleRefresh`, `handleFilterSubmit`에 confirm 체크 추가
- 모달이 아닌 경우 `useBeforeLeave` 등록

---

## 4. itemSelectable 패스스루

### Props 추가

```typescript
interface CrudSheetBaseProps<TItem, TFilter> {
  isItemSelectable?: (item: TItem) => boolean | string;
}
```

### 동작

- DataSheet의 `isItemSelectable`로 그대로 전달
- 이미 DataSheet에 완전히 구현되어 있음

---

## 5. diffsExcludes

### Props 추가

```typescript
interface InlineEditConfig<TItem> {
  diffsExcludes?: string[];
}
```

### 동작

- `getItemDiffs()` 호출 시 `oneWayDiffs`에 excludes 옵션 전달
- v12의 `diffsExcludes`와 동일

---

## 6. 복구 기능

### Props 변경

```typescript
interface ModalEditConfig<TItem> {
  editItem: (item?: TItem) => Promise<boolean | undefined>;
  deleteItems?: (items: TItem[]) => Promise<boolean>;
  restoreItems?: (items: TItem[]) => Promise<boolean>;  // 추가
}
```

### 동작

- `restoreItems`가 설정되면 "선택 복구" 버튼 자동 렌더링
- 선택된 아이템 중 삭제된 아이템이 있을 때만 활성화
- `itemDeleted` prop으로 삭제 여부 판별 (이미 존재)
- v12의 `toggleDeleteItems(false)` 패턴과 동일

### UI

```
[선택 삭제] [선택 복구]  ← restoreItems 설정 시 복구 버튼 추가
```

- "선택 삭제": 선택된 아이템 중 삭제되지 않은 항목이 있을 때 활성화
- "선택 복구": 선택된 아이템 중 삭제된 항목이 있을 때 활성화

---

## 7. submitted 이벤트

### Props 추가

```typescript
interface CrudSheetBaseProps<TItem, TFilter> {
  onSubmitted?: () => void;
}
```

### 동작

- inline edit `handleSave`에서 submit 성공 + refresh 완료 후 호출
- v12의 `submitted` output과 동일 타이밍

---

## 8. 키 기반 누적 선택

### 내부 구현

CrudSheet 내부에 `selectedKeys` Set을 관리:

```typescript
const [selectedKeys, setSelectedKeys] = createSignal<Set<string | number>>(new Set());
```

### 동기화 로직

1. **DataSheet → CrudSheet (사용자가 선택 변경)**:
   - 현재 페이지 아이템의 key 중 선택된 것 추가, 해제된 것 제거
   - 다른 페이지의 key는 보존 (누적)

2. **CrudSheet → DataSheet (items 변경 시)**:
   - 새 items에서 `selectedKeys`에 매칭되는 아이템을 `selectedItems`로 복원

3. **자동 초기화 없음** (v12 동일)

### CrudSheetContext 추가

```typescript
interface CrudSheetContext<TItem> {
  // ... 기존
  clearSelection(): void;  // 추가
}
```

- 사용자가 원하는 시점에 `ctx.clearSelection()`으로 초기화

---

## 9. itemsPerPage 제거

### search 시그니처 변경

```typescript
// Before
search: (filter: TFilter, page: number, sorts: SortingDef[]) => Promise<SearchResult<TItem>>

// After
search: (filter: TFilter, page: number | undefined, sorts: SortingDef[]) => Promise<SearchResult<TItem>>
```

### 동작

- 일반 조회: `search(filter, page(), sorts)` — page 숫자 전달
- 엑셀 다운로드: `search(filter, undefined, sorts)` — 전체 조회
- CrudSheet에서 `itemsPerPage` prop 제거
- DataSheet에 `itemsPerPage` 전달하지 않음 (서버 사이드 페이지네이션)
- pagination UI: `totalPageCount > 0`이면 표시

---

## 변경하지 않는 항목

### 1. Summary
컬럼별 `summary` prop이 DataSheet/CrudSheet.Column 모두 이미 동작.
Angular에서는 template 제약으로 `summaryData` signal이 필요했지만, SolidJS에서는 컬럼별 render prop으로 충분.

### 10. hideAutoTools
SolidJS에서는 `boolean` prop이라도 `hideAutoTools={someSignal()}`로 넘기면 반응적으로 동작. 변경 불필요.
