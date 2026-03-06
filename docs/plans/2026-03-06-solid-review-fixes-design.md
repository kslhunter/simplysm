# Solid Package Review Fixes Design

## Overview

`packages/solid` 코드 리뷰에서 발견된 16개 finding을 수정하는 설계. Echarts는 이미 수정 완료.

## Changes

### 1. CrudDetail: setReady after failed load (CRITICAL)

**File**: `components/features/crud-detail/CrudDetail.tsx`
**Change**: `doLoad()`에서 `setReady(true)`를 try 블록 안으로 이동, `setBusyCount` 감소를 finally로 이동.

### 2. NotificationProvider.error re-throw (WARNING)

**File**: `components/feedback/notification/NotificationProvider.tsx`
**Change**: non-Error 값도 danger 알림으로 변환. string이면 그대로, null/undefined면 generic 메시지. re-throw 제거.

### 3. CrudSheet concurrent refresh (WARNING)

**File**: `components/features/crud-sheet/CrudSheet.tsx`
**Change**: `doRefresh`에 version counter 추가. await 후 현재 version과 비교하여 stale이면 결과 무시. `setReady(true)`도 try 안으로 이동, `setBusyCount`는 finally로 이동.

### 4. SharedDataProvider swallowed rejection (WARNING)

**File**: `providers/shared-data/SharedDataProvider.tsx`
**Change**: `void client.addEventListener(...).then(...)` 체인에 `.catch()` 추가. catch에서 `initialized = false`로 리셋하여 다음 접근 시 재시도.

### 5. CrudSheet handleExcelUpload DOM leak (WARNING)

**File**: `components/features/crud-sheet/CrudSheet.tsx`
**Change**: `handleExcelUpload` 내부에서 매번 `document.createElement`하던 것을 컴포넌트 레벨 단일 persistent input으로 변경, 매 호출마다 재사용.

### 6. isItemSelectable type (WARNING)

**File**: `components/data/sheet/types.ts`
**Change**: `isItemSelectable?: (item: TItem) => boolean | string` → `(item: TItem) => true | string`. CrudSheet의 동일 타입도 함께 변경. consumer 코드에서 `false` 반환 시 타입 에러로 감지됨 (breaking change 허용).

### 7. Select onValueChange undefined (WARNING)

**File**: `components/form-control/select/Select.tsx`
**Change**: `SelectSingleBaseProps`의 `onValueChange?: (value: TValue) => void` → `(value: TValue | undefined) => void`.

### 8. `as unknown as` removal — compound component interfaces (WARNING)

**Files**: `Sidebar.tsx`, `Tabs.tsx`, `Dropdown.tsx`, `Print.tsx`, `CrudDetail.tsx`, `DataSheet.tsx`, `CrudSheet.tsx`, `TextInput.tsx`, `SharedDataProvider.tsx`, `DataSelectButton.tsx`, `SharedDataSelect.tsx`, `SharedDataSelectButton.tsx`, `EditorToolbar.tsx`
**Change**: `XxxComponent` interface 제거, `Object.assign(Inner, { Sub1, Sub2 })` 결과를 직접 export. `as unknown as` 제거. splitProps/context casts도 타입 전파 개선으로 제거.

### 9. Single-letter generic `<T>` (WARNING)

**Files**: `Select.tsx`, `Combobox.tsx`, `DataSheet.tsx`, `Kanban.tsx`
**Change**: `<T>` → `<TValue>` (Select, Combobox), `<TItem>` (DataSheet), `<TCard>` (Kanban). 파일 내 모든 `T` 참조를 일괄 변경.

### 10. notification/index.ts barrel removal (WARNING)

**File**: `components/feedback/notification/index.ts`
**Change**: barrel 파일 삭제. `src/index.ts`의 기존 re-export 확인 필요 — barrel을 참조하는 경우 개별 파일 경로로 변경.

### 11. Record<string, any> → Record<string, unknown> (WARNING)

**Files**: `Dialog.tsx`, `CrudSheet.tsx`, `crud-sheet/types.ts`
**Change**: `Record<string, any>` → `Record<string, unknown>`.

### 12. CrudDetail toolbar condition extraction (HIGH)

**File**: `components/features/crud-detail/CrudDetail.tsx`
**Change**: 3곳에서 반복되는 조건식을 변수로 추출:
- `const showSave = () => canEdit() && local.submit;`
- `const showDelete = () => canEdit() && local.toggleDelete && info() && !info()!.isNew && (local.deletable ?? true);`

3곳의 JSX 구조는 모드별로 다르므로 유지.

### 13. Invalid target element createMemo (HIGH)

**File**: `components/form-control/Invalid.tsx`
**Change**: 4개 `createEffect`에서 각각 `resolved.toArray().find(...)` 하던 것을 `createMemo`로 한 번만 해석. 4개 effect에서 memo 값을 공유.

### 14. EditorToolbar descriptor array (HIGH)

**File**: `components/form-control/editor/EditorToolbar.tsx`
**Change**: 18개 toolbar 버튼을 descriptor 배열로 정의 (icon, i18n key, active check, command, group). `createEditorTransaction` 14회 반복도 배열에서 파생. `<For>` 루프로 렌더링, group 경계에 separator 자동 삽입.

### 15. DataSheet JSX sub-render functions (MEDIUM)

**File**: `components/data/sheet/DataSheet.tsx`
**Change**: 525-line JSX에서 header cell renderer, feature column cells (expand/select/reorder), summary row를 같은 파일 내 named render function으로 추출.

### 16. Barcode type extraction (LOW)

**Files**: `components/display/Barcode.tsx` → `Barcode.types.ts`
**Change**: `BarcodeType` union 타입을 `Barcode.types.ts`로 분리. `Barcode.tsx`에서 import.
