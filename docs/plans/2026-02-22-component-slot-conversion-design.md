# Component Slot Conversion Design

## Overview

Convert existing prop-based APIs to compound component slot patterns using `splitSlots`.
This is NOT about adding new features — only restructuring existing functionality for better DX.

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
- `Dropdown.Trigger`: wraps children in `<span>`, captures ref, auto-toggles open on click.
- `Dropdown.Content`: contains existing popup logic (Portal, position calc, outside click, Escape, scroll close, etc.).
- When `Trigger` is absent, falls back to `position` prop for positioning.
- `open`/`onOpenChange` optional — uses `createControllableSignal` for uncontrolled mode.

#### Migration (Select, Combobox)

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

---

### 2. Dialog: Header/Action Slots

**Remove:** `title`, `headerAction` props
**Keep:** `hideHeader`, `closable`, `headerStyle`, and all other props
**Add:** `Dialog.Header`, `Dialog.Action` sub-components

#### Usage

```tsx
<Dialog open={open()} onOpenChange={setOpen}>
  <Dialog.Header>Title</Dialog.Header>
  <Dialog.Action>
    <Button variant="ghost"><Icon icon={IconPlus} /></Button>
  </Dialog.Action>
  <div class="p-4">Content</div>
</Dialog>
```

#### Rendered Layout

```
[Dialog.Header (flex-1)] [Dialog.Action] [Close button (auto)]
```

- `Dialog.Header`: replaces `title` prop. Gets `flex-1` to fill remaining space.
- `Dialog.Action`: replaces `headerAction` prop. Placed left of close button.
- Close button: auto-rendered, controlled by `closable` prop (default: true).
- When `Dialog.Header` is not provided: no header rendered (same as `hideHeader`).
- When `hideHeader=true`: header hidden even if slots are provided.

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
```

#### Implementation

- `splitSlots` extracts `Prefix` from children.
- Prefix rendered at existing `prefixIconEl()` position.
- Gap class auto-applied when Prefix is present.
- Works in both standalone and inset modes (rendered in both content div and overlay div).

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

### 5. Topbar.Right (+ Topbar.User slot extraction)

**Add:** `Topbar.Right` sub-component
**Change:** `Topbar.User` extracted as slot (always rightmost)

#### Usage

```tsx
<Topbar>
  <h1 class="text-lg font-bold">App Name</h1>
  <Topbar.Menu menus={menuItems} />
  <Topbar.Right>
    <NotificationBell />
    <Button variant="ghost">Settings</Button>
  </Topbar.Right>
  <Topbar.User menus={userMenus}>User</Topbar.User>
</Topbar>
```

#### Rendered Layout (fixed order)

```
[Sidebar toggle] [children (left)] [flex-1 spacer auto] [Topbar.Right] [Topbar.User]
```

- `splitSlots` extracts `Topbar.Right` and `Topbar.User` from children. Remainder = left.
- `flex-1` spacer auto-inserted between left children and right content.
- `Topbar.User` always at far right, regardless of JSX order.
- `Topbar.Right` omitted: spacer → User directly.
- `Topbar.User` omitted: ends at Right content.

---

### 6. DateRangePicker: Remove periodLabels

**Remove:** `periodLabels` prop
**Change:** Labels hardcoded to "일" / "월" / "범위"

- Delete `periodLabels` from `DateRangePickerProps`
- Remove internal `labels()` function
- Use literal strings directly in Select.Item and renderValue

---

## Affected Files

| File | Change |
|------|--------|
| `components/disclosure/Dropdown.tsx` | Restructure to container + Trigger/Content |
| `components/disclosure/Dialog.tsx` | Header/Action slots, remove title/headerAction |
| `components/form-control/field/TextInput.tsx` | Prefix slot, remove prefixIcon |
| `components/form-control/field/NumberInput.tsx` | Prefix slot, remove prefixIcon |
| `components/layout/topbar/Topbar.tsx` | Right slot, User extraction |
| `components/form-control/date-range-picker/DateRangePicker.tsx` | Remove periodLabels |
| `components/form-control/select/Select.tsx` | Dropdown migration |
| `components/form-control/combobox/Combobox.tsx` | Dropdown migration |
| `helpers/splitSlots.ts` | Verify supports all needed slot patterns |
| `index.ts` | Export updates if needed |
| Demo pages | Update usage |
| README | Update API docs |
