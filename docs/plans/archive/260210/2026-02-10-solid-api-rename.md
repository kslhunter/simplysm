# @simplysm/solid API 네이밍 표준화 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** @simplysm/solid 패키지의 컴포넌트 이름을 업계 표준에 맞춰 일괄 변경한다.

**Architecture:** 각 컴포넌트별로 파일 이름 변경(git mv) → 내부 코드 수정 → export 수정 → 소비자(demo, test) 수정 순으로 진행한다. 모든 변경 후 typecheck/lint/test로 검증한다.

**Tech Stack:** TypeScript, SolidJS, pnpm workspace

---

## 변경 목록 요약

| #   | 현재                      | 변경 후                          |
| --- | ------------------------- | -------------------------------- |
| 1   | `Note`                    | `Alert`                          |
| 2   | `Label`                   | `Tag`                            |
| 3   | `TextField`               | `TextInput`                      |
| 4   | `NumberField`             | `NumberInput`                    |
| 5   | `DateField`               | `DatePicker`                     |
| 6   | `DateTimeField`           | `DateTimePicker`                 |
| 7   | `TimeField`               | `TimePicker`                     |
| 8   | `TextAreaField`           | `Textarea`                       |
| 9   | `CheckBox`                | `Checkbox`                       |
| 10  | `CheckBoxGroup`           | `CheckboxGroup`                  |
| 11  | `Tab` / `Tab.Item`        | `Tabs` / `Tabs.Tab`              |
| 12  | `Select.Button`           | `Select.Action`                  |
| 13  | `BusyContainer`           | `LoadingContainer`               |
| 14  | `BusyProvider`            | `LoadingProvider`                |
| 15  | `BusyContext` / `useBusy` | `LoadingContext` / `useLoading`  |
| 16  | `Modal` / `useModal`      | `Dialog` / `useDialog`           |
| 17  | `ModalContext`            | `DialogContext`                  |
| 18  | `ModalProvider`           | `DialogProvider`                 |
| 19  | `Sheet` / `Sheet.Column`  | `DataSheet` / `DataSheet.Column` |

---

### Task 1: Note → Alert, Label → Tag

**Files:**

- Rename: `packages/solid/src/components/display/Note.tsx` → `Alert.tsx`
- Rename: `packages/solid/src/components/display/Label.tsx` → `Tag.tsx`
- Modify: `packages/solid/src/index.ts` (줄 51-52)
- Rename: `packages/solid/tests/components/display/Note.spec.tsx` → `Alert.spec.tsx`
- Rename: `packages/solid/tests/components/display/Label.spec.tsx` → `Tag.spec.tsx`
- Modify: `packages/solid-demo/src/pages/display/NotePage.tsx`
- Modify: `packages/solid-demo/src/pages/display/LabelPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/TablePage.tsx` (Label import)
- Modify: `packages/solid-demo/src/pages/form-control/ThemeTogglePage.tsx` (Note import)
- Modify: `packages/solid-demo/src/appStructure.ts` (줄 95-96 title 수정)

**Step 1: 파일 이름 변경**

```bash
cd packages/solid
git mv src/components/display/Note.tsx src/components/display/Alert.tsx
git mv src/components/display/Label.tsx src/components/display/Tag.tsx
git mv tests/components/display/Note.spec.tsx tests/components/display/Alert.spec.tsx
git mv tests/components/display/Label.spec.tsx tests/components/display/Tag.spec.tsx
```

**Step 2: Alert.tsx 내부 수정**

- `Note` → `Alert` (컴포넌트 이름)
- `NoteTheme` → `AlertTheme` (타입)
- `NoteProps` → `AlertProps` (타입)

**Step 3: Tag.tsx 내부 수정**

- `Label` → `Tag` (컴포넌트 이름)
- `LabelTheme` → `TagTheme` (타입)
- `LabelProps` → `TagProps` (타입)

**Step 4: index.ts export 경로 수정**

```typescript
// 줄 51-52
export * from "./components/display/Tag"; // was Label
export * from "./components/display/Alert"; // was Note
```

**Step 5: 테스트 파일 내부 수정**

- `Alert.spec.tsx`: import `Alert` from `Alert`, describe 텍스트 수정
- `Tag.spec.tsx`: import `Tag` from `Tag`, describe 텍스트 수정

**Step 6: 데모 파일 수정**

- `NotePage.tsx`: `Note` → `Alert`, `NoteTheme` → `AlertTheme`
- `LabelPage.tsx`: `Label` → `Tag`, `LabelTheme` → `TagTheme`
- `TablePage.tsx`: import `Label` → `Tag`, JSX 사용처 수정
- `ThemeTogglePage.tsx`: import `Note` → `Alert`, JSX 사용처 수정
- `appStructure.ts`: 줄 95 `title: "Label"` → `title: "Tag"`, 줄 96 `title: "Note"` → `title: "Alert"`

---

### Task 2: 필드 컴포넌트 6개 이름 변경

**Files:**

- Rename: `packages/solid/src/components/form-control/field/TextField.tsx` → `TextInput.tsx`
- Rename: `packages/solid/src/components/form-control/field/NumberField.tsx` → `NumberInput.tsx`
- Rename: `packages/solid/src/components/form-control/field/DateField.tsx` → `DatePicker.tsx`
- Rename: `packages/solid/src/components/form-control/field/DateTimeField.tsx` → `DateTimePicker.tsx`
- Rename: `packages/solid/src/components/form-control/field/TimeField.tsx` → `TimePicker.tsx`
- Rename: `packages/solid/src/components/form-control/field/TextAreaField.tsx` → `Textarea.tsx`
- Modify: `packages/solid/src/index.ts` (줄 6-11)
- Rename: 6개 테스트 파일 (tests/components/form-control/field/)
- Modify: `packages/solid-demo/src/pages/form-control/FieldPage.tsx` (모든 import)
- Modify: `packages/solid-demo/src/pages/data/SheetPage.tsx` (import 수정)
- Modify: `packages/solid-demo/src/pages/data/SheetFullPage.tsx` (import 수정 가능)
- Modify: `packages/solid-demo/src/pages/layout/FormTablePage.tsx` (TextField, NumberField import)
- Modify: `packages/solid-demo/src/pages/form-control/StatePresetPage.tsx` (TextField import)
- Modify: `packages/solid/src/components/form-control/date-range-picker/DateRangePicker.tsx` (DateField import)
- Modify: `packages/solid/src/components/form-control/numpad/Numpad.tsx` (NumberField import)
- Modify: `packages/solid/src/components/data/sheet/SheetConfigModal.tsx` (TextField import)

**Step 1: 파일 이름 변경**

```bash
cd packages/solid
git mv src/components/form-control/field/TextField.tsx src/components/form-control/field/TextInput.tsx
git mv src/components/form-control/field/NumberField.tsx src/components/form-control/field/NumberInput.tsx
git mv src/components/form-control/field/DateField.tsx src/components/form-control/field/DatePicker.tsx
git mv src/components/form-control/field/DateTimeField.tsx src/components/form-control/field/DateTimePicker.tsx
git mv src/components/form-control/field/TimeField.tsx src/components/form-control/field/TimePicker.tsx
git mv src/components/form-control/field/TextAreaField.tsx src/components/form-control/field/Textarea.tsx
git mv tests/components/form-control/field/TextField.spec.tsx tests/components/form-control/field/TextInput.spec.tsx
git mv tests/components/form-control/field/NumberField.spec.tsx tests/components/form-control/field/NumberInput.spec.tsx
git mv tests/components/form-control/field/DateField.spec.tsx tests/components/form-control/field/DatePicker.spec.tsx
git mv tests/components/form-control/field/DateTimeField.spec.tsx tests/components/form-control/field/DateTimePicker.spec.tsx
git mv tests/components/form-control/field/TimeField.spec.tsx tests/components/form-control/field/TimePicker.spec.tsx
git mv tests/components/form-control/field/TextAreaField.spec.tsx tests/components/form-control/field/Textarea.spec.tsx
```

**Step 2: 각 소스 파일 내부 수정**
각 파일에서 컴포넌트 이름과 Props 타입 이름을 변경:

- `TextInput.tsx`: `TextField` → `TextInput`, `TextFieldProps` → `TextInputProps`
- `NumberInput.tsx`: `NumberField` → `NumberInput`, `NumberFieldProps` → `NumberInputProps`
- `DatePicker.tsx`: `DateField` → `DatePicker`, `DateFieldProps` → `DatePickerProps`
- `DateTimePicker.tsx`: `DateTimeField` → `DateTimePicker`, `DateTimeFieldProps` → `DateTimePickerProps`
- `TimePicker.tsx`: `TimeField` → `TimePicker`, `TimeFieldProps` → `TimePickerProps`
- `Textarea.tsx`: `TextAreaField` → `Textarea`, `TextAreaFieldProps` → `TextareaProps`

**Step 3: index.ts export 경로 수정**

```typescript
// 줄 6-11
export * from "./components/form-control/field/TextInput";
export * from "./components/form-control/field/NumberInput";
export * from "./components/form-control/field/DatePicker";
export * from "./components/form-control/field/DateTimePicker";
export * from "./components/form-control/field/TimePicker";
export * from "./components/form-control/field/Textarea";
```

**Step 4: 내부 소비자 수정**

- `DateRangePicker.tsx`: `import { DateField }` → `import { DatePicker }`, JSX `<DateField` → `<DatePicker`
- `Numpad.tsx`: `import { NumberField }` → `import { NumberInput }`, JSX `<NumberField` → `<NumberInput`
- `SheetConfigModal.tsx`: `import { TextField }` → `import { TextInput }`, JSX `<TextField` → `<TextInput`

**Step 5: 테스트 파일 내부 수정**
각 spec 파일에서 import 경로와 컴포넌트 이름 수정.

**Step 6: 데모 파일 수정**

- `FieldPage.tsx`: 6개 import 이름 변경, JSX 사용처 전부 수정
- `SheetPage.tsx`: import 수정 (`DateField` → `DatePicker`, `DateTimeField` → `DateTimePicker`, `NumberField` → `NumberInput`, `TextField` → `TextInput`, `TextAreaField` → `Textarea`, `TimeField` → `TimePicker`)
- `SheetFullPage.tsx`: 확인 후 필요 시 수정
- `FormTablePage.tsx`: `TextField` → `TextInput`, `NumberField` → `NumberInput`
- `StatePresetPage.tsx`: `TextField` → `TextInput`

---

### Task 3: CheckBox → Checkbox, CheckBoxGroup → CheckboxGroup

**Files:**

- Rename: `packages/solid/src/components/form-control/checkbox/CheckBox.tsx` → `Checkbox.tsx`
- Rename: `packages/solid/src/components/form-control/checkbox/CheckBox.styles.ts` → `Checkbox.styles.ts`
- Rename: `packages/solid/src/components/form-control/checkbox/CheckBoxGroup.tsx` → `CheckboxGroup.tsx`
- Modify: `packages/solid/src/index.ts` (줄 13-14, 16)
- Rename: `packages/solid/tests/components/form-control/checkbox/CheckBox.spec.tsx` → `Checkbox.spec.tsx`
- Modify: 다수의 내부 소비자 (Sheet.tsx, PermissionTable.tsx, Kanban.tsx, SheetConfigModal.tsx, RadioGroup.tsx)
- Modify: 데모 파일 3개

**Step 1: 파일 이름 변경**

```bash
cd packages/solid
git mv src/components/form-control/checkbox/CheckBox.tsx src/components/form-control/checkbox/Checkbox.tsx
git mv src/components/form-control/checkbox/CheckBox.styles.ts src/components/form-control/checkbox/Checkbox.styles.ts
git mv src/components/form-control/checkbox/CheckBoxGroup.tsx src/components/form-control/checkbox/CheckboxGroup.tsx
git mv tests/components/form-control/checkbox/CheckBox.spec.tsx tests/components/form-control/checkbox/Checkbox.spec.tsx
```

**Step 2: Checkbox.styles.ts 수정**

- `CheckBoxTheme` → `CheckboxTheme`
- `CheckBoxSize` → `CheckboxSize`
- `checkBoxBaseClass` → `checkboxBaseClass`
- `checkBoxSizeClasses` → `checkboxSizeClasses`
- `checkBoxInsetClass` → `checkboxInsetClass`
- `checkBoxInsetSizeHeightClasses` → `checkboxInsetSizeHeightClasses`
- `checkBoxInlineClass` → `checkboxInlineClass`
- `checkBoxDisabledClass` → `checkboxDisabledClass`

**Step 3: Checkbox.tsx 수정**

- `CheckBox` → `Checkbox` (컴포넌트)
- `CheckBoxProps` → `CheckboxProps`
- import 경로: `./CheckBox.styles` → `./Checkbox.styles`
- 모든 styles 참조 이름 갱신 (checkBoxBaseClass → checkboxBaseClass 등)

**Step 4: CheckboxGroup.tsx 수정**

- `CheckBoxGroup` → `CheckboxGroup`
- `CheckBoxGroupProps` → `CheckboxGroupProps`
- import: `CheckBox` → `Checkbox`, `CheckBoxSize` → `CheckboxSize`, `CheckBoxTheme` → `CheckboxTheme`

**Step 5: RadioGroup.tsx 수정**

- import: `CheckBoxSize` → `CheckboxSize`, `CheckBoxTheme` → `CheckboxTheme`
- import 경로: `./CheckBox.styles` → `./Checkbox.styles`

**Step 6: index.ts export 수정**

```typescript
export * from "./components/form-control/checkbox/Checkbox";
export * from "./components/form-control/checkbox/Checkbox.styles";
// 줄 16
export * from "./components/form-control/checkbox/CheckboxGroup";
```

**Step 7: 내부 소비자 수정**

- `Sheet.tsx` (줄 28): `import { CheckBox }` → `import { Checkbox }`, JSX `<CheckBox` → `<Checkbox`
- `SheetConfigModal.tsx` (줄 7): 동일
- `PermissionTable.tsx` (줄 6): 동일
- `Kanban.tsx` (줄 17): 동일

**Step 8: 테스트 및 데모 파일 수정**

- `Checkbox.spec.tsx`: import 수정
- `CheckBoxRadioPage.tsx`: `CheckBox` → `Checkbox`, `CheckBoxTheme` → `CheckboxTheme`
- `CheckBoxRadioGroupPage.tsx`: `CheckBoxGroup` → `CheckboxGroup`
- `SheetPage.tsx`: `CheckBox` → `Checkbox`
- `appStructure.ts`: title 수정 `"CheckBox & Radio"` → `"Checkbox & Radio"`, `"CheckBoxGroup & RadioGroup"` → `"CheckboxGroup & RadioGroup"`

---

### Task 4: Tab → Tabs, Tab.Item → Tabs.Tab

**Files:**

- Rename: `packages/solid/src/components/navigation/Tab.tsx` → `Tabs.tsx`
- Modify: `packages/solid/src/index.ts` (줄 25)
- Rename: `packages/solid/tests/components/navigation/Tab.spec.tsx` → `Tabs.spec.tsx`
- Modify: `packages/solid-demo/src/pages/navigation/TabPage.tsx`
- Modify: `packages/solid-demo/src/appStructure.ts` (줄 85)

**Step 1: 파일 이름 변경**

```bash
cd packages/solid
git mv src/components/navigation/Tab.tsx src/components/navigation/Tabs.tsx
git mv tests/components/navigation/Tab.spec.tsx tests/components/navigation/Tabs.spec.tsx
```

**Step 2: Tabs.tsx 내부 수정**

- `Tab` → `Tabs` (컴포넌트)
- `TabProps` → `TabsProps`
- `TabItem` → `TabsTab` (서브 컴포넌트 내부 이름)
- `TabItemProps` → `TabsTabProps`
- `Tab.Item = TabItem` → `Tabs.Tab = TabsTab`
- interface: `TabComponent { Item: ... }` → `TabsComponent { Tab: ... }`
- context 이름: `TabContext` → `TabsContext`, `TabContextValue` → `TabsContextValue`

**Step 3: index.ts export 수정**

```typescript
export * from "./components/navigation/Tabs";
```

**Step 4: 테스트 파일 수정**

- import `Tab` → `Tabs`, describe 텍스트 수정
- `<Tab>` → `<Tabs>`, `<Tab.Item>` → `<Tabs.Tab>`

**Step 5: 데모 파일 수정**

- `TabPage.tsx`: import `Tab` → `Tabs`, JSX `<Tab>` → `<Tabs>`, `<Tab.Item>` → `<Tabs.Tab>`
- `appStructure.ts`: 줄 85 `title: "Tab"` → `title: "Tabs"`

---

### Task 5: Select.Button → Select.Action

**Files:**

- Modify: `packages/solid/src/components/form-control/select/Select.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/SelectPage.tsx`
- Modify: `packages/solid/tests/components/form/select/Select.spec.tsx` (있다면)

**Step 1: Select.tsx 수정**

- `SelectButton` → `SelectAction` (내부 컴포넌트 이름)
- `Select.Button = SelectButton` → `Select.Action = SelectAction`
- interface: `SelectComponent { Button: ... }` → `SelectComponent { Action: ... }`

**Step 2: 데모/테스트 수정**

- `SelectPage.tsx`: `<Select.Button>` → `<Select.Action>`
- 테스트 파일: 확인 후 수정

---

### Task 6: Busy → Loading (3파일 + 디렉토리)

**Files:**

- Rename directory: `packages/solid/src/components/feedback/busy/` → `loading/`
- Rename: `BusyContext.ts` → `LoadingContext.ts`
- Rename: `BusyProvider.tsx` → `LoadingProvider.tsx`
- Rename: `BusyContainer.tsx` → `LoadingContainer.tsx`
- Rename: `BusyContainer.css` → `LoadingContainer.css`
- Modify: `packages/solid/src/index.ts` (줄 69-71)
- Modify: `packages/solid/src/contexts/usePrint.ts` (useBusy import)
- Modify: `packages/solid/src/components/layout/kanban/Kanban.tsx` (BusyContainer import)
- Modify: `packages/solid-demo/src/pages/feedback/BusyPage.tsx`
- Modify: `packages/solid-demo/src/pages/feedback/PrintPage.tsx`
- Modify: `packages/solid/tests/print/usePrint.spec.tsx` (BusyProvider import)
- Modify: `packages/solid-demo/src/appStructure.ts` (줄 108)

**Step 1: 디렉토리 및 파일 이름 변경**

```bash
cd packages/solid
git mv src/components/feedback/busy src/components/feedback/loading
git mv src/components/feedback/loading/BusyContext.ts src/components/feedback/loading/LoadingContext.ts
git mv src/components/feedback/loading/BusyProvider.tsx src/components/feedback/loading/LoadingProvider.tsx
git mv src/components/feedback/loading/BusyContainer.tsx src/components/feedback/loading/LoadingContainer.tsx
git mv src/components/feedback/loading/BusyContainer.css src/components/feedback/loading/LoadingContainer.css
```

**Step 2: LoadingContext.ts 수정**

- `BusyContextValue` → `LoadingContextValue`
- `BusyVariant` → `LoadingVariant`
- `BusyContext` → `LoadingContext`
- `useBusy` → `useLoading`

**Step 3: LoadingProvider.tsx 수정**

- `BusyProvider` → `LoadingProvider`
- `BusyProviderProps` → `LoadingProviderProps`
- import: `BusyContext` → `LoadingContext`, `BusyContainer` → `LoadingContainer`
- 파일 경로 업데이트

**Step 4: LoadingContainer.tsx 수정**

- `BusyContainer` → `LoadingContainer`
- `BusyContainerProps` → `LoadingContainerProps`
- import: `BusyContext` → `LoadingContext`, `BusyVariant` → `LoadingVariant`
- CSS import: `./BusyContainer.css` → `./LoadingContainer.css`

**Step 5: LoadingContainer.css 수정**

- CSS 클래스명에 `busy` 포함 여부 확인 후 수정 (CSS 클래스는 내부 구현이므로 수정 필수는 아니나 일관성 위해 권장)

**Step 6: index.ts export 수정**

```typescript
export * from "./components/feedback/loading/LoadingContext";
export * from "./components/feedback/loading/LoadingProvider";
export * from "./components/feedback/loading/LoadingContainer";
```

**Step 7: 내부 소비자 수정**

- `usePrint.ts`: `import { useBusy }` → `import { useLoading }`, 사용처 `useBusy()` → `useLoading()`
- `Kanban.tsx`: `import { BusyContainer }` → `import { LoadingContainer }`, JSX `<BusyContainer` → `<LoadingContainer`

**Step 8: 테스트 및 데모 수정**

- `usePrint.spec.tsx`: `import { BusyProvider }` → `import { LoadingProvider }`, JSX 수정
- `BusyPage.tsx`: 모든 Busy 관련 import/사용 → Loading으로 수정
- `PrintPage.tsx`: `BusyProvider` → `LoadingProvider`
- `appStructure.ts`: 줄 108 `title: "Busy"` → `title: "Loading"`

---

### Task 7: Modal → Dialog (3파일 + 관련 타입/훅)

**Files:**

- Rename: `packages/solid/src/components/disclosure/Modal.tsx` → `Dialog.tsx`
- Rename: `packages/solid/src/components/disclosure/ModalContext.ts` → `DialogContext.ts`
- Rename: `packages/solid/src/components/disclosure/ModalProvider.tsx` → `DialogProvider.tsx`
- Modify: `packages/solid/src/index.ts` (줄 58-60)
- Rename: `packages/solid/tests/components/disclosure/Modal.spec.tsx` → `Dialog.spec.tsx`
- Rename: `packages/solid/tests/components/disclosure/ModalProvider.spec.tsx` → `DialogProvider.spec.tsx`
- Modify: `packages/solid/src/components/data/sheet/Sheet.tsx` (ModalContext import)
- Modify: `packages/solid/src/components/data/sheet/SheetConfigModal.tsx` (ModalContentProps import)
- Modify: `packages/solid-demo/src/pages/disclosure/ModalPage.tsx`
- Modify: `packages/solid-demo/src/appStructure.ts` (줄 77)

**Step 1: 파일 이름 변경**

```bash
cd packages/solid
git mv src/components/disclosure/Modal.tsx src/components/disclosure/Dialog.tsx
git mv src/components/disclosure/ModalContext.ts src/components/disclosure/DialogContext.ts
git mv src/components/disclosure/ModalProvider.tsx src/components/disclosure/DialogProvider.tsx
git mv tests/components/disclosure/Modal.spec.tsx tests/components/disclosure/Dialog.spec.tsx
git mv tests/components/disclosure/ModalProvider.spec.tsx tests/components/disclosure/DialogProvider.spec.tsx
```

**Step 2: DialogContext.ts 수정**

- `ModalDefaults` → `DialogDefaults`
- `ModalDefaultsContext` → `DialogDefaultsContext`
- `ModalShowOptions` → `DialogShowOptions`
- `ModalContentProps` → `DialogContentProps`
- `ModalContextValue` → `DialogContextValue`
- `ModalContext` → `DialogContext`
- `useModal` → `useDialog`

**Step 3: Dialog.tsx 수정**

- `Modal` → `Dialog` (컴포넌트)
- `ModalProps` → `DialogProps`
- import: `ModalDefaultsContext` → `DialogDefaultsContext` 등
- import 경로: `./ModalContext` → `./DialogContext`

**Step 4: DialogProvider.tsx 수정**

- `ModalProvider` → `DialogProvider`
- `ModalProviderProps` → `DialogProviderProps`
- import 업데이트: Modal → Dialog 관련 전체

**Step 5: index.ts export 수정**

```typescript
export * from "./components/disclosure/Dialog";
export * from "./components/disclosure/DialogContext";
export * from "./components/disclosure/DialogProvider";
```

**Step 6: 내부 소비자 수정**

- `Sheet.tsx`: `import { ModalContext }` → `import { DialogContext }`, 사용처 수정
- `SheetConfigModal.tsx`: `import type { ModalContentProps }` → `import type { DialogContentProps }`

**Step 7: 테스트 파일 수정**

- `Dialog.spec.tsx`: import/describe 수정
- `DialogProvider.spec.tsx`: import/describe 수정 (`ModalProvider` → `DialogProvider`, `useModal` → `useDialog`, `ModalContentProps` → `DialogContentProps`)

**Step 8: 데모 파일 수정**

- `ModalPage.tsx`: `Modal` → `Dialog`, `useModal` → `useDialog` 등 전체 수정
- `appStructure.ts`: 줄 77 `title: "Modal"` → `title: "Dialog"`

---

### Task 8: Sheet → DataSheet (가장 복잡)

**Files:**

- Rename: `packages/solid/src/components/data/sheet/Sheet.tsx` → `DataSheet.tsx`
- Rename: `packages/solid/src/components/data/sheet/SheetColumn.tsx` → `DataSheetColumn.tsx`
- Rename: `packages/solid/src/components/data/sheet/Sheet.styles.ts` → `DataSheet.styles.ts`
- Rename: `packages/solid/src/components/data/sheet/Sheet.css` → `DataSheet.css`
- Rename: `packages/solid/src/components/data/sheet/SheetConfigModal.tsx` → `DataSheetConfigDialog.tsx` (Modal→Dialog 반영)
- Modify: `packages/solid/src/components/data/sheet/sheetUtils.ts` (내부 타입명 수정)
- Modify: `packages/solid/src/components/data/sheet/types.ts` (Sheet 관련 타입명 수정)
- Modify: `packages/solid/src/index.ts` (줄 41)
- Modify: `packages/solid/src/components/data/permission-table/PermissionTable.tsx`
- Rename: `packages/solid/tests/sheet/Sheet.spec.tsx` → `DataSheet.spec.tsx` (경로 확인 필요)
- Modify: `packages/solid-demo/src/pages/data/SheetPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/SheetFullPage.tsx`
- Modify: `packages/solid-demo/src/appStructure.ts` (줄 63-64)

**Step 1: 파일 이름 변경**

```bash
cd packages/solid
git mv src/components/data/sheet/Sheet.tsx src/components/data/sheet/DataSheet.tsx
git mv src/components/data/sheet/SheetColumn.tsx src/components/data/sheet/DataSheetColumn.tsx
git mv src/components/data/sheet/Sheet.styles.ts src/components/data/sheet/DataSheet.styles.ts
git mv src/components/data/sheet/Sheet.css src/components/data/sheet/DataSheet.css
git mv src/components/data/sheet/SheetConfigModal.tsx src/components/data/sheet/DataSheetConfigDialog.tsx
# 테스트 파일 (정확한 경로 확인 후)
git mv tests/sheet/Sheet.spec.tsx tests/sheet/DataSheet.spec.tsx
```

**Step 2: types.ts 수정**

- `SheetColumnDef` → `DataSheetColumnDef`
- `SheetColumnProps` → `DataSheetColumnProps`
- `SheetConfig` → `DataSheetConfig`
- `SheetConfigColumn` → `DataSheetConfigColumn`
- `SheetConfigColumnInfo` → `DataSheetConfigColumnInfo`
- `SheetReorderEvent` → `DataSheetReorderEvent`
- `SortingDef` — 범용 타입이므로 유지
- `HeaderDef` — 범용 타입이므로 유지
- `FlatItem` — 범용 타입이므로 유지

**Step 3: DataSheetColumn.tsx 수정**

- `SheetColumn` → `DataSheetColumn`
- `isSheetColumnDef` → `isDataSheetColumnDef`
- import 타입명 갱신

**Step 4: DataSheet.styles.ts 수정**

- style 변수명에 `sheet` 포함 시 `dataSheet`로 변경 (확인 필요)

**Step 5: DataSheet.tsx 수정**

- `Sheet` → `DataSheet` (컴포넌트)
- `SheetProps` → `DataSheetProps`
- `Sheet.Column` → `DataSheet.Column`
- interface: `SheetComponent { Column: ... }` → `DataSheetComponent { Column: ... }`
- import 경로 전체 갱신 (Sheet.css → DataSheet.css 등)
- lazy import: `SheetConfigModal` → `DataSheetConfigDialog`
- `ModalContext` → `DialogContext` (Task 7에서 이미 변경됨)

**Step 6: DataSheetConfigDialog.tsx 수정**

- `SheetConfigModal` → `DataSheetConfigDialog` (컴포넌트)
- `ModalContentProps` → `DialogContentProps`
- import 경로 갱신
- `Sheet` import → `DataSheet` (자기 참조)
- `CheckBox` → `Checkbox` (Task 3에서 이미 변경됨)
- `TextField` → `TextInput` (Task 2에서 이미 변경됨)

**Step 7: sheetUtils.ts 수정**

- import 타입명 갱신 (`SheetColumnDef` → `DataSheetColumnDef` 등)
- 내부 함수는 유지 가능 (내부 유틸리티)

**Step 8: index.ts export 수정**

```typescript
export * from "./components/data/sheet/DataSheet";
export * from "./components/data/sheet/types";
```

**Step 9: 내부 소비자 수정**

- `PermissionTable.tsx`: `import { Sheet }` → `import { DataSheet }`, JSX `<Sheet` → `<DataSheet`, `<Sheet.Column` → `<DataSheet.Column`

**Step 10: 테스트 파일 수정**

- `DataSheet.spec.tsx`: import/describe/JSX 전체 수정

**Step 11: 데모 파일 수정**

- `SheetPage.tsx`: `Sheet` → `DataSheet`, `Sheet.Column` → `DataSheet.Column`, 기타 import 수정
- `SheetFullPage.tsx`: 동일
- `appStructure.ts`: 줄 63 `title: "Sheet"` → `title: "DataSheet"`, 줄 64 `title: "Sheet (Full)"` → `title: "DataSheet (Full)"`

---

### Task 9: CLAUDE.md 업데이트

**Files:**

- Modify: `/home/kslhunter/projects/simplysm/CLAUDE.md`

**Step 1: CLAUDE.md에서 이전 이름 참조를 새 이름으로 수정**

- 컴파운드 컴포넌트 예시: `Select.Button` → `Select.Action`, `Sheet.Column` → `DataSheet.Column`
- 기타 컴포넌트명 참조 업데이트

---

### Task 10: 검증

**Step 1: TypeScript 타입 체크**

```bash
pnpm typecheck
```

Expected: 에러 없음

**Step 2: ESLint 린트**

```bash
pnpm lint
```

Expected: 에러 없음

**Step 3: 테스트 실행**

```bash
pnpm vitest --project=solid --run
```

Expected: 모든 테스트 통과

**Step 4: Dev 서버 확인**

```bash
pnpm dev
```

데모 앱에서 변경된 컴포넌트들이 정상 렌더링되는지 확인

---

### Task 11: 커밋

**Step 1: 변경사항 확인 및 커밋**

```bash
git add .
git commit -m "refactor(solid): 컴포넌트 API 네이밍 표준화

업계 표준에 맞춰 컴포넌트 이름 일괄 변경:
- Modal → Dialog, Note → Alert, Label → Tag
- TextField → TextInput, NumberField → NumberInput
- DateField → DatePicker, DateTimeField → DateTimePicker, TimeField → TimePicker
- TextAreaField → Textarea
- CheckBox → Checkbox, CheckBoxGroup → CheckboxGroup
- Tab → Tabs, Tab.Item → Tabs.Tab
- Select.Button → Select.Action
- BusyContainer/Provider/Context → LoadingContainer/Provider/Context
- Sheet → DataSheet

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
