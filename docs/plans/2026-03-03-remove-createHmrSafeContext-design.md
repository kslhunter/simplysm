# Remove createHmrSafeContext

## Problem

`createHmrSafeContext` uses `as unknown as X` (prohibited cast) and exists solely because factory functions (`createAppStructure`, `createSelectionGroup`) create `createContext()` inside the factory body. Moving Context to module level makes this utility unnecessary.

## Changes

### 1. createAppStructure — Internal Context to Module Level

**File:** `packages/solid/src/helpers/createAppStructure.ts`

- Move `createContext()` to module level (outside the factory)
- Remove `createHmrSafeContext` import
- Factory function keeps the same API — still returns `{ AppStructureProvider, useAppStructure }`
- Consumer code: **no changes**

```typescript
// Before
import { createHmrSafeContext } from "./createHmrSafeContext";
// inside factory:
const Ctx = createHmrSafeContext<TRet>("AppStructure");

// After
const AppStructureCtx = createContext<AppStructure<any>>();
// factory reuses AppStructureCtx
```

### 2. createSelectionGroup — Replace Factory with Base Component

**Remove:** `packages/solid/src/hooks/createSelectionGroup.tsx`

**New file:** `packages/solid/src/components/form-control/checkbox/SelectionGroupBase.tsx`
- Shared logic: context provider, validation, layout
- Accepts Context, contextValue, mode as props

**Rewrite:** `packages/solid/src/components/form-control/checkbox/CheckboxGroup.tsx`
- Own module-level Context (`createContext<MultiSelectContext>()`)
- Uses `SelectionGroupBase` internally
- `Object.assign(CheckboxGroupInner, { Item: CheckboxGroupItem })` — removes `as unknown as` cast

**Rewrite:** `packages/solid/src/components/form-control/checkbox/RadioGroup.tsx`
- Own module-level Context (`createContext<SingleSelectContext>()`)
- Uses `SelectionGroupBase` internally
- `Object.assign(RadioGroupInner, { Item: RadioGroupItem })` — removes `as unknown as` cast

Consumer API: **no changes** — `CheckboxGroup`, `CheckboxGroup.Item`, `RadioGroup`, `RadioGroup.Item`

### 3. Cleanup

- **Delete:** `packages/solid/src/helpers/createHmrSafeContext.ts`
- **Update:** `packages/solid/src/index.ts` — remove `createHmrSafeContext` export

## Files Summary

| Action | File |
|--------|------|
| Modify | `helpers/createAppStructure.ts` |
| Create | `components/form-control/checkbox/SelectionGroupBase.tsx` |
| Rewrite | `components/form-control/checkbox/CheckboxGroup.tsx` |
| Rewrite | `components/form-control/checkbox/RadioGroup.tsx` |
| Modify | `src/index.ts` |
| Delete | `helpers/createHmrSafeContext.ts` |
| Delete | `hooks/createSelectionGroup.tsx` |

## Testing

Existing tests should pass without modification:
- `CheckboxGroup.spec.tsx` — external API unchanged
- `RadioGroup.spec.tsx` — external API unchanged
- `createAppStructure.spec.tsx` — internal change only
