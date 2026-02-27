# Select Keyboard Navigation: tabbable-based Focus Movement

## Problem

When the Select dropdown is open with a search TextInput, pressing ArrowDown from the trigger skips the TextInput and jumps directly to the first list item. The TextInput is completely unreachable via keyboard navigation.

**Root cause**: Dropdown's `handleTriggerKeyDown` uses a hardcoded CSS selector `'[tabindex]:not([tabindex="-1"]), button, [data-list-item]'` to find focusable elements. Native `<input>` elements are not matched by this selector.

Additionally, `handlePopupKeyDown` always moves focus directly to the trigger on unhandled ArrowUp, skipping intermediate tabbable elements (TextInput, SelectAll/DeselectAll buttons).

## Design

Replace Dropdown's hardcoded focusable selector with the `tabbable` library's `tabbable()` function, and update the popup keydown handler to navigate through tabbable elements sequentially.

### Changes

**1. Add `tabbable` dependency to `packages/solid/package.json`**

```json
"tabbable": "^6.4.0"
```

Already used in `@simplysm/core-browser`. Adding directly to `solid` for explicit dependency.

**2. `Dropdown.tsx` — `handleTriggerKeyDown` (line 322-326)**

Replace querySelectorAll with tabbable():

```typescript
// Before
const focusables = [
  ...popup.querySelectorAll<HTMLElement>(
    '[tabindex]:not([tabindex="-1"]), button, [data-list-item]',
  ),
];

// After
import { tabbable } from "tabbable";
const focusables = tabbable(popup);
```

**3. `Dropdown.tsx` — `handlePopupKeyDown` (line 349-368)**

Replace "always go to trigger" with "prev/next tabbable, then trigger":

```typescript
const handlePopupKeyDown = (e: KeyboardEvent) => {
  if (!local.keyboardNav) return;
  if (e.defaultPrevented) return;
  if (!triggerRef) return;

  const popup = popupRef();
  if (!popup) return;

  const dir = direction();
  const allTabbable = tabbable(popup);
  const current = e.target as HTMLElement;
  const currentIdx = allTabbable.indexOf(current);

  if (e.key === "ArrowUp") {
    if (currentIdx > 0) {
      e.preventDefault();
      allTabbable[currentIdx - 1]!.focus();
    } else if (dir === "down") {
      e.preventDefault();
      triggerRef.focus();
    }
  } else if (e.key === "ArrowDown") {
    if (currentIdx >= 0 && currentIdx < allTabbable.length - 1) {
      e.preventDefault();
      allTabbable[currentIdx + 1]!.focus();
    } else if (dir === "up") {
      e.preventDefault();
      triggerRef.focus();
    }
  }
};
```

### Focus Flow (direction=down, Select with search + multiple)

```
[Trigger]
   ↓ ArrowDown (open + focus first tabbable)
[TextInput]
   ↓ ArrowDown
[Select All button]
   ↓ ArrowDown
[Deselect All button]
   ↓ ArrowDown
[List Item 1]          ← List internal navigation takes over
   ↕ ArrowUp/Down      (stopPropagation within List)
[List Item N]
   ↓ ArrowDown          (no next in List → no preventDefault → bubbles)
   → no next tabbable   → no action (direction=down)

Reverse:
[List Item 1]          ← ArrowUp (no prev in List → bubbles to popup handler)
   ↑ prev tabbable
[Deselect All button]
   ↑ ArrowUp
[Select All button]
   ↑ ArrowUp
[TextInput]
   ↑ ArrowUp (no prev tabbable, dir=down)
[Trigger]
   ↑ ArrowUp
Close dropdown
```

### Why This Works Without Conflicts

- **List internal navigation**: List's `handleKeyDown` calls `stopPropagation()` for ArrowUp/Down between items (List.tsx:124,131). These events never reach the popup handler.
- **List boundary**: At first/last item, List does NOT call `stopPropagation()`. Event bubbles to `handlePopupKeyDown`.
- **tabbable() and ListItem**: Only the currently focused ListItem has `tabindex=0` (others have `-1`). So `tabbable()` returns just that one item, keeping the index calculation correct at boundaries.
- **No TextInput case**: When `getSearchText` is not set, `<Show>` removes TextInput from DOM. `tabbable()` naturally excludes it — same behavior as before.
- **No SelectAll case**: When not in multiple mode, buttons aren't rendered. Same automatic exclusion.

### Files Modified

| File | Change |
|------|--------|
| `packages/solid/package.json` | Add `tabbable` dependency |
| `packages/solid/src/components/disclosure/Dropdown.tsx` | Replace selector with `tabbable()`, update popup handler |
