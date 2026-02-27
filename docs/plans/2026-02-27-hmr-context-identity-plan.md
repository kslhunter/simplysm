# HMR Context Identity Fix — Implementation Plan

Design: `2026-02-27-hmr-context-identity-design.md`

## Tasks

### Task 1: Create `createHmrSafeContext` utility

- **Create**: `packages/solid/src/utils/hmrContext.ts`
- Implement `createHmrSafeContext<T>(key: string): Context<T>`
- dev-only globalThis caching with `import.meta.env.DEV`
- production: plain `createContext<T>()`

### Task 2: Apply to `createAppStructure`

- **Modify**: `packages/solid/src/helpers/createAppStructure.ts`
- Line 2: add import of `createHmrSafeContext`
- Line 500: replace `createContext<TRet>()` → `createHmrSafeContext<TRet>("AppStructure")`
- Remove unused `createContext` from solid-js import if no other usage

### Task 3: Apply to `createSelectionGroup`

- **Modify**: `packages/solid/src/hooks/createSelectionGroup.tsx`
- Add import of `createHmrSafeContext`
- Line 109: replace `createContext<...>()` → `createHmrSafeContext<...>(\`SelectionGroup_${config.contextName}\`)`
- Remove unused `createContext` from solid-js import if no other usage

## Dependencies

- Task 2, Task 3 depend on Task 1
- Task 2 and Task 3 are independent of each other
