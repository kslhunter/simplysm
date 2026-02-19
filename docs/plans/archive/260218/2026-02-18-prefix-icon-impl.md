# TextInput / NumberInput prefixIcon Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Add `prefixIcon` prop to TextInput and NumberInput components to display an icon before the input field.

**Architecture:** Add optional `prefixIcon` prop (Tabler icon component) to both components. Render `<Icon>` inside the existing flex wrapper before the input, with `textMuted` color and `gap-1.5` spacing. Applied consistently across standalone/inset/disabled modes.

**Tech Stack:** SolidJS, Tailwind CSS, @tabler/icons-solidjs, clsx, tailwind-merge

---

### Task 1: Add prefixIcon to TextInput

**Files:**
- Modify: `packages/solid/src/components/form-control/field/TextInput.tsx`

**Step 1: Add import and prop**

Add `Icon` import and `prefixIcon` prop to the interface and splitProps:

```typescript
// Add to imports (line 1 area)
import type { IconProps as TablerIconProps } from "@tabler/icons-solidjs";
import { Icon } from "../../display/Icon";

// Add to TextInputProps interface (after line 58, before closing brace)
  /** 접두 아이콘 */
  prefixIcon?: Component<TablerIconProps>;

// Add "prefixIcon" to splitProps array (after "format", before "class")
```

**Step 2: Add gap-1.5 to wrapper when prefixIcon is present**

In `getWrapperClass`, add `gap-1.5` when `prefixIcon` is set:

```typescript
const getWrapperClass = (includeCustomClass: boolean) =>
    twMerge(
      fieldBaseClass,
      local.prefixIcon && "gap-1.5",
      local.size && fieldSizeClasses[local.size],
      // ... rest unchanged
    );
```

**Step 3: Add icon rendering to all 3 render branches**

Define the prefix icon element once:

```tsx
const prefixIconEl = () => (
    <Show when={local.prefixIcon}>
      <Icon icon={local.prefixIcon!} class={clsx(textMuted, "shrink-0")} />
    </Show>
  );
```

Insert `{prefixIconEl()}` as the first child in all wrapper divs:

1. **Standalone disabled/readonly** (line 217 `<div {...rest} data-text-field ...>`): Add `{prefixIconEl()}` before `{displayValue() || ...}`
2. **Standalone editable** (line 233 `<div {...rest} data-text-field ...>`): Add `{prefixIconEl()}` before `<input ...>`
3. **Inset content div** (line 256 `<div data-text-field-content ...>`): Add `{prefixIconEl()}` before `{displayValue() || ...}`
4. **Inset editable input** (line 266 `<input ... class={clsx(fieldInputClass, "absolute left-0 top-0 size-full", "px-2 py-1")}>`): This is an absolutely positioned overlay — the icon in the content div behind it already provides visual alignment, no change needed.

**Step 4: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

---

### Task 2: Add prefixIcon to NumberInput

**Files:**
- Modify: `packages/solid/src/components/form-control/field/NumberInput.tsx`

**Step 1: Add import and prop**

Add `Icon` import and `prefixIcon` prop to the interface and splitProps:

```typescript
// Add to imports (line 1 area)
import type { IconProps as TablerIconProps } from "@tabler/icons-solidjs";
import { Icon } from "../../display/Icon";

// Add to NumberInputProps interface (after line 60, before closing brace)
  /** 접두 아이콘 */
  prefixIcon?: Component<TablerIconProps>;

// Add "prefixIcon" to splitProps array (after "inset", before "class")
```

**Step 2: Add gap-1.5 to wrapper when prefixIcon is present**

In `getWrapperClass`, add `gap-1.5` when `prefixIcon` is set:

```typescript
const getWrapperClass = (includeCustomClass: boolean) =>
    twMerge(
      fieldBaseClass,
      local.prefixIcon && "gap-1.5",
      local.size && fieldSizeClasses[local.size],
      // ... rest unchanged
    );
```

**Step 3: Add icon rendering to all render branches**

Define the prefix icon element once:

```tsx
const prefixIconEl = () => (
    <Show when={local.prefixIcon}>
      <Icon icon={local.prefixIcon!} class={clsx(textMuted, "shrink-0")} />
    </Show>
  );
```

Insert `{prefixIconEl()}` as the first child in all wrapper divs:

1. **Standalone disabled/readonly** (line 256 `<div {...rest} data-number-field ...>`): Add `{prefixIconEl()}` before `{formatNumber(...) || ...}`
2. **Standalone editable** (line 272 `<div {...rest} data-number-field ...>`): Add `{prefixIconEl()}` before `<input ...>`
3. **Inset content div** (line 289 `<div data-number-field-content ...>`): Add `{prefixIconEl()}` before `{formatNumber(...) || ...}`
4. **Inset editable wrapper** (line 305 `<div class={twMerge(getWrapperClass(false), "absolute ...")}>`): Add `{prefixIconEl()}` before `<input ...>`

**Step 4: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

---

### Task 3: Run lint and final verification

**Step 1: Run lint**

Run: `pnpm lint packages/solid/src/components/form-control/field/TextInput.tsx packages/solid/src/components/form-control/field/NumberInput.tsx`
Expected: PASS (no errors)

**Step 2: Run full typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS
