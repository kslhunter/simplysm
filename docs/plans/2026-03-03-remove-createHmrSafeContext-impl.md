# Remove createHmrSafeContext Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Remove `createHmrSafeContext` by moving Context creation to module level, eliminating prohibited `as unknown as X` casts.

**Architecture:** Move `createContext()` from inside factory functions to module level. Replace `createSelectionGroup` factory with an internal base component (`SelectionGroupBase`) used by `CheckboxGroup` and `RadioGroup` directly. Delete `createHmrSafeContext` utility.

**Tech Stack:** SolidJS, TypeScript, Vitest

---

### Task 1: Modify createAppStructure to use module-level Context

**Files:**
- Modify: `packages/solid/src/helpers/createAppStructure.ts:1-4,499-520`

**Step 1: Replace createHmrSafeContext with module-level createContext**

In `packages/solid/src/helpers/createAppStructure.ts`:

1. Remove line 3: `import { createHmrSafeContext } from "./createHmrSafeContext";`
2. Add `createContext` to the existing solid-js import on line 2, so it reads:
   ```typescript
   import { type Accessor, createContext, createMemo, createRoot, useContext } from "solid-js";
   ```
3. Add module-level Context right before the `createAppStructure` export function (before line 489):
   ```typescript
   const AppStructureCtx = createContext<AppStructure<any>>();
   ```
4. Inside `createAppStructure`, replace line 501:
   ```typescript
   // Before:
   const Ctx = createHmrSafeContext<TRet>("AppStructure");
   // After: (delete this line entirely — use module-level AppStructureCtx)
   ```
5. Replace lines 505-510 (Ctx.Provider usage):
   ```typescript
   // Before:
   return Ctx.Provider({
     value: structure as TRet,
     get children() {
       return props.children;
     },
   });
   // After:
   return AppStructureCtx.Provider({
     value: structure as TRet,
     get children() {
       return props.children;
     },
   });
   ```
6. Replace line 514 (useContext usage):
   ```typescript
   // Before:
   const ctx = useContext(Ctx);
   // After:
   const ctx = useContext(AppStructureCtx);
   ```

**Step 2: Run existing tests to verify no regression**

Run: `pnpm vitest packages/solid/tests/helpers/createAppStructure.spec.tsx --project=solid --run`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add packages/solid/src/helpers/createAppStructure.ts
git commit -m "refactor(solid): use module-level Context in createAppStructure"
```

---

### Task 2: Create SelectionGroupBase internal component

**Files:**
- Create: `packages/solid/src/components/form-control/checkbox/SelectionGroupBase.tsx`

**Step 1: Create the shared base component**

Create `packages/solid/src/components/form-control/checkbox/SelectionGroupBase.tsx` with the shared group rendering logic extracted from `createSelectionGroup.tsx`. This component handles: context provider wrapping, validation (required + custom validate), error display via `Invalid`, and layout (div with inline-flex + twMerge).

```typescript
import {
  type Context,
  type JSX,
  createMemo,
  splitProps,
} from "solid-js";
import { twMerge } from "tailwind-merge";
import { Invalid } from "../Invalid";
import { useI18n } from "../../../providers/i18n/I18nContext";

export interface SelectionGroupBaseProps {
  required?: boolean;
  touchMode?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

export function SelectionGroupBase<TContextValue>(props: SelectionGroupBaseProps & {
  context: Context<TContextValue | undefined>;
  contextValue: TContextValue;
  errorMsgKey: string;
  value: unknown;
  isEmpty: (value: unknown) => boolean;
  validate?: ((value: any) => string | undefined) | undefined;
}) {
  const i18n = useI18n();
  const resolvedErrorMsg = () => i18n.t(props.errorMsgKey);

  const [local, rest] = splitProps(props, [
    "context",
    "contextValue",
    "errorMsgKey",
    "value",
    "isEmpty",
    "validate",
    "required",
    "touchMode",
    "class",
    "style",
    "children",
  ]);

  const errorMsg = createMemo(() => {
    if (local.required && local.isEmpty(local.value)) return resolvedErrorMsg();
    return local.validate?.(local.value);
  });

  return (
    <Invalid message={errorMsg()} variant="dot" touchMode={local.touchMode}>
      <local.context.Provider value={local.contextValue}>
        <div {...rest} class={twMerge("inline-flex", local.class)} style={local.style}>
          {local.children}
        </div>
      </local.context.Provider>
    </Invalid>
  );
}
```

**Step 2: Commit**

```bash
git add packages/solid/src/components/form-control/checkbox/SelectionGroupBase.tsx
git commit -m "feat(solid): add SelectionGroupBase internal component"
```

---

### Task 3: Rewrite CheckboxGroup to use module-level Context

**Files:**
- Rewrite: `packages/solid/src/components/form-control/checkbox/CheckboxGroup.tsx`
- Test: `packages/solid/tests/components/form-control/checkbox/CheckboxGroup.spec.tsx` (existing, no modifications)

**Step 1: Rewrite CheckboxGroup.tsx**

Replace the entire content of `packages/solid/src/components/form-control/checkbox/CheckboxGroup.tsx`:

```typescript
import { type JSX, createContext, useContext } from "solid-js";
import { Checkbox } from "./Checkbox";
import type { CheckboxSize } from "./Checkbox.styles";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { SelectionGroupBase } from "./SelectionGroupBase";

interface CheckboxGroupContext {
  value: () => unknown[];
  toggle: (item: unknown) => void;
  disabled: () => boolean;
  size: () => CheckboxSize | undefined;
  inline: () => boolean;
  inset: () => boolean;
}

const CheckboxGroupCtx = createContext<CheckboxGroupContext>();

interface CheckboxGroupProps<TValue> {
  value?: TValue[];
  onValueChange?: (value: TValue[]) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inline?: boolean;
  inset?: boolean;
  required?: boolean;
  validate?: (value: TValue[]) => string | undefined;
  touchMode?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

function CheckboxGroupInner<TValue = unknown>(props: CheckboxGroupProps<TValue>): JSX.Element {
  const [value, setValue] = createControllableSignal<unknown[]>({
    value: () => (props.value as unknown[]) ?? [],
    onChange: () => props.onValueChange as ((v: unknown[]) => void) | undefined,
  });

  const toggle = (item: unknown) => {
    setValue((prev) => {
      if (prev.includes(item)) return prev.filter((v) => v !== item);
      return [...prev, item];
    });
  };

  const contextValue: CheckboxGroupContext = {
    value,
    toggle,
    disabled: () => props.disabled ?? false,
    size: () => props.size,
    inline: () => props.inline ?? false,
    inset: () => props.inset ?? false,
  };

  return (
    <SelectionGroupBase
      context={CheckboxGroupCtx}
      contextValue={contextValue}
      errorMsgKey="validation.selectItem"
      value={props.value ?? []}
      isEmpty={(v) => (v as unknown[]).length === 0}
      validate={props.validate as ((value: any) => string | undefined) | undefined}
      required={props.required}
      touchMode={props.touchMode}
      class={props.class}
      style={props.style}
    >
      {props.children}
    </SelectionGroupBase>
  );
}

function CheckboxGroupItem<TValue = unknown>(props: {
  value: TValue;
  disabled?: boolean;
  children?: JSX.Element;
}): JSX.Element {
  const ctx = useContext(CheckboxGroupCtx);
  if (!ctx) throw new Error("CheckboxGroup.Item can only be used inside CheckboxGroup");

  const isSelected = () => ctx.value().includes(props.value);

  const handleChange = () => {
    ctx.toggle(props.value);
  };

  return (
    <Checkbox
      value={isSelected()}
      onValueChange={handleChange}
      disabled={props.disabled ?? ctx.disabled()}
      size={ctx.size()}
      inline={ctx.inline()}
      inset={ctx.inset()}
    >
      {props.children}
    </Checkbox>
  );
}

interface CheckboxGroupComponent {
  <TValue = unknown>(props: CheckboxGroupProps<TValue>): JSX.Element;
  Item: <TValue = unknown>(props: {
    value: TValue;
    disabled?: boolean;
    children?: JSX.Element;
  }) => JSX.Element;
}

export const CheckboxGroup = Object.assign(CheckboxGroupInner, {
  Item: CheckboxGroupItem,
}) as CheckboxGroupComponent;
```

**Step 2: Run existing tests to verify no regression**

Run: `pnpm vitest packages/solid/tests/components/form-control/checkbox/CheckboxGroup.spec.tsx --project=solid --run`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/checkbox/CheckboxGroup.tsx
git commit -m "refactor(solid): rewrite CheckboxGroup with module-level Context"
```

---

### Task 4: Rewrite RadioGroup to use module-level Context

**Files:**
- Rewrite: `packages/solid/src/components/form-control/checkbox/RadioGroup.tsx`
- Test: `packages/solid/tests/components/form-control/checkbox/RadioGroup.spec.tsx` (existing, no modifications)

**Step 1: Rewrite RadioGroup.tsx**

Replace the entire content of `packages/solid/src/components/form-control/checkbox/RadioGroup.tsx`:

```typescript
import { type JSX, createContext, useContext } from "solid-js";
import { Radio } from "./Radio";
import type { CheckboxSize } from "./Checkbox.styles";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { SelectionGroupBase } from "./SelectionGroupBase";

interface RadioGroupContext {
  value: () => unknown | undefined;
  select: (item: unknown) => void;
  disabled: () => boolean;
  size: () => CheckboxSize | undefined;
  inline: () => boolean;
  inset: () => boolean;
}

const RadioGroupCtx = createContext<RadioGroupContext>();

interface RadioGroupProps<TValue> {
  value?: TValue;
  onValueChange?: (value: TValue) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inline?: boolean;
  inset?: boolean;
  required?: boolean;
  validate?: (value: TValue | undefined) => string | undefined;
  touchMode?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

function RadioGroupInner<TValue = unknown>(props: RadioGroupProps<TValue>): JSX.Element {
  const [value, setValue] = createControllableSignal<unknown>({
    value: () => props.value as unknown,
    onChange: () => props.onValueChange as ((v: unknown) => void) | undefined,
  });

  const select = (item: unknown) => {
    setValue(item);
  };

  const contextValue: RadioGroupContext = {
    value,
    select,
    disabled: () => props.disabled ?? false,
    size: () => props.size,
    inline: () => props.inline ?? false,
    inset: () => props.inset ?? false,
  };

  return (
    <SelectionGroupBase
      context={RadioGroupCtx}
      contextValue={contextValue}
      errorMsgKey="validation.selectItem"
      value={props.value}
      isEmpty={(v) => v === undefined || v === null}
      validate={props.validate as ((value: any) => string | undefined) | undefined}
      required={props.required}
      touchMode={props.touchMode}
      class={props.class}
      style={props.style}
    >
      {props.children}
    </SelectionGroupBase>
  );
}

function RadioGroupItem<TValue = unknown>(props: {
  value: TValue;
  disabled?: boolean;
  children?: JSX.Element;
}): JSX.Element {
  const ctx = useContext(RadioGroupCtx);
  if (!ctx) throw new Error("RadioGroup.Item can only be used inside RadioGroup");

  const isSelected = () => ctx.value() === props.value;

  const handleChange = () => {
    ctx.select(props.value);
  };

  return (
    <Radio
      value={isSelected()}
      onValueChange={handleChange}
      disabled={props.disabled ?? ctx.disabled()}
      size={ctx.size()}
      inline={ctx.inline()}
      inset={ctx.inset()}
    >
      {props.children}
    </Radio>
  );
}

interface RadioGroupComponent {
  <TValue = unknown>(props: RadioGroupProps<TValue>): JSX.Element;
  Item: <TValue = unknown>(props: {
    value: TValue;
    disabled?: boolean;
    children?: JSX.Element;
  }) => JSX.Element;
}

export const RadioGroup = Object.assign(RadioGroupInner, {
  Item: RadioGroupItem,
}) as RadioGroupComponent;
```

**Step 2: Run existing tests to verify no regression**

Run: `pnpm vitest packages/solid/tests/components/form-control/checkbox/RadioGroup.spec.tsx --project=solid --run`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/checkbox/RadioGroup.tsx
git commit -m "refactor(solid): rewrite RadioGroup with module-level Context"
```

---

### Task 5: Delete createHmrSafeContext and createSelectionGroup, update index.ts

**Files:**
- Delete: `packages/solid/src/helpers/createHmrSafeContext.ts`
- Delete: `packages/solid/src/hooks/createSelectionGroup.tsx`
- Modify: `packages/solid/src/index.ts`

**Step 1: Delete files**

```bash
rm packages/solid/src/helpers/createHmrSafeContext.ts
rm packages/solid/src/hooks/createSelectionGroup.tsx
```

**Step 2: Verify no remaining imports of deleted files**

Search for any imports of the deleted files. Expected: zero results.

```bash
pnpm grep -r "createHmrSafeContext" packages/solid/src/
pnpm grep -r "createSelectionGroup" packages/solid/src/
```

**Step 3: Verify index.ts has no exports of deleted files**

Check `packages/solid/src/index.ts`. It should NOT have any line referencing `createHmrSafeContext` or `createSelectionGroup`. The current file does not export either — `createHmrSafeContext` was never in index.ts and `createSelectionGroup` was only used internally. No changes needed to index.ts.

**Step 4: Run all solid tests**

Run: `pnpm vitest packages/solid/tests/ --project=solid --run`
Expected: All tests PASS

**Step 5: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: No errors

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(solid): remove createHmrSafeContext and createSelectionGroup"
```
