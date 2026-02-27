# HMR Context Identity Fix Design

## Problem

`createAppStructure()` factory creates `createContext()` inside the function body. When HMR re-evaluates the consumer module, a new Context object is created with different identity. The `AppStructureProvider` in the component tree still provides the old Context, but `useAppStructure()` references the new Context, causing `useContext()` to return `undefined`.

Error: `AppStructureProvider is required.`

Browser refresh resolves the issue (Context identity is consistent after fresh module evaluation).

## Root Cause

- `createAppStructure.ts:500` — `createContext()` called inside factory function
- HMR re-evaluates consumer module → factory re-runs → new Context object
- Provider (old Context) vs Consumer (new Context) = identity mismatch

Same pattern exists in `createSelectionGroup.tsx:109`, though less impacted because Provider and Consumer are always in the same component scope.

## Design

### Approach: `globalThis` Caching (dev-only)

Cache Context objects on `globalThis` so they survive module re-evaluation. In production, create Context normally (no globalThis pollution).

### New File: `packages/solid/src/utils/hmrContext.ts`

```typescript
import { type Context, createContext } from "solid-js";

export function createHmrSafeContext<T>(key: string): Context<T> {
  if (import.meta.env.DEV) {
    const cacheKey = `__simplysm_ctx_${key}__`;
    (globalThis as any)[cacheKey] ??= createContext<T>();
    return (globalThis as any)[cacheKey];
  }
  return createContext<T>();
}
```

### Modified Files

| File | Change | Cache Key |
|------|--------|-----------|
| `createAppStructure.ts:500` | `createContext<TRet>()` → `createHmrSafeContext<TRet>("AppStructure")` | `"AppStructure"` |
| `createSelectionGroup.tsx:109` | `createContext<...>()` → `createHmrSafeContext<...>(\`SelectionGroup_${config.contextName}\`)` | `"SelectionGroup_RadioGroup"`, `"SelectionGroup_CheckboxGroup"` |

### Why `globalThis`

- Module-level `Map` registry: Package itself gets HMR'd in this monorepo → Map resets → problem unsolved
- `import.meta.hot.data`: Only accessible within the same module's HMR boundary → can't reach consumer module's hot data
- `globalThis`: Survives ALL module re-evaluations, only resets on full page reload

### Constraints

- No public API changes
- No consumer code changes required
- Production behavior identical to current
