# Component Slot Conversion Design

## Overview

Convert existing prop-based APIs to compound component slot patterns using `splitSlots`.
This is NOT about adding new features — only restructuring existing functionality for better DX and pattern unification.

## Changes

### 1. Dropdown: Trigger/Content Structure

**Remove:** `triggerRef` prop
**Keep:** `position`, `open`, `onOpenChange`, `maxHeight`, `keyboardNav`, etc.
**Add:** `Dropdown.Trigger`, `Dropdown.Content` sub-components

#### Usage

```tsx
// Uncontrolled (auto toggle on Trigger click)
<Dropdown>
  <Dropdown.Trigger>
    <Button>Open</Button>
  </Dropdown.Trigger>
  <Dropdown.Content>Popup content</Dropdown.Content>
</Dropdown>

// Controlled
<Dropdown open={open()} onOpenChange={setOpen}>
  <Dropdown.Trigger>
    <Button>Open</Button>
  </Dropdown.Trigger>
  <Dropdown.Content>Popup content</Dropdown.Content>
</Dropdown>

// Context menu (no Trigger)
<Dropdown position={{ x, y }} open={open()} onOpenChange={setOpen}>
  <Dropdown.Content>Menu</Dropdown.Content>
</Dropdown>
```

#### Implementation

- `Dropdown` becomes a container. Uses `splitSlots` to extract `Trigger` and `Content`.
- `Dropdown.Trigger`: wraps children in `<div data-dropdown-trigger>`, captures ref, auto-toggles open on click.
- `Dropdown.Content`: `<div data-dropdown-content>` wrapper. Contains existing popup logic (Portal, position calc, outside click, Escape, scroll close, etc.).
- When `Trigger` is present, the `<div>` wrapper ref is used for position calculation + `minWidth`.
- When `Trigger` is absent, falls back to `position` prop for positioning.
- `open`/`onOpenChange` optional — uses `createControllableSignal` for uncontrolled mode (already in use).
- `class`/`style` on `Dropdown.Content` are passed through to the popup element.

#### Migration (Select, Combobox, etc.)

```tsx
// Before
<Dropdown triggerRef={() => triggerRef} open={open()} onOpenChange={setOpen} keyboardNav>
  {items}
</Dropdown>

// After
<Dropdown open={open()} onOpenChange={setOpen} keyboardNav>
  <Dropdown.Trigger>
    <div ref={triggerRef} ...>trigger content</div>
  </Dropdown.Trigger>
  <Dropdown.Content>{items}</Dropdown.Content>
</Dropdown>
```

**Affected consumers:** Select, Combobox, TopbarMenu, TopbarUser, NotificationBell

---

### 2. Dialog: Header/Action Slots

**Remove:** `title`, `hideHeader`, `headerAction` props
**Keep:** `closable`, `headerStyle`, and all other props
**Add:** `Dialog.Header`, `Dialog.Action` sub-components

#### Usage

```tsx
// With header
<Dialog open={open()} onOpenChange={setOpen}>
  <Dialog.Header>Title</Dialog.Header>
  <Dialog.Action>
    <Button variant="ghost"><Icon icon={IconPlus} /></Button>
  </Dialog.Action>
  <div class="p-4">Content</div>
</Dialog>

// Without header (just omit Dialog.Header)
<Dialog open={open()} onOpenChange={setOpen}>
  <div class="p-4">Content only</div>
</Dialog>

// Programmatic API
useDialog().show((close) => <Form />, { header: "New User" });
useDialog().show((close) => <Form />, { header: <span class="text-danger-500">Warning</span> });
useDialog().show((close) => <Form />);  // no header
```

#### Rendered Layout

```
[Dialog.Header (flex-1)] [Dialog.Action] [Close button (auto)]
```

- `Dialog.Header`: replaces `title` prop. Gets `flex-1` to fill remaining space.
- `Dialog.Action`: replaces `headerAction` prop. Placed left of close button.
- Close button: auto-rendered, controlled by `closable` prop (default: true).
- When `Dialog.Header` is absent: no header rendered (replaces `hideHeader` prop).

#### Accessibility

- Uses `aria-labelledby` + auto-generated id on header element (replaces `aria-label={title}`).
- `aria-labelledby` is the WAI-ARIA recommended approach for dialogs.
- When no `Dialog.Header`: no `aria-labelledby` attribute (same situation as current `hideHeader`).

#### Programmatic API

```typescript
interface DialogShowOptions {
  header?: JSX.Element;  // was: title: string (required)
  // ... rest unchanged
}
```

`DialogProvider` renders `<Dialog.Header>{entry.options.header}</Dialog.Header>` when `header` is provided.

---

### 3. TextInput.Prefix

**Remove:** `prefixIcon` prop
**Add:** `TextInput.Prefix` sub-component

#### Usage

```tsx
// Before
<TextInput prefixIcon={IconSearch} value={text()} onValueChange={setText} />

// After
<TextInput value={text()} onValueChange={setText}>
  <TextInput.Prefix><Icon icon={IconSearch} /></TextInput.Prefix>
</TextInput>

// Arbitrary JSX
<TextInput value={text()} onValueChange={setText}>
  <TextInput.Prefix><span class="text-base-400">@</span></TextInput.Prefix>
</TextInput>
```

#### Implementation

- `TextInputPrefix`: `<span data-text-input-prefix class="shrink-0">{props.children}</span>`
- `splitSlots` extracts `Prefix` from children.
- Prefix rendered at existing `prefixIconEl()` position.
- `fieldGapClasses` (from `Field.styles.ts`) auto-applied when Prefix is present.
- Works in all render branches: disabled, readonly, editable, inset.

---

### 4. NumberInput.Prefix

**Remove:** `prefixIcon` prop
**Add:** `NumberInput.Prefix` sub-component

Same pattern as TextInput.Prefix.

```tsx
// Before
<NumberInput prefixIcon={IconCurrencyWon} value={num()} onValueChange={setNum} />

// After
<NumberInput value={num()} onValueChange={setNum}>
  <NumberInput.Prefix><span class="text-base-400">₩</span></NumberInput.Prefix>
</NumberInput>
```

---

### 5. DateRangePicker: Remove periodLabels

**Remove:** `periodLabels` prop
**Change:** Labels hardcoded to "일" / "월" / "범위"

- Delete `periodLabels` from `DateRangePickerProps`
- Remove internal `labels()` function
- Use literal strings directly in Select.Item and renderValue (4 occurrences)

---

## Out of Scope

The following were evaluated and excluded:

- **Topbar.Right**: Manual `<div class="flex-1" />` spacer is sufficient. No need for additional abstraction.
- **Topbar.User extraction**: Current free-placement in children is kept as-is.

## Affected Files

| File | Change |
|------|--------|
| `components/disclosure/Dropdown.tsx` | Restructure to container + Trigger/Content |
| `components/disclosure/Dialog.tsx` | Header/Action slots, remove title/hideHeader/headerAction |
| `components/disclosure/DialogContext.ts` | `DialogShowOptions.title` → `header?: JSX.Element` |
| `components/disclosure/DialogProvider.tsx` | Render Dialog.Header from options.header |
| `components/form-control/field/TextInput.tsx` | Prefix slot, remove prefixIcon |
| `components/form-control/field/NumberInput.tsx` | Prefix slot, remove prefixIcon |
| `components/form-control/date-range-picker/DateRangePicker.tsx` | Remove periodLabels |
| `components/form-control/select/Select.tsx` | Dropdown migration |
| `components/form-control/combobox/Combobox.tsx` | Dropdown migration |
| `components/layout/topbar/TopbarMenu.tsx` | Dropdown migration |
| `components/layout/topbar/TopbarUser.tsx` | Dropdown migration |
| `components/feedback/notification/NotificationBell.tsx` | Dropdown migration |
| `helpers/splitSlots.ts` | Verify supports all needed slot patterns |
| `index.ts` | Export updates if needed |
| Demo pages | Update usage |
| README | Update API docs |
