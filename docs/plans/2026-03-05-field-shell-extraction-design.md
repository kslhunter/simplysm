# FieldShell Extraction Design

## Goal

Extract the duplicated 3-mode branching JSX structure from 6 field components into a shared `FieldShell` component.

**Target components**: DatePicker, DateTimePicker, TimePicker, TextInput, NumberInput, Textarea

## Problem

All 6 field components duplicate the same ~68-line JSX structure:
- `<Invalid>` wrapping
- `<Show when={inset}>` — standalone/inset branching
- Standalone: `<Show when={isEditable()}>` — readonly/editable branching
- Inset: hidden sizing element + absolute overlay pattern

Differences between components are limited to: input element, display content, validation, and event handling.

Additionally, Textarea has inconsistencies compared to TextInput that should be fixed.

## Design

### FieldShell Component

**File**: `packages/solid/src/components/form-control/field/FieldShell.tsx`

#### Props Interface

```typescript
interface FieldShellProps {
  // Invalid
  errorMsg: string | undefined;
  invalidVariant: "dot" | "border";
  touchMode?: boolean;

  // Mode
  inset: boolean | undefined;
  isEditable: boolean;

  // Wrapper styling
  wrapperClass: (includeCustomClass: boolean) => string;
  dataAttr: string;              // "data-date-field" etc.
  readonlyExtraClass?: string;   // "sd-date-field" etc.
  insetExtraClass?: string;      // "[text-decoration:inherit]" etc.
  sizingExtraClass?: string;     // "justify-end" etc.

  // Common HTML
  style?: JSX.CSSProperties;
  title?: string;
  class?: string;                // applied to inset outer
  rest?: Record<string, any>;    // splitProps remainder

  // Content
  displayContent: JSX.Element;           // readonly + default sizing
  renderSizing?: () => JSX.Element;      // override sizing content (Textarea)
  children: JSX.Element;                 // input element (rendered when editable)
}
```

#### JSX Structure

```
<Invalid message={errorMsg} variant={invalidVariant} touchMode={touchMode}>
  <Show when={inset}
    fallback={
      <Show when={isEditable}
        fallback={
          // Standalone-Readonly
          <div {...rest} {dataAttr} class={twMerge(wrapperClass(true), readonlyExtraClass)}
               style={style} title={title}>
            {displayContent}
          </div>
        }
      >
        // Standalone-Editable
        <div {...rest} {dataAttr} class={wrapperClass(true)}
             style={{position: "relative", ...style}}>
          {children}
        </div>
      </Show>
    }
  >
    // Inset
    <div {...rest} {dataAttr} class={clsx("relative", insetExtraClass, class)} style={style}>
      <div {dataAttr}-content class={twMerge(wrapperClass(false), sizingExtraClass)}
           style={{visibility: isEditable ? "hidden" : undefined}} title={title}>
        {renderSizing ? renderSizing() : displayContent}
      </div>
      <Show when={isEditable}>
        <div class={twMerge(wrapperClass(false), sizingExtraClass, "absolute left-0 top-0 size-full")}>
          {children}
        </div>
      </Show>
    </div>
  </Show>
</Invalid>
```

### Component Migration

**Group A: DatePicker, DateTimePicker, TimePicker**
- JSX return: ~68 lines → ~15 lines
- `displayContent={displayValue() || "\u00A0"}`
- children: `<input type="date|datetime-local|time" .../>`
- No other changes (format/parse, validation, handleChange preserved)

**Group B: TextInput, NumberInput**
- JSX return: ~90 lines → ~25 lines
- PrefixProvider wraps FieldShell externally
- displayContent includes prefix + PlaceholderFallback
- children includes prefix + input
- No other changes (IME handling, format, validation, slot preserved)

**Group C: Textarea**
- JSX return: ~95 lines → ~25 lines
- `displayContent={<PlaceholderFallback .../>}`
- `renderSizing={() => contentForHeight()}`
- children: hidden sizing div + textarea

### Textarea Inconsistency Fixes

| Item | Before | After |
|------|--------|-------|
| Invalid variant | always `"border"` | `inset ? "dot" : "border"` |
| Readonly extra class | none | `"sd-textarea-field"` |

### Files Changed

1. **New**: `packages/solid/src/components/form-control/field/FieldShell.tsx`
2. **Modified**: `DatePicker.tsx` — use FieldShell
3. **Modified**: `DateTimePicker.tsx` — use FieldShell
4. **Modified**: `TimePicker.tsx` — use FieldShell
5. **Modified**: `TextInput.tsx` — use FieldShell
6. **Modified**: `NumberInput.tsx` — use FieldShell
7. **Modified**: `Textarea.tsx` — use FieldShell + fix inconsistencies

### Test Impact

Existing tests query elements by `sd-*-field` class and `data-*` attributes. These are preserved by FieldShell (same DOM output), so tests should pass without modification.
