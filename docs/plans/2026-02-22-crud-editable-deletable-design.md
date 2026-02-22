# CrudDetail/CrudSheet: editable/deletable 추가

## 배경

Angular(`sd-data-detail`, `sd-data-sheet`)에서 SolidJS로 migration 시 `canDelete`(행별 삭제 가능 여부)와 행별 `canEdit`가 누락됨.

사용 예: 사용자 데이터 페이지에서 현재 로그인한 사용자는 edit 가능하나 delete 불가.

## 네이밍

기존 `canEdit`을 `editable`로 rename하고, 행별 prop을 `itemEditable`/`itemDeletable`로 추가.

| 범위 | prop | 타입 | 기본값 |
|------|------|------|--------|
| 전체 편집 권한 | `editable` | `() => boolean` | `true` |
| 행별 편집 가능 | `itemEditable` | `(item: TItem) => boolean` | `true` |
| 행별 삭제 가능 | `itemDeletable` | `(item: TItem) => boolean` | `true` |

## CrudDetail 변경

### types.ts

```typescript
interface CrudDetailProps<TData extends object> {
  // canEdit → editable (rename)
  editable?: () => boolean;
  // NEW
  deletable?: () => boolean;
  // ... 나머지 기존 props
}
```

- `deletable`은 단일 아이템 뷰이므로 `item` prefix 불필요.

### CrudDetail.tsx

삭제/복구 버튼 표시 조건 변경 (페이지 모드 toolbar + 모달 하단 바 모두):

```
기존: local.toggleDelete && info()
변경: local.toggleDelete && info() && !info()!.isNew && (local.deletable?.() ?? true)
```

`canEdit` → `editable` rename 반영.

## CrudSheet 변경

### types.ts

```typescript
interface CrudSheetBaseProps<TItem, TFilter> {
  // canEdit → editable (rename)
  editable?: () => boolean;
  // NEW
  itemEditable?: (item: TItem) => boolean;
  itemDeletable?: (item: TItem) => boolean;
  // ... 나머지 기존 props
}
```

### CrudSheet.tsx

#### 1. `canEdit` → `editable` rename

내부 변수/함수에서 `canEdit` 참조를 `editable`로 변경.

#### 2. 모달 editable 컬럼 링크

```typescript
// 기존
if (local.modalEdit && col.editable && canEdit()) {

// 변경
if (local.modalEdit && col.editable && canEdit() && (local.itemEditable?.(dsCtx.item) ?? true)) {
```

`itemEditable`이 false인 행은 편집 링크 대신 일반 셀로 렌더링.

#### 3. 인라인 삭제 버튼

```typescript
// 기존: 항상 클릭 가능한 Link
<Link theme="danger" onClick={() => handleToggleDelete(dsCtx.item, dsCtx.index)}>

// 변경: itemDeletable 체크
<Link
  theme="danger"
  disabled={!(local.itemDeletable?.(dsCtx.item) ?? true)}
  onClick={() => handleToggleDelete(dsCtx.item, dsCtx.index)}
>
```

#### 4. 모달 "선택 삭제" 버튼

```typescript
// 기존
disabled={selectedItems().length === 0}

// 변경: 선택된 아이템 중 삭제 가능한 게 있는지 체크
disabled={selectedItems().length === 0 || !selectedItems().some((item) => local.itemDeletable?.(item) ?? true)}
```

## 하위 호환

- 모든 새 prop은 optional, 미지정 시 `true` (기존 동작 유지)
- `canEdit` → `editable` rename은 breaking change (초기 단계이므로 허용)
