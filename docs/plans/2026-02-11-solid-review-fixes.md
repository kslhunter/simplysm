# Solid 코드 리뷰 수정사항 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 코드 리뷰에서 합의된 4건의 수정사항을 적용한다.

**Architecture:** Select/Combobox 공유 트리거 스타일을 별도 파일로 추출하고, Combobox의 수동 controlled/uncontrolled 패턴을 `createControllableSignal`로 교체하며, DateRangePicker와 Dialog의 사소한 컨벤션 이슈를 수정한다.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS (clsx + twMerge)

---

## Task 1: Select/Combobox 공유 트리거 스타일 추출

**Files:**
- Create: `packages/solid/src/components/form-control/DropdownTrigger.styles.ts`
- Modify: `packages/solid/src/components/form-control/select/Select.tsx:18-42`
- Modify: `packages/solid/src/components/form-control/combobox/Combobox.tsx:19-42`

**Step 1: 공유 스타일 파일 생성**

`packages/solid/src/components/form-control/DropdownTrigger.styles.ts`:

```typescript
import clsx from "clsx";
import { borderDefault, type ComponentSize, paddingLg, paddingSm } from "../../styles/tokens.styles";
import { insetBase, insetFocusOutlineSelf } from "../../styles/patterns.styles";

export const triggerBaseClass = clsx(
  "inline-flex items-center gap-2",
  "w-40",
  "border",
  borderDefault,
  "rounded",
  "bg-transparent",
  "hover:bg-base-100 dark:hover:bg-base-700",
  "cursor-pointer",
  "focus:outline-none",
  "focus-within:border-primary-400 dark:focus-within:border-primary-400",
);

export const triggerDisabledClass = clsx("cursor-default bg-base-200 text-base-400 dark:bg-base-800 dark:text-base-500");

export const triggerInsetClass = clsx(insetBase, "bg-transparent", insetFocusOutlineSelf);

export const triggerSizeClasses: Record<ComponentSize, string> = {
  sm: clsx("gap-1.5", paddingSm),
  lg: clsx("gap-3", paddingLg),
};

export const chevronWrapperClass = clsx("opacity-30", "hover:opacity-100");
```

**Step 2: Select.tsx에서 공유 스타일 import로 교체**

Select.tsx에서 lines 18-42의 로컬 스타일 선언 5개(`triggerBaseClass`, `triggerDisabledClass`, `triggerInsetClass`, `sizeClasses`, `chevronWrapperClass`)를 삭제하고, 새 파일에서 import한다.

- `import { borderDefault, type ComponentSize, paddingLg, paddingSm, textMuted } from "../../../styles/tokens.styles";`에서 `ComponentSize`, `paddingLg`, `paddingSm` 제거 (더 이상 직접 사용하지 않으므로)
- `import { insetBase, insetFocusOutlineSelf } from "../../../styles/patterns.styles";` 제거
- `import { triggerBaseClass, triggerDisabledClass, triggerInsetClass, triggerSizeClasses, chevronWrapperClass } from "../DropdownTrigger.styles";` 추가
- `multiTagClass`, `selectedValueClass`는 Select 전용이므로 그대로 유지
- 컴포넌트 내에서 `sizeClasses` → `triggerSizeClasses`로 변경 (line 322)

**Step 3: Combobox.tsx에서 공유 스타일 import로 교체**

Combobox.tsx에서 lines 19-42의 로컬 스타일 선언 5개를 삭제하고, 새 파일에서 import한다.

- `import { borderDefault, type ComponentSize, paddingLg, paddingSm, textMuted } from "../../../styles/tokens.styles";`에서 `ComponentSize`, `paddingLg`, `paddingSm` 제거
- `import { insetBase, insetFocusOutlineSelf } from "../../../styles/patterns.styles";` 제거
- `import { triggerBaseClass, triggerDisabledClass, triggerInsetClass, triggerSizeClasses, chevronWrapperClass } from "../DropdownTrigger.styles";` 추가
- `selectedValueClass`, `inputClass`, `noResultsClass`는 Combobox 전용이므로 그대로 유지
- 컴포넌트 내에서 `sizeClasses` → `triggerSizeClasses`로 변경 (line 304)

**Step 4: 타입체크 및 린트**

```bash
pnpm typecheck packages/solid
pnpm lint packages/solid
```

**Step 5: 커밋**

```bash
git add packages/solid/src/components/form-control/DropdownTrigger.styles.ts
git add packages/solid/src/components/form-control/select/Select.tsx
git add packages/solid/src/components/form-control/combobox/Combobox.tsx
git commit -m "refactor(solid): Select/Combobox 공유 트리거 스타일을 DropdownTrigger.styles.ts로 추출"
```

---

## Task 2: Combobox `createControllableSignal` 전환

**Files:**
- Modify: `packages/solid/src/components/form-control/combobox/Combobox.tsx:1-3, 182-199, 210-212, 216-217, 327`

**Step 1: 수동 패턴을 `createControllableSignal`로 교체**

Combobox.tsx에서 lines 182-199의 수동 controlled/uncontrolled 구현:

```typescript
// 삭제할 코드 (lines 182-199):
const [internalValue, setInternalValueRaw] = createSignal<T | undefined>(undefined);

createEffect(() => {
  const propValue = local.value;
  setInternalValueRaw(() => propValue);
});

const isControlled = () => local.onValueChange !== undefined;
const getValue = () => (isControlled() ? local.value : internalValue());
const setInternalValue = (newValue: T) => {
  if (isControlled()) {
    local.onValueChange?.(newValue);
  } else {
    setInternalValueRaw(() => newValue);
  }
};
```

교체할 코드:

```typescript
const [getValue, setInternalValue] = createControllableSignal({
  value: () => local.value,
  onChange: () => local.onValueChange,
});
```

> 기존 `getValue()`, `setInternalValue()` 이름을 그대로 유지하여 나머지 코드 변경을 최소화한다.

**Step 2: 불필요한 import 제거**

line 1의 import에서 `createEffect`, `createSignal`이 더 이상 직접 필요하지 않으면 제거한다.
단, 다른 곳에서 사용 중인지 확인 필요:
- `createSignal`: `open`(line 177), `query`(line 178), `items`(line 179), `loading`(line 180)에서 사용 → 유지
- `createEffect`: 다른 곳에서 사용하지 않으면 제거 가능 → 확인 후 결정

`createControllableSignal` import 추가:

```typescript
import { createControllableSignal } from "../../../utils/createControllableSignal";
```

**Step 3: 타입체크 및 린트**

```bash
pnpm typecheck packages/solid
pnpm lint packages/solid
```

**Step 4: 커밋**

```bash
git add packages/solid/src/components/form-control/combobox/Combobox.tsx
git commit -m "refactor(solid): Combobox의 controlled/uncontrolled 패턴을 createControllableSignal로 통일"
```

---

## Task 3: DateRangePicker compound component 컨벤션 수정

**Files:**
- Modify: `packages/solid/src/components/form-control/date-range-picker/DateRangePicker.tsx:9, 180-182`

**Step 1: SelectItem 직접 import을 Select.Item으로 변경**

line 9 삭제:
```typescript
import { SelectItem } from "../select/SelectItem";
```

(`import { Select } from "../select/Select";`는 line 8에 이미 있음)

lines 180-182에서 `<SelectItem>` → `<Select.Item>`으로 변경:

```typescript
// Before:
<SelectItem value={"day" as DateRangePeriodType}>{labels().day}</SelectItem>
<SelectItem value={"month" as DateRangePeriodType}>{labels().month}</SelectItem>
<SelectItem value={"range" as DateRangePeriodType}>{labels().range}</SelectItem>

// After:
<Select.Item value={"day" as DateRangePeriodType}>{labels().day}</Select.Item>
<Select.Item value={"month" as DateRangePeriodType}>{labels().month}</Select.Item>
<Select.Item value={"range" as DateRangePeriodType}>{labels().range}</Select.Item>
```

**Step 2: 타입체크 및 린트**

```bash
pnpm typecheck packages/solid
pnpm lint packages/solid
```

**Step 3: 커밋**

```bash
git add packages/solid/src/components/form-control/date-range-picker/DateRangePicker.tsx
git commit -m "fix(solid): DateRangePicker에서 SelectItem 직접 import을 Select.Item으로 변경"
```

---

## Task 4: Dialog 미사용 `_rest` 변수 제거

**Files:**
- Modify: `packages/solid/src/components/disclosure/Dialog.tsx:116`

**Step 1: `_rest` 제거**

line 116:
```typescript
// Before:
const [local, _rest] = splitProps(props, [

// After:
const [local] = splitProps(props, [
```

**Step 2: 타입체크 및 린트**

```bash
pnpm typecheck packages/solid
pnpm lint packages/solid
```

**Step 3: 커밋**

```bash
git add packages/solid/src/components/disclosure/Dialog.tsx
git commit -m "fix(solid): Dialog에서 미사용 _rest 변수 제거"
```
