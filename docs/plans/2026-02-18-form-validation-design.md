# Built-in Form Validation Design

## Overview

Add built-in validation to all form control components in the `solid` package. Each component receives validation props (`required`, `minLength`, `max`, `validate`, etc.) and internally wraps with an enhanced `Invalid` component for visual error display and native form validation integration.

## Goals

- Users add validation props directly to form controls (no manual `Invalid` wrapping needed)
- Native `<form>` + `reportValidity()` integration via `setCustomValidity`
- Consistent error display: red border (normal mode) or red dot (inset mode)
- Custom validator support for application-specific logic
- Existing `Invalid` component remains available for user custom components

## Invalid Component Changes

### Current

- Renders `<div>` wrapper with red dot indicator + hidden input
- Props: `message`, `class`

### New

- Renders as Fragment (`<>...</>`) — no wrapper div
- Uses SolidJS `children()` helper to auto-detect first child element as target
- Props:

```tsx
interface InvalidProps {
  variant?: "border" | "dot";  // default: "dot"
  message?: string;            // always sets setCustomValidity
  touchMode?: boolean;         // true = show visual only after blur
  children: JSX.Element;
}
```

### Behavior by variant

**`variant="border"`:**
- Adds/removes `border-danger-500` class on target element via `createEffect`

**`variant="dot"`:**
- Checks target's `position` — if `static`, changes to `relative`
- Injects red dot element inside target (top-left corner) via JS DOM manipulation
- Removes dot when message clears

**Common:**
- Hidden input rendered as sibling in Fragment: `<>{children}<input hidden .../></>`
- `setCustomValidity(message)` always set (regardless of `touchMode`)
- Focus on hidden input redirects to first focusable child in target

### touchMode

- `touchMode={false}` (default): visual display immediately reflects `message`
- `touchMode={true}`: visual display only after target's `focusout` event, then real-time on value changes
- `setCustomValidity` always reflects `message` regardless of `touchMode` (form submit always works)
- Invalid manages touched state internally

## Form Control Changes

### Common validation props (all controls)

```tsx
required?: boolean;
validate?: (value: TValue) => string | undefined;
touchMode?: boolean;
```

### Per-component validation props

| Component | Additional props |
|-----------|-----------------|
| TextInput | `minLength`, `maxLength`, `pattern` |
| Textarea | `minLength`, `maxLength` |
| NumberInput | `min`, `max` |
| DatePicker | `min`, `max` |
| DateTimePicker | `min`, `max` |
| TimePicker | `min`, `max` |
| Select | — |
| Combobox | — |
| Checkbox | — |
| CheckboxGroup | — |
| RadioGroup | — |
| ColorPicker | — |

### Internal implementation pattern

```tsx
// TextInput example
const errorMsg = createMemo(() => {
  const v = value();
  if (props.required && !v) return "필수 입력 항목입니다";
  if (props.minLength != null && v.length < props.minLength)
    return `최소 ${props.minLength}자 이상 입력하세요`;
  if (props.maxLength != null && v.length > props.maxLength)
    return `최대 ${props.maxLength}자까지 입력 가능합니다`;
  if (props.pattern != null && !new RegExp(props.pattern).test(v))
    return "입력 형식이 올바르지 않습니다";
  return props.validate?.(v);
});

return (
  <Invalid
    variant={props.inset ? "dot" : "border"}
    message={errorMsg()}
    touchMode={props.touchMode}
  >
    <div class={fieldBaseClass}>...</div>
  </Invalid>
);
```

### Checkbox/Radio: Remove `theme` prop

- Delete `CheckboxTheme` type and `themeCheckedClasses` from `Checkbox.styles.ts`
- Checked state fixed to `primary` theme only
- Prevents conflict with danger border for validation errors

## Default Error Messages (Korean)

```
required:  "필수 입력 항목입니다"
minLength: `최소 ${n}자 이상 입력하세요`
maxLength: `최대 ${n}자까지 입력 가능합니다`
pattern:   "입력 형식이 올바르지 않습니다"
min:       `최솟값은 ${n}입니다`
max:       `최댓값은 ${n}입니다`
```

i18n support deferred to future work.

## Form Integration

Native `<form>` + `reportValidity()`:

```tsx
<form onSubmit={(e) => {
  e.preventDefault();
  if (!e.currentTarget.reportValidity()) return;
  // submit logic
}}>
  <TextInput required minLength={2} value={name()} onValueChange={setName} />
  <NumberInput required min={0} value={age()} onValueChange={setAge} />
  <button type="submit">Submit</button>
</form>
```

- `reportValidity()` triggers browser native tooltip on first invalid control + focus
- Works because each control's hidden input has `setCustomValidity` set

## User API Examples

```tsx
// Basic required field — red border shown immediately
<TextInput required value={name()} onValueChange={setName} />

// Login form — show error only after blur
<TextInput required touchMode value={email()} onValueChange={setEmail} />

// Custom validator — runs after built-in validators pass
<TextInput
  required
  minLength={2}
  validate={(v) => v.includes("@") ? undefined : "@ 문자가 필요합니다"}
  value={email()}
  onValueChange={setEmail}
/>

// User custom component with Invalid
<Invalid variant="dot" message={myError()}>
  <div>
    <MyCustomWidget />
  </div>
</Invalid>
```

## Files to Modify

| File | Change |
|------|--------|
| `Invalid.tsx` | Rewrite: Fragment render, variant, touchMode, children() target detection |
| `Checkbox.styles.ts` | Remove `CheckboxTheme`, `themeCheckedClasses` |
| `Checkbox.tsx` | Remove `theme` prop, add `required`, `validate`, `touchMode`, wrap with Invalid |
| `Radio.tsx` | Remove `theme` prop, add `required`, `validate`, `touchMode`, wrap with Invalid |
| `CheckboxGroup.tsx` | Add `required`, `validate`, `touchMode`, wrap with Invalid |
| `RadioGroup.tsx` | Add `required`, `validate`, `touchMode`, wrap with Invalid |
| `TextInput.tsx` | Add `required`, `minLength`, `maxLength`, `pattern`, `validate`, `touchMode`, wrap with Invalid |
| `Textarea.tsx` | Add `required`, `minLength`, `maxLength`, `validate`, `touchMode`, wrap with Invalid |
| `NumberInput.tsx` | Add `required`, `min`, `max`, `validate`, `touchMode`, wrap with Invalid |
| `DatePicker.tsx` | Add `required`, `min`, `max`, `validate`, `touchMode`, wrap with Invalid |
| `DateTimePicker.tsx` | Add `required`, `min`, `max`, `validate`, `touchMode`, wrap with Invalid |
| `TimePicker.tsx` | Add `required`, `min`, `max`, `validate`, `touchMode`, wrap with Invalid |
| `Select.tsx` | Add `validate`, `touchMode`, wrap with Invalid (already has `required`) |
| `Combobox.tsx` | Add `required`, `validate`, `touchMode`, wrap with Invalid |
| `ColorPicker.tsx` | Add `required`, `validate`, `touchMode`, wrap with Invalid |
| Demo pages | Update to showcase validation features |
| `README.md` | Update Invalid and form control documentation |
