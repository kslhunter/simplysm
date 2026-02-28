# CrudDetail/CrudSheet Keyboard Shortcut — Focus-Free Activation

## Problem

CrudDetail and CrudSheet components require form focus (`formRef.contains(document.activeElement)`) for keyboard shortcuts (Ctrl+S, Ctrl+Alt+L) to work. Users expect these shortcuts to work regardless of focus state.

## Requirements

1. **Focus-free shortcuts**: Ctrl+S (save) and Ctrl+Alt+L (refresh) should work without form focus
2. **Most recently interacted component wins**: When multiple CrudDetail/CrudSheet exist, the one last interacted with responds
3. **Dialog boundary**: When a Dialog is open, only the topmost Dialog's inner crud responds. If no crud exists inside the topmost Dialog, shortcuts do nothing
4. **Dropdown has no effect**: Dropdown open state does not block shortcuts
5. **Auto-activate on mount**: Components are active immediately on mount (last mounted = active)
6. **isSelectMode preserved**: CrudSheet's `isSelectMode()` check for Ctrl+S remains unchanged

## Design

### New File: `crudRegistry.ts`

**Location:** `packages/solid/src/components/features/crudRegistry.ts`

**Data Structure:**

```typescript
interface CrudEntry {
  id: string;
  formEl: HTMLFormElement;
  lastActivatedAt: number;
}

const entries: CrudEntry[] = [];
```

**API:**

| Function | Purpose |
|----------|---------|
| `registerCrud(id, formEl)` | Register on mount + auto-activate |
| `unregisterCrud(id)` | Unregister on cleanup |
| `activateCrud(id)` | Update timestamp on interaction |
| `isActiveCrud(id)` | Check if this crud should respond to shortcuts |

**`isActiveCrud(id)` Logic:**

1. Get topmost Dialog element from `dialogZIndex.ts`
2. If Dialog is open → filter entries to those inside the Dialog (`dialog.contains(formEl)`)
3. If no Dialog → all entries are candidates
4. Among candidates, find the one with highest `lastActivatedAt`
5. Return `true` if that entry's id matches the argument

### Modified File: `dialogZIndex.ts`

Add one exported function:

```typescript
export function getTopmostDialog(): HTMLElement | null {
  return stack.length > 0 ? stack[stack.length - 1] : null;
}
```

No other changes to existing logic.

### Modified File: `CrudDetail.tsx`

1. **Mount/cleanup**: Register/unregister with `crudRegistry`
2. **Interaction tracking**: `pointerdown` + `focusin` on formRef → `activateCrud(id)`
3. **Keydown handler**: Replace `formRef.contains(document.activeElement)` with `isActiveCrud(id)`
4. **Stop propagation**: Add `e.stopImmediatePropagation()` when handling shortcuts

### Modified File: `CrudSheet.tsx`

Same pattern as CrudDetail. `isSelectMode()` check for Ctrl+S is preserved.

## Files Changed

| File | Change |
|------|--------|
| `crudRegistry.ts` **(new)** | Global crud activation tracking module |
| `dialogZIndex.ts` | Add `getTopmostDialog()` getter |
| `CrudDetail.tsx` | Registry integration, keydown handler update |
| `CrudSheet.tsx` | Registry integration, keydown handler update |

## Files NOT Changed

- `Dialog.tsx` — Escape handler unchanged
- `Dropdown.tsx` — No change
- All other files — No change
