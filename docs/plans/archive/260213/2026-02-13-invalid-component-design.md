# Invalid Component Design

## Overview

Migrate the legacy Angular `sd-invalid` directive to a SolidJS `<Invalid>` wrapper component. This component provides form validation UI using the browser's native Constraint Validation API (`setCustomValidity()`).

Also remove the existing `error` prop from all form control components, as `<Invalid>` replaces that functionality.

## Component: `<Invalid>`

**Location**: `packages/solid/src/components/form-control/Invalid.tsx`

### Props

| Prop | Type | Description |
|------|------|-------------|
| `message` | `string` | Validation error message. Non-empty = invalid. |
| `children` | `JSX.Element` | The form control to wrap. |
| `class` | `string?` | Optional custom class. |
| `style` | `JSX.CSSProperties?` | Optional custom style. |

### Behavior

1. Wraps children in a `position: relative` container `<div>`
2. Inserts a **hidden `<input>`** element with `setCustomValidity(message)` — updated reactively
3. When `message` is non-empty:
   - Shows a **red dot indicator** (top-left corner)
   - Hidden input has custom validity set → browser native form validation treats it as invalid
4. When `message` is empty:
   - Hides the red dot
   - Clears custom validity
5. When the hidden input receives focus (e.g. from native form validation) → redirects focus to the actual focusable element inside the wrapper

### Native `<form>` Integration

No special implementation needed. When `<Invalid>` is used inside a `<form>`:
- Browser automatically validates all fields on Enter/submit
- If a field is invalid, browser focuses the hidden input → which redirects to the real field
- This is all native browser behavior from `setCustomValidity()`

### Usage Example

```tsx
<form onSubmit={handleSubmit}>
  <Invalid message={id() ? "" : "Required"}>
    <TextInput value={id()} onValueChange={setId} />
  </Invalid>
  <Invalid message={pw() ? "" : "Required"}>
    <TextInput type="password" value={pw()} onValueChange={setPw} />
  </Invalid>
  <Button type="submit">Login</Button>
</form>
```

Works without `<form>` too — just shows the red dot indicator in real-time.

## Remove `error` Prop

Remove `error?: boolean` prop and `fieldErrorClass` usage from these 7 components:

- `TextInput.tsx`
- `Textarea.tsx`
- `NumberInput.tsx`
- `DatePicker.tsx`
- `DateTimePicker.tsx`
- `TimePicker.tsx`
- `RichTextEditor.tsx`

Also remove `fieldErrorClass` from `Field.styles.ts`.

Clean up any demo pages or other files that reference the `error` prop.

## Red Dot Indicator Style (Tailwind)

Based on legacy CSS, converted to Tailwind classes:
- `absolute` positioned, top-left corner
- Small red circle (danger color)
- `pointer-events-none`, `select-none`
- Hidden when `message` is empty, visible when non-empty

## Hidden Input Style

- `absolute`, bottom-left, 1x1px, `opacity-0`
- `pointer-events-none`, `z-[-1]`
- On focus → find and focus the actual focusable element in the parent
