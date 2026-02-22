# packages/solid Review Fixes Design

## Overview

`/sd-review solid` 결과에서 확인된 수정 대상 이슈 9건.

## Fixes

### P0-1: ColorPicker validation bug

- **파일:** `components/form-control/color-picker/ColorPicker.tsx:109`
- **문제:** `errorMsg` memo가 controllable signal `value()` 대신 `props.value`를 직접 읽음. uncontrolled 모드에서 검증이 초기값 기준으로 동작.
- **수정:** `props.value` → `value()`

### P0-2: selectMode 값 불일치

- **파일:** `components/data/crud-sheet/types.ts:88`, `CrudSheet.tsx:501-508`
- **문제:** CrudSheet은 `"multi"`, DataSheet은 `"multiple"` 사용. 개발자 혼란 유발.
- **수정:** CrudSheet의 `"multi"` → `"multiple"`로 통일. 내부 변환 코드 제거.

### P1-1: createPointerDrag pointercancel 누락

- **파일:** `hooks/createPointerDrag.ts`
- **문제:** `pointercancel` 핸들러 없어 리스너 누수 및 고스트 드래그 가능.
- **수정:** `pointercancel` 리스너 추가, cleanup 함수 분리.

### P2-1: Dropdown createControllableSignal 미사용

- **파일:** `components/disclosure/Dropdown.tsx:157-171`
- **문제:** Dialog, Tabs는 `createControllableSignal` 사용, Dropdown만 수동 구현.
- **수정:** `createControllableSignal`로 리팩토링.

### P2-2: ColorPicker inset/size 확장

- **파일:** `components/form-control/color-picker/ColorPicker.tsx`
- **문제:** 다른 form control은 모두 `inset` prop과 `ComponentSize` 지원, ColorPicker만 누락.
- **수정:** `inset?: boolean` 추가, `ComponentSizeCompact` → `ComponentSize`로 확장, `xs`/`xl` 사이즈 클래스 추가.

### P3-1: Inset 듀얼 엘리먼트 패턴 공유 wrapper 추출

- **파일:** TextInput, NumberInput, DatePicker, TimePicker
- **문제:** inset 모드의 동일한 JSX 구조(~30줄)가 4개 컴포넌트에서 반복.
- **수정:** 공유 wrapper 컴포넌트 추출 (예: `InsetFieldWrapper`).

### P3-2: SlotAccessor → createSlotSignal 유틸리티

- **파일:** Dialog, Dropdown, TextInput, NumberInput, Select, Kanban 등 7개+
- **문제:** `SlotAccessor` 타입과 시그널 wrapper 패턴 반복.
- **수정:** `createSlotSignal()` 유틸리티 추출.

### P3-3: DataSheetColumn/CrudSheetColumn 공유 팩토리

- **파일:** `DataSheetColumn.tsx`, `CrudSheetColumn.tsx`
- **문제:** CrudSheetColumn = DataSheetColumn + `editTrigger` 하나. guard 함수도 동일.
- **수정:** 공유 팩토리 함수로 중복 제거.

### P4-1: index.ts export * 통일

- **파일:** `index.ts:118-197`
- **문제:** Providers, Hooks, Directives, Helpers 섹션에서 명시적 named export 사용. CLAUDE.md 규칙 위반.
- **수정:** 모두 `export *`로 통일.
