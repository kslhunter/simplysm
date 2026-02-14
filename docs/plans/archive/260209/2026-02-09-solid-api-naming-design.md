# Solid 컴포넌트 API 명칭 표준화 — 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `packages/solid` 컴포넌트 라이브러리의 22개 API 명칭을 업계 표준에 맞게 변경한다.

**Architecture:** prop 이름 변경 리팩토링. 각 Task에서 타입 정의 → 구현 → 사용처 → 테스트를 순서대로 수정하고, typecheck로 누락을 검증한다. 반전 prop(`disable*`→`*able`, `hide*`→`*able`)은 기본값 로직을 함께 변경한다.

**Tech Stack:** TypeScript, SolidJS, Vitest

---

### Task 1: Sheet 함수 props 이름 변경

5개 함수 prop의 이름을 변경한다.

| 현재                  | 변경 후            |
| --------------------- | ------------------ |
| `getChildrenFn`       | `getChildren`      |
| `getItemSelectableFn` | `isItemSelectable` |
| `getItemCellClassFn`  | `cellClass`        |
| `getItemCellStyleFn`  | `cellStyle`        |
| `trackByFn`           | `getItemId`        |

**Files:**

- Modify: `packages/solid/src/components/data/sheet/types.ts`
- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx`
- Modify: `packages/solid/src/components/data/sheet/SheetColumn.tsx` (해당 시)
- Modify: `packages/solid-demo/src/pages/data/SheetPage.tsx`

**Step 1: 타입 정의 변경**

`types.ts`에서 prop 이름 변경:

- `trackByFn` → `getItemId` (line 6)
- `getChildrenFn` → `getChildren` (line 36)
- `getItemSelectableFn` → `isItemSelectable` (line 31)
- `getItemCellClassFn` → `cellClass` (line 39)
- `getItemCellStyleFn` → `cellStyle` (line 40)

**Step 2: 구현 변경**

`Sheet.tsx`에서 `splitProps`와 모든 참조를 새 이름으로 변경. `formatNumber` 내부 파라미터명 `useComma`는 로컬 변수이므로 변경 불필요.

**Step 3: 사용처 변경**

`SheetPage.tsx`에서:

- `getChildrenFn={(item) => item.children}` → `getChildren={...}`
- `getItemSelectableFn={...}` → `isItemSelectable={...}`

**Step 4: typecheck**

```bash
pnpm typecheck packages/solid
pnpm typecheck packages/solid-demo
```

**Step 5: Commit**

```
refactor(solid): Sheet 함수 prop 이름 표준화

getChildrenFn→getChildren, getItemSelectableFn→isItemSelectable,
getItemCellClassFn→cellClass, getItemCellStyleFn→cellStyle,
trackByFn→getItemId
```

---

### Task 2: Sheet boolean/enum props 변경

| 현재                 | 변경 후                 | 주의                        |
| -------------------- | ----------------------- | --------------------------- |
| `useAutoSort`        | `autoSort`              | 단순 이름 변경              |
| `selectMode="multi"` | `selectMode="multiple"` | 값 변경                     |
| `disableSorting`     | `sortable`              | 반전. 기본값 로직 변경 필요 |
| `disableResizing`    | `resizable`             | 반전. 기본값 로직 변경 필요 |

**Files:**

- Modify: `packages/solid/src/components/data/sheet/types.ts`
- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx`
- Modify: `packages/solid/src/components/data/sheet/SheetColumn.tsx`
- Modify: `packages/solid-demo/src/pages/data/SheetPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/SheetFullPage.tsx`

**Step 1: 타입 정의 변경**

`types.ts`:

- `useAutoSort?: boolean` → `autoSort?: boolean`
- `selectMode?: "single" | "multi"` → `selectMode?: "single" | "multiple"`
- `disableSorting?: boolean` → `sortable?: boolean` (SheetColumnProps + SheetColumnDef)
- `disableResizing?: boolean` → `resizable?: boolean` (SheetColumnProps + SheetColumnDef)

**Step 2: 구현 변경 — 반전 로직**

`SheetColumn.tsx`:

```typescript
// 변경 전
disableSorting: props.disableSorting ?? false,
disableResizing: props.disableResizing ?? false,

// 변경 후
sortable: props.sortable ?? true,
resizable: props.resizable ?? true,
```

`Sheet.tsx`:

```typescript
// 변경 전
!effectiveColumns()[c().colIndex!].disableSorting;
!effectiveColumns()[c().colIndex!].disableResizing;

// 변경 후
effectiveColumns()[c().colIndex!].sortable;
effectiveColumns()[c().colIndex!].resizable;
```

`selectMode` 비교:

```typescript
// "multi" → "multiple" 전체 치환
local.selectMode === "multi" → local.selectMode === "multiple"
```

**Step 3: 사용처 변경**

데모 파일에서 prop 이름/값 변경.

**Step 4: typecheck**

```bash
pnpm typecheck packages/solid
pnpm typecheck packages/solid-demo
```

**Step 5: Commit**

```
refactor(solid): Sheet boolean/enum prop 이름 표준화

useAutoSort→autoSort, selectMode "multi"→"multiple",
disableSorting→sortable, disableResizing→resizable
```

---

### Task 3: Modal props 변경

| 현재                  | 변경 후           | 주의                        |
| --------------------- | ----------------- | --------------------------- |
| `useCloseByBackdrop`  | `closeOnBackdrop` | 단순 이름 변경              |
| `useCloseByEscapeKey` | `closeOnEscape`   | 단순 이름 변경              |
| `hideCloseButton`     | `closable`        | 반전. 기본값 로직 변경 필요 |

**Files:**

- Modify: `packages/solid/src/components/disclosure/Modal.tsx`
- Modify: `packages/solid/src/components/disclosure/ModalContext.ts`
- Modify: `packages/solid/src/components/disclosure/ModalProvider.tsx`
- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx` (Modal 내부 사용)
- Modify: `packages/solid-demo/src/pages/disclosure/ModalPage.tsx`
- Modify: `packages/solid/tests/components/disclosure/Modal.spec.tsx`

**Step 1: 타입 및 context 변경**

`ModalContext.ts`:

- `hideCloseButton` → `closable`
- `useCloseByBackdrop` → `closeOnBackdrop`
- `useCloseByEscapeKey` → `closeOnEscape`

`Modal.tsx` props interface: 동일 변경.

**Step 2: 구현 변경 — 반전 로직**

`Modal.tsx`:

```typescript
// 변경 전
<Show when={!local.hideCloseButton}>

// 변경 후
<Show when={local.closable ?? true}>
```

```typescript
// 변경 전
if (!local.useCloseByBackdrop) return;
if (!local.useCloseByEscapeKey) return;

// 변경 후
if (!local.closeOnBackdrop) return;
if (!local.closeOnEscape) return;
```

**Step 3: 사용처 변경**

`ModalProvider.tsx`, `Sheet.tsx` (내부 Modal 호출), `ModalPage.tsx` (데모), `Modal.spec.tsx` (테스트).

**Step 4: typecheck + test**

```bash
pnpm typecheck packages/solid
pnpm typecheck packages/solid-demo
pnpm vitest packages/solid/tests/components/disclosure/Modal.spec.tsx --project=solid --run
```

**Step 5: Commit**

```
refactor(solid): Modal prop 이름 표준화

useCloseByBackdrop→closeOnBackdrop, useCloseByEscapeKey→closeOnEscape,
hideCloseButton→closable
```

---

### Task 4: Dropdown + NumberField props 변경

| 현재                | 변경 후       | 컴포넌트    |
| ------------------- | ------------- | ----------- |
| `enableKeyboardNav` | `keyboardNav` | Dropdown    |
| `useComma`          | `comma`       | NumberField |

**Files:**

- Modify: `packages/solid/src/components/disclosure/Dropdown.tsx`
- Modify: `packages/solid/src/components/form-control/select/Select.tsx` (Dropdown 사용처)
- Modify: `packages/solid/tests/components/overlay/Dropdown.spec.tsx`
- Modify: `packages/solid/src/components/form-control/field/NumberField.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/FieldPage.tsx`
- Modify: `packages/solid/tests/components/form-control/field/NumberField.spec.tsx`

**Step 1: Dropdown 변경**

`Dropdown.tsx`: `enableKeyboardNav` → `keyboardNav` (인터페이스, splitProps, 3개 조건문)
`Select.tsx`: `enableKeyboardNav` → `keyboardNav`

**Step 2: NumberField 변경**

`NumberField.tsx`: `useComma` → `comma` (인터페이스, splitProps, 모든 참조)
`formatNumber` 내부 파라미터명은 로컬 변수이므로 선택 사항.

**Step 3: 사용처/테스트 변경**

**Step 4: typecheck + test**

```bash
pnpm typecheck packages/solid
pnpm typecheck packages/solid-demo
pnpm vitest packages/solid/tests/components/overlay/Dropdown.spec.tsx --project=solid --run
pnpm vitest packages/solid/tests/components/form-control/field/NumberField.spec.tsx --project=solid --run
```

**Step 5: Commit**

```
refactor(solid): Dropdown, NumberField prop 이름 표준화

enableKeyboardNav→keyboardNav, useComma→comma
```

---

### Task 5: DateRangePicker 한국어 리터럴 → 영어

| 현재     | 변경 후   |
| -------- | --------- |
| `"일"`   | `"day"`   |
| `"월"`   | `"month"` |
| `"범위"` | `"range"` |

**Files:**

- Modify: `packages/solid/src/components/form-control/date-range-picker/DateRangePicker.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/DateRangePickerPage.tsx`
- Modify: `packages/solid/tests/components/form-control/date-range-picker/DateRangePicker.spec.tsx`

**Step 1: 타입 변경**

```typescript
// 변경 전
export type DateRangePeriodType = "일" | "월" | "범위";

// 변경 후
export type DateRangePeriodType = "day" | "month" | "range";
```

**Step 2: 구현 변경**

`DateRangePicker.tsx` 내부의 모든 한국어 리터럴을 영어로 치환:

- 기본값 `"범위"` → `"range"`
- 조건 비교 `=== "범위"` → `=== "range"`, `=== "월"` → `=== "month"`
- SelectItem의 `value` 속성값

SelectItem의 표시 텍스트는 한국어 유지 (UI 표시용):

```typescript
<SelectItem value={"day" as DateRangePeriodType}>일</SelectItem>
<SelectItem value={"month" as DateRangePeriodType}>월</SelectItem>
<SelectItem value={"range" as DateRangePeriodType}>범위</SelectItem>
```

**Step 3: 사용처/테스트 변경**

데모와 테스트의 모든 `"일"`, `"월"`, `"범위"` 값을 영어로 변경.

**Step 4: typecheck + test**

```bash
pnpm typecheck packages/solid
pnpm typecheck packages/solid-demo
pnpm vitest packages/solid/tests/components/form-control/date-range-picker --project=solid --run
```

**Step 5: Commit**

```
refactor(solid): DateRangePicker periodType 한국어→영어 리터럴

"일"→"day", "월"→"month", "범위"→"range"
```

---

### Task 6: Pagination 명칭 통일

| 현재           | 변경 후            | 컴포넌트   |
| -------------- | ------------------ | ---------- |
| `totalPages`   | `totalPageCount`   | Pagination |
| `displayPages` | `displayPageCount` | Pagination |

**Files:**

- Modify: `packages/solid/src/components/data/Pagination.tsx`
- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx` (Pagination에 전달하는 부분)
- Modify: `packages/solid-demo/src/pages/data/PaginationPage.tsx`
- Modify: `packages/solid/tests/components/data/Pagination.spec.tsx` (대량 수정)

**Step 1: Pagination 컴포넌트 변경**

인터페이스, splitProps, 내부 참조 모두 변경.

**Step 2: Sheet 내부 Pagination 호출 변경**

`Sheet.tsx`에서 Pagination에 전달하는 prop 이름 변경:

```typescript
// 변경 전
totalPages={effectivePageCount()}
displayPages={local.displayPageCount}

// 변경 후
totalPageCount={effectivePageCount()}
displayPageCount={local.displayPageCount}
```

**Step 3: 데모/테스트 변경**

`Pagination.spec.tsx`에 `totalPages`/`displayPages` 사용 라인이 매우 많음 (40개+). 일괄 치환.

**Step 4: typecheck + test**

```bash
pnpm typecheck packages/solid
pnpm typecheck packages/solid-demo
pnpm vitest packages/solid/tests/components/data/Pagination.spec.tsx --project=solid --run
```

**Step 5: Commit**

```
refactor(solid): Pagination prop 이름을 Sheet과 통일

totalPages→totalPageCount, displayPages→displayPageCount
```

---

### Task 7: ThemeToggle size "default" 제거

**Files:**

- Modify: `packages/solid/src/components/form-control/ThemeToggle.tsx`

**Step 1: 타입 변경**

```typescript
// 변경 전
size?: "sm" | "default" | "lg";

// 변경 후
size?: "sm" | "lg";
```

**Step 2: 구현 변경**

`sizeClasses`와 `iconSizes` 객체에서 `"default"` 키를 제거하고, 기본값 로직 수정:

```typescript
// 변경 전
const getClassName = () => twMerge(baseClass, sizeClasses[local.size ?? "default"], local.class);

// 변경 후: undefined일 때 기본 크기 클래스 적용
// sizeClasses에서 "default" 키의 값을 baseClass에 통합하거나 별도 처리
```

기존 `sizeClasses["default"]`의 값을 확인하여 `undefined` 분기로 이동 필요.

**Step 3: typecheck**

```bash
pnpm typecheck packages/solid
pnpm typecheck packages/solid-demo
```

**Step 4: Commit**

```
refactor(solid): ThemeToggle size에서 "default" 값 제거

다른 컴포넌트와 동일하게 size="sm"|"lg", 기본=undefined
```

---

### Task 8: DateField/TimeField/DateTimeField type→unit

| 컴포넌트      | 현재                              | 변경 후                        |
| ------------- | --------------------------------- | ------------------------------ |
| DateField     | `type="year"\|"month"\|"date"`    | `unit="year"\|"month"\|"date"` |
| TimeField     | `type="time"\|"time-sec"`         | `unit="minute"\|"second"`      |
| DateTimeField | `type="datetime"\|"datetime-sec"` | `unit="minute"\|"second"`      |

**Files:**

- Modify: `packages/solid/src/components/form-control/field/DateField.tsx`
- Modify: `packages/solid/src/components/form-control/field/TimeField.tsx`
- Modify: `packages/solid/src/components/form-control/field/DateTimeField.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/FieldPage.tsx`
- Modify: `packages/solid/tests/components/form-control/field/DateField.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/field/TimeField.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/field/DateTimeField.spec.tsx`

**Step 1: DateField 변경**

타입 정의:

```typescript
// 변경 전
type DateFieldType = "year" | "month" | "date";
// prop: type?: DateFieldType

// 변경 후
type DateFieldUnit = "year" | "month" | "date";
// prop: unit?: DateFieldUnit
```

내부 로직: `local.type` → `local.unit`, `fieldType` 변수명은 `fieldUnit`으로 변경 권장.

**Step 2: TimeField 변경**

타입 + 값 변경:

```typescript
// 변경 전
type TimeFieldType = "time" | "time-sec";

// 변경 후
type TimeFieldUnit = "minute" | "second";
```

내부 로직에서 `"time"` → `"minute"`, `"time-sec"` → `"second"` 비교문 변경.

**Step 3: DateTimeField 변경**

동일 패턴:

```typescript
// 변경 전
type DateTimeFieldType = "datetime" | "datetime-sec";

// 변경 후
type DateTimeFieldUnit = "minute" | "second";
```

**Step 4: 사용처/테스트 변경**

데모 파일과 테스트 파일의 `type=` → `unit=`, 값도 함께 변경.

주의: `DateRangePicker.tsx` 내부에서 `DateField`에 `type`을 전달하는 부분도 `unit`으로 변경 필요.

**Step 5: typecheck + test**

```bash
pnpm typecheck packages/solid
pnpm typecheck packages/solid-demo
pnpm vitest packages/solid/tests/components/form-control/field/DateField.spec.tsx --project=solid --run
pnpm vitest packages/solid/tests/components/form-control/field/TimeField.spec.tsx --project=solid --run
pnpm vitest packages/solid/tests/components/form-control/field/DateTimeField.spec.tsx --project=solid --run
```

**Step 6: Commit**

```
refactor(solid): DateField/TimeField/DateTimeField type→unit

type prop을 unit으로 변경하고, TimeField/DateTimeField 값을
minute/second로 통일
```

---

### Task 9: BusyContainer/Provider type→variant

**Files:**

- Modify: `packages/solid/src/components/feedback/busy/BusyContext.ts`
- Modify: `packages/solid/src/components/feedback/busy/BusyContainer.tsx`
- Modify: `packages/solid/src/components/feedback/busy/BusyProvider.tsx`
- Modify: `packages/solid-demo/src/pages/feedback/BusyPage.tsx`

**Step 1: 타입 변경**

`BusyContext.ts`:

```typescript
// 변경 전
export type BusyType = "spinner" | "bar";

// 변경 후
export type BusyVariant = "spinner" | "bar";
```

**Step 2: 구현 변경**

`BusyContainer.tsx`, `BusyProvider.tsx`:

- prop 이름 `type` → `variant`
- 타입 `BusyType` → `BusyVariant`
- 내부 변수명 `currType` → `currVariant` 등

**Step 3: 사용처 변경**

**Step 4: typecheck**

```bash
pnpm typecheck packages/solid
pnpm typecheck packages/solid-demo
```

**Step 5: Commit**

```
refactor(solid): BusyContainer/Provider type→variant

비주얼 스타일 변형은 variant가 업계 표준
```

---

### Task 10: 최종 검증

**Step 1: 전체 typecheck**

```bash
pnpm typecheck
```

**Step 2: 전체 lint**

```bash
pnpm lint packages/solid
pnpm lint packages/solid-demo
```

**Step 3: 전체 테스트**

```bash
pnpm vitest packages/solid --project=solid --run
```

**Step 4: 데모 앱 확인**

```bash
pnpm dev
```

브라우저에서 데모 앱 동작 확인.

**Step 5: Commit (lint 수정 등 있을 경우)**

```
fix(solid): API 명칭 표준화 후 lint/타입 수정
```
